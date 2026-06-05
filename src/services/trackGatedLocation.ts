import type { Bot } from "grammy";
import { PlayerSleepState } from "@prisma/client";
import { prisma } from "../db";
import { escapeHtml } from "../utils/text";
import { playerForms } from "./grammar";
import { notifyLocationExcept } from "./notifications";
import { assertCanPerformPhysicalAction } from "./postureRules";
import { visibilityRulesForLocation } from "./visibility";
import {
  evaluateFollowRouteMemoryForStep,
  FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE,
  FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
  FOLLOW_ROUTE_STEP_MEMORY_TTL_MS,
  latestFollowRouteMemoryForPlayer,
} from "./followRouteMemory";
import { recordTrackingPractice, TRACKING_PRACTICE_CONTEXT_TRACK_GATE } from "./trackingLearning";

export const TRACK_GATE_FEATURE_KEY = "meadow_16_05_animal_run";
export const TRACK_GATE_SOURCE_KEY = "meadow_16_05";
export const TRACK_GATE_DESTINATION_KEY = "meadow_16_05_grass_run";
export const TRACK_GATE_EVENT_TITLE = "Track-gated grass run passage";
export const TRACK_GATE_MEMORY_TTL_MS = Number(process.env.TRACK_GATE_MEMORY_TTL_MS || FOLLOW_ROUTE_STEP_MEMORY_TTL_MS);

type TrackGateFeature = {
  key?: string | null;
  data?: unknown | null;
};

function featureData(feature: TrackGateFeature) {
  return feature.data && typeof feature.data === "object" && !Array.isArray(feature.data)
    ? feature.data as Record<string, unknown>
    : {};
}

export function isTrackGateFeature(feature: TrackGateFeature) {
  return feature.key === TRACK_GATE_FEATURE_KEY
    || featureData(feature).attention_gate === "fresh_tracks";
}

export function trackGateDarkOutline() {
  return "у траві є прим’ята смуга, але без свіжого сліду вона не стає шляхом";
}

export function trackGateDarkInspectionText() {
  return [
    "🐾 <i>Прим’ята трава</i>",
    "",
    "У траві є прим’ята смуга, але без свіжого сліду вона нічим не краща за випадковий вітер. Тут можна дивитися під ноги, та дорога ще не відповідає.",
  ].join("\n");
}

export function trackGateRevealText(kind: "tracks" | "follow-memory" | "either" = "either") {
  const lead = kind === "follow-memory"
    ? "Ви ще тримаєте в увазі чужий рух. Там, де він ніби зник зі стежки, трава не зімкнулася до кінця."
    : "Слід не йде далі відкритою стежкою. Він ковзає низько під траву, туди, де людина пройде тільки боком і дуже повільно.";
  return [
    lead,
    "",
    "Це не сховище й не нова дорога для поспіху. Якщо пройти за слідом обережно, низький лаз виведе у тиху смугу під травою.",
  ].join("\n");
}

export function trackGateButtonLabel() {
  return "🐾 Пройти за слідом";
}

export type TrackGateRevealReason = "tracks" | "follow-memory";

export function canRevealTrackGate(input: {
  hasFreshVisibleTrack?: boolean;
  hasFreshFollowRouteMemory?: boolean;
  hasHiddenRouteMemory?: boolean;
}) {
  if (input.hasHiddenRouteMemory && !input.hasFreshVisibleTrack && !input.hasFreshFollowRouteMemory) return false;
  return input.hasFreshVisibleTrack === true || input.hasFreshFollowRouteMemory === true;
}

export function trackGateRevealReason(input: {
  hasFreshVisibleTrack?: boolean;
  hasFreshFollowRouteMemory?: boolean;
}): TrackGateRevealReason | null {
  if (input.hasFreshFollowRouteMemory) return "follow-memory";
  if (input.hasFreshVisibleTrack) return "tracks";
  return null;
}

