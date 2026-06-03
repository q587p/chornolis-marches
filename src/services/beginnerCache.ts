import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { canPickUpGroundItem } from "./groundItems";
import { inventoryResourceKeyFromText } from "./inventoryUse";
import { resourceTypeDisplayName } from "./corpses";
import { GRIVNA_RESOURCE_KEY, isMoneyResourceKey, moneyAmountText, SHAH_RESOURCE_KEY, type MoneyResourceKey } from "../utils/moneyText";

export const BEGINNER_CACHE_FEATURE_KEY = "start_beginner_shared_cache";
export const BEGINNER_CACHE_RESTOCK_AFTER_MS = 45 * 60 * 1000;

const CACHE_ITEM_ORDER = ["berries", "herbs", "mushrooms", "raw_meat", "cooked_meat", "honey", "beeswax", "twigs"] as const;
const CACHE_MONEY_ORDER = [SHAH_RESOURCE_KEY, GRIVNA_RESOURCE_KEY] as const;
export type BeginnerCacheSupplyKey = (typeof CACHE_ITEM_ORDER)[number];
export type BeginnerCacheResourceKey = BeginnerCacheSupplyKey | MoneyResourceKey;

const CACHE_ITEM_LABELS: Record<BeginnerCacheResourceKey, string> = {
  berries: "ягоди",
  herbs: "лікарські трави",
  mushrooms: "гриби",
  raw_meat: "сире м'ясо",
  cooked_meat: "смажене м'ясо",
  honey: "мед",
  beeswax: "віск",
  twigs: "хмиз",
  shah: "шаг",
  grivna: "ґривня",
};

const CACHE_ITEM_ACCUSATIVE: Record<BeginnerCacheResourceKey, string> = {
  berries: "ягоди",
  herbs: "лікарські трави",
  mushrooms: "гриби",
  raw_meat: "сире м'ясо",
  cooked_meat: "смажене м'ясо",
  honey: "мед",
  beeswax: "віск",
  twigs: "хмиз",
  shah: "шаг",
  grivna: "ґривню",
};

const CACHE_ITEM_ALL_QUANTIFIERS: Record<BeginnerCacheResourceKey, string> = {
  berries: "всі",
  herbs: "всі",
  mushrooms: "всі",
  raw_meat: "все",
  cooked_meat: "все",
  honey: "весь",
  beeswax: "весь",
  twigs: "весь",
  shah: "всі",
  grivna: "всі",
};

const DEFAULT_STOCK: Record<BeginnerCacheResourceKey, number> = {
  berries: 4,
  herbs: 2,
  mushrooms: 2,
  raw_meat: 4,
  cooked_meat: 2,
  honey: 0,
  beeswax: 0,
  twigs: 8,
  shah: 0,
  grivna: 0,
};

const DEFAULT_MAX_STOCK: Record<BeginnerCacheResourceKey, number> = {
  berries: 10,
  herbs: 6,
  mushrooms: 6,
  raw_meat: 8,
  cooked_meat: 5,
  honey: 5,
  beeswax: 5,
  twigs: 14,
  shah: 200,
  grivna: 20,
};

