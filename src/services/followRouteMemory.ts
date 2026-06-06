import type { Bot } from "grammy";
import { PlayerPosture, PlayerSleepState, type Direction } from "@prisma/client";
import { prisma } from "../db";
import { directionLabels } from "../ui/labels";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { escapeHtml } from "../utils/text";
import { safeSendMessage } from "../utils/telegram";
import { withSlowLog } from "../utils/slowLog";
import { canSendProactiveToTelegramId } from "./sessionPresence";
import { visibilityRulesForLocation } from "./visibility";
import { recordLearningProgress } from "./learning";
import { FOLLOW_TARGET_CREATURE, FOLLOW_TARGET_PLAYER, type FollowTargetType } from "./following";
import { movementDurationMs } from "./actionRules";
import { performOrQueuePlayerAction } from "./actionLifecycle";
import { locationLockedExitMessageForPlayer } from "./tutorial";

export const FOLLOW_ROUTE_MEMORY_EVENT_TITLE = "Follow intent route memory";
export const FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE = "Follow intent hidden route memory";
export const FOLLOW_ROUTE_VISIBLE_HINT_COOLDOWN_MS = Number(process.env.FOLLOW_ROUTE_VISIBLE_HINT_COOLDOWN_MS || 90_000);
export const FOLLOW_ROUTE_HIDDEN_HINT_COOLDOWN_MS = Number(process.env.FOLLOW_ROUTE_HIDDEN_HINT_COOLDOWN_MS || 5 * 60_000);
export const FOLLOW_ROUTE_LEARNING_COOLDOWN_MS = Number(process.env.FOLLOW_ROUTE_LEARNING_COOLDOWN_MS || 5 * 60_000);
export const FOLLOW_ROUTE_STEP_MEMORY_TTL_MS = Number(process.env.FOLLOW_ROUTE_STEP_MEMORY_TTL_MS || 10 * 60_000);
export const FOLLOW_ASSIST_EVENT_TITLE = "Follow assist queued move";
export const FOLLOW_ASSIST_COOLDOWN_MS = Number(process.env.FOLLOW_ASSIST_COOLDOWN_MS || 90_000);

const FOLLOW_STEP_DIRECTIONS = new Set<Direction>(["NORTH", "EAST", "SOUTH", "WEST", "UP", "DOWN", "INSIDE", "OUTSIDE"]);

export type FollowRouteTarget = {
  type: FollowTargetType;
  id: number;
  label: string;
  visible?: boolean | null;
};

export type FollowIntentRouteLike = {
  targetType?: string | null;
  targetPlayerId?: number | null;
  targetCreatureId?: number | null;
  lastKnownTargetLabel?: string | null;
};

export function followIntentMatchesMoveTarget(intent: FollowIntentRouteLike | null | undefined, target: Pick<FollowRouteTarget, "type" | "id">) {
  if (!intent || intent.targetType !== target.type) return false;
  if (target.type === FOLLOW_TARGET_PLAYER) return intent.targetPlayerId === target.id;
  return intent.targetCreatureId === target.id;
}

export function followRouteMemoryKind(input: {
  exitVisible?: boolean | null;
  targetVisible?: boolean | null;
  showTracks?: boolean | null;
}) {
  if (!input.exitVisible || input.targetVisible === false) return "none" as const;
  return input.showTracks ? "clear" as const : "dark" as const;
}

export function followedRouteMemoryText(input: {
  label?: string | null;
  direction?: Direction | string | null;
  kind: "clear" | "dark";
}) {
  if (input.kind === "dark") return "Ви відчуваєте, що чужий слід зрушив, але темрява забирає напрям.";
  const label = input.label?.trim() || "хтось";
  const direction = input.direction ? String(directionLabels[input.direction] ?? input.direction).toLocaleLowerCase("uk-UA") : "невідомо куди";
  return `Ви трималися чужого сліду: ${escapeHtml(label)} рушає на ${escapeHtml(direction)}.`;
}

export function followedHiddenRouteMemoryText() {
  return "Чужий слід зникає не кроком. Ви запам'ятовуєте не напрям, а слово й місце біля зарубок.";
}

