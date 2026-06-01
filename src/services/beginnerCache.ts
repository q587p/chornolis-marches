import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { canPickUpGroundItem } from "./groundItems";
import { inventoryResourceKeyFromText } from "./inventoryUse";
import { resourceTypeDisplayName } from "./corpses";

export const BEGINNER_CACHE_FEATURE_KEY = "start_beginner_shared_cache";
export const BEGINNER_CACHE_RESTOCK_AFTER_MS = 45 * 60 * 1000;

const CACHE_ITEM_ORDER = ["torch", "berries", "herbs", "mushrooms", "twigs"] as const;
export type BeginnerCacheResourceKey = (typeof CACHE_ITEM_ORDER)[number];

const CACHE_ITEM_LABELS: Record<BeginnerCacheResourceKey, string> = {
  torch: "факел",
  berries: "ягоди",
  herbs: "лікарські трави",
  mushrooms: "гриби",
  twigs: "хмиз",
};

const CACHE_ITEM_ACCUSATIVE: Record<BeginnerCacheResourceKey, string> = {
  torch: "факел",
  berries: "ягоди",
  herbs: "лікарські трави",
  mushrooms: "гриби",
  twigs: "хмиз",
};

const DEFAULT_STOCK: Record<BeginnerCacheResourceKey, number> = {
  torch: 1,
  berries: 2,
  herbs: 1,
  mushrooms: 0,
  twigs: 3,
};

const DEFAULT_MAX_STOCK: Record<BeginnerCacheResourceKey, number> = {
  torch: 3,
  berries: 6,
  herbs: 4,
  mushrooms: 4,
  twigs: 10,
};

const RESTOCK_TARGET: Record<BeginnerCacheResourceKey, number> = {
  torch: 2,
  berries: 3,
  herbs: 1,
  mushrooms: 1,
  twigs: 5,
};

type JsonRecord = Record<string, unknown>;

function jsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function jsonInput(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function intFromJson(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function dateFromJson(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function stockRecordFromData(data: JsonRecord, key: "cache_stock" | "cache_max_stock", fallback: Record<BeginnerCacheResourceKey, number>) {
  const stock = jsonRecord(data[key]);
  return Object.fromEntries(
    CACHE_ITEM_ORDER.map((resourceKey) => [resourceKey, intFromJson(stock[resourceKey], fallback[resourceKey])]),
  ) as Record<BeginnerCacheResourceKey, number>;
}

export function isBeginnerCacheData(data: unknown) {
  return jsonRecord(data).beginner_cache === true;
}

export function beginnerCacheResourceKeyFromText(query?: string | null): BeginnerCacheResourceKey | null {
  if (!query?.trim()) return null;
  const key = inventoryResourceKeyFromText(query);
  return (CACHE_ITEM_ORDER as readonly string[]).includes(key) ? key as BeginnerCacheResourceKey : null;
}

export function beginnerCacheStock(data: unknown) {
  return stockRecordFromData(jsonRecord(data), "cache_stock", DEFAULT_STOCK);
}

export function beginnerCacheMaxStock(data: unknown) {
  return stockRecordFromData(jsonRecord(data), "cache_max_stock", DEFAULT_MAX_STOCK);
}

function amountPhrase(amount: number) {
  if (amount <= 0) return "немає";
  if (amount === 1) return "один";
  if (amount <= 3) return "трохи";
  return "досить";
}

export function beginnerCacheStockLines(data: unknown) {
  const stock = beginnerCacheStock(data);
  return CACHE_ITEM_ORDER
    .filter((key) => stock[key] > 0)
    .map((key) => `- ${CACHE_ITEM_LABELS[key]}: ${amountPhrase(stock[key])}`);
}

export function beginnerCacheInspectionText(feature: { description?: string | null; data?: unknown }) {
  const lines = beginnerCacheStockLines(feature.data);
  return [
    feature.description ?? "Під навісом стоїть спільна скриня для тих, хто щойно вийшов до Межі.",
    "",
    lines.length
      ? ["Усередині зараз видно:", ...lines].join("\n")
      : "Скриня майже порожня. Можна лишити щось просте для наступного прибулого.",
    "",
    "Можна взяти одну потрібну річ або залишити зайве. Це не крамниця й не нагорода: просто табір пам’ятає, що перша ніч буває темною.",
  ].join("\n");
}

function restockedStock(data: JsonRecord, now: Date) {
  const stock = beginnerCacheStock(data);
  const maxStock = beginnerCacheMaxStock(data);
  const lastObservedAt = dateFromJson(data.cache_last_observed_at);
  const lastRestockedAt = dateFromJson(data.cache_last_restocked_at);
  const restockAfterMs = intFromJson(data.cache_restock_after_ms, BEGINNER_CACHE_RESTOCK_AFTER_MS);
  const wasUnobservedLongEnough = !lastObservedAt || now.getTime() - lastObservedAt.getTime() >= restockAfterMs;
  const restockCooldownPassed = !lastRestockedAt || now.getTime() - lastRestockedAt.getTime() >= restockAfterMs;
  if (!wasUnobservedLongEnough || !restockCooldownPassed) return null;

  let changed = false;
  const next = { ...stock };
  for (const key of CACHE_ITEM_ORDER) {
    const target = intFromJson(jsonRecord(data.cache_restock_target)[key], RESTOCK_TARGET[key]);
    if (next[key] < target) {
      next[key] = Math.min(maxStock[key], target);
      changed = true;
    }
  }

  return changed ? next : null;
}

export function beginnerCacheDataAfterHiddenRestock(data: unknown, now = new Date()) {
  const current = jsonRecord(data);
  if (!isBeginnerCacheData(current)) return current;
  const nextStock = restockedStock(current, now);
  if (!nextStock) return current;
  return {
    ...current,
    cache_stock: nextStock,
    cache_last_restocked_at: now.toISOString(),
  };
}

export function beginnerCacheDataAfterObservation(data: unknown, now = new Date()) {
  return {
    ...jsonRecord(data),
    cache_last_observed_at: now.toISOString(),
  };
}

export async function prepareBeginnerCacheForInspection(featureId: number, now = new Date()) {
  const feature = await prisma.locationFeature.findUnique({ where: { id: featureId }, include: { location: true } });
  if (!feature || !feature.isActive || !isBeginnerCacheData(feature.data)) return feature;

  const restocked = beginnerCacheDataAfterHiddenRestock(feature.data, now);
  const observed = beginnerCacheDataAfterObservation(restocked, now);
  return prisma.locationFeature.update({
    where: { id: feature.id },
    data: { data: jsonInput(observed) },
    include: { location: true },
  });
}

async function localBeginnerCacheForPlayer(tx: Prisma.TransactionClient, player: { currentLocationId: number | null }, featureId?: number | null) {
  if (!player.currentLocationId) return null;
  return tx.locationFeature.findFirst({
    where: {
      ...(featureId ? { id: featureId } : {}),
      locationId: player.currentLocationId,
      isActive: true,
      data: { path: ["beginner_cache"], equals: true },
    },
    orderBy: { id: "asc" },
  });
}

export async function takeFromBeginnerCache(playerId: number, featureId: number, requestedKey?: string | null) {
  const key = beginnerCacheResourceKeyFromText(requestedKey) ?? "torch";
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({
      where: { id: playerId },
      select: { currentLocationId: true, hp: true, stamina: true, isResting: true, posture: true, sleepState: true },
    });
    if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
    if (!canPickUpGroundItem(player)) throw new Error("Ви надто втомлені, щоб брати це просто зараз. Спершу перепочиньте.");

    const feature = await localBeginnerCacheForPlayer(tx, player, featureId);
    if (!feature) throw new Error("Поруч немає спільної скрині.");

    const restocked = beginnerCacheDataAfterHiddenRestock(feature.data, now);
    const stock = beginnerCacheStock(restocked);
    if (stock[key] <= 0) throw new Error(`У скрині зараз немає: ${CACHE_ITEM_LABELS[key]}.`);

    const resourceType = await tx.resourceType.findUnique({ where: { key } });
    if (!resourceType) throw new Error("Світ ще не знає такої речі для скрині.");

    const nextStock = { ...stock, [key]: stock[key] - 1 };
    await tx.locationFeature.update({
      where: { id: feature.id },
      data: { data: jsonInput(beginnerCacheDataAfterObservation({ ...jsonRecord(restocked), cache_stock: nextStock }, now)) },
    });
    await tx.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: resourceType.id } },
      update: { amount: { increment: 1 } },
      create: { playerId, resourceTypeId: resourceType.id, amount: 1 },
    });

    return {
      featureId: feature.id,
      locationId: feature.locationId,
      key,
      name: resourceTypeDisplayName(resourceType),
      text: `Ви взяли зі спільної скрині ${CACHE_ITEM_ACCUSATIVE[key]}.`,
    };
  });
}

