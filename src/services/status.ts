import { prisma } from "../db";
import { config } from "../config";
import { getHttpServerStartedAt, getLastRuntimeError, getTelegramBotStatus, setLastRuntimeError } from "../runtimeState";
import { getRuntimeTimingConfig } from "../gameConfig";
import {
  HERALD_SERVICE_KEY,
  HERALD_SERVICE_LABEL,
  SERVICE_HEARTBEAT_STALE_AFTER_MS,
  getServiceHeartbeat,
  isServiceHeartbeatStale,
  serviceHeartbeatAgeMs,
  type ServiceHeartbeatSnapshot,
} from "./serviceHeartbeat";

const ACTIVE_ACTION_STATUSES = ["QUEUED", "RUNNING"] as const;
const WORLD_TICK_STALE_MULTIPLIER = 10;

export type RuntimeServiceState = "ok" | "warning" | "down";

export type RuntimeServiceStatus = {
  key: string;
  label: string;
  state: RuntimeServiceState;
  detail: string;
  checkedAt?: Date | null;
};

function oldestAgeMs(value: Date | null | undefined, now: Date) {
  return value ? Math.max(0, now.getTime() - value.getTime()) : 0;
}

export async function getActionQueueStats() {
  const now = new Date();
  const [groups, oldestQueued, oldestRunning, overdueRunning, overdueGroups] = await Promise.all([
    prisma.worldAction.groupBy({
      by: ["actorType", "status"],
      where: { status: { in: [...ACTIVE_ACTION_STATUSES] } },
      _count: { _all: true },
    }),
    prisma.worldAction.findFirst({
      where: { status: "QUEUED" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { createdAt: true },
    }),
    prisma.worldAction.findFirst({
      where: { status: "RUNNING" },
      orderBy: [{ startedAt: "asc" }, { id: "asc" }],
      select: { startedAt: true },
    }),
    prisma.worldAction.findMany({
      where: { status: "RUNNING", executeAt: { lte: now } },
      orderBy: [{ executeAt: "asc" }, { id: "asc" }],
      take: 1,
      select: { executeAt: true },
    }),
    prisma.worldAction.groupBy({
      by: ["actorType"],
      where: { status: "RUNNING", executeAt: { lte: now } },
      _count: { _all: true },
    }),
  ]);

  const stats = {
    playerQueued: 0,
    playerRunning: 0,
    creatureQueued: 0,
    creatureRunning: 0,
    totalQueued: 0,
    totalRunning: 0,
    oldestQueuedAgeMs: oldestAgeMs(oldestQueued?.createdAt, now),
    oldestRunningAgeMs: oldestAgeMs(oldestRunning?.startedAt, now),
    overdueRunning: 0,
    maxOverdueMs: oldestAgeMs(overdueRunning[0]?.executeAt, now),
  };

  for (const group of groups) {
    const count = group._count._all;
    if (group.status === "QUEUED") stats.totalQueued += count;
    if (group.status === "RUNNING") stats.totalRunning += count;
    if (group.actorType === "PLAYER" && group.status === "QUEUED") stats.playerQueued = count;
    if (group.actorType === "PLAYER" && group.status === "RUNNING") stats.playerRunning = count;
    if (group.actorType === "CREATURE" && group.status === "QUEUED") stats.creatureQueued = count;
    if (group.actorType === "CREATURE" && group.status === "RUNNING") stats.creatureRunning = count;
  }

  stats.overdueRunning = overdueGroups.reduce((sum, group) => sum + group._count._all, 0);

  return stats;
}

function serviceStatus(key: string, label: string, state: RuntimeServiceState, detail: string, checkedAt?: Date | null): RuntimeServiceStatus {
  return { key, label, state, detail, checkedAt: checkedAt ?? null };
}

function formatDurationShort(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds} с`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} хв`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} год`;
  return `${Math.floor(hours / 24)} дн`;
}

function compactError(error: unknown) {
  const text = String(error instanceof Error ? error.message : error);
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function optionalAgo(value: Date | null | undefined, now: Date) {
  return value ? `${formatDurationShort(now.getTime() - value.getTime())} тому` : null;
}

export function serverRuntimeStatus(now = new Date()): RuntimeServiceStatus {
  const startedAt = getHttpServerStartedAt();
  const uptimeMs = Math.max(0, Math.round(process.uptime() * 1000));
  const detail = startedAt
    ? `HTTP відповідає; працює ${formatDurationShort(now.getTime() - startedAt.getTime())}.`
    : `HTTP відповідає; процес працює ${formatDurationShort(uptimeMs)}.`;
  return serviceStatus("server", "Сервер", "ok", detail, startedAt ?? now);
}

export function telegramRuntimeStatus(): RuntimeServiceStatus {
  const status = getTelegramBotStatus();
  if (status.state === "ready") {
    return serviceStatus(
      "telegram",
      "Основний бот",
      "ok",
      status.username ? `API відповів як @${status.username}.` : "API відповів, бот готовий.",
      status.checkedAt,
    );
  }
  if (status.state === "error") {
    return serviceStatus("telegram", "Основний бот", "down", status.error ? `Помилка: ${compactError(status.error)}` : "Є помилка Telegram-бота.", status.checkedAt);
  }
  return serviceStatus("telegram", "Основний бот", "warning", "Перевірка Telegram API ще триває.", status.checkedAt);
}

export function databaseRuntimeStatus(error: unknown | null, checkedAt = new Date()): RuntimeServiceStatus {
  if (!error) return serviceStatus("database", "База даних", "ok", "Запити до БД виконуються.", checkedAt);
  return serviceStatus("database", "База даних", "down", `Помилка БД: ${compactError(error)}`, checkedAt);
}

export function worldTickRuntimeStatus(latestTick: { createdAt: Date } | null | undefined, now = new Date(), tickMs = getRuntimeTimingConfig().tickMs): RuntimeServiceStatus {
  if (!latestTick) return serviceStatus("worldTick", "Світовий цикл", "warning", "Ще немає жодного World Tick.", now);
  const ageMs = Math.max(0, now.getTime() - latestTick.createdAt.getTime());
  const staleAfterMs = Math.max(60_000, tickMs * WORLD_TICK_STALE_MULTIPLIER);
  const state: RuntimeServiceState = ageMs > staleAfterMs ? "warning" : "ok";
  return serviceStatus("worldTick", "Світовий цикл", state, `Останній тік ${formatDurationShort(ageMs)} тому.`, latestTick.createdAt);
}

export function actionQueueRuntimeStatus(actionQueue: Awaited<ReturnType<typeof getActionQueueStats>> | null, now = new Date()): RuntimeServiceStatus {
  if (!actionQueue) return serviceStatus("actionQueue", "Черга дій", "warning", "Чергу дій не вдалося прочитати.", now);
  if (actionQueue.overdueRunning > 0) {
    return serviceStatus(
      "actionQueue",
      "Черга дій",
      "warning",
      `Прострочено дій: ${actionQueue.overdueRunning}; найбільша затримка ${formatDurationShort(actionQueue.maxOverdueMs)}.`,
      now,
    );
  }
  return serviceStatus(
    "actionQueue",
    "Черга дій",
    "ok",
    `Очікує ${actionQueue.totalQueued}, виконується ${actionQueue.totalRunning}.`,
    now,
  );
}

export type HeraldServiceStats = {
  heartbeat: ServiceHeartbeatSnapshot | null;
  queuedCount: number;
  publishedCount: number;
  lastPublishedNewsAt: Date | null;
};

export function heraldRuntimeStatus(stats: HeraldServiceStats | null, now = new Date()): RuntimeServiceStatus {
  if (!stats) {
    return serviceStatus("herald", HERALD_SERVICE_LABEL, "warning", "Канцелярію не вдалося прочитати з БД.", now);
  }

  const { heartbeat, queuedCount, publishedCount, lastPublishedNewsAt } = stats;
  const heartbeatAgeMs = serviceHeartbeatAgeMs(heartbeat, now);
  const state: RuntimeServiceState = !heartbeat || isServiceHeartbeatStale(heartbeat, now, SERVICE_HEARTBEAT_STALE_AFTER_MS)
    ? "warning"
    : "ok";
  const mode = heartbeat?.mode ?? "невідомо";
  const heartbeatText = heartbeatAgeMs === null
    ? "ще не подавала знаку"
    : state === "ok"
      ? `на зв’язку; останній знак ${formatDurationShort(heartbeatAgeMs)} тому`
      : `давно не подавала знаку; останній знак ${formatDurationShort(heartbeatAgeMs)} тому`;
  const startupText = optionalAgo(heartbeat?.startedAt, now);
  const newsText = optionalAgo(lastPublishedNewsAt, now);
  const parts = [
    `${heartbeatText}.`,
    `Режим: ${mode}.`,
    `У скрині вістей: очікує ${queuedCount}; опубліковано ${publishedCount}.`,
  ];

  if (newsText) parts.push(`Остання опублікована новина ${newsText}.`);
  if (startupText) parts.push(`Останній старт ${startupText}.`);

  return serviceStatus("herald", HERALD_SERVICE_LABEL, state, parts.join(" "), heartbeat?.lastSeenAt ?? now);
}

export async function getStatusData() {
  const checkedAt = new Date();
  let databaseError: unknown | null = null;
  let snapshot = {
    playersCount: 0,
    regionsCount: 0,
    locationsCount: 0,
    exitsCount: 0,
    aliveAnimalsCount: 0,
    animalCorpsesCount: 0,
    goneAnimalsCount: 0,
    npcCount: 0,
    aliveCreaturesCount: 0,
    resourcesCount: 0,
    eventsCount: 0,
    latestEvents: [] as Awaited<ReturnType<typeof prisma.worldEvent.findMany>>,
    latestTickEvent: null as { createdAt: Date } | null,
    actionQueue: null as Awaited<ReturnType<typeof getActionQueueStats>> | null,
    herald: null as HeraldServiceStats | null,
  };

  try {
    const [
      playersCount,
      regionsCount,
      locationsCount,
      exitsCount,
      aliveAnimalsCount,
      animalCorpsesCount,
      goneAnimalsCount,
      npcCount,
      aliveCreaturesCount,
      resourcesCount,
      eventsCount,
      latestEvents,
      latestTickEvent,
      actionQueue,
      heraldHeartbeat,
      heraldQueuedCount,
      heraldPublishedCount,
      heraldLastPublishedNews,
    ] = await Promise.all([
      prisma.player.count(),
      prisma.region.count(),
      prisma.cellLocation.count(),
      prisma.locationExit.count(),
      prisma.creature.count({ where: { isAlive: true, isGone: false, species: { kind: "ANIMAL" } } }),
      prisma.creature.count({ where: { isAlive: false, isGone: false, species: { kind: "ANIMAL" } } }),
      prisma.creature.count({ where: { isGone: true, species: { kind: "ANIMAL" } } }),
      prisma.creature.count({ where: { isAlive: true, isGone: false, species: { kind: { not: "ANIMAL" } } } }),
      prisma.creature.count({ where: { isAlive: true, isGone: false } }),
      prisma.resourceNode.count(),
      prisma.worldEvent.count(),
      prisma.worldEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.worldEvent.findFirst({ where: { title: "World Tick" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      getActionQueueStats(),
      getServiceHeartbeat(HERALD_SERVICE_KEY),
      prisma.heraldPublication.count({ where: { publishedAt: null } }),
      prisma.heraldPublication.count({ where: { publishedAt: { not: null } } }),
      prisma.heraldPublication.findFirst({
        where: { publishedAt: { not: null }, sourceType: { in: ["NEWS_MD", "NEWS_MD_ARCHIVE"] } },
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        select: { publishedAt: true },
      }),
    ]);
    snapshot = {
      playersCount,
      regionsCount,
      locationsCount,
      exitsCount,
      aliveAnimalsCount,
      animalCorpsesCount,
      goneAnimalsCount,
      npcCount,
      aliveCreaturesCount,
      resourcesCount,
      eventsCount,
      latestEvents,
      latestTickEvent,
      actionQueue,
      herald: {
        heartbeat: heraldHeartbeat,
        queuedCount: heraldQueuedCount,
        publishedCount: heraldPublishedCount,
        lastPublishedNewsAt: heraldLastPublishedNews?.publishedAt ?? null,
      },
    };
  } catch (error) {
    databaseError = error;
    setLastRuntimeError(error);
  }

  const services = [
    serverRuntimeStatus(checkedAt),
    telegramRuntimeStatus(),
    databaseRuntimeStatus(databaseError, checkedAt),
    heraldRuntimeStatus(snapshot.herald, checkedAt),
    worldTickRuntimeStatus(snapshot.latestTickEvent, checkedAt),
    actionQueueRuntimeStatus(snapshot.actionQueue, checkedAt),
  ];

  return {
    version: config.appVersion,
    ...snapshot,
    latestEvent: snapshot.latestEvents[0] ?? null,
    services,
    databaseError: databaseError ? compactError(databaseError) : null,
    lastRuntimeError: getLastRuntimeError(),
  };
}
