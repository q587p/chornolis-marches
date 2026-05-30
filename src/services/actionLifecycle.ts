import { Bot } from "grammy";
import { PlayerPosture, Prisma, WorldAction, WorldActionType, WorldActorType } from "@prisma/client";
import { prisma } from "../db";
import {
  BASE_HP,
  BASE_STAMINA,
  HEALTH_REGEN_PER_INTERVAL,
  LOW_HP_WARNING,
  MAX_QUEUED_ACTIONS_PER_ACTOR,
  REST_HEALTH_REGEN_INTERVAL_MS,
  REST_STAMINA_REGEN_INTERVAL_MS,
  REST_STAMINA_REGEN_PER_INTERVAL,
  QUICK_PLAYER_ACTION_DURATION_MS,
} from "../gameConfig";
import { buildFatigueRestKeyboard } from "../ui/keyboards";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { setLastRuntimeError } from "../runtimeState";
import { actionPriority, actionTitle, effectivePlayerActionDurationMs } from "./actionRules";
import { fatigueStateFor, recoverStamina } from "./actionRecovery";
import { getPlayerRestStaminaCap, getPlayerRestStaminaRegenMultiplier } from "./locationFeatures";
import { isPhysicalPlayerAction, PlayerMustStandError } from "./postureRules";
import { logEvent } from "./worldEvents";
import { canSendProactiveToPlayerId } from "./sessionPresence";

export type ActorRef =
  | { actorType: "PLAYER"; playerId: number; creatureId?: never }
  | { actorType: "CREATURE"; creatureId: number; playerId?: never };

type ActionPayload = Prisma.InputJsonObject;

type EnqueueInput = ActorRef & {
  type: WorldActionType;
  payload?: ActionPayload;
  durationMs: number;
  priority?: number;
  interruptCurrent?: boolean;
  interruptQueued?: boolean;
  interruptible?: boolean;
  note?: string;
  chatId?: number | string;
  messageId?: number;
};

type PlayerActionRequest = {
  playerId: number;
  type: WorldActionType;
  payload?: ActionPayload;
  durationMs: number;
  priority?: number;
  interruptCurrent?: boolean;
  interruptQueued?: boolean;
  interruptible?: boolean;
  note?: string;
  chatId?: number | string;
  messageId?: number;
};

type PlayerActionSubmitResult = {
  action: WorldAction;
  mode: "queued" | "immediate";
  wasResting: boolean;
  shouldPromptRestChoice: boolean;
  remainingToMax: number;
};

function positiveIntEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

const PLAYER_RUNNING_ACTION_BATCH = 100;
const PLAYER_COMPLETION_CONCURRENCY = positiveIntEnv("PLAYER_COMPLETION_CONCURRENCY", 10);
const CREATURE_RUNNING_ACTION_BATCH = positiveIntEnv("CREATURE_RUNNING_ACTION_BATCH", 1000);
const CREATURE_COMPLETION_CONCURRENCY = positiveIntEnv("CREATURE_COMPLETION_CONCURRENCY", 25);
const PLAYER_QUEUED_ACTION_BATCH = 200;
const CREATURE_QUEUED_ACTION_BATCH = 1000;
let creatureQueueProcessing = false;

async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  const limit = Math.max(1, Math.floor(concurrency));
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await worker(item);
    }
  });
  await Promise.all(workers);
}

function groupActionsByActor(actions: WorldAction[]) {
  const groups = new Map<string, WorldAction[]>();
  for (const action of actions) {
    const key = actorKey(action);
    const group = groups.get(key);
    if (group) group.push(action);
    else groups.set(key, [action]);
  }
  return Array.from(groups.values());
}

export function actorWhere(ref: ActorRef) {
  return ref.actorType === "PLAYER"
    ? { actorType: "PLAYER" as WorldActorType, playerId: ref.playerId }
    : { actorType: "CREATURE" as WorldActorType, creatureId: ref.creatureId };
}

function actorWhereFromAction(action: WorldAction) {
  return action.actorType === "PLAYER"
    ? { actorType: action.actorType, playerId: action.playerId }
    : { actorType: action.actorType, creatureId: action.creatureId };
}

function actorKey(action: Pick<WorldAction, "actorType" | "playerId" | "creatureId">) {
  return action.actorType === "PLAYER" ? `PLAYER:${action.playerId}` : `CREATURE:${action.creatureId}`;
}

function isMissingRecordError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function chatIdFromAction(action: WorldAction) {
  if (!action.chatId) return undefined;
  const numeric = Number(action.chatId);
  return Number.isSafeInteger(numeric) ? numeric : action.chatId;
}