export function followRouteMemoryEventDescription(input: {
  playerId: number;
  targetType: FollowTargetType;
  targetId: number;
  fromLocationId: number;
  toLocationId?: number | null;
  direction?: Direction | string | null;
  source: "visible_move" | "hidden_route";
  visibility?: "clear" | "dark" | "hidden";
  cooldownKey?: string | null;
  learningKey?: string | null;
}) {
  return [
    `playerId=${input.playerId}`,
    `targetType=${input.targetType}`,
    `targetId=${input.targetId}`,
    `from=${input.fromLocationId}`,
    input.toLocationId ? `to=${input.toLocationId}` : null,
    input.direction ? `direction=${input.direction}` : null,
    `source=${input.source}`,
    input.visibility ? `visibility=${input.visibility}` : null,
    input.cooldownKey ? `cooldownKey=${input.cooldownKey}` : null,
    input.learningKey ? `learningKey=${input.learningKey}` : null,
  ].filter(Boolean).join("; ");
}

export function followRouteMemoryCooldownKey(input: {
  playerId: number;
  targetType: FollowTargetType;
  targetId: number;
  fromLocationId: number;
  direction?: Direction | string | null;
  source: "visible_move" | "hidden_route";
}) {
  return [
    "follow_route",
    `player_${input.playerId}`,
    `target_${input.targetType}_${input.targetId}`,
    `from_${input.fromLocationId}`,
    input.direction ? `direction_${input.direction}` : null,
    `source_${input.source}`,
  ].filter(Boolean).join(":");
}

export function followRouteLearningCooldownKey(input: {
  playerId: number;
  targetType: FollowTargetType;
  targetId: number;
}) {
  return `follow_learning:player_${input.playerId}:target_${input.targetType}_${input.targetId}`;
}

export function followAssistCooldownKey(input: {
  playerId: number;
  targetType: FollowTargetType;
  targetId: number;
  fromLocationId: number;
  direction?: Direction | string | null;
}) {
  return [
    "follow_assist",
    `player_${input.playerId}`,
    `target_${input.targetType}_${input.targetId}`,
    `from_${input.fromLocationId}`,
    input.direction ? `direction_${input.direction}` : null,
  ].filter(Boolean).join(":");
}

export function isWithinFollowRouteCooldown(createdAt: Date | string | number | null | undefined, now = Date.now(), cooldownMs: number) {
  if (!createdAt || cooldownMs <= 0) return false;
  const time = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (!Number.isFinite(time)) return false;
  return now - time < cooldownMs;
}

export type FollowRouteMemoryDescription = {
  playerId?: number;
  targetType?: FollowTargetType;
  targetId?: number;
  fromLocationId?: number;
  toLocationId?: number;
  direction?: Direction;
  source?: "visible_move" | "hidden_route";
  visibility?: "clear" | "dark" | "hidden";
};

export type FollowStepFailureReason =
  | "no-intent"
  | "no-memory"
  | "stale"
  | "dark"
  | "hidden"
  | "wrong-location"
  | "wrong-target"
  | "no-direction"
  | "no-visible-exit";

export type FollowStepMemoryResult =
  | { ok: true; direction: Direction; targetLabel?: string | null }
  | { ok: false; reason: FollowStepFailureReason };

export type FollowAssistFailureReason =
  | "assist-disabled"
  | "no-memory"
  | "dark"
  | "hidden"
  | "wrong-location"
  | "wrong-target"
  | "no-direction"
  | "no-visible-exit"
  | "busy"
  | "resting"
  | "incapacitated"
  | "cooldown"
  | "no-stamina";

export type FollowAssistEligibilityResult =
  | { ok: true; direction: Direction; cooldownKey: string }
  | { ok: false; reason: FollowAssistFailureReason };

