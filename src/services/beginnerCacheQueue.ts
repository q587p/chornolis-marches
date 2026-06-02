import type { Bot } from "grammy";
import type { WorldAction } from "@prisma/client";
import { prisma } from "../db";
import { MAX_QUEUED_ACTIONS_PER_ACTOR } from "../gameConfig";
import { actionDurationMs, performOrQueuePlayerAction } from "./actionQueue";
import {
  beginnerCacheActionLabel,
  beginnerCacheCombinedMaxStock,
  beginnerCacheCombinedStock,
  beginnerCacheDataAfterHiddenRestock,
  beginnerCacheResourceKeyFromText,
  isBeginnerCacheData,
  type BeginnerCacheResourceKey,
} from "./beginnerCache";
import { assertCanPerformPhysicalAction } from "./postureRules";

type CacheContributionPlayer = {
  id: number;
  stamina: number;
  posture?: string | null;
  sleepState?: string | null;
  isResting?: boolean | null;
};

export type BeginnerCacheContributeAllPlan = {
  count: number;
  carriedAmount: number;
  activeActionCount: number;
  activeContributionCount: number;
  availableSlots: number;
  alreadyPlanned: number;
  unplannedCarried: number;
  freeCapacity: number;
  limitedByQueue: boolean;
  limitedByCapacity: boolean;
};

function actionPayload(action: Pick<WorldAction, "payload">) {
  const payload = action.payload;
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
}

export function isBeginnerCacheContributionPayload(payload: unknown): payload is {
  cacheContribution: true;
  featureId: number;
  resourceKey: BeginnerCacheResourceKey;
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const record = payload as Record<string, unknown>;
  return record.cacheContribution === true
    && typeof record.featureId === "number"
    && typeof record.resourceKey === "string"
    && Boolean(beginnerCacheResourceKeyFromText(record.resourceKey));
}

export function planBeginnerCacheContributeAll(input: {
  carriedAmount: number;
  requestedAmount?: number | "all";
  stock: number;
  maxStock: number;
  activeActionCount: number;
  activeContributionCount: number;
  maxQueuedActions?: number;
}): BeginnerCacheContributeAllPlan {
  const maxQueuedActions = input.maxQueuedActions ?? MAX_QUEUED_ACTIONS_PER_ACTOR;
  const carriedAmount = Math.max(0, Math.floor(input.carriedAmount));
  const requestedAmount = input.requestedAmount === "all" || input.requestedAmount === undefined
    ? carriedAmount
    : Math.max(0, Math.floor(input.requestedAmount));
  const targetAmount = Math.min(carriedAmount, requestedAmount);
  const stock = Math.max(0, Math.floor(input.stock));
  const maxStock = Math.max(0, Math.floor(input.maxStock));
  const activeActionCount = Math.max(0, Math.floor(input.activeActionCount));
  const activeContributionCount = Math.max(0, Math.floor(input.activeContributionCount));
  const alreadyPlanned = Math.min(targetAmount, activeContributionCount);
  const unplannedCarried = Math.max(0, targetAmount - alreadyPlanned);
  const freeCapacity = Math.max(0, maxStock - stock - activeContributionCount);
  const availableSlots = Math.max(0, maxQueuedActions - activeActionCount);
  const count = Math.min(unplannedCarried, freeCapacity, availableSlots);

  return {
    count,
    carriedAmount,
    activeActionCount,
    activeContributionCount,
    availableSlots,
    alreadyPlanned,
    unplannedCarried,
    freeCapacity,
    limitedByQueue: count < Math.min(unplannedCarried, freeCapacity),
    limitedByCapacity: count < Math.min(unplannedCarried, availableSlots),
  };
}