async function refreshKeyboardWhenPlayerQueueEnds(bot: Bot, action: WorldAction) {
  if (action.actorType !== "PLAYER" || !action.playerId || action.durationMs <= QUICK_PLAYER_ACTION_DURATION_MS) return;
  if (!(await canSendProactiveToPlayerId(action.playerId))) return;
  const chatId = chatIdFromAction(action);
  if (!chatId) return;

  const [activeCount, player] = await Promise.all([
    prisma.worldAction.count({ where: { actorType: "PLAYER", playerId: action.playerId, status: { in: ["QUEUED", "RUNNING"] } } }),
    prisma.player.findUnique({ where: { id: action.playerId }, select: { telegramId: true, isResting: true } }),
  ]);

  if (activeCount > 0 || !player || player.isResting) return;
  await bot.api.sendMessage(chatId, "Черга дій завершена.", {
    reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), false),
  });
}

export async function interruptActorActions(ref: ActorRef, reason = "перервано", includeQueued = true) {
  const where = actorWhere(ref);
  return prisma.worldAction.updateMany({
    where: {
      ...where,
      status: includeQueued ? { in: ["QUEUED", "RUNNING"] } : "RUNNING",
      interruptible: true,
    },
    data: { status: "CANCELLED", note: reason },
  });
}

