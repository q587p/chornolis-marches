import { Bot } from "grammy";
import { prisma } from "../db";
import type { WorldDaypart } from "../data/worldClock";
import { getCurrentWorldTimeSnapshot } from "./worldTime";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { noteKnownMessage } from "../utils/messageTracker";

export const APIARY_STING_EVENT_TITLE = "Apiary sting";
export const APIARY_PASSIVE_STING_LINE = "Поки ви милувалися квітами, вас боляче вжалив джміль!";
export const APIARY_RAID_EVENT_TITLE = "Apiary raid";
export const HONEY_RESOURCE_KEY = "honey";
export const BEESWAX_RESOURCE_KEY = "beeswax";

export type ApiaryAuraKind = "center" | "neighbor" | "outside";
export type ApiaryHazardReason = "move" | "look" | "wait";
export type ApiaryData = Record<string, unknown>;

type ApiaryFeature = {
  id?: number;
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

export function apiaryRaidCooldownMs(data: ApiaryData) {
  return Math.max(0, Math.floor(numberFromData(data, "raid_cooldown_ms", 6 * 60 * 60 * 1000)));
}

export function apiaryRaidSuccessChancePermille(data: ApiaryData) {
  return Math.max(0, Math.floor(numberFromData(data, "raid_success_chance_permille", 700)));
}

export function apiaryRaidWaxChancePermille(data: ApiaryData) {
  return Math.max(0, Math.floor(numberFromData(data, "raid_wax_chance_permille", 350)));
}

export function apiaryRaidDamageRange(data: ApiaryData): [number, number] {
  return damageRangeFromData(data, "raid_damage", [2, 5]);
}

export function apiaryRaidHoneyAmount(data: ApiaryData) {
  return Math.max(1, Math.floor(numberFromData(data, "raid_honey_amount", 1)));
}

export function apiaryRaidOutcome(data: ApiaryData, currentHp: number, random: () => number = Math.random) {
  const success = Math.floor(random() * 1000) < apiaryRaidSuccessChancePermille(data);
  const beeswax = success && Math.floor(random() * 1000) < apiaryRaidWaxChancePermille(data) ? 1 : 0;
  const rolledDamage = rollDamage(apiaryRaidDamageRange(data), random);
  return {
    success,
    honey: success ? apiaryRaidHoneyAmount(data) : 0,
    beeswax,
    ...passiveApiaryDamageResult(currentHp, rolledDamage),
  };
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
    select: { id: true, key: true, locationId: true, data: true },
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

async function apiaryAtCenterLocation(locationId: number, featureId?: number) {
  const apiaries = await activeApiaryFeatures();
  const matches = apiaries.filter((feature) => {
    if (feature.locationId !== locationId) return false;
    if (featureId && featureId !== (feature as any).id) return false;
    return true;
  });
  const feature = matches[0] as (ApiaryFeature & { id?: number }) | undefined;
  return feature ? { feature, data: apiaryData(feature) } : null;
}

async function ensureApiaryRewardResourceTypes(tx: any = prisma) {
  const [honey, beeswax] = await Promise.all([
    tx.resourceType.upsert({
      where: { key: HONEY_RESOURCE_KEY },
      update: {
        name: "мед",
        description: "Густий дикий мед із борті: їжа, ліки, приманка і майбутній торговий товар. Дістати його важче, ніж ягоди.",
      },
      create: {
        key: HONEY_RESOURCE_KEY,
        name: "мед",
        description: "Густий дикий мед із борті: їжа, ліки, приманка і майбутній торговий товар. Дістати його важче, ніж ягоди.",
      },
    }),
    tx.resourceType.upsert({
      where: { key: BEESWAX_RESOURCE_KEY },
      update: {
        name: "віск",
        description: "Жовтий віск із борті: матеріал для свічок, герметизації, обрядів і кращого світла.",
      },
      create: {
        key: BEESWAX_RESOURCE_KEY,
        name: "віск",
        description: "Жовтий віск із борті: матеріал для свічок, герметизації, обрядів і кращого світла.",
      },
    }),
  ]);
  return { honey, beeswax };
}

function apiaryRaidRewardText(outcome: ReturnType<typeof apiaryRaidOutcome>) {
  if (!outcome.success) return "Мед лишається глибше в темній щілині. Цього разу рука повертається порожньою.";
  if (outcome.beeswax > 0) return "У руці лишається липкий мед і жовтий шматочок воску.";
  return "У руці лишається липкий мед.";
}

function apiaryRaidDamageText(outcome: ReturnType<typeof apiaryRaidOutcome>) {
  if (outcome.appliedDamage <= 0) return "Джмелі сердяться, але цього разу не знаходять шкіри.";
  return outcome.nextHp <= 3
    ? "Джмелі не відпускають вас без плати. Тіло просить обережності."
    : "Джмелі не відпускають вас без плати.";
}

export async function raidApiaryForPlayer(playerId: number, featureId?: number, random: () => number = Math.random) {
  const now = new Date();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, currentLocationId: true, hp: true, hpMax: true },
  });
  if (!player?.currentLocationId) throw new Error("Ви ще не стоїте біля місця, де можна шукати мед.");
  if (player.hp <= 1) throw new Error("Тіло ледве тримається на ногах. Лізти до борті зараз нерозумно.");

  const apiary = await apiaryAtCenterLocation(player.currentLocationId, featureId);
  if (!apiary) throw new Error("Поруч немає борті, з якої можна дістати мед.");

  const cooldownMs = apiaryRaidCooldownMs(apiary.data);
  const previous = await prisma.worldEvent.findFirst({
    where: {
      title: APIARY_RAID_EVENT_TITLE,
      description: { contains: apiaryEventMarker(apiary.feature.key) },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (isApiaryCooldownActive(previous?.createdAt, now, cooldownMs)) {
    throw new Error("Бортя вже потривожена. Гул усередині ще надто густий, щоб знову лізти руками.");
  }

  const time = await getCurrentWorldTimeSnapshot(prisma, now);
  const outcome = apiaryRaidOutcome(apiary.data, player.hp, random);

  await prisma.$transaction(async (tx) => {
    const resources = await ensureApiaryRewardResourceTypes(tx);
    await tx.player.update({
      where: { id: player.id },
      data: { hp: outcome.nextHp },
    });
    if (outcome.honey > 0) {
      await tx.playerResource.upsert({
        where: { playerId_resourceTypeId: { playerId: player.id, resourceTypeId: resources.honey.id } },
        update: { amount: { increment: outcome.honey } },
        create: { playerId: player.id, resourceTypeId: resources.honey.id, amount: outcome.honey },
      });
    }
    if (outcome.beeswax > 0) {
      await tx.playerResource.upsert({
        where: { playerId_resourceTypeId: { playerId: player.id, resourceTypeId: resources.beeswax.id } },
        update: { amount: { increment: outcome.beeswax } },
        create: { playerId: player.id, resourceTypeId: resources.beeswax.id, amount: outcome.beeswax },
      });
    }
    await tx.worldEvent.create({
      data: {
        type: "PLAYER_ACTION",
        title: APIARY_RAID_EVENT_TITLE,
        playerId: player.id,
        locationId: player.currentLocationId,
        description: `${apiaryEventMarker(apiary.feature.key)}; success=${outcome.success}; honey=${outcome.honey}; beeswax=${outcome.beeswax}; damage=${outcome.appliedDamage}; daypart=${time.daypart}`,
      },
    });
  });

  const opening = time.daypart === "night"
    ? "Уночі бортя спала тихо — доки ви не торкнулися її руками. Гул прокидається одразу, злий і низький."
    : "Ви обережно торкаєтеся старої борті. Гул усередині густішає.";

  return {
    text: [
      opening,
      apiaryRaidRewardText(outcome),
      apiaryRaidDamageText(outcome),
    ].join("\n\n"),
    outcome,
  };
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
    select: { id: true, telegramId: true, hp: true, hpMax: true, currentLocationId: true },
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
      `${APIARY_PASSIVE_STING_LINE}\n\n${hpFeedback(result.nextHp, player.hpMax)}`,
      { reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), false) },
    ));
  }
  return true;
}