function numberField(value: string | undefined) {
  if (!value || !/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function parseFollowRouteMemoryEventDescription(description: string | null | undefined): FollowRouteMemoryDescription {
  const fields = new Map<string, string>();
  for (const part of String(description ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key || !rest.length) continue;
    fields.set(key, rest.join("=").trim());
  }

  const targetType = fields.get("targetType");
  const direction = fields.get("direction");
  const source = fields.get("source");
  const visibility = fields.get("visibility");
  return {
    playerId: numberField(fields.get("playerId")),
    targetType: targetType === FOLLOW_TARGET_PLAYER || targetType === FOLLOW_TARGET_CREATURE ? targetType : undefined,
    targetId: numberField(fields.get("targetId")),
    fromLocationId: numberField(fields.get("from")),
    toLocationId: numberField(fields.get("to")),
    direction: direction && FOLLOW_STEP_DIRECTIONS.has(direction as Direction) ? direction as Direction : undefined,
    source: source === "visible_move" || source === "hidden_route" ? source : undefined,
    visibility: visibility === "clear" || visibility === "dark" || visibility === "hidden" ? visibility : undefined,
  };
}

export function followStepFailureText(reason: FollowStepFailureReason) {
  if (reason === "no-intent") return "Ви ще не тримаєтеся жодного чужого сліду. Спершу: /follow <ціль>.";
  if (reason === "dark" || reason === "no-direction") {
    return "Ви пам’ятаєте, що чужий слід зрушив, але не напрям. Якщо тепер маєте світло, спробуйте /track або «шукати сліди» — сам цей спогад уже не стане яснішим.";
  }
  if (reason === "hidden") return "Той слід зник не кроком. Його не повторити простою ходою.";
  if (reason === "wrong-location") return "Ви вже не там, де втримали цей слід.";
  if (reason === "no-visible-exit") return "Слід пам’ятає напрям, але стежка тут уже не відкривається простою ходою.";
  return "Чужий слід уже розійшовся з шумом місцини. Спробуйте знову озирнутися або вистежити.";
}

export function evaluateFollowRouteMemoryForStep(input: {
  intent?: FollowIntentRouteLike | null;
  currentLocationId?: number | null;
  event?: { title?: string | null; description?: string | null; createdAt?: Date | string | number | null } | null;
  now?: number;
  ttlMs?: number;
}): FollowStepMemoryResult {
  if (!input.intent) return { ok: false, reason: "no-intent" };
  if (!input.event) return { ok: false, reason: "no-memory" };

  const parsed = parseFollowRouteMemoryEventDescription(input.event.description);
  if (input.event.title === FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE || parsed.source === "hidden_route" || parsed.visibility === "hidden") {
    return { ok: false, reason: "hidden" };
  }
  if (input.event.title !== FOLLOW_ROUTE_MEMORY_EVENT_TITLE || parsed.source !== "visible_move") return { ok: false, reason: "no-memory" };

  const eventTime = input.event.createdAt instanceof Date ? input.event.createdAt.getTime() : new Date(input.event.createdAt ?? 0).getTime();
  const now = input.now ?? Date.now();
  const ttlMs = input.ttlMs ?? FOLLOW_ROUTE_STEP_MEMORY_TTL_MS;
  if (!Number.isFinite(eventTime) || ttlMs <= 0 || now - eventTime > ttlMs) return { ok: false, reason: "stale" };
  if (parsed.visibility !== "clear") return { ok: false, reason: "dark" };
  if (!parsed.direction) return { ok: false, reason: "no-direction" };
  if (!input.currentLocationId || parsed.fromLocationId !== input.currentLocationId) return { ok: false, reason: "wrong-location" };
  if (!parsed.targetType || !parsed.targetId || !followIntentMatchesMoveTarget(input.intent, { type: parsed.targetType, id: parsed.targetId })) {
    return { ok: false, reason: "wrong-target" };
  }

  return { ok: true, direction: parsed.direction, targetLabel: input.intent.lastKnownTargetLabel };
}

export function evaluateFollowAssistEligibility(input: {
  intent?: (FollowIntentRouteLike & { playerId?: number | null; assistEnabled?: boolean | null }) | null;
  currentLocationId?: number | null;
  event?: { title?: string | null; description?: string | null; createdAt?: Date | string | number | null } | null;
  player?: {
    hp?: number | null;
    stamina?: number | null;
    posture?: string | null;
    sleepState?: string | null;
    isResting?: boolean | null;
  } | null;
  activeActionCount?: number;
  hasVisibleExit?: boolean;
  locked?: boolean;
  hasRecentAssist?: boolean;
  now?: number;
  ttlMs?: number;
}): FollowAssistEligibilityResult {
  if (!input.intent?.assistEnabled) return { ok: false, reason: "assist-disabled" };
  const player = input.player;
  if (!player || (player.hp ?? 0) <= 0 || player.sleepState !== PlayerSleepState.AWAKE) return { ok: false, reason: "incapacitated" };
  if (player.isResting || player.posture !== PlayerPosture.STANDING) return { ok: false, reason: "resting" };
  if ((player.stamina ?? 0) <= 0) return { ok: false, reason: "no-stamina" };
  if ((input.activeActionCount ?? 0) > 0) return { ok: false, reason: "busy" };
  if (input.hasRecentAssist) return { ok: false, reason: "cooldown" };

  const remembered = evaluateFollowRouteMemoryForStep({
    intent: input.intent,
    currentLocationId: input.currentLocationId,
    event: input.event,
    now: input.now,
    ttlMs: input.ttlMs,
  });
  if (!remembered.ok) {
    if (remembered.reason === "stale" || remembered.reason === "no-intent") return { ok: false, reason: "no-memory" };
    return { ok: false, reason: remembered.reason };
  }
  if (!input.hasVisibleExit || input.locked) return { ok: false, reason: "no-visible-exit" };

  return {
    ok: true,
    direction: remembered.direction,
    cooldownKey: followAssistCooldownKey({
      playerId: input.intent.playerId ?? 0,
      targetType: input.intent.targetType as FollowTargetType,
      targetId: input.intent.targetType === FOLLOW_TARGET_PLAYER ? input.intent.targetPlayerId ?? 0 : input.intent.targetCreatureId ?? 0,
      fromLocationId: input.currentLocationId ?? 0,
      direction: remembered.direction,
    }),
  };
}

export function followAssistQueuedText(direction: Direction) {
  const label = String(directionLabels[direction] ?? direction).toLocaleLowerCase("uk-UA");
  const phrase = ["UP", "DOWN", "INSIDE", "OUTSIDE"].includes(direction) ? label : `на ${label}`;
  return `Ви підхоплюєте чужий крок: ${phrase}.`;
}

export function followAssistFailureText(reason: FollowAssistFailureReason) {
  if (reason === "hidden") return "Чужий слід зник не кроком. Автокрок мовчить.";
  if (reason === "dark" || reason === "no-direction") return "Темрява забрала напрям. Автокрок не знає, куди йти.";
  if (reason === "busy") return "Ви вже зайняті іншим кроком. Автокрок не втручається.";
  if (reason === "resting" || reason === "incapacitated") return "Тіло не підхоплює чужий крок просто зараз.";
  if (reason === "no-stamina") return "Снаги не стає на автокрок слідом.";
  if (reason === "no-visible-exit") return "Автокрок пам'ятає напрям, але звичайна стежка тут не відкривається.";
  return "Автокрок слідом не знаходить ясного руху.";
}

export async function latestFollowRouteMemoryForPlayer(playerId: number) {
  return prisma.worldEvent.findFirst({
    where: {
      playerId,
      title: { in: [FOLLOW_ROUTE_MEMORY_EVENT_TITLE, FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE] },
    },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function followStepDirectionForPlayer(playerId: number): Promise<FollowStepMemoryResult> {
  const [player, intent, event] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } }),
    prisma.playerFollowIntent.findUnique({ where: { playerId } }),
    latestFollowRouteMemoryForPlayer(playerId),
  ]);
  const evaluated = evaluateFollowRouteMemoryForStep({
    intent,
    currentLocationId: player?.currentLocationId,
    event,
  });
  if (!evaluated.ok) return evaluated;

  const exit = await prisma.locationExit.findUnique({
    where: { fromLocationId_direction: { fromLocationId: player!.currentLocationId!, direction: evaluated.direction } },
    select: { id: true, isHidden: true },
  });
  if (!exit || exit.isHidden) return { ok: false, reason: "no-visible-exit" };
  return evaluated;
}

