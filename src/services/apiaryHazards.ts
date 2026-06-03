import { Bot } from "grammy";
import { prisma } from "../db";
import type { WorldDaypart } from "../data/worldClock";
import { getCurrentWorldTimeSnapshot } from "./worldTime";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { noteKnownMessage } from "../utils/messageTracker";

export const APIARY_STING_EVENT_TITLE = "Apiary sting";
export const APIARY_PASSIVE_STING_LINE = "Поки ви милувалися квітами, вас боляче вжалив джміль!";

export type ApiaryAuraKind = "center" | "neighbor" | "outside";
export type ApiaryHazardReason = "move" | "look" | "wait";
export type ApiaryData = Record<string, unknown>;

type ApiaryFeature = {
  key: string;
  locationId: number;
  data: unknown;
};

type MaybeTriggerPassiveApiaryStingInput = {
  playerId: number;
  locationId: number;
  chatId?: number | string;
  reason: ApiaryHazardReason;
  now?: Date;
  random?: () => number;
};

function apiaryData(feature: ApiaryFeature): ApiaryData {
  return feature.data && typeof feature.data === "object" && !Array.isArray(feature.data)
    ? feature.data as ApiaryData
    : {};
}

function numberFromData(data: ApiaryData, key: string, fallback: number) {
  const value = data[key];
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function damageRangeFromData(data: ApiaryData, key: string, fallback: [number, number]): [number, number] {
  const value = data[key];
  if (!Array.isArray(value) || value.length < 2) return fallback;
  const min = Math.max(0, Math.floor(Number(value[0])));
  const max = Math.max(min, Math.floor(Number(value[1])));
  return [min, max];
}

export function apiaryAuraKind(distance: number | null | undefined, data: ApiaryData): ApiaryAuraKind {
  if (distance == null || distance < 0) return "outside";
  if (distance === 0) return "center";
  const radius = Math.max(0, Math.floor(numberFromData(data, "aura_radius", 0)));
  return distance <= radius ? "neighbor" : "outside";
}

export function apiaryAuraDistanceFromLinks(
  centerLocationId: number,
  playerLocationId: number,
  linkedLocationIds: Iterable<number>,
  radius: number,
) {
  if (centerLocationId === playerLocationId) return 0;
  if (radius < 1) return null;
  const linked = new Set(linkedLocationIds);
  return linked.has(centerLocationId) ? 1 : null;
}

export function apiaryPassiveChancePermille(kind: ApiaryAuraKind, data: ApiaryData) {
  if (kind === "center") return Math.max(0, Math.floor(numberFromData(data, "center_sting_chance_permille", 0)));
  if (kind === "neighbor") return Math.max(0, Math.floor(numberFromData(data, "neighbor_sting_chance_permille", 0)));
  return 0;
}

export function apiaryPassiveDamageRange(kind: ApiaryAuraKind, data: ApiaryData): [number, number] {
  if (kind === "center") return damageRangeFromData(data, "center_damage", [1, 2]);
  if (kind === "neighbor") return damageRangeFromData(data, "neighbor_damage", [1, 1]);
  return [0, 0];
}

export function apiaryPassiveCooldownMs(data: ApiaryData) {
  return Math.max(0, Math.floor(numberFromData(data, "passive_cooldown_ms", 3 * 60 * 60 * 1000)));
}

export function isApiarySleepingForPassiveHazard(daypart: WorldDaypart, data: ApiaryData) {
  return daypart === "night" && data.night_passive_sleeping === true;
}

export function apiaryEventMarker(apiaryKey: string) {
  return `apiaryKey=${apiaryKey}`;
}

export function apiaryEventDescriptionMatches(description: string | null | undefined, apiaryKey: string) {
  return Boolean(description?.includes(apiaryEventMarker(apiaryKey)));
}

export function isApiaryCooldownActive(
  previousCreatedAt: Date | null | undefined,
  now: Date,
  cooldownMs: number,
) {
  if (!previousCreatedAt || cooldownMs <= 0) return false;
  return now.getTime() - previousCreatedAt.getTime() < cooldownMs;
}

export function passiveApiaryDamageResult(currentHp: number, rolledDamage: number) {
  const hp = Math.max(0, Math.floor(currentHp));
  const damage = Math.max(0, Math.floor(rolledDamage));
  const nextHp = Math.max(1, hp - damage);
  return { appliedDamage: Math.max(0, hp - nextHp), nextHp };
}

function rollDamage(range: [number, number], random: () => number) {
  const [min, max] = range;
  if (max <= min) return min;
  return min + Math.floor(random() * (max - min + 1));
}

function hpFeedback(nextHp: number, maxHp: number | null | undefined) {
  const max = Math.max(1, Math.floor(maxHp ?? 20));
  if (nextHp <= Math.max(1, Math.floor(max * 0.25))) return "Тіло просить обережності, але ви лишаєтеся на ногах.";
  return "Боляче, але ви лишаєтеся на ногах.";
}

async function activeApiaryFeatures() {
  const features = await prisma.locationFeature.findMany({
    where: { isActive: true },
    select: { key: true, locationId: true, data: true },
    orderBy: { id: "asc" },
  });
  return features.filter((feature) => apiaryData(feature).apiary === true);
}

async function linkedLocationIds(locationId: number) {
  const exits = await prisma.locationExit.findMany({
    where: {
      isHidden: false,
      OR: [
        { fromLocationId: locationId },
        { toLocationId: locationId },
      ],
    },
    select: { fromLocationId: true, toLocationId: true },
  });
  return exits.map((exit) => exit.fromLocationId === locationId ? exit.toLocationId : exit.fromLocationId);
}

async function nearestApiaryAtLocation(locationId: number) {
  const links = await linkedLocationIds(locationId);
  const apiaries = await activeApiaryFeatures();
  let nearest: { feature: ApiaryFeature; data: ApiaryData; kind: ApiaryAuraKind } | null = null;
  for (const feature of apiaries) {
    const data = apiaryData(feature);
    const radius = Math.max(0, Math.floor(numberFromData(data, "aura_radius", 0)));
    const distance = apiaryAuraDistanceFromLinks(feature.locationId, locationId, links, radius);
    const kind = apiaryAuraKind(distance, data);
    if (kind === "outside") continue;
    if (!nearest || kind === "center") nearest = { feature, data, kind };
    if (kind === "center") break;
  }
  return nearest;
}

export async function maybeTriggerPassiveApiarySting(bot: Bot, input: MaybeTriggerPassiveApiaryStingInput) {
  const now = input.now ?? new Date();
  const random = input.random ?? Math.random;
  const source = await nearestApiaryAtLocation(input.locationId);
  if (!source) return false;

  const time = await getCurrentWorldTimeSnapshot(prisma, now);
  if (isApiarySleepingForPassiveHazard(time.daypart, source.data)) return false;

  const chance = apiaryPassiveChancePermille(source.kind, source.data);
  if (chance <= 0 || Math.floor(random() * 1000) >= chance) return false;

  const cooldownMs = apiaryPassiveCooldownMs(source.data);
  const previous = await prisma.worldEvent.findFirst({
    where: {
      title: APIARY_STING_EVENT_TITLE,
      playerId: input.playerId,
      description: { contains: apiaryEventMarker(source.feature.key) },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (isApiaryCooldownActive(previous?.createdAt, now, cooldownMs)) return false;

  const player = await prisma.player.findUnique({
    where: { id: input.playerId },
    select: { id: true, telegramId: true, hp: true, maxHp: true, currentLocationId: true },
  });
  if (!player || player.currentLocationId !== input.locationId || player.hp <= 1) return false;

  const rolledDamage = rollDamage(apiaryPassiveDamageRange(source.kind, source.data), random);
  const result = passiveApiaryDamageResult(player.hp, rolledDamage);
  if (result.appliedDamage <= 0) return false;

  await prisma.player.update({
    where: { id: player.id },
    data: { hp: result.nextHp },
  });
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: APIARY_STING_EVENT_TITLE,
      playerId: player.id,
      locationId: input.locationId,
      description: `${apiaryEventMarker(source.feature.key)}; hazard=bumblebee_sting; damage=${result.appliedDamage}; passive=true; reason=${input.reason}`,
    },
  });

  if (input.chatId) {
    noteKnownMessage(await bot.api.sendMessage(
      input.chatId,
      `${APIARY_PASSIVE_STING_LINE}\n\n${hpFeedback(result.nextHp, player.maxHp)}`,
      { reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), false) },
    ));
  }
  return true;
}
