import { Bot, InlineKeyboard } from "grammy";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { notifyLocationAll } from "./notifications";
import { canPickUpGroundItem } from "./groundItems";
import { canSendProactiveToTelegramId } from "./sessionPresence";
import { MINUTES_PER_WORLD_DAY } from "../data/worldClock";
import { ensureWorldState } from "./worldTime";
import { observedSendMessage } from "../utils/telegram";

export const CAMPFIRE_DURATION_MS = 16 * 60_000;
export const CAMPFIRE_FADING_MS = 4 * 60_000;
export const CAMPFIRE_TWIGS_AFTER_MS = 2 * 60_000;
export const CAMPFIRE_TWIGS_EXTENSION_MS = 4 * 60_000;
export const CAMPFIRE_BUILD_TWIG_COST = 5;
export const MAX_HANDMADE_CAMPFIRES_PER_LOCATION = 3;
export const WET_RIVER_CAMPFIRE_DURATION_MULTIPLIER = 0.3;
export const WET_SWAMP_CAMPFIRE_DURATION_MULTIPLIER = 0.2;
export const EXTINGUISHED_CAMPFIRE_DECAY_MINUTES = 2 * MINUTES_PER_WORLD_DAY;
export const EXTINGUISHED_CAMPFIRE_FADING_MINUTES = 2 * 60;
export const TORCH_DURATION_MS = 10 * 60_000;
export const TORCH_FADING_MS = 2 * 60_000;
export const MAX_LIT_TORCHES_IN_HANDS = 2;
export const TORCH_SOURCE_PLAYER_CARRY_LIMIT = 13;
export const TORCH_SOURCE_TAKE_WINDOW_MS = 13 * 60_000;
export const TORCH_SOURCE_TAKE_EVENT_TITLE = "Player took torch";
export const TORCH_FADING_WARNING_TEXT = "🔥 Ваш факел догорає: жар уже бере останню суху серцевину. Якщо маєте інший факел, підпаліть його від цього полум'я, поки воно ще живе; інакше доведеться шукати вогнище.";

const TORCH_KEY = "torch";
const LIT_TORCH_KEY = "lit_torch";
const DOUSED_TORCH_KEY = "doused_torch";
const TWIGS_KEY = "twigs";
const DOUSED_TORCH_TIMER_TITLE = "Doused torch timer";
const DOUSED_TORCH_CONSUMED_TITLE = "Doused torch timer consumed";
const OLD_CAMPFIRE_MEMORY_REVEALED_AT_KEY = "oldCampfireMemoryRevealedAt";
const OLD_CAMPFIRE_MEMORY_TEXT_KEY = "oldCampfireMemoryText";
const ASH_EXPIRES_AT_MINUTE_KEY = "ashExpiresAtMinute";
const ASH_FADING_AT_MINUTE_KEY = "ashFadingAtMinute";
const ASH_FADING_NOTIFIED_AT_MINUTE_KEY = "ashFadingNotifiedAtMinute";

export const OLD_CAMPFIRE_MEMORY_OMENS = [
  "Коли світло торкається каменів, у попелі проступає стара подряпина: три короткі риски й одна довга, спрямована в бік темного лісу.",
  "Жар піднімає з попелу запах мокрої вовни. Біля краю вогнища видно чужий слід, надто вузький для людської ноги.",
  "Полум'я на мить лягає набік, і під головешкою блимає обвуглений вузлик із сухої трави.",
] as const;

type JsonRecord = Record<string, unknown>;

function jsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function jsonInput(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function dateFromJson(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function numberFromJson(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.floor(number) : null;
}

function currentWorldMinuteFromData(data: unknown) {
  return numberFromJson(jsonRecord(data).absoluteMinute);
}

function withAshDecaySchedule(data: unknown, absoluteMinute?: number | null) {
  const current = jsonRecord(data);
  const baseMinute = absoluteMinute ?? currentWorldMinuteFromData(current);
  if (baseMinute == null) return current;
  const expiresAtMinute = baseMinute + EXTINGUISHED_CAMPFIRE_DECAY_MINUTES;
  return {
    ...current,
    [ASH_EXPIRES_AT_MINUTE_KEY]: expiresAtMinute,
    [ASH_FADING_AT_MINUTE_KEY]: expiresAtMinute - EXTINGUISHED_CAMPFIRE_FADING_MINUTES,
    [ASH_FADING_NOTIFIED_AT_MINUTE_KEY]: null,
  };
}

function withoutAshDecaySchedule(data: unknown) {
  const {
    [ASH_EXPIRES_AT_MINUTE_KEY]: _ashExpiresAtMinute,
    [ASH_FADING_AT_MINUTE_KEY]: _ashFadingAtMinute,
    [ASH_FADING_NOTIFIED_AT_MINUTE_KEY]: _ashFadingNotifiedAtMinute,
    ...rest
  } = jsonRecord(data);
  return rest;
}

function timedFireData(createdBy: string, durationMs = CAMPFIRE_DURATION_MS, debug = true) {
  const litAt = new Date();
  const expiresAt = new Date(litAt.getTime() + durationMs);
  return {
    debug,
    is_campfire: true,
    created_by: createdBy,
    magical: false,
    litAt: litAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    durationMs,
  };
}

function extinguishedFireData(data: unknown, absoluteMinute?: number | null) {
  const next = {
    ...jsonRecord(data),
    is_campfire: true,
    extinguished: true,
    extinguishedAt: new Date().toISOString(),
  };
  return jsonRecord(data).seeded === true ? next : withAshDecaySchedule(next, absoluteMinute);
}

function relitFireData(data: unknown, createdBy: string, durationMs = CAMPFIRE_DURATION_MS) {
  const current = jsonRecord(data);
  const base = timedFireData(createdBy, durationMs, current.handmade !== true);
  return {
    ...withoutAshDecaySchedule(current),
    ...base,
    extinguished: false,
    prepared: false,
    unlit: false,
    relitAt: base.litAt,
  };
}

function addTwigsToFireData(data: unknown, absoluteMinute?: number | null) {
  const current = jsonRecord(data);
  const next = {
    ...current,
    is_campfire: true,
    fuelTwigs: Number(current.fuelTwigs ?? 0) + 1,
    lastTwigsAddedAt: new Date().toISOString(),
  };
  return current.extinguished === true && current.seeded !== true ? withAshDecaySchedule(next, absoluteMinute) : next;
}

function stableIndex(value: string, modulo: number) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return hash % modulo;
}

export function canRevealOldCampfireMemory(feature: { key?: string | null; type?: string | null; data?: unknown | null }) {
  const data = jsonRecord(feature.data);
  return feature.type === "CAMPFIRE"
    && data.seeded === true
    && data.is_campfire === true
    && data[OLD_CAMPFIRE_MEMORY_REVEALED_AT_KEY] == null;
}

export function oldCampfireMemoryOmen(feature: { key?: string | null }) {
  const key = feature.key ?? "";
  return OLD_CAMPFIRE_MEMORY_OMENS[stableIndex(key, OLD_CAMPFIRE_MEMORY_OMENS.length)];
}

export function oldCampfireMemoryInspectionText(feature: { type?: string | null; data?: unknown | null }) {
  if (feature.type !== "CAMPFIRE") return null;
  const text = jsonRecord(feature.data)[OLD_CAMPFIRE_MEMORY_TEXT_KEY];
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

function withOldCampfireMemory(data: unknown, feature: { key?: string | null }, now = new Date()) {
  const omen = oldCampfireMemoryOmen(feature);
  return {
    ...jsonRecord(data),
    [OLD_CAMPFIRE_MEMORY_REVEALED_AT_KEY]: now.toISOString(),
    [OLD_CAMPFIRE_MEMORY_TEXT_KEY]: omen,
  };
}

function extendFireData(data: unknown, now = new Date()) {
  const current = jsonRecord(data);
  const currentExpiresAt = dateFromJson(current.expiresAt);
  const baseFrom = currentExpiresAt && currentExpiresAt.getTime() > now.getTime() ? currentExpiresAt : now;
  const cappedExpiresAt = new Date(Math.min(baseFrom.getTime() + CAMPFIRE_TWIGS_EXTENSION_MS, now.getTime() + CAMPFIRE_DURATION_MS));
  return {
    ...withoutAshDecaySchedule(addTwigsToFireData(current)),
    extinguished: false,
    expiresAt: cappedExpiresAt.toISOString(),
    durationMs: CAMPFIRE_DURATION_MS,
  };
}

function featureData(value: unknown): JsonRecord {
  return jsonRecord(value);
}

export function isHandmadeCampfire(feature: { type?: string | null; data?: unknown | null }) {
  const data = featureData(feature.data);
  return feature.type === "CAMPFIRE"
    && data.is_campfire === true
    && data.handmade === true
    && data.seeded !== true
    && data.magical !== true;
}

export function isPreparedCampfire(feature: { type?: string | null; data?: unknown | null; providesLight?: boolean | null }) {
  const data = featureData(feature.data);
  return isHandmadeCampfire(feature)
    && data.prepared === true
    && data.unlit === true
    && feature.providesLight !== true;
}

export function isDismantlableCampfire(feature: { type?: string | null; data?: unknown | null; providesLight?: boolean | null }) {
  if (!isHandmadeCampfire(feature)) return false;
  return isPreparedCampfire(feature) || isExtinguishedCampfire(feature);
}

export function isAdminDeletableCampfire(feature: { type?: string | null; data?: unknown | null }) {
  const data = featureData(feature.data);
  return feature.type === "CAMPFIRE" && data.magical !== true;
}

export function firstRelightableCampfireId(features: Array<{ id: number; type?: string | null; data?: unknown | null; providesLight?: boolean | null }>) {
  return features.find((feature) => isPreparedCampfire(feature) || isExtinguishedCampfire(feature))?.id ?? null;
}

export function adminHandmadeCampfireData(worldMinute: number | null | undefined) {
  return {
    is_campfire: true,
    magical: false,
    handmade: true,
    created_by: "addCampfire",
    prepared: true,
    unlit: true,
    fuelTwigs: CAMPFIRE_BUILD_TWIG_COST,
    builtAtMinute: worldMinute ?? null,
    adminCreated: true,
  };
}

export type CampfireIgnitionAtmosphereInput = {
  wasFirstActiveCampfire: boolean;
  hadLocalLightBefore: boolean;
};

export function campfireIgnitionAtmosphereText(input: CampfireIgnitionAtmosphereInput) {
  if (!input.wasFirstActiveCampfire) return "";
  const lines = [
    "Тепло розходиться місциною. Біля вогню стає затишніше: тут легше перепочити, а снагу можна відновлювати швидше й вище звичайної межі.",
  ];
  if (!input.hadLocalLightBefore) {
    lines.push("Світло відсуває темряву від землі й речей поруч. Те, що ховалося в тіні, тепер легше помітити.");
  }
  return lines.join("\n\n");
}

async function campfireIgnitionAtmosphereState(locationId: number) {
  const [hadLocalLightBefore, activeCampfireCount] = await Promise.all([
    hasActiveLightAtLocation(locationId),
    prisma.locationFeature.count({
      where: {
        locationId,
        isActive: true,
        providesLight: true,
        type: { in: ["CAMPFIRE", "MAGIC_CAMPFIRE"] },
      },
    }),
  ]);

  return {
    wasFirstActiveCampfire: activeCampfireCount === 0,
    hadLocalLightBefore,
  };
}

function appendCampfireIgnitionAtmosphere(base: string, atmosphereState: CampfireIgnitionAtmosphereInput, suffix?: string | null) {
  const atmosphere = campfireIgnitionAtmosphereText(atmosphereState);
  return [base, atmosphere, suffix].filter((part) => typeof part === "string" && part.trim().length > 0).join("\n\n");
}

export async function douseableHandmadeCampfireId(playerId: number) {
  await expireTimedCampfires();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) return null;

  const features = await prisma.locationFeature.findMany({
    where: {
      locationId: player.currentLocationId,
      isActive: true,
      type: "CAMPFIRE",
      providesLight: true,
    },
    select: { id: true, type: true, data: true, providesLight: true },
    orderBy: { id: "asc" },
  });

  const feature = features.find((item) => isHandmadeCampfire(item) && !isPreparedCampfire(item) && !isExtinguishedCampfire(item));
  return feature?.id ?? null;
}

export async function dismantlableHandmadeCampfireId(playerId: number) {
  await expireTimedCampfires();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) return null;

  const features = await prisma.locationFeature.findMany({
    where: {
      locationId: player.currentLocationId,
      isActive: true,
      type: "CAMPFIRE",
    },
    select: { id: true, type: true, data: true, providesLight: true },
    orderBy: { id: "asc" },
  });

  const feature = features.find((item) => isDismantlableCampfire(item));
  return feature?.id ?? null;
}