async function hasFreshVisibleTrackAtLocation(locationId: number, ttlMs = TRACK_GATE_MEMORY_TTL_MS) {
  const visibility = await visibilityRulesForLocation(locationId, "details");
  if (!visibility.showTracks) return false;
  const now = new Date();
  const since = new Date(now.getTime() - Math.max(1, ttlMs));
  const track = await prisma.worldTrack.findFirst({
    where: {
      expiresAt: { gt: now },
      createdAt: { gte: since },
      OR: [{ fromLocationId: locationId }, { toLocationId: locationId }],
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return Boolean(track);
}

async function followRouteMemoryRevealState(playerId: number, locationId: number) {
  const [intent, event] = await Promise.all([
    prisma.playerFollowIntent.findUnique({ where: { playerId } }),
    latestFollowRouteMemoryForPlayer(playerId),
  ]);
  if (!event) return { clear: false, hidden: false };
  if (event.title === FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE) return { clear: false, hidden: true };
  const evaluated = evaluateFollowRouteMemoryForStep({
    intent,
    currentLocationId: locationId,
    event,
    ttlMs: TRACK_GATE_MEMORY_TTL_MS,
  });
  return {
    clear: evaluated.ok && event.title === FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
    hidden: !evaluated.ok && evaluated.reason === "hidden",
  };
}

export async function trackGateRevealStateForPlayer(playerId: number, locationId: number) {
  const [hasFreshVisibleTrack, memory] = await Promise.all([
    hasFreshVisibleTrackAtLocation(locationId),
    followRouteMemoryRevealState(playerId, locationId),
  ]);
  const hasFreshFollowRouteMemory = memory.clear;
  const hasHiddenRouteMemory = memory.hidden;
  return {
    hasFreshVisibleTrack,
    hasFreshFollowRouteMemory,
    hasHiddenRouteMemory,
    canReveal: canRevealTrackGate({ hasFreshVisibleTrack, hasFreshFollowRouteMemory, hasHiddenRouteMemory }),
    reason: trackGateRevealReason({ hasFreshVisibleTrack, hasFreshFollowRouteMemory }),
  };
}

export async function canPlayerRevealTrackGate(playerId: number, locationId: number) {
  return (await trackGateRevealStateForPlayer(playerId, locationId)).canReveal;
}

export function trackGateUseDecision(input: {
  playerLocationId?: number | null;
  playerLocationKey?: string | null;
  feature?: (TrackGateFeature & { id: number; locationId: number; isActive?: boolean | null }) | null;
  hasFreshVisibleTrack?: boolean;
  hasFreshFollowRouteMemory?: boolean;
  hasHiddenRouteMemory?: boolean;
}) {
  if (!input.playerLocationId || input.playerLocationKey !== TRACK_GATE_SOURCE_KEY) {
    return { ok: false as const, reason: "wrong-location" as const };
  }

  const feature = input.feature;
  if (!feature || !feature.isActive || feature.locationId !== input.playerLocationId || !isTrackGateFeature(feature)) {
    return { ok: false as const, reason: "missing-feature" as const };
  }

  if (!canRevealTrackGate(input)) {
    return { ok: false as const, reason: "no-track" as const, featureId: feature.id };
  }

  return {
    ok: true as const,
    featureId: feature.id,
    revealReason: trackGateRevealReason(input) ?? "tracks",
  };
}

export function trackGateEventDescription(playerId: number, revealReason: TrackGateRevealReason) {
  return `player=${playerId}; source=${TRACK_GATE_SOURCE_KEY}; destination=${TRACK_GATE_DESTINATION_KEY}; feature=${TRACK_GATE_FEATURE_KEY}; gate=fresh_tracks; reveal=${revealReason}`;
}

export function trackGateFailureText(reason: "wrong-location" | "missing-feature" | "no-track") {
  if (reason === "no-track") {
    return "Ви бачите прим’яту траву, але не шлях. Спробуйте вистежити свіжий слід або повернутися, коли рух тут ще не охолов.";
  }
  if (reason === "wrong-location") return "Тут немає низького сліду, за яким можна було б пройти під травою.";
  return "Поруч не видно звірячого лазу, який можна пройти за свіжим слідом.";
}

export async function findLocalTrackGateFeature(playerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true },
  });
  if (!player?.currentLocationId) return null;
  return prisma.locationFeature.findFirst({
    where: {
      key: TRACK_GATE_FEATURE_KEY,
      locationId: player.currentLocationId,
      isActive: true,
    },
    orderBy: { id: "asc" },
  });
}