export function followIntentTrackMatches(intent: FollowIntentRouteLike | null | undefined, track: any) {
  if (!intent) return false;
  if (intent.targetType === FOLLOW_TARGET_PLAYER) return Boolean(intent.targetPlayerId && track.playerId === intent.targetPlayerId);
  if (intent.targetType === FOLLOW_TARGET_CREATURE) return Boolean(intent.targetCreatureId && track.creatureId === intent.targetCreatureId);
  return false;
}

export function prioritizeFollowIntentTracks<T extends { id?: number }>(tracks: T[], intent: FollowIntentRouteLike | null | undefined) {
  if (!intent) return tracks;
  return [...tracks].sort((a: any, b: any) => Number(followIntentTrackMatches(intent, b)) - Number(followIntentTrackMatches(intent, a)));
}

export function followedTrackDisplayLabel(intent: FollowIntentRouteLike | null | undefined, track: any, fallbackLabel: string) {
  if (!followIntentTrackMatches(intent, track)) return fallbackLabel;
  const label = intent?.lastKnownTargetLabel?.trim() || fallbackLabel;
  return `чужий слід: ${label}`;
}

async function sendFollowRouteMemoryMessage(bot: Bot, player: { telegramId: string; isAutoEnabled?: boolean | null }, text: string) {
  if (!(await canSendProactiveToTelegramId(player.telegramId))) return;
  await safeSendMessage(
    bot,
    player.telegramId,
    text,
    {
      parse_mode: "HTML",
      reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), Boolean(player.isAutoEnabled)),
    },
    "follow route memory sendMessage",
  );
}