export function isWetCampfireLocation(location: { biome?: string | null } | null | undefined) {
  return location?.biome === "RIVER" || location?.biome === "SWAMP";
}

export function campfireDurationForLocation(location: { biome?: string | null } | null | undefined) {
  if (location?.biome === "SWAMP") return Math.max(1, Math.floor(CAMPFIRE_DURATION_MS * WET_SWAMP_CAMPFIRE_DURATION_MULTIPLIER));
  if (location?.biome === "RIVER") return Math.max(1, Math.floor(CAMPFIRE_DURATION_MS * WET_RIVER_CAMPFIRE_DURATION_MULTIPLIER));
  return CAMPFIRE_DURATION_MS;
}

export function handmadeCampfireCount(features: Array<{ type?: string | null; isActive?: boolean | null; data?: unknown | null }>) {
  return features.filter((feature) => feature.isActive !== false && isHandmadeCampfire(feature)).length;
}

export function canBuildAnotherHandmadeCampfire(features: Array<{ type?: string | null; isActive?: boolean | null; data?: unknown | null }>) {
  return handmadeCampfireCount(features) < MAX_HANDMADE_CAMPFIRES_PER_LOCATION;
}

export function campfireRecoveredTwigs(
  feature: { type?: string | null; data?: unknown | null; providesLight?: boolean | null },
  absoluteMinute: number,
) {
  if (!isDismantlableCampfire(feature)) return 0;
  if (isPreparedCampfire(feature)) return Math.max(1, CAMPFIRE_BUILD_TWIG_COST - 1);

  const expiresAtMinute = campfireAshExpiresAtMinute(feature);
  if (expiresAtMinute != null && absoluteMinute >= expiresAtMinute) return 0;
  if (isExtinguishedCampfireAshFading(feature, absoluteMinute)) return 1;
  return 2;
}

function remainingMs(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() - now.getTime();
}

function activeLitTorchSince(now = new Date()) {
  return new Date(now.getTime() - TORCH_DURATION_MS);
}

export function litTorchExpiresAt(resource: { updatedAt: Date | string }) {
  const updatedAt = resource.updatedAt instanceof Date ? resource.updatedAt : new Date(resource.updatedAt);
  return new Date(updatedAt.getTime() + TORCH_DURATION_MS);
}

export function isActiveLitTorchResource(
  resource: { amount: number; updatedAt: Date | string; resourceType?: { key?: string | null } | null },
  now = new Date(),
) {
  const updatedAt = resource.updatedAt instanceof Date ? resource.updatedAt : new Date(resource.updatedAt);
  return resource.amount > 0
    && resource.resourceType?.key === LIT_TORCH_KEY
    && !Number.isNaN(updatedAt.getTime())
    && updatedAt.getTime() > activeLitTorchSince(now).getTime();
}

export function isActiveGroundLitTorchResource(
  resource: { amount: number; updatedAt: Date | string; resourceType?: { key?: string | null } | null },
  now = new Date(),
) {
  return isActiveLitTorchResource(resource, now);
}

export function campfireExpiresAt(feature: { data?: unknown | null }) {
  return dateFromJson(jsonRecord(feature.data).expiresAt);
}

export function campfireLitAt(feature: { data?: unknown | null; createdAt?: Date | string | null }) {
  return dateFromJson(jsonRecord(feature.data).litAt) ?? (feature.createdAt ? new Date(feature.createdAt) : null);
}

export function isTimedCampfireExpired(feature: { data?: unknown | null }, now = new Date()) {
  if (jsonRecord(feature.data).extinguished) return false;
  const expiresAt = campfireExpiresAt(feature);
  return Boolean(expiresAt && remainingMs(expiresAt, now) <= 0);
}

export function isExtinguishedCampfire(feature: { data?: unknown | null; providesLight?: boolean | null }) {
  const data = jsonRecord(feature.data);
  return Boolean(data.extinguished) || Boolean(campfireExpiresAt(feature) && !feature.providesLight);
}

