import { buildActionQueueKeyboard, buildRestingActionChoiceKeyboard } from "../ui/keyboards";
import { hasPlayerActionQueueControls, renderPlayerActionQueue } from "../services/actionQueue";

export async function actionQueueReplyOptions(playerId: number) {
  return (await hasPlayerActionQueueControls(playerId)) ? { reply_markup: buildActionQueueKeyboard(true) } : undefined;
}

async function editOrReply(ctx: any, text: string, options?: any) {
  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, options);
      return;
    } catch {
      // Fall back to a new message when Telegram cannot edit the source message.
    }
  }

  await ctx.reply(text, options);
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

  await editOrReply(ctx, await renderPlayerActionQueue(playerId), await actionQueueReplyOptions(playerId));
}
