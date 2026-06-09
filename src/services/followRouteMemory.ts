import type { Bot } from "grammy";
import { PlayerPosture, PlayerSleepState, type Direction } from "@prisma/client";
import { prisma } from "../db";
import { directionLabels } from "../ui/labels";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { escapeHtml } from "../utils/text";
import { safeSendMessage } from "../utils/telegram";
import { withSlowLog } from "../utils/slowLog";
import { canSendProactiveToPlayerId, canSendProactiveToTelegramId } from "./sessionPresence";
import { visibilityRulesForLocation } from "./visibility";
import { recordLearningProgress } from "./learning";
import { FOLLOW_TARGET_CREATURE, FOLLOW_TARGET_PLAYER, type FollowTargetType } from "./following";
import { movementDurationMs } from "./actionRules";
import { performOrQueuePlayerAction } from "./actionLifecycle";
import { locationLockedExitMessageForPlayer } from "./tutorial";
import { maybeRecordMentorshipLessonFeedback, mentorshipTrackingObservationLearningInput } from "./mentorship";
import { createWorldEventMarker, hasRecentWorldEventMarker, recordWorldEventMarkerIfAbsent } from "./worldEventMarkers";
import { hasActiveLitTorchForPlayer } from "./fire";

export const FOLLOW_ROUTE_MEMORY_EVENT_TITLE = "Follow intent route memory";
export const FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE = "Follow intent hidden route memory";
export const FOLLOW_ROUTE_VISIBLE_HINT_COOLDOWN_MS = Number(process.env.FOLLOW_ROUTE_VISIBLE_HINT_COOLDOWN_MS || 90_000);
export const FOLLOW_ROUTE_HIDDEN_HINT_COOLDOWN_MS = Number(process.env.FOLLOW_ROUTE_HIDDEN_HINT_COOLDOWN_MS || 5 * 60_000);
export const FOLLOW_ROUTE_LEARNING_COOLDOWN_MS = Number(process.env.FOLLOW_ROUTE_LEARNING_COOLDOWN_MS || 5 * 60_000);
export const FOLLOW_ROUTE_STEP_MEMORY_TTL_MS = Number(process.env.FOLLOW_ROUTE_STEP_MEMORY_TTL_MS || 10 * 60_000);
export const FOLLOW_ASSIST_EVENT_TITLE = "Follow assist queued move";
export const FOLLOW_ASSIST_MARKER_KEY = "follow_assist_queued_move";
export const FOLLOW_ASSIST_FAILURE_MARKER_KEY = "follow_assist_failure";
export const FOLLOW_ASSIST_COOLDOWN_MS = Number(process.env.FOLLOW_ASSIST_COOLDOWN_MS || 90_000);
export const FOLLOW_ASSIST_FAILURE_HINT_COOLDOWN_MS = Number(process.env.FOLLOW_ASSIST_FAILURE_HINT_COOLDOWN_MS || 90_000);
export const FOLLOW_ASSIST_STEP_NOTE = "follow-assist";
export const FOLLOW_ASSIST_CATCH_UP_NOTE = "follow-assist:catch-up";
const FOLLOW_ASSIST_CATCH_UP_EVENT_TAKE = Number(process.env.FOLLOW_ASSIST_CATCH_UP_EVENT_TAKE || 20);

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
  playerHasLight?: boolean | null;
}) {
  if (!input.exitVisible || input.targetVisible === false) return "none" as const;
  return input.showTracks || input.playerHasLight ? "clear" as const : "dark" as const;
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

export function followAssistEventDescription(input: Parameters<typeof followRouteMemoryEventDescription>[0] & {
  assistKind: "same_room" | "catch_up";
  note: string;
}) {
  return [
    followRouteMemoryEventDescription(input),
    `assistKind=${input.assistKind}`,
    `note=${input.note}`,
  ].join("; ");
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

export function followAssistFailureCooldownKey(input: {
  playerId: number;
  targetType: FollowTargetType;
  targetId: number;
  fromLocationId: number;
  reason: FollowAssistFailureReason;
  direction?: Direction | string | null;
}) {
  return [
    "follow_assist_failure",
    `player_${input.playerId}`,
    `target_${input.targetType}_${input.targetId}`,
    `from_${input.fromLocationId}`,
    `reason_${input.reason}`,
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
  playerHasLight?: boolean | null;
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
  if (parsed.visibility !== "clear" && !(parsed.visibility === "dark" && input.playerHasLight)) {
    return { ok: false, reason: "dark" };
  }
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
  playerHasLight?: boolean | null;
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
    playerHasLight: input.playerHasLight,
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

export function followAssistQueuedText(direction: Direction, targetLabel?: string | null) {
  const label = String(directionLabels[direction] ?? direction).toLocaleLowerCase("uk-UA");
  const phrase = ["UP", "DOWN", "INSIDE", "OUTSIDE"].includes(direction) ? label : `на ${label}`;
  const target = targetLabel?.trim();
  if (target) return `Ви трималися чужого сліду: ${escapeHtml(target)} рушає ${phrase}. Слідова підмога підхоплює цей рух.`;
  return `Ви підхоплюєте чужий крок: ${phrase}.`;
}

export function followAssistCatchUpQueuedText(direction: Direction) {
  const label = String(directionLabels[direction] ?? direction).toLocaleLowerCase("uk-UA");
  const phrase = ["UP", "DOWN", "INSIDE", "OUTSIDE"].includes(direction) ? label : `на ${label}`;
  return `Слідова підмога не губить слід: далі ${phrase}.`;
}

export function followAssistFailureText(reason: FollowAssistFailureReason) {
  if (reason === "hidden") return "Чужий слід зник не кроком. Слідова підмога мовчить.";
  if (reason === "dark") return "Темрява забрала напрям. Слідова підмога не знає, куди йти.";
  if (reason === "no-direction") return "У сліді не лишилося ясного напряму. Слідова підмога не знає, куди йти.";
  if (reason === "busy") return "Ви вже зайняті іншим кроком. Слідова підмога не втручається.";
  if (reason === "resting" || reason === "incapacitated") return "Тіло не підхоплює чужий крок просто зараз.";
  if (reason === "no-stamina") return "Снаги не стає на слідову підмогу.";
  if (reason === "no-visible-exit") return "Слідова підмога пам'ятає напрям, але звичайна стежка тут не відкривається.";
  return "Слідова підмога не знаходить ясного руху.";
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
  const parsed = parseFollowRouteMemoryEventDescription(event?.description);
  const playerHasLight = parsed.visibility === "dark" ? await hasActiveLitTorchForPlayer(playerId) : false;
  const evaluated = evaluateFollowRouteMemoryForStep({
    intent,
    currentLocationId: player?.currentLocationId,
    event,
    playerHasLight,
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

async function assistFollowersExpectingTargetAtLocation(sourceLocationId: number, target: FollowRouteTarget) {
  return prisma.playerFollowIntent.findMany({
    where: {
      targetType: target.type,
      ...(target.type === FOLLOW_TARGET_PLAYER ? { targetPlayerId: target.id } : { targetCreatureId: target.id }),
      assistEnabled: true,
      lastSeenLocationId: sourceLocationId,
      player: {
        currentLocationId: { not: sourceLocationId },
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

async function hasRecentFollowAssistMarker(input: {
  playerId: number;
  targetType: FollowTargetType;
  targetId: number;
  locationId: number;
  cooldownKey: string;
}) {
  if (FOLLOW_ASSIST_COOLDOWN_MS <= 0) return false;
  return hasRecentWorldEventMarker({
    markerKey: FOLLOW_ASSIST_MARKER_KEY,
    scopeType: "PLAYER_TARGET",
    playerId: input.playerId,
    targetType: input.targetType,
    targetId: input.targetId,
    locationId: input.locationId,
    contextKey: input.cooldownKey,
    cooldownMs: FOLLOW_ASSIST_COOLDOWN_MS,
  });
}

async function hasRecentFollowAssistFailureMarker(input: {
  playerId: number;
  targetType: FollowTargetType;
  targetId: number;
  locationId: number;
  failureKey: string;
}) {
  if (FOLLOW_ASSIST_FAILURE_HINT_COOLDOWN_MS <= 0) return false;
  return hasRecentWorldEventMarker({
    markerKey: FOLLOW_ASSIST_FAILURE_MARKER_KEY,
    scopeType: "PLAYER_TARGET",
    playerId: input.playerId,
    targetType: input.targetType,
    targetId: input.targetId,
    locationId: input.locationId,
    contextKey: input.failureKey,
    cooldownMs: FOLLOW_ASSIST_FAILURE_HINT_COOLDOWN_MS,
  });
}

export async function hasBlockingPlayerActionsForFollowAssist(playerId: number) {
  return prisma.worldAction.count({
    where: { actorType: "PLAYER", playerId, status: { in: ["QUEUED", "RUNNING"] } },
  });
}

function shouldSendFollowAssistFailureHint(reason: FollowAssistFailureReason) {
  return ["busy", "no-stamina", "dark", "hidden", "no-visible-exit", "resting", "incapacitated"].includes(reason);
}

async function maybeSendFollowAssistFailureHint(bot: Bot, input: {
  intent: Awaited<ReturnType<typeof followersForTargetAtLocation>>[number];
  target: FollowRouteTarget;
  sourceLocationId: number;
  reason: FollowAssistFailureReason;
  direction?: Direction | null;
}) {
  if (!shouldSendFollowAssistFailureHint(input.reason)) return false;
  const failureKey = followAssistFailureCooldownKey({
    playerId: input.intent.playerId,
    targetType: input.target.type,
    targetId: input.target.id,
    fromLocationId: input.sourceLocationId,
    reason: input.reason,
    direction: input.direction,
  });
  if (await hasRecentFollowAssistFailureMarker({
    playerId: input.intent.playerId,
    targetType: input.target.type,
    targetId: input.target.id,
    locationId: input.sourceLocationId,
    failureKey,
  })) return false;
  const marker = await recordWorldEventMarkerIfAbsent({
    markerKey: FOLLOW_ASSIST_FAILURE_MARKER_KEY,
    scopeType: "PLAYER_TARGET",
    playerId: input.intent.playerId,
    targetType: input.target.type,
    targetId: input.target.id,
    locationId: input.sourceLocationId,
    contextKey: failureKey,
    cooldownMs: FOLLOW_ASSIST_FAILURE_HINT_COOLDOWN_MS,
    ttlMs: FOLLOW_ASSIST_FAILURE_HINT_COOLDOWN_MS,
    metadata: {
      reason: input.reason,
      direction: input.direction ?? null,
    },
  });
  if (!marker.created) return false;
  await prisma.worldEvent.create({
    data: {
      type: "MOVE",
      title: FOLLOW_ASSIST_EVENT_TITLE,
      description: [
        `playerId=${input.intent.playerId}`,
        `targetType=${input.target.type}`,
        `targetId=${input.target.id}`,
        `from=${input.sourceLocationId}`,
        input.direction ? `direction=${input.direction}` : null,
        `reason=${input.reason}`,
        `failureKey=${failureKey}`,
      ].filter(Boolean).join("; "),
      playerId: input.intent.playerId,
      locationId: input.sourceLocationId,
    },
  });
  await sendFollowRouteMemoryMessage(bot, input.intent.player, followAssistFailureText(input.reason));
  return true;
}

async function maybeQueueFollowAssistMove(bot: Bot, input: {
  intent: Awaited<ReturnType<typeof followersForTargetAtLocation>>[number];
  event: { title: string; description: string | null; createdAt: Date };
  sourceLocationId: number;
  target: FollowRouteTarget;
  direction: Direction;
  successText?: string;
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
    hasBlockingPlayerActionsForFollowAssist(input.intent.playerId),
    prisma.locationExit.findUnique({
      where: { fromLocationId_direction: { fromLocationId: input.sourceLocationId, direction: input.direction } },
      select: { id: true, isHidden: true, travelCost: true },
    }),
    locationLockedExitMessageForPlayer(input.intent.playerId, input.sourceLocationId, input.direction),
    hasRecentFollowAssistMarker({
      playerId: input.intent.playerId,
      targetType: input.target.type,
      targetId: input.target.id,
      locationId: input.sourceLocationId,
      cooldownKey: preliminaryCooldownKey,
    }),
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
  if (!eligibility.ok) {
    const hinted = await maybeSendFollowAssistFailureHint(bot, {
      intent: input.intent,
      target: input.target,
      sourceLocationId: input.sourceLocationId,
      reason: eligibility.reason,
      direction: input.direction,
    });
    return { ...eligibility, hinted };
  }
  const parsedMemory = parseFollowRouteMemoryEventDescription(input.event.description);

  const result = await performOrQueuePlayerAction(bot, {
    playerId: input.intent.playerId,
    type: "MOVE",
    payload: { direction: eligibility.direction },
    durationMs: movementDurationMs(exit?.travelCost, player.stamina),
    chatId: player.telegramId,
    note: FOLLOW_ASSIST_STEP_NOTE,
  });

  const auditEvent = await prisma.$transaction(async (tx) => {
    const auditEvent = await tx.worldEvent.create({
      data: {
        type: "MOVE",
        title: FOLLOW_ASSIST_EVENT_TITLE,
        description: followAssistEventDescription({
          playerId: input.intent.playerId,
          targetType: input.target.type,
          targetId: input.target.id,
          fromLocationId: input.sourceLocationId,
          toLocationId: parsedMemory.toLocationId,
          direction: eligibility.direction,
          source: "visible_move",
          visibility: "clear",
          cooldownKey: eligibility.cooldownKey,
          assistKind: "same_room",
          note: FOLLOW_ASSIST_STEP_NOTE,
        }),
        playerId: input.intent.playerId,
        locationId: input.sourceLocationId,
      },
    });
    await createWorldEventMarker({
      markerKey: FOLLOW_ASSIST_MARKER_KEY,
      scopeType: "PLAYER_TARGET",
      playerId: input.intent.playerId,
      targetType: input.target.type,
      targetId: input.target.id,
      locationId: input.sourceLocationId,
      contextKey: eligibility.cooldownKey,
      worldEventId: auditEvent.id,
      ttlMs: FOLLOW_ASSIST_COOLDOWN_MS,
      metadata: {
        assistKind: "same_room",
        note: FOLLOW_ASSIST_STEP_NOTE,
        direction: eligibility.direction,
      },
    }, tx as any);
    await tx.playerFollowIntent.update({
      where: { playerId: input.intent.playerId },
      data: { lastAssistAt: new Date() },
    });
    return auditEvent;
  });

  await sendFollowRouteMemoryMessage(bot, player, input.successText ?? followAssistQueuedText(eligibility.direction));
  return { ...eligibility, result, event: auditEvent };
}

async function latestFollowRouteMemoryForCatchUp(playerId: number, currentLocationId: number) {
  const ttlMs = FOLLOW_ROUTE_STEP_MEMORY_TTL_MS;
  const since = new Date(Date.now() - ttlMs);
  const events = await prisma.worldEvent.findMany({
    where: {
      playerId,
      title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
      createdAt: { gte: since },
    },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: Math.max(1, Math.min(50, FOLLOW_ASSIST_CATCH_UP_EVENT_TAKE)),
  });
  return events.find((event) => {
    const parsed = parseFollowRouteMemoryEventDescription(event.description);
    return parsed.source === "visible_move" && parsed.fromLocationId === currentLocationId;
  }) ?? null;
}

export async function maybeQueueFollowAssistCatchUp(bot: Bot, input: {
  playerId: number;
}) {
  return withSlowLog("followAssist.catchUp", () => maybeQueueFollowAssistCatchUpInner(bot, input));
}

async function maybeQueueFollowAssistCatchUpInner(bot: Bot, input: {
  playerId: number;
}) {
  if (!(await canSendProactiveToPlayerId(input.playerId))) return { ok: false as const, reason: "incapacitated" as const };

  const [player, intent] = await Promise.all([
    prisma.player.findUnique({ where: { id: input.playerId } }),
    prisma.playerFollowIntent.findUnique({ where: { playerId: input.playerId } }),
  ]);
  if (!player?.currentLocationId || !intent?.assistEnabled || !intent.targetType) {
    return { ok: false as const, reason: "assist-disabled" as const };
  }

  const event = await latestFollowRouteMemoryForCatchUp(input.playerId, player.currentLocationId);
  const parsed = event ? parseFollowRouteMemoryEventDescription(event.description) : {};
  const target: FollowRouteTarget | null = intent.targetType === FOLLOW_TARGET_PLAYER && intent.targetPlayerId
    ? { type: FOLLOW_TARGET_PLAYER, id: intent.targetPlayerId, label: intent.lastKnownTargetLabel ?? "хтось" }
    : intent.targetType === FOLLOW_TARGET_CREATURE && intent.targetCreatureId
      ? { type: FOLLOW_TARGET_CREATURE, id: intent.targetCreatureId, label: intent.lastKnownTargetLabel ?? "хтось" }
      : null;
  if (!target) return { ok: false as const, reason: "wrong-target" as const };

  const preliminaryDirection = parsed.direction;
  const preliminaryCooldownKey = preliminaryDirection ? followAssistCooldownKey({
    playerId: input.playerId,
    targetType: target.type,
    targetId: target.id,
    fromLocationId: player.currentLocationId,
    direction: preliminaryDirection,
  }) : null;

  const [activeActionCount, exit, lockedMessage, hasRecentAssist] = await Promise.all([
    hasBlockingPlayerActionsForFollowAssist(input.playerId),
    preliminaryDirection
      ? prisma.locationExit.findUnique({
        where: { fromLocationId_direction: { fromLocationId: player.currentLocationId, direction: preliminaryDirection } },
        select: { id: true, isHidden: true, travelCost: true },
      })
      : Promise.resolve(null),
    preliminaryDirection ? locationLockedExitMessageForPlayer(input.playerId, player.currentLocationId, preliminaryDirection) : Promise.resolve(null),
    preliminaryCooldownKey ? hasRecentFollowAssistMarker({
      playerId: input.playerId,
      targetType: target.type,
      targetId: target.id,
      locationId: player.currentLocationId,
      cooldownKey: preliminaryCooldownKey,
    }) : Promise.resolve(false),
  ]);
  const playerHasLight = parsed.visibility === "dark" ? await hasActiveLitTorchForPlayer(input.playerId) : false;

  const eligibility = evaluateFollowAssistEligibility({
    intent,
    currentLocationId: player.currentLocationId,
    event,
    player,
    activeActionCount,
    hasVisibleExit: Boolean(exit && !exit.isHidden),
    locked: Boolean(lockedMessage),
    hasRecentAssist,
    playerHasLight,
  });
  if (!eligibility.ok) {
    await maybeSendFollowAssistFailureHint(bot, {
      intent: { ...intent, player },
      target,
      sourceLocationId: player.currentLocationId,
      reason: eligibility.reason,
      direction: preliminaryDirection,
    });
    return eligibility;
  }

  const result = await performOrQueuePlayerAction(bot, {
    playerId: input.playerId,
    type: "MOVE",
    payload: { direction: eligibility.direction },
    durationMs: movementDurationMs(exit?.travelCost, player.stamina),
    chatId: player.telegramId,
    note: FOLLOW_ASSIST_CATCH_UP_NOTE,
  });

  const auditEvent = await prisma.$transaction(async (tx) => {
    const auditEvent = await tx.worldEvent.create({
      data: {
        type: "MOVE",
        title: FOLLOW_ASSIST_EVENT_TITLE,
        description: followAssistEventDescription({
          playerId: input.playerId,
          targetType: target.type,
          targetId: target.id,
          fromLocationId: player.currentLocationId!,
          toLocationId: parsed.toLocationId,
          direction: eligibility.direction,
          source: "visible_move",
          visibility: "clear",
          cooldownKey: eligibility.cooldownKey,
          assistKind: "catch_up",
          note: FOLLOW_ASSIST_CATCH_UP_NOTE,
        }),
        playerId: input.playerId,
        locationId: player.currentLocationId,
      },
    });
    await createWorldEventMarker({
      markerKey: FOLLOW_ASSIST_MARKER_KEY,
      scopeType: "PLAYER_TARGET",
      playerId: input.playerId,
      targetType: target.type,
      targetId: target.id,
      locationId: player.currentLocationId!,
      contextKey: eligibility.cooldownKey,
      worldEventId: auditEvent.id,
      ttlMs: FOLLOW_ASSIST_COOLDOWN_MS,
      metadata: {
        assistKind: "catch_up",
        note: FOLLOW_ASSIST_CATCH_UP_NOTE,
        direction: eligibility.direction,
      },
    }, tx as any);
    await tx.playerFollowIntent.update({
      where: { playerId: input.playerId },
      data: { lastAssistAt: new Date() },
    });
    return auditEvent;
  });

  await sendFollowRouteMemoryMessage(bot, player, followAssistCatchUpQueuedText(eligibility.direction));
  return { ...eligibility, result, event: auditEvent };
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
    const [presentFollowers, expectedFollowers] = await Promise.all([
      followersForTargetAtLocation(input.sourceLocationId, input.target),
      assistFollowersExpectingTargetAtLocation(input.sourceLocationId, input.target),
    ]);
    const followers = [
      ...presentFollowers.map((intent) => ({ intent, present: true })),
      ...expectedFollowers
        .filter((intent) => !presentFollowers.some((present) => present.playerId === intent.playerId))
        .map((intent) => ({ intent, present: false })),
    ];
    if (!followers.length) return 0;

    const visibility = await visibilityRulesForLocation(input.sourceLocationId, "brief");
    if (input.target.visible === false) return 0;

    for (const follower of followers) {
      try {
        const { intent, present } = follower;
        const playerHasLight = visibility.showTracks ? false : await hasActiveLitTorchForPlayer(intent.playerId);
        const kind = followRouteMemoryKind({
          exitVisible: true,
          targetVisible: true,
          showTracks: visibility.showTracks,
          playerHasLight,
        });
        if (kind === "none") continue;
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
        const shouldNotify = present && !(await hasRecentFollowRouteMemoryMarker({
          title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
          playerId: intent.playerId,
          markerName: "cooldownKey",
          markerValue: cooldownKey,
          cooldownMs: FOLLOW_ROUTE_VISIBLE_HINT_COOLDOWN_MS,
        }));
        const shouldLearn = present && kind === "clear" && !(await hasRecentFollowRouteMemoryMarker({
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

        const shouldAssist = Boolean(present && intent.assistEnabled);
        const shouldRecordCatchUpMemory = Boolean(!present && intent.assistEnabled);
        if (!shouldNotify && !shouldLearn && !shouldAssist && !shouldRecordCatchUpMemory) continue;

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
          const mentorshipLearningInput = await mentorshipTrackingObservationLearningInput({
            playerId: intent.playerId,
            sourceEventId: event.id,
            targetType: input.target.type,
            targetId: input.target.id,
            source: "visible_move",
            visibility: kind,
          });
          if (mentorshipLearningInput) {
            await recordLearningProgress(mentorshipLearningInput);
            if (input.target.type === FOLLOW_TARGET_CREATURE) {
              const lesson = await maybeRecordMentorshipLessonFeedback({
                playerId: intent.playerId,
                mentorCreatureId: input.target.id,
                skillKey: "tracking",
                contextKey: mentorshipLearningInput.contextKey,
                locationId: input.sourceLocationId,
                mentorName: label,
              });
              if (lesson.ok && present) {
                await sendFollowRouteMemoryMessage(bot, intent.player, lesson.text);
              }
            }
          }
        }
        let assistResult: Awaited<ReturnType<typeof maybeQueueFollowAssistMove>> | null = null;
        if (shouldAssist) {
          assistResult = await maybeQueueFollowAssistMove(bot, {
            intent,
            event,
            sourceLocationId: input.sourceLocationId,
            target: input.target,
            direction: input.direction,
            successText: followAssistQueuedText(input.direction, label),
          });
        }
        const shouldSuppressRouteHint = Boolean(assistResult?.ok || (assistResult && !assistResult.ok && (assistResult.hinted || ["dark", "hidden"].includes(assistResult.reason))));
        if (shouldNotify && !shouldSuppressRouteHint) {
          await sendFollowRouteMemoryMessage(bot, intent.player, followedRouteMemoryText({
            label,
            direction: input.direction,
            kind,
          }));
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
        if (intent.assistEnabled) {
          await maybeSendFollowAssistFailureHint(bot, {
            intent,
            target: input.target,
            sourceLocationId: input.sourceLocationId,
            reason: "hidden",
          });
        } else {
          await sendFollowRouteMemoryMessage(bot, intent.player, followedHiddenRouteMemoryText());
        }
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