async function activePlayerActionCounts(playerId: number, featureId: number, resourceKey: BeginnerCacheResourceKey) {
  const actions = await prisma.worldAction.findMany({
    where: {
      actorType: "PLAYER",
      playerId,
      status: { in: ["QUEUED", "RUNNING"] },
    },
    select: { type: true, payload: true },
  });

  let activeContributionCount = 0;
  for (const action of actions) {
    if (action.type !== "DROP_ITEM") continue;
    const payload = actionPayload(action);
    if (payload.cacheContribution === true && payload.featureId === featureId && payload.resourceKey === resourceKey) {
      activeContributionCount += 1;
    }
  }

  return {
    activeActionCount: actions.length,
    activeContributionCount,
  };
}

export async function queueAllBeginnerCacheContributions(
  bot: Bot,
  player: CacheContributionPlayer,
  featureId: number,
  requestedKey?: string | null,
  requestedAmount?: number | "all",
  chatId?: number | string,
) {
  assertCanPerformPhysicalAction(player, "DROP_ITEM");
  const key = beginnerCacheResourceKeyFromText(requestedKey);
  if (!key) throw new Error("Що саме залишити все у спільній скрині? Підійдуть ягоди, лікарські трави, гриби, сире чи смажене м'ясо або хмиз.");

  const dbPlayer = await prisma.player.findUnique({
    where: { id: player.id },
    select: { currentLocationId: true },
  });
  if (!dbPlayer?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");

  const feature = await prisma.locationFeature.findFirst({
    where: {
      id: featureId,
      locationId: dbPlayer.currentLocationId,
      isActive: true,
      data: { path: ["beginner_cache"], equals: true },
    },
    orderBy: { id: "asc" },
  });
  if (!feature || !isBeginnerCacheData(feature.data)) throw new Error("Поруч немає спільної скрині.");

  const resourceType = await prisma.resourceType.findUnique({ where: { key } });
  if (!resourceType) throw new Error("Світ ще не знає такої речі для скрині.");

  const [carried, activeCounts] = await Promise.all([
    prisma.playerResource.findUnique({
      where: { playerId_resourceTypeId: { playerId: player.id, resourceTypeId: resourceType.id } },
      select: { amount: true },
    }),
    activePlayerActionCounts(player.id, feature.id, key),
  ]);
  const carriedAmount = Math.max(0, carried?.amount ?? 0);
  if (carriedAmount <= 0) throw new Error(`У ваших речах немає: ${beginnerCacheActionLabel(key)}.`);
  if (typeof requestedAmount === "number" && requestedAmount > carriedAmount) {
    throw new Error(`У ваших речах стільки немає. Можна лишити щонайбільше ${carriedAmount}.`);
  }

  const restocked = beginnerCacheDataAfterHiddenRestock(feature.data);
  const stock = beginnerCacheCombinedStock(restocked);
  const maxStock = beginnerCacheCombinedMaxStock(restocked);
  const plan = planBeginnerCacheContributeAll({
    carriedAmount,
    requestedAmount,
    stock: stock[key],
    maxStock: maxStock[key],
    ...activeCounts,
  });

  if (plan.count <= 0 && plan.unplannedCarried <= 0) {
    throw new Error(`Усе це вже стоїть у черзі до спільної скрині: ${beginnerCacheActionLabel(key)}.`);
  }
  if (plan.count <= 0 && plan.freeCapacity <= 0) {
    throw new Error(`Для цього у скрині вже досить місця зайнято або заплановано: ${beginnerCacheActionLabel(key)}.`);
  }
  if (plan.count <= 0) {
    throw new Error(`У черзі вже ${MAX_QUEUED_ACTIONS_PER_ACTOR} дій. Спершу дочекайся виконання або очисти чергу.`);
  }

  const durationMs = actionDurationMs("DROP_ITEM", player.stamina);
  for (let i = 0; i < plan.count; i += 1) {
    await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type: "DROP_ITEM",
      payload: { cacheContribution: true, featureId: feature.id, resourceKey: key },
      durationMs,
      chatId,
    });
  }

  return {
    ...plan,
    key,
    label: beginnerCacheActionLabel(key),
    durationMs,
  };
}
