import type { Bot } from "grammy";
import { WorldActionType } from "@prisma/client";
import { prisma } from "../db";
import { MAX_QUEUED_ACTIONS_PER_ACTOR } from "../gameConfig";
import { actionDurationMs, performOrQueuePlayerAction } from "./actionQueue";
import { canCookPlayerMeat, playerRawMeatAmount } from "./meat";
import { assertCanPerformPhysicalAction } from "./postureRules";

type CookAllPlayer = {
  id: number;
  stamina: number;
  posture?: string | null;
  sleepState?: string | null;
  isResting?: boolean | null;
};

export type CookAllPlan = {
  count: number;
  rawMeatAmount: number;
  activeActionCount: number;
  activeCookActionCount: number;
  availableSlots: number;
  alreadyPlanned: number;
  unplannedRawMeat: number;
  limitedByQueue: boolean;
};

export function planCookAllRawMeat(input: {
  rawMeatAmount: number;
  activeActionCount: number;
  activeCookActionCount: number;
  maxQueuedActions?: number;
}): CookAllPlan {
  const maxQueuedActions = input.maxQueuedActions ?? MAX_QUEUED_ACTIONS_PER_ACTOR;
  const rawMeatAmount = Math.max(0, Math.floor(input.rawMeatAmount));
  const activeActionCount = Math.max(0, Math.floor(input.activeActionCount));
  const activeCookActionCount = Math.max(0, Math.floor(input.activeCookActionCount));
  const alreadyPlanned = Math.min(rawMeatAmount, activeCookActionCount);
  const unplannedRawMeat = Math.max(0, rawMeatAmount - alreadyPlanned);
  const availableSlots = Math.max(0, maxQueuedActions - activeActionCount);
  const count = Math.min(unplannedRawMeat, availableSlots);

  return {
    count,
    rawMeatAmount,
    activeActionCount,
    activeCookActionCount,
    availableSlots,
    alreadyPlanned,
    unplannedRawMeat,
    limitedByQueue: count < unplannedRawMeat,
  };
}

async function activePlayerActionCounts(playerId: number) {
  const actions = await prisma.worldAction.groupBy({
    by: ["type"],
    where: {
      actorType: "PLAYER",
      playerId,
      status: { in: ["QUEUED", "RUNNING"] },
    },
    _count: { _all: true },
  });

  let activeActionCount = 0;
  let activeCookActionCount = 0;
  for (const action of actions) {
    const count = action._count._all;
    activeActionCount += count;
    if (action.type === WorldActionType.COOK) activeCookActionCount += count;
  }

  return { activeActionCount, activeCookActionCount };
}

export async function queueAllRawMeatCooking(bot: Bot, player: CookAllPlayer, chatId?: number | string) {
  assertCanPerformPhysicalAction(player, "COOK");

  const [rawMeatAmount, hasCookFire, actionCounts] = await Promise.all([
    playerRawMeatAmount(player.id),
    canCookPlayerMeat(player.id),
    activePlayerActionCounts(player.id),
  ]);

  if (rawMeatAmount <= 0) throw new Error("У ваших речах немає сирого м'яса.");
  if (!hasCookFire) throw new Error("Потрібне вогнище поруч. Самого факела замало, щоб посмажити м'ясо.");

  const plan = planCookAllRawMeat({ rawMeatAmount, ...actionCounts });
  if (plan.count <= 0 && plan.unplannedRawMeat <= 0) {
    throw new Error("Усе сире м'ясо вже стоїть у черзі на підсмажування.");
  }
  if (plan.count <= 0) {
    throw new Error(`У черзі вже ${MAX_QUEUED_ACTIONS_PER_ACTOR} дій. Спершу дочекайся виконання або очисти чергу.`);
  }

  const durationMs = actionDurationMs("COOK", player.stamina);
  for (let i = 0; i < plan.count; i += 1) {
    await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type: "COOK",
      payload: {},
      durationMs,
      chatId,
    });
  }

  return { ...plan, durationMs };
}