export function isDecayableExtinguishedCampfire(feature: { type?: string | null; data?: unknown | null; providesLight?: boolean | null }) {
  const data = jsonRecord(feature.data);
  return feature.type === "CAMPFIRE"
    && isExtinguishedCampfire(feature)
    && data.seeded !== true
    && data.magical !== true;
}

export function campfireAshExpiresAtMinute(feature: { data?: unknown | null }) {
  return numberFromJson(jsonRecord(feature.data)[ASH_EXPIRES_AT_MINUTE_KEY]);
}

export function campfireAshFadingAtMinute(feature: { data?: unknown | null }) {
  return numberFromJson(jsonRecord(feature.data)[ASH_FADING_AT_MINUTE_KEY]);
}

export function isExtinguishedCampfireAshFading(feature: { type?: string | null; data?: unknown | null; providesLight?: boolean | null }, absoluteMinute: number) {
  if (!isDecayableExtinguishedCampfire(feature)) return false;
  const fadingAtMinute = campfireAshFadingAtMinute(feature);
  const expiresAtMinute = campfireAshExpiresAtMinute(feature);
  return fadingAtMinute != null && expiresAtMinute != null && absoluteMinute >= fadingAtMinute && absoluteMinute < expiresAtMinute;
}

export function shouldRemoveExtinguishedCampfireAsh(feature: { type?: string | null; data?: unknown | null; providesLight?: boolean | null }, absoluteMinute: number) {
  if (!isDecayableExtinguishedCampfire(feature)) return false;
  const expiresAtMinute = campfireAshExpiresAtMinute(feature);
  return expiresAtMinute != null && absoluteMinute >= expiresAtMinute;
}

export function isCampfireFading(feature: { data?: unknown | null }, now = new Date()) {
  const expiresAt = campfireExpiresAt(feature);
  const left = expiresAt ? remainingMs(expiresAt, now) : CAMPFIRE_DURATION_MS;
  return left > 0 && left <= CAMPFIRE_FADING_MS;
}

export function canAddTwigsToCampfire(feature: { data?: unknown | null; createdAt?: Date | string | null }, now = new Date()) {
  const litAt = campfireLitAt(feature);
  return Boolean(litAt && now.getTime() - litAt.getTime() >= CAMPFIRE_TWIGS_AFTER_MS);
}

export function campfireStateLine(feature: { data?: unknown | null }) {
  if (isPreparedCampfire(feature)) return "складено; ще не дає світла";
  if (isExtinguishedCampfire(feature)) return "згасло; не дає світла";
  if (isCampfireFading(feature)) return "полум'я нижчає; скоро згасне, варто додати хмизу";
  return null;
}

async function currentWorldMinute(absoluteMinute?: number | null) {
  if (absoluteMinute != null) return absoluteMinute;
  const state = await ensureWorldState();
  return state.absoluteMinute;
}

export async function expireTimedCampfires(locationId?: number | null, absoluteMinute?: number | null) {
  const worldMinute = await currentWorldMinute(absoluteMinute);
  const features = await prisma.locationFeature.findMany({
    where: {
      isActive: true,
      type: { in: ["CAMPFIRE", "MAGIC_CAMPFIRE"] },
      ...(locationId ? { locationId } : {}),
    },
    select: { id: true, data: true },
  });

  const expired = features.filter((feature) => isTimedCampfireExpired(feature));
  if (!expired.length) return 0;

  for (const feature of expired) {
    await prisma.locationFeature.update({
      where: { id: feature.id },
      data: {
        name: "Згасле вогнище",
        isActive: true,
        providesLight: false,
        restStaminaCapMultiplier: null,
        data: jsonInput(extinguishedFireData(feature.data, worldMinute)),
      },
    });
  }
  return expired.length;
}

function needsAshDecayBackfill(feature: { type?: string | null; data?: unknown | null; providesLight?: boolean | null }) {
  return isDecayableExtinguishedCampfire(feature) && campfireAshExpiresAtMinute(feature) == null;
}

export async function decayExtinguishedCampfires(bot?: Bot | null, absoluteMinute?: number | null, locationId?: number | null) {
  const worldMinute = await currentWorldMinute(absoluteMinute);
  const features = await prisma.locationFeature.findMany({
    where: {
      isActive: true,
      type: "CAMPFIRE",
      ...(locationId ? { locationId } : {}),
    },
    select: { id: true, name: true, locationId: true, type: true, providesLight: true, data: true },
  });

  let backfilled = 0;
  let fading = 0;
  let removed = 0;

  for (const feature of features) {
    if (!isDecayableExtinguishedCampfire(feature)) continue;

    const data = jsonRecord(feature.data);
    if (needsAshDecayBackfill(feature)) {
      await prisma.locationFeature.update({
        where: { id: feature.id },
        data: { data: jsonInput(withAshDecaySchedule(data, worldMinute)) },
      });
      backfilled++;
      continue;
    }

    if (shouldRemoveExtinguishedCampfireAsh(feature, worldMinute)) {
      await prisma.locationFeature.update({
        where: { id: feature.id },
        data: {
          isActive: false,
          providesLight: false,
          restStaminaCapMultiplier: null,
          name: "Слід від вогнища",
          data: jsonInput({
            ...data,
            decayedAtMinute: worldMinute,
          }),
        },
      });
      removed++;
      continue;
    }

    const notifiedAtMinute = numberFromJson(data[ASH_FADING_NOTIFIED_AT_MINUTE_KEY]);
    if (isExtinguishedCampfireAshFading(feature, worldMinute) && notifiedAtMinute == null) {
      await prisma.locationFeature.update({
        where: { id: feature.id },
        data: {
          name: "Ледь помітне вогнище",
          data: jsonInput({
            ...data,
            [ASH_FADING_NOTIFIED_AT_MINUTE_KEY]: worldMinute,
          }),
        },
      });
      if (bot) await notifyLocationAll(bot, feature.locationId, "🪨 Старе згасле вогнище майже розсипалося в землю. Ще трохи — і від нього лишиться тільки тьмяний слід у попелі.");
      fading++;
    }
  }

  return { backfilled, fading, removed };
}

async function hasTimerWarning(marker: string) {
  const existing = await prisma.worldEvent.findFirst({
    where: { type: "SYSTEM", title: "Timer warning", description: marker },
    select: { id: true },
  });
  return Boolean(existing);
}

async function markTimerWarning(marker: string, locationId?: number | null, playerId?: number | null) {
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Timer warning",
      description: marker,
      locationId: locationId ?? undefined,
      playerId: playerId ?? undefined,
    },
  });
}

export async function notifyFadingFireTimers(bot: Bot) {
  const now = new Date();
  await expireTimedCampfires();
  await decayExtinguishedCampfires(bot);
  await expireGroundLitTorches(bot, now);

  const fadingCampfires = await prisma.locationFeature.findMany({
    where: {
      isActive: true,
      providesLight: true,
      type: { in: ["CAMPFIRE", "MAGIC_CAMPFIRE"] },
    },
    select: { id: true, data: true, locationId: true, name: true },
  });

  for (const feature of fadingCampfires.filter((feature) => isCampfireFading(feature, now))) {
    const expiresAt = campfireExpiresAt(feature);
    if (!expiresAt) continue;

    const marker = `campfire-fading:${feature.id}:${expiresAt.toISOString()}`;
    if (await hasTimerWarning(marker)) continue;

    await notifyLocationAll(bot, feature.locationId, `🔥 ${feature.name} починає згасати. Полум'я нижчає; скоро варто буде додати хмизу.`);
    await markTimerWarning(marker, feature.locationId);
  }

  const { litTorch } = await ensureTorchResourceTypes();
  const expiredSince = new Date(now.getTime() - TORCH_DURATION_MS);
  const fadingSince = new Date(now.getTime() - (TORCH_DURATION_MS - TORCH_FADING_MS));

  const expiredTorches = await prisma.playerResource.findMany({
    where: { resourceTypeId: litTorch.id, amount: { gt: 0 }, updatedAt: { lte: expiredSince } },
    select: { playerId: true },
  });
  for (const resource of expiredTorches) {
    await syncPlayerTorchState(resource.playerId);
  }

  const expiredCreatureTorches = await prisma.creatureResource.findMany({
    where: { resourceTypeId: litTorch.id, amount: { gt: 0 }, updatedAt: { lte: expiredSince } },
    select: { creatureId: true },
  });
  for (const resource of expiredCreatureTorches) {
    await syncCreatureTorchState(resource.creatureId);
  }

  const fadingTorches = await prisma.playerResource.findMany({
    where: {
      resourceTypeId: litTorch.id,
      amount: { gt: 0 },
      updatedAt: { gt: expiredSince, lte: fadingSince },
    },
    include: { player: true },
  });

  for (const resource of fadingTorches) {
    const marker = `torch-fading:${resource.playerId}:${resource.updatedAt.toISOString()}`;
    if (await hasTimerWarning(marker)) continue;

    try {
      if (!(await canSendProactiveToTelegramId(resource.player.telegramId))) continue;
      const torchState = await getPlayerTorchState(resource.playerId);
      await observedSendMessage(bot, resource.player.telegramId, TORCH_FADING_WARNING_TEXT, {
        reply_markup: torchFadingWarningReplyMarkup(torchState),
      }, "fire.fadingTorchNotice");
      await markTimerWarning(marker, resource.player.currentLocationId, resource.playerId);
    } catch (error) {
      console.warn("Failed to notify fading torch:", error);
    }
  }
}

