import { buildActionQueueKeyboard, buildRestingActionChoiceKeyboard } from "../ui/keyboards";
import { hasPlayerActionQueueControls, renderPlayerActionQueue } from "../services/actionQueue";

export async function actionQueueReplyOptions(playerId: number) {
  return (await hasPlayerActionQueueControls(playerId)) ? { reply_markup: buildActionQueueKeyboard(true) } : undefined;
}


export async function sendActionSubmitFeedback(ctx: any, playerId: number, result: { mode: "queued" | "immediate"; shouldPromptRestChoice: boolean; remainingToMax: number }) {
  if (result.mode === "immediate") return;

  if (result.shouldPromptRestChoice) {
    await ctx.reply(
      `Ви зараз відпочиваєте. До повного відновлення лишилось ${result.remainingToMax} витривалості. Перервати відпочинок чи поставити дію в чергу після відпочинку?`,
      { reply_markup: buildRestingActionChoiceKeyboard() }
    );
    return;
  }

  await ctx.reply(await renderPlayerActionQueue(playerId), await actionQueueReplyOptions(playerId));
}
