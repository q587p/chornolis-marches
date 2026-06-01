import type { Bot } from "grammy";
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

export async function queueAllRawMeatCooking(bot: Bot, player: CookAllPlayer, chatId?: number | string) {
  assertCanPerformPhysicalAction(player, "COOK");

  const [rawMeatAmount, hasCookFire] = await Promise.all([
    playerRawMeatAmount(player.id),
    canCookPlayerMeat(player.id),
  ]);

  if (rawMeatAmount <= 0) throw new Error("У ваших речах немає сирого м'яса.");
  if (!hasCookFire) throw new Error("Потрібне вогнище поруч. Самого факела замало, щоб посмажити м'ясо.");

  const durationMs = actionDurationMs("COOK", player.stamina);
  for (let i = 0; i < rawMeatAmount; i += 1) {
    await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type: "COOK",
      payload: {},
      durationMs,
      chatId,
    });
  }

  return { count: rawMeatAmount, durationMs };
}