export async function contributeToBeginnerCache(playerId: number, featureId?: number | null, requestedKey?: string | null) {
  const key = beginnerCacheResourceKeyFromText(requestedKey);
  if (!key) throw new Error("Що саме залишити у спільній скрині? Підійдуть факел, ягоди, лікарські трави, гриби або хмиз.");
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({
      where: { id: playerId },
      select: { currentLocationId: true, hp: true, stamina: true, isResting: true, posture: true, sleepState: true },
    });
    if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
    if (!canPickUpGroundItem(player)) throw new Error("Ви надто втомлені, щоб перекладати речі просто зараз. Спершу перепочиньте.");

    const feature = await localBeginnerCacheForPlayer(tx, player, featureId);
    if (!feature) throw new Error("Поруч немає спільної скрині.");

    const resourceType = await tx.resourceType.findUnique({ where: { key } });
    if (!resourceType) throw new Error("Світ ще не знає такої речі для скрині.");
    const carried = await tx.playerResource.findUnique({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: resourceType.id } },
    });
    if (!carried || carried.amount <= 0) throw new Error(`У ваших речах немає: ${CACHE_ITEM_LABELS[key]}.`);

    const restocked = beginnerCacheDataAfterHiddenRestock(feature.data, now);
    const stock = beginnerCacheStock(restocked);
    const maxStock = beginnerCacheMaxStock(restocked);
    if (stock[key] >= maxStock[key]) throw new Error(`Для цього у скрині вже досить місця зайнято: ${CACHE_ITEM_LABELS[key]}.`);

    if (carried.amount > 1) {
      await tx.playerResource.update({ where: { id: carried.id }, data: { amount: { decrement: 1 } } });
    } else {
      await tx.playerResource.delete({ where: { id: carried.id } });
    }

    const nextStock = { ...stock, [key]: Math.min(maxStock[key], stock[key] + 1) };
    await tx.locationFeature.update({
      where: { id: feature.id },
      data: { data: jsonInput(beginnerCacheDataAfterObservation({ ...jsonRecord(restocked), cache_stock: nextStock }, now)) },
    });

    return {
      featureId: feature.id,
      locationId: feature.locationId,
      key,
      name: resourceTypeDisplayName(resourceType),
      text: `Ви залишили у спільній скрині ${CACHE_ITEM_ACCUSATIVE[key]}.`,
    };
  });
}

export async function playerBeginnerCacheContributionKeys(playerId: number) {
  const resources = await prisma.playerResource.findMany({
    where: { playerId, amount: { gt: 0 }, resourceType: { key: { in: [...CACHE_ITEM_ORDER] } } },
    include: { resourceType: true },
    orderBy: { id: "asc" },
  });
  return resources.map((resource) => resource.resourceType.key as BeginnerCacheResourceKey);
}

export function beginnerCacheActionLabel(key: BeginnerCacheResourceKey) {
  return CACHE_ITEM_LABELS[key];
}

export function beginnerCacheTakeKeys(data: unknown) {
  const stock = beginnerCacheStock(data);
  return CACHE_ITEM_ORDER.filter((key) => stock[key] > 0);
}