const RESTOCK_TARGET: Record<BeginnerCacheResourceKey, number> = {
  berries: 4,
  herbs: 2,
  mushrooms: 2,
  raw_meat: 4,
  cooked_meat: 2,
  honey: 0,
  beeswax: 0,
  twigs: 8,
  shah: 0,
  grivna: 0,
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

function stockRecordFromData<T extends readonly BeginnerCacheResourceKey[]>(data: JsonRecord, keys: T, key: "cache_stock" | "cache_max_stock" | "cache_restock_target" | "cache_money_stock" | "cache_money_max_stock" | "cache_money_restock_target", fallback: Record<BeginnerCacheResourceKey, number>) {
  const stock = jsonRecord(data[key]);
  return Object.fromEntries(
    keys.map((resourceKey) => [resourceKey, intFromJson(stock[resourceKey], fallback[resourceKey])]),
  ) as Record<T[number], number>;
}

export function isBeginnerCacheData(data: unknown) {
  return jsonRecord(data).beginner_cache === true;
}

export function beginnerCacheResourceKeyFromText(query?: string | null): BeginnerCacheResourceKey | null {
  if (!query?.trim()) return null;
  const key = inventoryResourceKeyFromText(query);
  return ([...CACHE_ITEM_ORDER, ...CACHE_MONEY_ORDER] as readonly string[]).includes(key) ? key as BeginnerCacheResourceKey : null;
}

export function beginnerCacheStock(data: unknown) {
  return stockRecordFromData(jsonRecord(data), CACHE_ITEM_ORDER, "cache_stock", DEFAULT_STOCK);
}

export function beginnerCacheMoneyStock(data: unknown) {
  return stockRecordFromData(jsonRecord(data), CACHE_MONEY_ORDER, "cache_money_stock", DEFAULT_STOCK);
}

export function beginnerCacheCombinedStock(data: unknown): Record<BeginnerCacheResourceKey, number> {
  return { ...beginnerCacheStock(data), ...beginnerCacheMoneyStock(data) };
}

export function beginnerCacheMaxStock(data: unknown) {
  return stockRecordFromData(jsonRecord(data), CACHE_ITEM_ORDER, "cache_max_stock", DEFAULT_MAX_STOCK);
}

export function beginnerCacheMoneyMaxStock(data: unknown) {
  return stockRecordFromData(jsonRecord(data), CACHE_MONEY_ORDER, "cache_money_max_stock", DEFAULT_MAX_STOCK);
}

export function beginnerCacheCombinedMaxStock(data: unknown): Record<BeginnerCacheResourceKey, number> {
  return { ...beginnerCacheMaxStock(data), ...beginnerCacheMoneyMaxStock(data) };
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

export function beginnerCacheMoneyStockLines(data: unknown) {
  const stock = beginnerCacheMoneyStock(data);
  return CACHE_MONEY_ORDER
    .filter((key) => stock[key] > 0)
    .map((key) => `- ${moneyAmountText(key, stock[key])}`);
}

export function beginnerCacheInspectionText(feature: { description?: string | null; data?: unknown }, options: { catPresenceLine?: string | null } = {}) {
  const lines = beginnerCacheStockLines(feature.data);
  const moneyLines = beginnerCacheMoneyStockLines(feature.data);
  return [
    feature.description ?? "Під навісом стоїть спільна скриня для тих, хто щойно вийшов до Межі.",
    "",
    lines.length
      ? ["Усередині зараз видно:", ...lines].join("\n")
      : "Скриня майже порожня. Можна лишити щось просте для наступного прибулого.",
    "",
    moneyLines.length
      ? ["У малій коробці для монет зараз видно:", ...moneyLines].join("\n")
      : "Мала коробка для монет порожня.",
    ...(options.catPresenceLine ? ["", options.catPresenceLine] : []),
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

function cacheStockKeyForResource(key: BeginnerCacheResourceKey) {
  return isMoneyResourceKey(key) ? "cache_money_stock" : "cache_stock";
}

function cacheStockForKey(data: unknown, key: BeginnerCacheResourceKey) {
  return isMoneyResourceKey(key) ? beginnerCacheMoneyStock(data)[key] : beginnerCacheStock(data)[key];
}

function cacheMaxStockForKey(data: unknown, key: BeginnerCacheResourceKey) {
  return isMoneyResourceKey(key) ? beginnerCacheMoneyMaxStock(data)[key] : beginnerCacheMaxStock(data)[key];
}

function updateCacheStockForKey(data: unknown, key: BeginnerCacheResourceKey, amount: number) {
  const current = jsonRecord(data);
  const stockKey = cacheStockKeyForResource(key);
  const stock = isMoneyResourceKey(key) ? beginnerCacheMoneyStock(current) : beginnerCacheStock(current);
  return {
    ...current,
    [stockKey]: {
      ...stock,
      [key]: Math.max(0, Math.floor(amount)),
    },
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
  const key = beginnerCacheResourceKeyFromText(requestedKey);
  if (!key) throw new Error("Що саме взяти зі спільної скрині? Тут лишають їжу, м'ясо, трави, гриби або хмиз; факели стоять окремо на поставці поруч.");
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
    const stockAmount = cacheStockForKey(restocked, key);
    if (stockAmount <= 0) throw new Error(`У скрині зараз немає: ${CACHE_ITEM_LABELS[key]}.`);

    const resourceType = await tx.resourceType.findUnique({ where: { key } });
    if (!resourceType) throw new Error("Світ ще не знає такої речі для скрині.");

    await tx.locationFeature.update({
      where: { id: feature.id },
      data: { data: jsonInput(beginnerCacheDataAfterObservation(updateCacheStockForKey(restocked, key, stockAmount - 1), now)) },
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
  if (!key) throw new Error("Що саме залишити у спільній скрині? Підійдуть ягоди, лікарські трави, гриби, сире чи смажене м'ясо або хмиз. Факели стоять окремо на поставці поруч.");
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
    const stockAmount = cacheStockForKey(restocked, key);
    const maxStockAmount = cacheMaxStockForKey(restocked, key);
    if (stockAmount >= maxStockAmount) throw new Error(`Для цього у скрині вже досить місця зайнято: ${CACHE_ITEM_LABELS[key]}.`);

    if (carried.amount > 1) {
      await tx.playerResource.update({ where: { id: carried.id }, data: { amount: { decrement: 1 } } });
    } else {
      await tx.playerResource.delete({ where: { id: carried.id } });
    }

    await tx.locationFeature.update({
      where: { id: feature.id },
      data: { data: jsonInput(beginnerCacheDataAfterObservation(updateCacheStockForKey(restocked, key, Math.min(maxStockAmount, stockAmount + 1)), now)) },
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
    where: { playerId, amount: { gt: 0 }, resourceType: { key: { in: [...CACHE_ITEM_ORDER, ...CACHE_MONEY_ORDER] } } },
    include: { resourceType: true },
    orderBy: { id: "asc" },
  });
  return resources.map((resource) => resource.resourceType.key as BeginnerCacheResourceKey);
}

export function beginnerCacheActionLabel(key: BeginnerCacheResourceKey) {
  return CACHE_ITEM_LABELS[key];
}

export function beginnerCacheContributeAllButtonLabel(key: BeginnerCacheResourceKey) {
  if (isMoneyResourceKey(key)) return `🪙 Лишити ${CACHE_ITEM_ALL_QUANTIFIERS[key]} ${key === SHAH_RESOURCE_KEY ? "шаги" : "ґривні"}`;
  return `🤲 Лишити ${CACHE_ITEM_ALL_QUANTIFIERS[key]} ${CACHE_ITEM_LABELS[key]}`;
}

export function beginnerCacheTakeButtonLabel(key: BeginnerCacheResourceKey) {
  return isMoneyResourceKey(key) ? `🪙 Взяти ${CACHE_ITEM_ACCUSATIVE[key]}` : `📦 Взяти ${CACHE_ITEM_LABELS[key]}`;
}

export function beginnerCacheContributeButtonLabel(key: BeginnerCacheResourceKey) {
  return isMoneyResourceKey(key) ? `🪙 Лишити ${CACHE_ITEM_ACCUSATIVE[key]}` : `🤲 Лишити ${CACHE_ITEM_LABELS[key]}`;
}

export function beginnerCacheTakeKeys(data: unknown) {
  const stock = beginnerCacheCombinedStock(data);
  return [...CACHE_ITEM_ORDER, ...CACHE_MONEY_ORDER].filter((key) => stock[key] > 0);
}