export async function trackGateCanBeUsedByPlayer(playerId: number, featureId?: number | null) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { currentLocation: { select: { id: true, key: true } } },
  });
  if (!player?.currentLocationId || player.currentLocation?.key !== TRACK_GATE_SOURCE_KEY) {
    return { ok: false as const, reason: "wrong-location" as const };
  }

  const feature = featureId
    ? await prisma.locationFeature.findUnique({ where: { id: featureId }, include: { location: true } })
    : await findLocalTrackGateFeature(player.id);
  const reveal = await trackGateRevealStateForPlayer(player.id, player.currentLocationId);
  const decision = trackGateUseDecision({
    playerLocationId: player.currentLocationId,
    playerLocationKey: player.currentLocation?.key,
    feature,
    ...reveal,
  });
  if (!decision.ok) return decision;

  return { ok: true as const, player, featureId: decision.featureId, revealReason: decision.revealReason };
}

export async function enterTrackGatedPassage(bot: Bot, input: {
  playerId: number;
  featureId?: number | null;
}) {
  const usable = await trackGateCanBeUsedByPlayer(input.playerId, input.featureId);
  if (!usable.ok) {
    return { ok: false as const, text: trackGateFailureText(usable.reason) };
  }

  const { player } = usable;
  assertCanPerformPhysicalAction(player, "MOVE");

  if ((player.hp ?? 0) <= 0 || player.sleepState !== PlayerSleepState.AWAKE) {
    return { ok: false as const, text: "Зараз тіло не відповідає на такий низький хід." };
  }

  const destination = await prisma.cellLocation.findUnique({
    where: { key: TRACK_GATE_DESTINATION_KEY },
    select: { id: true },
  });
  if (!destination) return { ok: false as const, text: "Слід є, але далі трава не тримає певного місця." };

  const sourceLocationId = player.currentLocationId;
  if (!sourceLocationId) {
    return { ok: false as const, text: "Слід на мить є, але ваш крок не знаходить його знову." };
  }

  const forms = playerForms(player);
  const moved = await prisma.$transaction(async (tx) => {
    const updated = await tx.player.updateMany({
      where: {
        id: player.id,
        currentLocationId: sourceLocationId,
        hp: { gt: 0 },
        isResting: false,
        sleepState: PlayerSleepState.AWAKE,
      },
      data: {
        currentLocationId: destination.id,
        steps: { increment: 1 },
        lastActionAt: new Date(),
        lastPlayerActionAt: new Date(),
      },
    });
    if (updated.count === 0) return false;

    await tx.worldEvent.create({
      data: {
        type: "PLAYER_ACTION",
        title: TRACK_GATE_EVENT_TITLE,
        description: trackGateEventDescription(player.id, usable.revealReason),
        playerId: player.id,
        locationId: sourceLocationId,
      },
    });
    return true;
  });
  if (!moved) return { ok: false as const, text: "Слід на мить є, але ваш крок не знаходить його знову." };
  await recordTrackingPractice({
    playerId: player.id,
    locationId: sourceLocationId,
    contextKey: TRACKING_PRACTICE_CONTEXT_TRACK_GATE,
  });

  await notifyLocationExcept(
    bot,
    sourceLocationId,
    [player.id],
    `${escapeHtml(forms.nominative)} пригинається до прим’ятої трави й зникає з відкритої стежки.`,
    { parseMode: "HTML" },
  );
  await notifyLocationExcept(
    bot,
    destination.id,
    [player.id],
    `${escapeHtml(forms.nominative)} повільно виходить із низької трави.`,
    { parseMode: "HTML" },
  );

  const text = "Ви йдете не дорогою, а слідом: пригинаєтеся нижче трави й повільно просуваєтесь боком.\n\nТут чути землю ближче, ніж небо. Низький лаз не веде до скарбів; він просто показує, що не кожна дорога любить бути дорогою.";
  return { ok: true as const, text, destinationLocationId: destination.id };
}