export async function expireGroundLitTorches(bot?: Bot, now = new Date(), locationId?: number | null) {
  const { litTorch, twigs } = await ensureTorchResourceTypes();
  const expiredSince = activeLitTorchSince(now);
  const expiredNodes = await prisma.resourceNode.findMany({
    where: {
      resourceTypeId: litTorch.id,
      amount: { gt: 0 },
      updatedAt: { lte: expiredSince },
      ...(locationId ? { locationId } : {}),
    },
    select: { id: true, locationId: true, amount: true },
  });

  for (const node of expiredNodes) {
    const converted = await prisma.$transaction(async (tx) => {
      const removed = await tx.resourceNode.updateMany({
        where: { id: node.id, amount: { gt: 0 }, resourceTypeId: litTorch.id },
        data: { amount: 0 },
      });
      if (removed.count === 0) return false;

      await tx.resourceNode.upsert({
        where: { locationId_resourceTypeId: { locationId: node.locationId, resourceTypeId: twigs.id } },
        update: { amount: { increment: node.amount } },
        create: { locationId: node.locationId, resourceTypeId: twigs.id, amount: node.amount, maxAmount: Math.max(1, node.amount) },
      });

      await tx.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: "Ground torch burned out",
          description: `lit_torch=${node.id}; amount=${node.amount}; converted_to=twigs`,
          locationId: node.locationId,
        },
      });
      return true;
    });

    if (converted && bot) {
      await notifyLocationAll(bot, node.locationId, "🔥 Запалений факел на землі догорів і розсипався на хмиз.");
    }
  }

  return expiredNodes.length;
}

export async function createDebugCampfire(locationId: number) {
  const key = `debug_campfire_${locationId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const atmosphereState = await campfireIgnitionAtmosphereState(locationId);
  const feature = await prisma.locationFeature.create({
    data: {
      key,
      locationId,
      type: "CAMPFIRE",
      name: "Вогнище",
      description: "Звичайне вогнище потріскує й дає тепле світло. Воно не має магічної сили незгасного полум'я.",
      isActive: true,
      providesLight: true,
      restStaminaCapMultiplier: null,
      data: timedFireData("addCampfire"),
    },
  });
  return { feature, atmosphereText: campfireIgnitionAtmosphereText(atmosphereState) };
}

export async function createAdminHandmadeCampfire(locationId: number) {
  const key = `handmade_admin_campfire_${locationId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const worldMinute = await currentWorldMinute();
  const feature = await prisma.locationFeature.create({
    data: {
      key,
      locationId,
      type: "CAMPFIRE",
      name: "Складене вогнище",
      description: "Хмиз складено в сухе гніздо. Лишилося дати йому вогонь.",
      isActive: true,
      providesLight: false,
      restStaminaCapMultiplier: null,
      data: jsonInput(adminHandmadeCampfireData(worldMinute)),
    },
  });
  return { feature, atmosphereText: null };
}

export async function deleteAdminCampfiresAtLocation(locationId: number) {
  const worldMinute = await currentWorldMinute();
  const features = await prisma.locationFeature.findMany({
    where: {
      locationId,
      isActive: true,
      type: { in: ["CAMPFIRE", "MAGIC_CAMPFIRE"] },
    },
    select: { id: true, key: true, name: true, type: true, data: true },
    orderBy: { id: "asc" },
  });

  const deletable = features.filter(isAdminDeletableCampfire);
  if (deletable.length > 0) {
    await prisma.$transaction(deletable.map((feature) => prisma.locationFeature.update({
      where: { id: feature.id },
      data: {
        isActive: false,
        providesLight: false,
        restStaminaCapMultiplier: null,
        data: jsonInput({
          ...featureData(feature.data),
          adminDeletedAtMinute: worldMinute,
          adminDeletedAt: new Date().toISOString(),
        }),
      },
    })));
  }

  return {
    deletedCount: deletable.length,
    protectedMagicCount: features.length - deletable.length,
    deletedKeys: deletable.map((feature) => feature.key),
  };
}

export async function playerTwigsAmount(playerId: number) {
  const { twigs } = await ensureTorchResourceTypes();
  const carried = await prisma.playerResource.findUnique({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: twigs.id } },
    select: { amount: true },
  });
  return carried?.amount ?? 0;
}

export async function canBuildCampfireFromInventory(playerId: number) {
  return (await playerTwigsAmount(playerId)) >= CAMPFIRE_BUILD_TWIG_COST;
}

export async function campfireBuildConfirmationText(playerId: number) {
  const twigsAmount = await playerTwigsAmount(playerId);
  if (twigsAmount < CAMPFIRE_BUILD_TWIG_COST) {
    throw new Error(`Потрібно хмизу ×${CAMPFIRE_BUILD_TWIG_COST}, щоб скласти вогнище. Зараз у вас замало сухих гілок.`);
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true, hp: true, stamina: true, isResting: true, posture: true, sleepState: true },
  });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  if (!canPickUpGroundItem(player)) throw new Error("Ви надто втомлені, щоб складати вогнище просто зараз. Спершу перепочиньте.");

  const location = await prisma.cellLocation.findUnique({
    where: { id: player.currentLocationId },
    select: {
      biome: true,
      features: { where: { isActive: true, type: "CAMPFIRE" }, select: { type: true, isActive: true, data: true } },
    },
  });
  if (!location) throw new Error("Місцину не знайдено.");
  if (!canBuildAnotherHandmadeCampfire(location.features)) {
    throw new Error("Тут уже досить вогнищ. Щоб скласти нове, спершу розберіть або приберіть одне зі старих.");
  }

  return isWetCampfireLocation(location)
    ? "Тут мокро. Вогнище можна скласти, але воно швидко втягне воду й згасне. Складати все одно?"
    : null;
}