async function followersForTargetAtLocation(sourceLocationId: number, target: FollowRouteTarget) {
  return prisma.playerFollowIntent.findMany({
    where: {
      targetType: target.type,
      ...(target.type === FOLLOW_TARGET_PLAYER ? { targetPlayerId: target.id } : { targetCreatureId: target.id }),
      player: {
        currentLocationId: sourceLocationId,
        hp: { gt: 0 },
        sleepState: "AWAKE",
      },
    },
    include: { player: true },
  });
}

async function hasRecentFollowRouteMemoryMarker(input: {
  title: string;
  playerId: number;
  markerName: "cooldownKey" | "learningKey";
  markerValue: string;
  cooldownMs: number;
}) {
  if (input.cooldownMs <= 0) return false;
  const since = new Date(Date.now() - input.cooldownMs);
  return Boolean(await prisma.worldEvent.findFirst({
    where: {
      title: input.title,
      playerId: input.playerId,
      createdAt: { gte: since },
      description: { contains: `${input.markerName}=${input.markerValue}` },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  }));
}

async function hasRecentFollowAssistMarker(playerId: number, cooldownKey: string) {
  if (FOLLOW_ASSIST_COOLDOWN_MS <= 0) return false;
  const since = new Date(Date.now() - FOLLOW_ASSIST_COOLDOWN_MS);
  return Boolean(await prisma.worldEvent.findFirst({
    where: {
      title: FOLLOW_ASSIST_EVENT_TITLE,
      playerId,
      createdAt: { gte: since },
      description: { contains: `cooldownKey=${cooldownKey}` },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  }));
}

async function maybeQueueFollowAssistMove(bot: Bot, input: {
  intent: Awaited<ReturnType<typeof followersForTargetAtLocation>>[number];
  event: { title: string; description: string | null; createdAt: Date };
  sourceLocationId: number;
  target: FollowRouteTarget;
  direction: Direction;
}) {
  const player = input.intent.player;
  const preliminaryCooldownKey = followAssistCooldownKey({
    playerId: input.intent.playerId,
    targetType: input.target.type,
    targetId: input.target.id,
    fromLocationId: input.sourceLocationId,
    direction: input.direction,
  });
  const [activeActionCount, exit, lockedMessage, hasRecentAssist] = await Promise.all([
    prisma.worldAction.count({ where: { actorType: "PLAYER", playerId: input.intent.playerId, status: { in: ["QUEUED", "RUNNING"] } } }),
    prisma.locationExit.findUnique({
      where: { fromLocationId_direction: { fromLocationId: input.sourceLocationId, direction: input.direction } },
      select: { id: true, isHidden: true, travelCost: true },
    }),
    locationLockedExitMessageForPlayer(input.intent.playerId, input.sourceLocationId, input.direction),
    hasRecentFollowAssistMarker(input.intent.playerId, preliminaryCooldownKey),
  ]);

  const eligibility = evaluateFollowAssistEligibility({
    intent: input.intent,
    currentLocationId: player.currentLocationId,
    event: input.event,
    player,
    activeActionCount,
    hasVisibleExit: Boolean(exit && !exit.isHidden),
    locked: Boolean(lockedMessage),
    hasRecentAssist,
  });
  if (!eligibility.ok) return eligibility;
  const parsedMemory = parseFollowRouteMemoryEventDescription(input.event.description);

  const result = await performOrQueuePlayerAction(bot, {
    playerId: input.intent.playerId,
    type: "MOVE",
    payload: { direction: eligibility.direction },
    durationMs: movementDurationMs(exit?.travelCost, player.stamina),
    chatId: player.telegramId,
    note: "follow-assist",
  });

  await prisma.$transaction([
    prisma.worldEvent.create({
      data: {
        type: "MOVE",
        title: FOLLOW_ASSIST_EVENT_TITLE,
        description: followRouteMemoryEventDescription({
          playerId: input.intent.playerId,
          targetType: input.target.type,
          targetId: input.target.id,
          fromLocationId: input.sourceLocationId,
          toLocationId: parsedMemory.toLocationId,
          direction: eligibility.direction,
          source: "visible_move",
          visibility: "clear",
          cooldownKey: eligibility.cooldownKey,
        }),
        playerId: input.intent.playerId,
        locationId: input.sourceLocationId,
      },
    }),
    prisma.playerFollowIntent.update({
      where: { playerId: input.intent.playerId },
      data: { lastAssistAt: new Date() },
    }),
  ]);

  await sendFollowRouteMemoryMessage(bot, player, followAssistQueuedText(eligibility.direction));
  return { ...eligibility, result };
}

export async function rememberFollowedTargetVisibleMove(bot: Bot, input: {
  sourceLocationId: number;
  destinationLocationId: number;
  direction: Direction;
  target: FollowRouteTarget;
}) {
  return withSlowLog("followRoute.visibleMove", () => rememberFollowedTargetVisibleMoveInner(bot, input));
}

async function rememberFollowedTargetVisibleMoveInner(bot: Bot, input: {
  sourceLocationId: number;
  destinationLocationId: number;
  direction: Direction;
  target: FollowRouteTarget;
}) {
  try {
    const followers = await followersForTargetAtLocation(input.sourceLocationId, input.target);
    if (!followers.length) return 0;

    const visibility = await visibilityRulesForLocation(input.sourceLocationId, "brief");
    const kind = followRouteMemoryKind({
      exitVisible: true,
      targetVisible: input.target.visible !== false,
      showTracks: visibility.showTracks,
    });
    if (kind === "none") return 0;

    for (const intent of followers) {
      try {
        const label = input.target.label || intent.lastKnownTargetLabel || "хтось";
        const cooldownKey = followRouteMemoryCooldownKey({
          playerId: intent.playerId,
          targetType: input.target.type,
          targetId: input.target.id,
          fromLocationId: input.sourceLocationId,
          direction: input.direction,
          source: "visible_move",
        });
        const learningKey = followRouteLearningCooldownKey({
          playerId: intent.playerId,
          targetType: input.target.type,
          targetId: input.target.id,
        });
        const shouldNotify = !(await hasRecentFollowRouteMemoryMarker({
          title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
          playerId: intent.playerId,
          markerName: "cooldownKey",
          markerValue: cooldownKey,
          cooldownMs: FOLLOW_ROUTE_VISIBLE_HINT_COOLDOWN_MS,
        }));
        const shouldLearn = kind === "clear" && !(await hasRecentFollowRouteMemoryMarker({
          title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
          playerId: intent.playerId,
          markerName: "learningKey",
          markerValue: learningKey,
          cooldownMs: FOLLOW_ROUTE_LEARNING_COOLDOWN_MS,
        }));

        await prisma.playerFollowIntent.update({
          where: { playerId: intent.playerId },
          data: {
            lastSeenLocationId: kind === "clear" ? input.destinationLocationId : input.sourceLocationId,
            lastKnownTargetLabel: label,
          },
        });

        const shouldAssist = Boolean(intent.assistEnabled && kind === "clear");
        if (!shouldNotify && !shouldLearn && !shouldAssist) continue;

        const event = await prisma.worldEvent.create({
          data: {
            type: "MOVE",
            title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
            description: followRouteMemoryEventDescription({
              playerId: intent.playerId,
              targetType: input.target.type,
              targetId: input.target.id,
              fromLocationId: input.sourceLocationId,
              toLocationId: input.destinationLocationId,
              direction: input.direction,
              source: "visible_move",
              visibility: kind,
              cooldownKey: shouldNotify ? cooldownKey : null,
              learningKey: shouldLearn ? learningKey : null,
            }),
            playerId: intent.playerId,
            locationId: input.sourceLocationId,
          },
        });
        if (shouldLearn) {
          await recordLearningProgress({
            playerId: intent.playerId,
            skillKey: "tracking",
            sourceKey: "observation",
            contextKey: "followed_movement",
            amount: 1,
            lastSourceEventId: event.id,
          });
        }
        if (shouldNotify) {
          await sendFollowRouteMemoryMessage(bot, intent.player, followedRouteMemoryText({
            label,
            direction: input.direction,
            kind,
          }));
        }
        if (shouldAssist) {
          await maybeQueueFollowAssistMove(bot, {
            intent,
            event,
            sourceLocationId: input.sourceLocationId,
            target: input.target,
            direction: input.direction,
          });
        }
      } catch (error) {
        console.warn("Failed to record follow route memory:", error);
      }
    }

    return followers.length;
  } catch (error) {
    console.warn("Failed to inspect follow route memory:", error);
    return 0;
  }
}

export async function rememberFollowedTargetHiddenRoute(bot: Bot, input: {
  sourceLocationId: number;
  destinationLocationId?: number | null;
  target: FollowRouteTarget;
}) {
  return withSlowLog("followRoute.hiddenRoute", () => rememberFollowedTargetHiddenRouteInner(bot, input));
}

async function rememberFollowedTargetHiddenRouteInner(bot: Bot, input: {
  sourceLocationId: number;
  destinationLocationId?: number | null;
  target: FollowRouteTarget;
}) {
  try {
    const followers = await followersForTargetAtLocation(input.sourceLocationId, input.target);
    if (!followers.length) return 0;

    for (const intent of followers) {
      try {
        const label = input.target.label || intent.lastKnownTargetLabel || "хтось";
        const cooldownKey = followRouteMemoryCooldownKey({
          playerId: intent.playerId,
          targetType: input.target.type,
          targetId: input.target.id,
          fromLocationId: input.sourceLocationId,
          source: "hidden_route",
        });
        const shouldNotify = !(await hasRecentFollowRouteMemoryMarker({
          title: FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE,
          playerId: intent.playerId,
          markerName: "cooldownKey",
          markerValue: cooldownKey,
          cooldownMs: FOLLOW_ROUTE_HIDDEN_HINT_COOLDOWN_MS,
        }));

        await prisma.playerFollowIntent.update({
          where: { playerId: intent.playerId },
          data: {
            lastSeenLocationId: input.sourceLocationId,
            lastKnownTargetLabel: label,
          },
        });
        if (!shouldNotify) continue;

        await prisma.worldEvent.create({
          data: {
            type: "MOVE",
            title: FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE,
            description: followRouteMemoryEventDescription({
              playerId: intent.playerId,
              targetType: input.target.type,
              targetId: input.target.id,
              fromLocationId: input.sourceLocationId,
              toLocationId: input.destinationLocationId,
              source: "hidden_route",
              visibility: "hidden",
              cooldownKey,
            }),
            playerId: intent.playerId,
            locationId: input.sourceLocationId,
          },
        });
        await sendFollowRouteMemoryMessage(bot, intent.player, followedHiddenRouteMemoryText());
      } catch (error) {
        console.warn("Failed to record hidden follow route memory:", error);
      }
    }

    return followers.length;
  } catch (error) {
    console.warn("Failed to inspect hidden follow route memory:", error);
    return 0;
  }
}
