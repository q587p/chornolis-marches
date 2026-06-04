import { prisma } from "../db";
import {
  REAL_MS_PER_GAME_MINUTE,
  worldTimeSnapshotFromAbsoluteMinute,
  type WorldTimeSnapshot,
} from "../data/worldClock";
import { playerForms } from "./grammar";
import { getCurrentWorldState } from "./worldTime";

export const CHRONICLE_TITLE_PREFIX = "Chronicle:";
export const NEW_PLAYER_CHRONICLE_KIND = "new_player";
export const CARCASS_QUEST_STARTED_KIND = "carcass_quest_started";
export const CARCASS_QUEST_STOPPED_KIND = "carcass_quest_stopped";

type ChronicleEventLike = {
  id?: number;
  title: string;
  description: string | null;
  createdAt: Date;
};

type WorldStateLike = {
  absoluteMinute: number;
  lastAdvancedAt: Date;
  weatherKey?: string | null;
  weatherIntensity?: number | null;
};

type ChronicleRenderMode = "world" | "real";

export function chronicleTitle(kind: string) {
  return `${CHRONICLE_TITLE_PREFIX} ${kind}`;
}

export function formatChronicleDate(value: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    day: "numeric",
    month: "long",
  }).format(value);
}

export function formatChronicleTime(value: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function chronicleLine(event: ChronicleEventLike) {
  return `${formatChronicleTime(event.createdAt)} | ${event.description ?? event.title}`;
}

export function absoluteMinuteForChronicleEvent(
  eventCreatedAt: Date,
  worldState: WorldStateLike,
  realMsPerGameMinute = REAL_MS_PER_GAME_MINUTE,
) {
  const elapsedMs = eventCreatedAt.getTime() - worldState.lastAdvancedAt.getTime();
  const elapsedMinutes = Math.trunc(elapsedMs / Math.max(1, realMsPerGameMinute));
  return Math.max(0, worldState.absoluteMinute + elapsedMinutes);
}

export function worldSnapshotForChronicleEvent(
  eventCreatedAt: Date,
  worldState: WorldStateLike,
): WorldTimeSnapshot {
  return worldTimeSnapshotFromAbsoluteMinute(
    absoluteMinuteForChronicleEvent(eventCreatedAt, worldState),
    worldState.weatherKey ?? undefined,
    worldState.weatherIntensity ?? undefined,
  );
}

export function formatChronicleWorldDate(snapshot: WorldTimeSnapshot) {
  return `${snapshot.lunarCircleName}, день ${snapshot.dayOfCircle}`;
}

export function formatChronicleWorldTime(snapshot: WorldTimeSnapshot) {
  return snapshot.clockLabel;
}

function worldChronicleLine(event: ChronicleEventLike, worldState: WorldStateLike) {
  const snapshot = worldSnapshotForChronicleEvent(event.createdAt, worldState);
  return `${formatChronicleWorldTime(snapshot)} | ${event.description ?? event.title}`;
}

export function renderGlobalChronicles(
  events: ChronicleEventLike[],
  options: { mode?: ChronicleRenderMode; worldState?: WorldStateLike } = {},
) {
  const lines = ["📜 Хроніки Порубіжжя"];
  let previousDate = "";
  const mode = options.mode ?? (options.worldState ? "world" : "real");

  if (events.length === 0) {
    return `${lines.join("\n")}\n\nПоки на корі немає свіжих зарубок.`;
  }

  for (const event of events) {
    const snapshot = options.worldState ? worldSnapshotForChronicleEvent(event.createdAt, options.worldState) : null;
    const date = mode === "world" && snapshot ? formatChronicleWorldDate(snapshot) : formatChronicleDate(event.createdAt);
    if (date !== previousDate) {
      lines.push("", date);
      previousDate = date;
    }
    lines.push(mode === "world" && options.worldState ? worldChronicleLine(event, options.worldState) : chronicleLine(event));
  }

  return lines.join("\n");
}

export async function latestChronicleEvents(take = 30) {
  return prisma.worldEvent.findMany({
    where: { title: { startsWith: CHRONICLE_TITLE_PREFIX } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
}

export async function latestGlobalChronicles(take = 30) {
  const [events, worldState] = await Promise.all([
    latestChronicleEvents(take),
    getCurrentWorldState(),
  ]);
  return renderGlobalChronicles(events, { mode: "world", worldState });
}

export async function latestGlobalChroniclesRealTime(take = 30) {
  const events = await latestChronicleEvents(take);
  return renderGlobalChronicles(events, { mode: "real" });
}

export function renderSingleChronicleRelay(
  event: ChronicleEventLike,
  worldState: WorldStateLike,
) {
  const snapshot = worldSnapshotForChronicleEvent(event.createdAt, worldState);
  return [
    "📜 Хроніки Порубіжжя",
    "",
    `${formatChronicleWorldDate(snapshot)}, ${formatChronicleWorldTime(snapshot)}`,
    event.description ?? event.title,
  ].join("\n");
}

export function renderSingleChronicleRelayRealTime(event: ChronicleEventLike) {
  return [
    "📜 Хроніки Порубіжжя",
    "",
    `${formatChronicleDate(event.createdAt)}, ${formatChronicleTime(event.createdAt)}`,
    event.description ?? event.title,
  ].join("\n");
}

export async function backfillNewPlayerChroniclesFromPlayers() {
  const players = await prisma.player.findMany({
    where: {
      nameNominative: { not: null },
    },
    select: {
      id: true,
      nameNominative: true,
      firstName: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  let created = 0;
  let skipped = 0;

  for (const player of players) {
    const existing = await prisma.worldEvent.findFirst({
      where: {
        title: chronicleTitle(NEW_PLAYER_CHRONICLE_KIND),
        playerId: player.id,
      },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const name = playerForms(player).nominative;
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: chronicleTitle(NEW_PLAYER_CHRONICLE_KIND),
        description: `👋 Новий слід у Порубіжжі: ${name}.`,
        playerId: player.id,
        createdAt: player.createdAt,
      },
    });
    created += 1;
  }

  return { created, skipped, checked: players.length };
}

export async function recordNewPlayerChronicle(player: { id: number; nameNominative: string | null; firstName: string | null }) {
  const existing = await prisma.worldEvent.findFirst({
    where: {
      title: chronicleTitle(NEW_PLAYER_CHRONICLE_KIND),
      playerId: player.id,
    },
    select: { id: true },
  });
  if (existing) return;

  const name = playerForms(player).nominative;
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: chronicleTitle(NEW_PLAYER_CHRONICLE_KIND),
      description: `👋 Новий слід у Порубіжжі: ${name}.`,
      playerId: player.id,
    },
  });
}

export async function recordCarcassQuestChronicle(mode: "start" | "stop", locationId?: number | null) {
  const kind = mode === "start" ? CARCASS_QUEST_STARTED_KIND : CARCASS_QUEST_STOPPED_KIND;
  const latest = await prisma.worldEvent.findFirst({
    where: { title: { startsWith: `${CHRONICLE_TITLE_PREFIX} carcass_quest_` } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { title: true },
  });
  if (latest?.title === chronicleTitle(kind)) return;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: chronicleTitle(kind),
      description: mode === "start"
        ? "🦴 Падальний рів знову кличе до здобичі."
        : "🦴 Біля падального рову прибили бересту: поки досить.",
      locationId: locationId ?? undefined,
    },
  });
}