export async function buildCampfireFromInventory(playerId: number, options: { confirmWet?: boolean } = {}) {
  await expireTimedCampfires();
  const { twigs } = await ensureTorchResourceTypes();
  const worldMinute = await currentWorldMinute();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true, hp: true, stamina: true, isResting: true, posture: true, sleepState: true },
  });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  if (!canPickUpGroundItem(player)) throw new Error("Ви надто втомлені, щоб складати вогнище просто зараз. Спершу перепочиньте.");

  const location = await prisma.cellLocation.findUnique({
    where: { id: player.currentLocationId },
    select: {
      id: true,
      key: true,
      biome: true,
      features: { where: { isActive: true, type: "CAMPFIRE" }, select: { type: true, isActive: true, data: true } },
    },
  });
  if (!location) throw new Error("Місцину не знайдено.");
  if (!canBuildAnotherHandmadeCampfire(location.features)) {
    throw new Error("Тут уже досить вогнищ. Щоб скласти нове, спершу розберіть або приберіть одне зі старих.");
  }
  if (isWetCampfireLocation(location) && !options.confirmWet) {
    throw new Error("Тут мокро. Вогнище можна скласти, але воно швидко втягне воду й згасне. Складати все одно?");
  }

  const key = `handmade_campfire_${location.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const wet = isWetCampfireLocation(location);
  const feature = await prisma.$transaction(async (tx) => {
    const carried = await tx.playerResource.findUnique({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: twigs.id } },
    });
    if (!carried || carried.amount < CAMPFIRE_BUILD_TWIG_COST) {
      throw new Error(`Потрібно хмизу ×${CAMPFIRE_BUILD_TWIG_COST}, щоб скласти вогнище. Зараз у вас замало сухих гілок.`);
    }

    if (carried.amount > CAMPFIRE_BUILD_TWIG_COST) {
      await tx.playerResource.update({
        where: { playerId_resourceTypeId: { playerId, resourceTypeId: twigs.id } },
        data: { amount: { decrement: CAMPFIRE_BUILD_TWIG_COST } },
      });
    } else {
      await tx.playerResource.delete({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: twigs.id } } });
    }

    return tx.locationFeature.create({
      data: {
        key,
        locationId: location.id,
        type: "CAMPFIRE",
        name: "Складене вогнище",
        description: "Хмиз складено в сухе гніздо. Лишилося дати йому вогонь.",
        isActive: true,
        providesLight: false,
        restStaminaCapMultiplier: null,
        data: jsonInput({
          is_campfire: true,
          handmade: true,
          created_by: "player",
          createdByPlayerId: playerId,
          prepared: true,
          unlit: true,
          fuelTwigs: CAMPFIRE_BUILD_TWIG_COST,
          builtAtMinute: worldMinute,
          ...(wet ? { wetPenalty: true, wetBiome: location.biome } : {}),
        }),
      },
      select: { id: true, locationId: true },
    });
  });

  return {
    text: wet
      ? "🪵 Ви склали невелике вогнище з хмизу. Гілки слухняно лягли в купу, але волога вже підступає знизу: коли воно займеться, горітиме недовго."
      : "🪵 Ви склали невелике вогнище з хмизу. Гілки лежать сухим гніздом — тільки й чекають вогню.",
    featureId: feature.id,
    locationId: feature.locationId,
  };
}

export async function douseCampfire(playerId: number, featureId: number) {
  await expireTimedCampfires();
  const worldMinute = await currentWorldMinute();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true, hp: true, stamina: true, isResting: true, posture: true, sleepState: true },
  });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  if (!canPickUpGroundItem(player)) throw new Error("Ви надто втомлені, щоб поратися з вогнем просто зараз. Спершу перепочиньте.");

  const feature = await prisma.locationFeature.findFirst({
    where: { id: featureId, locationId: player.currentLocationId, isActive: true, type: "CAMPFIRE" },
    select: { id: true, locationId: true, type: true, data: true, providesLight: true },
  });
  if (!feature || !isHandmadeCampfire(feature) || isPreparedCampfire(feature) || isExtinguishedCampfire(feature) || !feature.providesLight) {
    throw new Error("Це вогнище не вдається погасити так просто.");
  }

  await prisma.locationFeature.update({
    where: { id: feature.id },
    data: {
      name: "Згасле вогнище",
      providesLight: false,
      restStaminaCapMultiplier: null,
      data: jsonInput(extinguishedFireData({ ...featureData(feature.data), dousedByPlayerId: playerId }, worldMinute)),
    },
  });

  return {
    text: "🫗 Ви пригасили вогнище. Полум’я зникло в попелі, лишивши чорні головешки й теплий слід.",
    featureId: feature.id,
    locationId: feature.locationId,
  };
}

export async function dismantleCampfire(playerId: number, featureId: number) {
  await expireTimedCampfires();
  const worldMinute = await currentWorldMinute();
  const { twigs } = await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true, hp: true, stamina: true, isResting: true, posture: true, sleepState: true },
  });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  if (!canPickUpGroundItem(player)) throw new Error("Ви надто втомлені, щоб розбирати вогнище просто зараз. Спершу перепочиньте.");

  const feature = await prisma.locationFeature.findFirst({
    where: { id: featureId, locationId: player.currentLocationId, isActive: true, type: "CAMPFIRE" },
    select: { id: true, locationId: true, type: true, data: true, providesLight: true },
  });
  if (!feature || !isDismantlableCampfire(feature)) {
    throw new Error("Це вогнище не варто розбирати: воно або ще горить, або тримається не лише на хмизі.");
  }

  const recovered = campfireRecoveredTwigs(feature, worldMinute);
  await prisma.$transaction(async (tx) => {
    await tx.locationFeature.update({
      where: { id: feature.id },
      data: {
        isActive: false,
        providesLight: false,
        restStaminaCapMultiplier: null,
        name: "Розібране вогнище",
        data: jsonInput({
          ...featureData(feature.data),
          dismantledAtMinute: worldMinute,
          dismantledByPlayerId: playerId,
          recoveredTwigs: recovered,
        }),
      },
    });
    if (recovered > 0) {
      await tx.playerResource.upsert({
        where: { playerId_resourceTypeId: { playerId, resourceTypeId: twigs.id } },
        update: { amount: { increment: recovered } },
        create: { playerId, resourceTypeId: twigs.id, amount: recovered },
      });
    }
  });

  return {
    text: recovered > 0
      ? `🧹 Ви розібрали вогнище й повернули до речей хмиз ×${recovered}. Решта вже стала попелом і землею.`
      : "🧹 Ви розібрали вогнище. Хмизу з нього вже не врятувати: все пішло в попіл і землю.",
    locationId: feature.locationId,
    recoveredTwigs: recovered,
  };
}

export async function ensureTorchResourceTypes() {
  const [torch, litTorch, dousedTorch, twigs] = await Promise.all([
    prisma.resourceType.upsert({
      where: { key: TORCH_KEY },
      update: { name: "факел", description: "Сухий факел, який можна підпалити біля вогнища." },
      create: { key: TORCH_KEY, name: "факел", description: "Сухий факел, який можна підпалити біля вогнища." },
    }),
    prisma.resourceType.upsert({
      where: { key: LIT_TORCH_KEY },
      update: { name: "запалений факел", description: "Факел, що ще тримає полум'я." },
      create: { key: LIT_TORCH_KEY, name: "запалений факел", description: "Факел, що ще тримає полум'я." },
    }),
    prisma.resourceType.upsert({
      where: { key: DOUSED_TORCH_KEY },
      update: { name: "притушений факел", description: "Факел без полум'я, у якому ще лишився запас горіння." },
      create: { key: DOUSED_TORCH_KEY, name: "притушений факел", description: "Факел без полум'я, у якому ще лишився запас горіння." },
    }),
    prisma.resourceType.upsert({
      where: { key: TWIGS_KEY },
      update: { name: "хмиз", description: "Сухі дрібні гілки для підкидання у вогнище." },
      create: { key: TWIGS_KEY, name: "хмиз", description: "Сухі дрібні гілки для підкидання у вогнище." },
    }),
  ]);
  return { torch, litTorch, dousedTorch, twigs };
}

export async function syncPlayerTorchState(playerId: number) {
  const { litTorch, twigs } = await ensureTorchResourceTypes();
  const lit = await prisma.playerResource.findUnique({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } },
  });

  if (!lit || lit.amount <= 0) return;
  if (Date.now() - lit.updatedAt.getTime() < TORCH_DURATION_MS) return;

  await prisma.$transaction([
    prisma.playerResource.delete({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } }),
    prisma.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: twigs.id } },
      update: { amount: { increment: lit.amount } },
      create: { playerId, resourceTypeId: twigs.id, amount: lit.amount },
    }),
  ]);
}

export async function syncCreatureTorchState(creatureId: number) {
  const { litTorch, twigs } = await ensureTorchResourceTypes();
  const lit = await prisma.creatureResource.findUnique({
    where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: litTorch.id } },
  });

  if (!lit || lit.amount <= 0) return;
  if (Date.now() - lit.updatedAt.getTime() < TORCH_DURATION_MS) return;

  await prisma.$transaction([
    prisma.creatureResource.delete({ where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: litTorch.id } } }),
    prisma.creatureResource.upsert({
      where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: twigs.id } },
      update: { amount: { increment: lit.amount } },
      create: { creatureId, resourceTypeId: twigs.id, amount: lit.amount },
    }),
  ]);
}

export async function getPlayerTorchState(playerId: number) {
  await syncPlayerTorchState(playerId);
  const { torch, litTorch, dousedTorch } = await ensureTorchResourceTypes();
  const [plain, lit, doused] = await Promise.all([
    prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } } }),
    prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } }),
    prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: dousedTorch.id } } }),
  ]);

  const litAt = lit && lit.amount > 0 ? lit.updatedAt : null;
  const expiresAt = litAt ? new Date(litAt.getTime() + TORCH_DURATION_MS) : null;
  const left = expiresAt ? remainingMs(expiresAt) : 0;
  return {
    hasTorch: Boolean((plain?.amount ?? 0) > 0 || (lit?.amount ?? 0) > 0 || (doused?.amount ?? 0) > 0),
    isLit: Boolean(litAt && left > 0),
    isFading: Boolean(litAt && left > 0 && left <= TORCH_FADING_MS),
    plainAmount: plain?.amount ?? 0,
    dousedAmount: doused?.amount ?? 0,
    litAmount: litAt && left > 0 ? lit?.amount ?? 0 : 0,
    litAt,
    expiresAt,
  };
}

export function carriedTorchCount(torchState: Pick<Awaited<ReturnType<typeof getPlayerTorchState>>, "plainAmount" | "litAmount" | "dousedAmount">) {
  return torchState.plainAmount + torchState.litAmount + torchState.dousedAmount;
}

export function canPromptLightAnotherTorch(torchState: Pick<Awaited<ReturnType<typeof getPlayerTorchState>>, "plainAmount" | "litAmount" | "dousedAmount">) {
  return torchState.litAmount > 0
    && torchState.litAmount < MAX_LIT_TORCHES_IN_HANDS
    && (torchState.plainAmount > 0 || torchState.dousedAmount > 0);
}

function torchFadingWarningReplyMarkup(torchState: Pick<Awaited<ReturnType<typeof getPlayerTorchState>>, "plainAmount" | "litAmount" | "dousedAmount">) {
  if (!canPromptLightAnotherTorch(torchState)) return undefined;
  return new InlineKeyboard().text("🔥 Підпалити ще", "inventory:light:torch");
}

export type TorchSourceTakeDecision =
  | { ok: true }
  | { ok: false; reason: "carry-limit" | "recent-window" };

export function decideTorchSourceTake(input: {
  carriedCount: number;
  recentTakenCount: number;
  carryLimit?: number;
  windowLimit?: number;
}): TorchSourceTakeDecision {
  const carryLimit = input.carryLimit ?? TORCH_SOURCE_PLAYER_CARRY_LIMIT;
  const windowLimit = input.windowLimit ?? TORCH_SOURCE_PLAYER_CARRY_LIMIT;
  if (input.carriedCount >= carryLimit) return { ok: false, reason: "carry-limit" };
  if (input.recentTakenCount >= windowLimit) return { ok: false, reason: "recent-window" };
  return { ok: true };
}

export function torchSourceTakeBlockedText(reason: Exclude<TorchSourceTakeDecision, { ok: true }>["reason"]) {
  if (reason === "carry-limit") {
    return "Факелів у вас уже досить. Лишіть трохи іншим: біля темряви кожен сухий факел може стати чиїмось шляхом.";
  }
  return "Ви вже набрали факелів нещодавно. Поставка лишається для інших; поверніться трохи пізніше, якщо справді треба.";
}

export async function getCreatureTorchState(creatureId: number) {
  await syncCreatureTorchState(creatureId);
  const { torch, litTorch, dousedTorch } = await ensureTorchResourceTypes();
  const [plain, lit, doused] = await Promise.all([
    prisma.creatureResource.findUnique({ where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: torch.id } } }),
    prisma.creatureResource.findUnique({ where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: litTorch.id } } }),
    prisma.creatureResource.findUnique({ where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: dousedTorch.id } } }),
  ]);

  const litAt = lit && lit.amount > 0 ? lit.updatedAt : null;
  const expiresAt = litAt ? new Date(litAt.getTime() + TORCH_DURATION_MS) : null;
  const left = expiresAt ? remainingMs(expiresAt) : 0;
  return {
    hasTorch: Boolean((plain?.amount ?? 0) > 0 || (lit?.amount ?? 0) > 0 || (doused?.amount ?? 0) > 0),
    isLit: Boolean(litAt && left > 0),
    isFading: Boolean(litAt && left > 0 && left <= TORCH_FADING_MS),
    plainAmount: plain?.amount ?? 0,
    dousedAmount: doused?.amount ?? 0,
    litAmount: litAt && left > 0 ? lit?.amount ?? 0 : 0,
    litAt,
    expiresAt,
  };
}

export async function creatureCarriedResourceAmount(creatureId: number, resourceKey: string) {
  const resourceType = await prisma.resourceType.findUnique({ where: { key: resourceKey } });
  if (!resourceType) return 0;
  const carried = await prisma.creatureResource.findUnique({
    where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: resourceType.id } },
  });
  return carried?.amount ?? 0;
}

export async function creatureCarriedTorchCount(creatureId: number) {
  const torchState = await getCreatureTorchState(creatureId);
  return torchState.plainAmount + torchState.litAmount + torchState.dousedAmount;
}

export async function lightCreatureTorchAtCampfire(creatureId: number, locationId: number) {
  await syncCreatureTorchState(creatureId);
  const { torch, litTorch } = await ensureTorchResourceTypes();
  const campfire = await activeCampfireForTorch(locationId);
  if (!campfire) return false;

  const [plain, lit] = await Promise.all([
    prisma.creatureResource.findUnique({ where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: torch.id } } }),
    prisma.creatureResource.findUnique({ where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: litTorch.id } } }),
  ]);
  if (lit && lit.amount > 0 && Date.now() - lit.updatedAt.getTime() < TORCH_DURATION_MS) return false;
  if (!plain || plain.amount <= 0) return false;

  await prisma.$transaction([
    plain.amount > 1
      ? prisma.creatureResource.update({
          where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: torch.id } },
          data: { amount: { decrement: 1 } },
        })
      : prisma.creatureResource.delete({ where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: torch.id } } }),
    prisma.creatureResource.upsert({
      where: { creatureId_resourceTypeId: { creatureId, resourceTypeId: litTorch.id } },
      update: { amount: 1, updatedAt: new Date() },
      create: { creatureId, resourceTypeId: litTorch.id, amount: 1 },
    }),
  ]);
  return true;
}

function parseDousedTimer(description: string | null | undefined) {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description);
    const remainingMsValue = Number(parsed.remainingMs);
    return Number.isFinite(remainingMsValue) ? Math.max(1, Math.min(TORCH_DURATION_MS, Math.floor(remainingMsValue))) : null;
  } catch {
    return null;
  }
}

async function nextDousedTorchTimer(playerId: number) {
  const timers = await prisma.worldEvent.findMany({
    where: { playerId, title: DOUSED_TORCH_TIMER_TITLE },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  if (!timers.length) return { eventId: null as number | null, remainingMs: TORCH_DURATION_MS };

  const consumed = await prisma.worldEvent.findMany({
    where: { playerId, title: DOUSED_TORCH_CONSUMED_TITLE },
    select: { description: true },
  });
  const consumedIds = new Set(consumed.map((event) => Number(event.description)).filter(Number.isFinite));
  const timer = timers.find((event) => !consumedIds.has(event.id));
  return {
    eventId: timer?.id ?? null,
    remainingMs: parseDousedTimer(timer?.description) ?? TORCH_DURATION_MS,
  };
}

async function consumeDousedTorchTimer(playerId: number, eventId: number | null, locationId?: number | null) {
  if (!eventId) return;
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: DOUSED_TORCH_CONSUMED_TITLE,
      description: String(eventId),
      playerId,
      locationId: locationId ?? undefined,
    },
  });
}

async function consumeOneCarriedResource(resourceTypeId: number, playerId: number) {
  const carried = await prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId } } });
  if (!carried || carried.amount <= 0) return false;
  if (carried.amount > 1) {
    await prisma.playerResource.update({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId } },
      data: { amount: { decrement: 1 } },
    });
  } else {
    await prisma.playerResource.delete({ where: { playerId_resourceTypeId: { playerId, resourceTypeId } } });
  }
  return true;
}

export async function lightPlayerTorchAtCampfire(playerId: number, featureId: number) {
  await expireTimedCampfires();
  await syncPlayerTorchState(playerId);
  const { torch, litTorch } = await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  const feature = await prisma.locationFeature.findUnique({ where: { id: featureId }, select: { id: true, locationId: true, isActive: true, type: true, providesLight: true, key: true, name: true } });
  if (!player?.currentLocationId || !feature?.isActive || player.currentLocationId !== feature.locationId || !feature.providesLight) {
    return "Біля цього вогню вже не вдається підпалити факел.";
  }

  const plain = await prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } } });
  const lit = await prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } });
  const wasLit = Boolean(lit && lit.amount > 0);
  const litAmount = lit?.amount ?? 0;
  if (litAmount >= MAX_LIT_TORCHES_IN_HANDS && plain && plain.amount > 0) {
    return "🔥 У вас уже горять два факелі. Куди ви візьмете ще стільки вогню?";
  }
  if (!wasLit && (!plain || plain.amount <= 0)) {
    return "Потрібен факел у речах, щоб підпалити його біля вогнища.";
  }

  const consumePlainTorch =
    plain && plain.amount > 0 && (!wasLit || litAmount < MAX_LIT_TORCHES_IN_HANDS)
      ? plain.amount > 1
        ? prisma.playerResource.update({
            where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } },
            data: { amount: { decrement: 1 } },
          })
        : prisma.playerResource.delete({
            where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } },
          })
      : null;

  await prisma.$transaction([
    ...(consumePlainTorch ? [consumePlainTorch] : []),
    prisma.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } },
      update: { amount: consumePlainTorch ? Math.min(MAX_LIT_TORCHES_IN_HANDS, litAmount + 1) : Math.max(1, litAmount), updatedAt: new Date() },
      create: { playerId, resourceTypeId: litTorch.id, amount: 1 },
    }),
  ]);

  if (wasLit && consumePlainTorch) return "🔥 Ви підпалили ще один факел. Два вогники ледве вміщаються в руках.";
  return wasLit
    ? "🔥 Ви оновили вогонь на факелі. Полум'я знову триматиметься довше."
    : "🔥 Ви підпалили факел. Тепер він дає світло поруч із вами.";
}

async function activeCampfireForTorch(locationId: number) {
  await expireTimedCampfires(locationId);
  return prisma.locationFeature.findFirst({
    where: {
      locationId,
      isActive: true,
      providesLight: true,
      type: { in: ["CAMPFIRE", "MAGIC_CAMPFIRE"] },
    },
    orderBy: { id: "asc" },
  });
}

export async function canLightPlayerTorchFromInventory(playerId: number) {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) return false;

  const torchState = await getPlayerTorchState(playerId);
  if (torchState.plainAmount <= 0 && torchState.dousedAmount <= 0) return false;
  if (torchState.isLit && torchState.litAmount < MAX_LIT_TORCHES_IN_HANDS) return true;
  return Boolean(await activeCampfireForTorch(player.currentLocationId));
}

export async function lightPlayerTorchFromInventory(playerId: number) {
  await syncPlayerTorchState(playerId);
  const { torch, litTorch, dousedTorch } = await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) return "Ти ще не увійшов у світ. Напиши /start";

  const torchState = await getPlayerTorchState(playerId);
  if (torchState.plainAmount <= 0 && torchState.dousedAmount <= 0) return "Потрібен сухий або притушений факел у речах.";

  if (!torchState.isLit) {
    const campfire = await activeCampfireForTorch(player.currentLocationId);
    if (!campfire) return "Поруч немає вогню, від якого можна підпалити факел.";
    if (torchState.plainAmount > 0) return lightPlayerTorchAtCampfire(playerId, campfire.id);
  }

  if (torchState.litAmount >= MAX_LIT_TORCHES_IN_HANDS) {
    return "🔥 У вас уже горять два факели. Куди ви візьмете ще стільки вогню?";
  }

  if (torchState.dousedAmount > 0) {
    const consumed = await consumeOneCarriedResource(dousedTorch.id, playerId);
    if (!consumed) return "У ваших речах уже немає притушеного факела.";
    const timer = await nextDousedTorchTimer(playerId);
    const remaining = Math.max(1, Math.min(TORCH_DURATION_MS, timer.remainingMs));
    const resumedLitAt = new Date(Date.now() - (TORCH_DURATION_MS - remaining));
    const existingLit = await prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } });
    const nextLitAt = existingLit && existingLit.updatedAt.getTime() > resumedLitAt.getTime() ? existingLit.updatedAt : resumedLitAt;
    await prisma.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } },
      update: { amount: Math.min(MAX_LIT_TORCHES_IN_HANDS, (existingLit?.amount ?? 0) + 1), updatedAt: nextLitAt },
      create: { playerId, resourceTypeId: litTorch.id, amount: 1, updatedAt: nextLitAt },
    });
    await consumeDousedTorchTimer(playerId, timer.eventId, player.currentLocationId);
    return "🔥 Ви знову підпалили притушений факел. Він горітиме стільки, скільки в ньому лишалося.";
  }

  const plain = await prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } } });
  const lit = await prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } });
  if (!plain || plain.amount <= 0) return "Потрібен сухий факел у речах.";

  await prisma.$transaction([
    plain.amount > 1
      ? prisma.playerResource.update({
          where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } },
          data: { amount: { decrement: 1 } },
        })
      : prisma.playerResource.delete({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } } }),
    prisma.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } },
      update: { amount: Math.min(MAX_LIT_TORCHES_IN_HANDS, (lit?.amount ?? 0) + 1), updatedAt: new Date() },
      create: { playerId, resourceTypeId: litTorch.id, amount: 1 },
    }),
  ]);

  return "🔥 Ви підпалили ще один факел від того, що вже горить у руках.";
}

export async function canDousePlayerTorchFromInventory(playerId: number) {
  const torchState = await getPlayerTorchState(playerId);
  return torchState.isLit && torchState.litAmount > 0;
}

export async function dousePlayerTorchFromInventory(playerId: number) {
  await syncPlayerTorchState(playerId);
  const { litTorch, dousedTorch } = await ensureTorchResourceTypes();
  const [player, lit] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } }),
    prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } }),
  ]);
  if (!player?.currentLocationId) return "Ти ще не увійшов у світ. Напиши /start";

  const litAt = lit && lit.amount > 0 ? lit.updatedAt : null;
  const remaining = litAt ? litAt.getTime() + TORCH_DURATION_MS - Date.now() : 0;
  if (!litAt || remaining <= 0) {
    await syncPlayerTorchState(playerId);
    return "Факел уже не горить.";
  }
  const activeLit = lit!;

  await prisma.$transaction([
    activeLit.amount > 1
      ? prisma.playerResource.update({
          where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } },
          data: { amount: { decrement: 1 } },
        })
      : prisma.playerResource.delete({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } }),
    prisma.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: dousedTorch.id } },
      update: { amount: { increment: 1 } },
      create: { playerId, resourceTypeId: dousedTorch.id, amount: 1 },
    }),
    prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: DOUSED_TORCH_TIMER_TITLE,
        description: JSON.stringify({ remainingMs: remaining, dousedAt: new Date().toISOString() }),
        playerId,
        locationId: player.currentLocationId,
      },
    }),
  ]);

  return "🔥 Ви притушили факел. Полум'я сховалося в димний жар; коли знову підпалите його, він догорятиме з цього місця.";
}

export async function takeTorchFromFeature(playerId: number, featureId: number) {
  const { torch } = await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true, hp: true, stamina: true, isResting: true, posture: true, sleepState: true },
  });
  if (!player?.currentLocationId) return "Ти ще не увійшов у світ. Напиши /start";
  if (!canPickUpGroundItem(player)) return "Ви надто втомлені, щоб брати це просто зараз. Спершу перепочиньте.";

  const feature = await prisma.locationFeature.findUnique({
    where: { id: featureId },
    select: { locationId: true, isActive: true, data: true },
  });
  if (!feature?.isActive || feature.locationId !== player.currentLocationId || featureData(feature.data).torch_source !== true) {
    return "Тут уже не видно, звідки взяти факел.";
  }

  const [torchState, recentTakenCount] = await Promise.all([
    getPlayerTorchState(playerId),
    prisma.worldEvent.count({
      where: {
        title: TORCH_SOURCE_TAKE_EVENT_TITLE,
        description: { contains: `player=${playerId};` },
        createdAt: { gte: new Date(Date.now() - TORCH_SOURCE_TAKE_WINDOW_MS) },
      },
    }),
  ]);
  const decision = decideTorchSourceTake({
    carriedCount: carriedTorchCount(torchState),
    recentTakenCount,
  });
  if (!decision.ok) return torchSourceTakeBlockedText(decision.reason);

  await prisma.playerResource.upsert({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } },
    update: { amount: { increment: 1 } },
    create: { playerId, resourceTypeId: torch.id, amount: 1 },
  });

  return "🕯 Ви взяли сухий факел.";
}

export async function lightCampfireFromTorch(playerId: number, featureId: number) {
  await expireTimedCampfires();
  const { litTorch } = await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  const feature = await prisma.locationFeature.findUnique({
    where: { id: featureId },
    select: {
      id: true,
      key: true,
      locationId: true,
      isActive: true,
      type: true,
      data: true,
      location: { select: { biome: true } },
    },
  });
  if (!player?.currentLocationId || !feature?.isActive || player.currentLocationId !== feature.locationId || feature.type !== "CAMPFIRE") {
    return "Це вогнище вже не вдається підпалити.";
  }
  if (!isPreparedCampfire(feature) && !isExtinguishedCampfire(feature)) {
    return "Вогнище вже горить. Йому зараз потрібен не вогонь, а хмиз ближче до згасання.";
  }

  const lit = await prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } });
  const litAt = lit && lit.amount > 0 ? lit.updatedAt : null;
  if (!litAt || Date.now() - litAt.getTime() >= TORCH_DURATION_MS) {
    await syncPlayerTorchState(playerId);
    return "Потрібен запалений факел, щоб підпалити це вогнище.";
  }

  const memoryText = canRevealOldCampfireMemory(feature) ? oldCampfireMemoryOmen(feature) : null;
  const durationMs = campfireDurationForLocation(feature.location);
  const nextData = relitFireData(feature.data, "torch", durationMs);
  const atmosphereState = await campfireIgnitionAtmosphereState(feature.locationId);
  await prisma.locationFeature.update({
    where: { id: feature.id },
    data: {
      name: "Вогнище",
      providesLight: true,
      restStaminaCapMultiplier: null,
      data: jsonInput(memoryText ? withOldCampfireMemory(nextData, feature) : nextData),
    },
  });

  const base = durationMs < CAMPFIRE_DURATION_MS
    ? "🔥 Ви підпалили вогнище від факела. Полум'я розгоряється й дає світло навколо, але волога під ним шипить: цей жар протримається недовго."
    : "🔥 Ви підпалили вогнище від факела. Полум'я розгоряється й дає світло навколо.";
  return appendCampfireIgnitionAtmosphere(base, atmosphereState, memoryText);
}

export async function addTwigsToCampfire(playerId: number, featureId?: number) {
  await expireTimedCampfires();
  const { twigs } = await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true, hp: true, stamina: true, isResting: true, posture: true, sleepState: true },
  });
  if (!player?.currentLocationId) return "Ти ще не увійшов у світ. Напиши /start";
  if (!canPickUpGroundItem(player)) return "Ви надто втомлені, щоб підкидати хмиз просто зараз. Спершу перепочиньте.";

  const feature = featureId
    ? await prisma.locationFeature.findFirst({
        where: { id: featureId, locationId: player.currentLocationId, isActive: true, type: "CAMPFIRE" },
      })
    : await prisma.locationFeature.findFirst({
        where: { locationId: player.currentLocationId, isActive: true, type: "CAMPFIRE" },
        orderBy: [{ providesLight: "asc" }, { id: "asc" }],
      });

  if (!feature) return "Поруч немає звичайного вогнища, куди можна підкинути хмиз.";

  const carriedTwigs = await prisma.playerResource.findUnique({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: twigs.id } },
  });
  if (!carriedTwigs || carriedTwigs.amount <= 0) return "Потрібен хмиз у речах. Його можна знайти в лісі або отримати, коли догорить факел.";

  const extinguished = isExtinguishedCampfire(feature);
  if (!extinguished && !canAddTwigsToCampfire(feature)) {
    return "Вогнище ще тримається рівно. Хмиз краще підкидати, коли жар почне просідати.";
  }

  const consumeTwigs =
    carriedTwigs.amount > 1
      ? prisma.playerResource.update({
          where: { playerId_resourceTypeId: { playerId, resourceTypeId: twigs.id } },
          data: { amount: { decrement: 1 } },
        })
      : prisma.playerResource.delete({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: twigs.id } } });

  const memoryText = canRevealOldCampfireMemory(feature) ? oldCampfireMemoryOmen(feature) : null;
  const worldMinute = extinguished ? await currentWorldMinute() : null;
  const nextData = extinguished ? addTwigsToFireData(feature.data, worldMinute) : extendFireData(feature.data);

  await prisma.$transaction([
    consumeTwigs,
    prisma.locationFeature.update({
      where: { id: feature.id },
      data: extinguished
        ? { name: "Згасле вогнище", data: jsonInput(memoryText ? withOldCampfireMemory(nextData, feature) : nextData) }
        : { name: "Вогнище", providesLight: true, data: jsonInput(memoryText ? withOldCampfireMemory(nextData, feature) : nextData) },
    }),
  ]);

  const base = extinguished
    ? "🪵 Ви підклали хмиз у згасле вогнище. Попіл прийняв сухі гілки; тепер потрібен вогонь, щоб розпалити його."
    : "🪵 Ви підкинули хмиз у вогнище. Полум'я знову тримається впевненіше.";
  return memoryText ? `${base}\n\n${memoryText}` : base;
}

export async function relightableCampfireFromTorchId(playerId: number, featureId?: number) {
  await expireTimedCampfires();
  const torchState = await getPlayerTorchState(playerId);
  if (!torchState.isLit) return null;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true },
  });
  if (!player?.currentLocationId) return null;

  if (featureId) {
    const feature = await prisma.locationFeature.findFirst({
      where: { id: featureId, locationId: player.currentLocationId, isActive: true, type: "CAMPFIRE" },
    });
    return feature && (isPreparedCampfire(feature) || isExtinguishedCampfire(feature)) ? feature.id : null;
  }

  const features = await prisma.locationFeature.findMany({
    where: { locationId: player.currentLocationId, isActive: true, type: "CAMPFIRE" },
    select: { id: true, type: true, data: true, providesLight: true },
    orderBy: [{ providesLight: "asc" }, { id: "asc" }],
  });

  return firstRelightableCampfireId(features);
}

export async function canAddTwigsToNearbyCampfire(playerId: number) {
  await expireTimedCampfires();
  const { twigs } = await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) return false;

  const carriedTwigs = await prisma.playerResource.findUnique({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: twigs.id } },
  });
  if (!carriedTwigs || carriedTwigs.amount <= 0) return false;

  const features = await prisma.locationFeature.findMany({
    where: { locationId: player.currentLocationId, isActive: true, type: "CAMPFIRE" },
  });
  return features.some((feature) => isExtinguishedCampfire(feature) || canAddTwigsToCampfire(feature));
}

export async function hasActiveGroundTorchLightAtLocation(locationId: number, now = new Date()) {
  const litTorch = await prisma.resourceType.findUnique({ where: { key: LIT_TORCH_KEY } });
  if (!litTorch) return false;
  const groundCount = await prisma.resourceNode.count({
    where: {
      locationId,
      resourceTypeId: litTorch.id,
      amount: { gt: 0 },
      updatedAt: { gt: activeLitTorchSince(now) },
    },
  });
  return groundCount > 0;
}

export async function hasActiveLitTorchForPlayer(playerId: number, now = new Date()) {
  const litTorch = await prisma.resourceType.findUnique({ where: { key: LIT_TORCH_KEY } });
  if (!litTorch) return false;
  const activeSince = activeLitTorchSince(now);
  const count = await prisma.playerResource.count({
    where: {
      playerId,
      resourceTypeId: litTorch.id,
      amount: { gt: 0 },
      updatedAt: { gt: activeSince },
    },
  });
  return count > 0;
}

export async function hasActiveTorchLightAtLocation(locationId: number, now = new Date()) {
  const litTorch = await prisma.resourceType.findUnique({ where: { key: LIT_TORCH_KEY } });
  if (!litTorch) return false;
  const activeSince = activeLitTorchSince(now);
  const [playerCarriedCount, creatureCarriedCount, groundLight] = await Promise.all([
    prisma.playerResource.count({
      where: {
        resourceTypeId: litTorch.id,
        amount: { gt: 0 },
        updatedAt: { gt: activeSince },
        player: { currentLocationId: locationId },
      },
    }),
    prisma.creatureResource.count({
      where: {
        resourceTypeId: litTorch.id,
        amount: { gt: 0 },
        updatedAt: { gt: activeSince },
        creature: { locationId, isAlive: true, isGone: false, isHidden: false },
      },
    }),
    hasActiveGroundTorchLightAtLocation(locationId, now),
  ]);
  return playerCarriedCount + creatureCarriedCount > 0 || groundLight;
}

export async function hasActiveLightAtLocation(locationId: number) {
  const now = new Date();
  await Promise.all([
    expireTimedCampfires(locationId),
    expireGroundLitTorches(undefined, now, locationId),
  ]);
  const [featureLight, torchLight] = await Promise.all([
    prisma.locationFeature.count({ where: { locationId, isActive: true, providesLight: true } }),
    hasActiveTorchLightAtLocation(locationId, now),
  ]);
  return featureLight > 0 || torchLight;
}