export async function enqueueWorldAction(input: EnqueueInput) {
  const where = actorWhere(input);
  const priority = input.priority ?? actionPriority(input.type);

  if (input.interruptCurrent) await interruptActorActions(input, `перервано дією ${input.type}`, Boolean(input.interruptQueued));
  else if (input.interruptQueued) {
    await prisma.worldAction.updateMany({
      where: { ...where, status: "QUEUED", priority: { lt: priority }, interruptible: true },
      data: { status: "CANCELLED", note: `витіснено дією ${input.type}` },
    });
  }

  const activeCount = await prisma.worldAction.count({ where: { ...where, status: { in: ["QUEUED", "RUNNING"] } } });

  if (activeCount >= MAX_QUEUED_ACTIONS_PER_ACTOR) {
    throw new Error(`У черзі вже ${MAX_QUEUED_ACTIONS_PER_ACTOR} дій. Спершу дочекайся виконання або очисти чергу.`);
  }

  const last = await prisma.worldAction.findFirst({
    where: { ...where, status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { position: "desc" },
  });

  return prisma.worldAction.create({
    data: {
      ...where,
      type: input.type,
      priority,
      interruptible: input.interruptible ?? true,
      note: input.note,
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      durationMs: input.durationMs,
      position: (last?.position ?? 0) + 1,
      chatId: input.chatId === undefined ? undefined : String(input.chatId),
      messageId: input.messageId,
    },
  });
}

export async function enqueuePlayerAction(input: PlayerActionRequest): Promise<PlayerActionSubmitResult> {
  const player = await prisma.player.findUnique({ where: { id: input.playerId } });
  const queuedBefore = await prisma.worldAction.count({
    where: { actorType: "PLAYER", playerId: input.playerId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  const wasResting = Boolean(player?.isResting);
  const action = await enqueueWorldAction({ ...input, actorType: "PLAYER" });

  return {
    action,
    mode: "queued",
    wasResting,
    shouldPromptRestChoice: wasResting && queuedBefore === 0,
    remainingToMax: player ? Math.max(0, (player.staminaMax ?? BASE_STAMINA) - player.stamina) : 0,
  };
}

export async function performOrQueuePlayerAction(bot: Bot, input: PlayerActionRequest): Promise<PlayerActionSubmitResult> {
  const player = await prisma.player.findUnique({ where: { id: input.playerId } });
  if (!player) throw new Error("Персонажа не знайдено.");

  if ((player.posture === PlayerPosture.SITTING || player.isResting) && isPhysicalPlayerAction(input.type)) {
    throw new PlayerMustStandError(input.type);
  }

  if (player.hp <= 0 && input.type !== "REST") {
    await startPlayerRest(input.playerId);
    if (input.chatId) {
      await bot.api.sendMessage(input.chatId, "Ви непритомні. Черга очищена, тіло намагається відновитися. Зараз доступний лише відпочинок.", { reply_markup: buildFatigueRestKeyboard() });
    }
    throw new Error("Ви непритомні. Доступний лише відпочинок.");
  }

  if (player.hp > 0 && player.hp <= LOW_HP_WARNING && input.type !== "REST" && input.chatId) {
    await bot.api.sendMessage(input.chatId, "Ви дуже слабі. Можна діяти, але вам би відновитися.", { reply_markup: buildFatigueRestKeyboard() });
  }

  const wasResting = Boolean(player.isResting);
  const remainingToMax = Math.max(0, (player.staminaMax ?? BASE_STAMINA) - player.stamina);
  const normalizedInput = { ...input };

  if (normalizedInput.interruptCurrent) {
    await interruptActorActions({ actorType: "PLAYER", playerId: input.playerId }, `перервано дією ${input.type}`, Boolean(input.interruptQueued));
    normalizedInput.interruptCurrent = false;
    normalizedInput.interruptQueued = false;
  }

  const activeCount = await prisma.worldAction.count({
    where: { actorType: "PLAYER", playerId: input.playerId, status: { in: ["QUEUED", "RUNNING"] } },
  });

  if (!player.isResting && player.stamina > 0 && activeCount === 0) {
    const priority = normalizedInput.priority ?? actionPriority(normalizedInput.type);
    const durationMs = effectivePlayerActionDurationMs(player, normalizedInput.type, normalizedInput.durationMs);
    const startedAt = new Date();
    const action = await prisma.worldAction.create({
      data: {
        actorType: "PLAYER",
        playerId: input.playerId,
        type: normalizedInput.type,
        status: "RUNNING",
        priority,
        interruptible: normalizedInput.interruptible ?? true,
        note: normalizedInput.note,
        payload: (normalizedInput.payload ?? {}) as Prisma.InputJsonValue,
        durationMs,
        position: 1,
        startedAt,
        executeAt: new Date(startedAt.getTime() + durationMs),
        chatId: normalizedInput.chatId === undefined ? undefined : String(normalizedInput.chatId),
        messageId: normalizedInput.messageId,
      },
    });

    return {
      action,
      mode: "immediate",
      wasResting,
      shouldPromptRestChoice: false,
      remainingToMax,
    };
  }

  const result = await enqueuePlayerAction(normalizedInput);
  return { ...result, wasResting, shouldPromptRestChoice: wasResting && activeCount === 0, remainingToMax };
}

export async function queuePlayerRest(playerId: number, chatId?: number | string) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;
  const max = await getPlayerRestStaminaCap(playerId);
  const hpMax = player.hpMax ?? BASE_HP;
  const remaining = Math.max(0, max - player.stamina);
  const restStaminaRate = REST_STAMINA_REGEN_PER_INTERVAL * await getPlayerRestStaminaRegenMultiplier(playerId);
  const staminaMs = Math.max(1, Math.ceil(remaining / Math.max(1, restStaminaRate))) * REST_STAMINA_REGEN_INTERVAL_MS;
  const hpMs = Math.max(1, Math.ceil(Math.max(0, hpMax - player.hp) / HEALTH_REGEN_PER_INTERVAL)) * REST_HEALTH_REGEN_INTERVAL_MS;
  return enqueuePlayerAction({
    playerId,
    type: "REST",
    payload: { untilFull: true },
    durationMs: Math.max(staminaMs, hpMs),
    chatId,
    interruptible: true,
    note: "відпочинок у черзі",
  });
}

export async function startPlayerRest(playerId: number) {
  await prisma.worldAction.updateMany({
    where: { actorType: "PLAYER", playerId, status: { in: ["QUEUED", "RUNNING"] } },
    data: { status: "CANCELLED", note: "перервано відпочинком" },
  });
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;
  const max = await getPlayerRestStaminaCap(playerId);
  const hpMax = player.hpMax ?? BASE_HP;
  if (player.stamina >= max && player.hp >= hpMax && !player.isResting) return player;
  const updated = await prisma.player.updateMany({
    where: { id: playerId },
    data: {
      posture: PlayerPosture.SITTING,
      isResting: true,
      fatigueState: fatigueStateFor(player.stamina, max),
      lastStaminaRegenAt: new Date(),
      lastHpRegenAt: new Date(),
      restStarts: player.isResting ? undefined : { increment: 1 },
    },
  });
  return updated.count > 0 ? player : null;
}

export async function stopPlayerRest(playerId: number) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;
  await prisma.worldAction.updateMany({
    where: { actorType: "PLAYER", playerId, type: "REST", status: "RUNNING" },
    data: { status: "CANCELLED", note: "перервано відпочинок" },
  });
  const updated = await prisma.player.updateMany({
    where: { id: playerId },
    data: {
      isResting: false,
      fatigueState: fatigueStateFor(player.stamina, player.staminaMax ?? BASE_STAMINA),
      lastStaminaRegenAt: new Date(),
      lastHpRegenAt: new Date(),
    },
  });
  return updated.count > 0 ? player : null;
}

export async function enqueueCreatureAction(input: {
  creatureId: number;
  type: WorldActionType;
  payload?: ActionPayload;
  durationMs: number;
  priority?: number;
  interruptCurrent?: boolean;
  interruptQueued?: boolean;
  interruptible?: boolean;
  note?: string;
  chatId?: number | string;
  messageId?: number;
}) {
  return enqueueWorldAction({ ...input, actorType: "CREATURE" });
}

export async function hasActiveCreatureActions(creatureId: number) {
  const count = await prisma.worldAction.count({
    where: { actorType: "CREATURE", creatureId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  return count > 0;
}

export async function accelerateFirstQueuedPlayerAction(playerId: number) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.stamina < 0) return false;

  const first = await prisma.worldAction.findFirst({
    where: { actorType: "PLAYER", playerId, status: "QUEUED" },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  if (!first) return false;

  const startedAt = new Date();
  const durationMs = effectivePlayerActionDurationMs(player, first.type, first.durationMs);
  const result = await prisma.worldAction.updateMany({
    where: { id: first.id, status: "QUEUED" },
    data: { status: "RUNNING", durationMs, startedAt, executeAt: new Date(startedAt.getTime() + durationMs) },
  });

  return result.count > 0;
}

export async function playerActionQueueControlCount(playerId: number) {
  const [actionCount, player] = await Promise.all([
    prisma.worldAction.count({
      where: { actorType: "PLAYER", playerId, status: { in: ["QUEUED", "RUNNING"] } },
    }),
    prisma.player.findUnique({ where: { id: playerId }, select: { isResting: true } }),
  ]);

  return actionCount + (player?.isResting ? 1 : 0);
}

export async function hasPlayerActionQueueControls(playerId: number) {
  return (await playerActionQueueControlCount(playerId)) > 0;
}

export async function clearQueuedPlayerActions(playerId: number) {
  const result = await prisma.worldAction.updateMany({
    where: { actorType: "PLAYER", playerId, status: { in: ["QUEUED", "RUNNING"] } },
    data: { status: "CANCELLED", note: "очищено гравцем" },
  });

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  const stoppedRest = Boolean(player?.isResting);
  if (stoppedRest) {
    await prisma.player.updateMany({
      where: { id: playerId },
      data: { isResting: false, fatigueState: fatigueStateFor(player!.stamina, player!.staminaMax ?? BASE_STAMINA), lastStaminaRegenAt: new Date() },
    });
  }

  return { count: result.count + (stoppedRest ? 1 : 0) };
}

export async function cancelCurrentPlayerAction(playerId: number) {
  const result = await prisma.worldAction.updateMany({
    where: { actorType: "PLAYER", playerId, status: "RUNNING", interruptible: true },
    data: { status: "CANCELLED", note: "скасовано гравцем" },
  });

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  const stoppedRest = Boolean(player?.isResting);
  if (stoppedRest) {
    await prisma.player.updateMany({
      where: { id: playerId },
      data: { isResting: false, fatigueState: fatigueStateFor(player!.stamina, player!.staminaMax ?? BASE_STAMINA), lastStaminaRegenAt: new Date() },
    });
  }

  return { count: result.count + (stoppedRest ? 1 : 0) };
}

async function startNextQueuedAction(action: WorldAction) {
  const startedAt = new Date();
  let durationMs = action.durationMs;
  if (action.actorType === "PLAYER" && action.playerId) {
    const player = await prisma.player.findUnique({ where: { id: action.playerId } });
    durationMs = effectivePlayerActionDurationMs(player, action.type, action.durationMs);
  }

  const result = await prisma.worldAction.updateMany({
    where: { id: action.id, status: "QUEUED" },
    data: { status: "RUNNING", durationMs, startedAt, executeAt: new Date(startedAt.getTime() + durationMs) },
  });
  if (result.count === 0) return;

  if (action.actorType === "PLAYER" && action.playerId && action.type === "REST") {
    const player = await prisma.player.findUnique({ where: { id: action.playerId } });
    await prisma.player.updateMany({
      where: { id: action.playerId },
      data: { posture: PlayerPosture.SITTING, isResting: true, lastStaminaRegenAt: new Date(), lastHpRegenAt: new Date(), restStarts: player?.isResting ? undefined : { increment: 1 } },
    });
  }

  if (action.actorType === "CREATURE" && action.creatureId) {
    const activity = action.type === "MOVE" ? "MOVING" : action.type === "GATHER" || action.type === "GATHER_SPECIFIC" ? "GATHERING" : action.type === "LOOK" || action.type === "INSPECT" || action.type === "TRACK" ? "LOOKING" : action.type === "ATTACK" ? "FIGHTING" : action.type === "SAY" || action.type === "GREET" ? "SPEAKING" : action.type === "REST" ? "RESTING" : undefined;
    await prisma.creature.updateMany({ where: { id: action.creatureId, isGone: false }, data: { activity, currentAction: actionTitle(action) } });
  }
}

async function startQueuedActionsForActorType(actorType: WorldActorType, take: number) {
  const nextQueued = await prisma.worldAction.findMany({
    where: { actorType, status: "QUEUED" },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    take,
  });
  if (nextQueued.length === 0) return;

  const runningActions = await prisma.worldAction.findMany({
    where: { actorType, status: "RUNNING" },
    select: { actorType: true, playerId: true, creatureId: true },
  });
  const runningActors = new Set(runningActions.map(actorKey));
  const startedActors = new Set<string>();
  let restingPlayerIds = new Set<number>();
  let sittingPlayerIds = new Set<number>();

  if (actorType === "PLAYER") {
    const playerIds = [...new Set(nextQueued.map((action) => action.playerId).filter((id): id is number => Boolean(id)))];
    if (playerIds.length > 0) {
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, isResting: true, posture: true },
      });
      restingPlayerIds = new Set(players.filter((player) => player.isResting).map((player) => player.id));
      sittingPlayerIds = new Set(players.filter((player) => player.posture === PlayerPosture.SITTING || player.isResting).map((player) => player.id));
    }
  }

  for (const action of nextQueued) {
    const key = actorKey(action);
    if (startedActors.has(key) || runningActors.has(key)) continue;
    if (action.actorType === "PLAYER" && action.playerId && sittingPlayerIds.has(action.playerId) && isPhysicalPlayerAction(action.type)) {
      await prisma.worldAction.updateMany({
        where: { id: action.id, status: "QUEUED" },
        data: { status: "CANCELLED", note: "потрібно встати" },
      });
      continue;
    }
    if (action.actorType === "PLAYER" && action.playerId && restingPlayerIds.has(action.playerId)) continue;
    startedActors.add(key);
    try {
      await startNextQueuedAction(action);
    } catch (error) {
      if (!isMissingRecordError(error)) throw error;
    }
  }
}

async function processCreatureActionQueue(bot: Bot, completeAction: (bot: Bot, action: WorldAction) => Promise<unknown>) {
  if (creatureQueueProcessing) return;
  creatureQueueProcessing = true;
  try {
    const now = new Date();
    const dueCreatureRunning = await prisma.worldAction.findMany({
      where: { actorType: "CREATURE", status: "RUNNING", executeAt: { lte: now } },
      orderBy: [{ executeAt: "asc" }, { id: "asc" }],
      take: CREATURE_RUNNING_ACTION_BATCH,
    });
    await runWithConcurrency(dueCreatureRunning, CREATURE_COMPLETION_CONCURRENCY, async (action) => {
      try {
        await completeAction(bot, action);
      } catch (error) {
        if (!isMissingRecordError(error)) throw error;
      }
    });

    await startQueuedActionsForActorType("CREATURE", CREATURE_QUEUED_ACTION_BATCH);
  } finally {
    creatureQueueProcessing = false;
  }
}

export async function processActionQueue(bot: Bot, completeAction: (bot: Bot, action: WorldAction) => Promise<unknown>) {
  await recoverStamina(bot);
  const now = new Date();
  const completedPlayerActions: WorldAction[] = [];
  const duePlayerRunning = await prisma.worldAction.findMany({
    where: { actorType: "PLAYER", status: "RUNNING", executeAt: { lte: now } },
    orderBy: [{ executeAt: "asc" }, { id: "asc" }],
    take: PLAYER_RUNNING_ACTION_BATCH,
  });
  const duePlayerGroups = groupActionsByActor(duePlayerRunning);
  await runWithConcurrency(duePlayerGroups, PLAYER_COMPLETION_CONCURRENCY, async (actions) => {
    for (const action of actions) {
      try {
        await completeAction(bot, action);
        completedPlayerActions.push(action);
      } catch (error) {
        if (!isMissingRecordError(error)) throw error;
      }
    }
  });

  await startQueuedActionsForActorType("PLAYER", PLAYER_QUEUED_ACTION_BATCH);
  for (const action of completedPlayerActions.sort((a, b) => a.id - b.id)) {
    await refreshKeyboardWhenPlayerQueueEnds(bot, action);
  }

  void processCreatureActionQueue(bot, completeAction).catch((error) => {
    setLastRuntimeError(error);
    console.error("Creature action queue failed:", error);
    logEvent("ERROR", "Creature action queue failed", String(error)).catch(() => undefined);
  });
}
