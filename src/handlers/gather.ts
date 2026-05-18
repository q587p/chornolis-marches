import { Bot } from "grammy";
import { gatherConfig } from "../gameConfig";
import { buildActionQueueKeyboard, buildRestingActionChoiceKeyboard } from "../ui/keyboards";
import { enqueuePlayerAction, gatherDurationMs, renderPlayerActionQueue } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { buildGatherMenuForLocation } from "../services/locations";
import { safeAnswerCallbackQuery } from "../utils/telegram";

export function registerGatherHandlers(bot: Bot) {
  bot.callbackQuery("gather:menu", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const keyboard = await buildGatherMenuForLocation(player.currentLocationId);
    await safeAnswerCallbackQuery(ctx);

    try {
      await ctx.editMessageText("Що саме зібрати?", { reply_markup: keyboard });
    } catch {
      await ctx.reply("Що саме зібрати?", { reply_markup: keyboard });
    }
  });

  bot.callbackQuery(/^gather:(berries|mushrooms|herbs)$/, async (ctx) => {
    const resourceKey = ctx.match[1] as "berries" | "mushrooms" | "herbs";
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    if (!gatherConfig[resourceKey]) {
      await safeAnswerCallbackQuery(ctx, "Невідомий матеріял.");
      return;
    }

    const durationMs = gatherDurationMs(resourceKey);

    let enqueueResult: Awaited<ReturnType<typeof enqueuePlayerAction>>;
    try {
      enqueueResult = await enqueuePlayerAction({
        playerId: player.id,
        type: "GATHER_SPECIFIC",
        payload: { resourceKey },
        durationMs,
        chatId: ctx.chat?.id,
        messageId: ctx.callbackQuery.message?.message_id,
      });
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося додати дію.");
      return;
    }

    const queueText = await renderPlayerActionQueue(player.id);
    await safeAnswerCallbackQuery(ctx, `Додано в чергу (${Math.ceil(durationMs / 1000)} с).`);
    if (enqueueResult.shouldPromptRestChoice) {
      await ctx.reply(`Ви зараз відпочиваєте. До повного відновлення лишилось ${enqueueResult.remainingToMax} витривалості. Перервати відпочинок чи поставити дію в чергу після відпочинку?`, { reply_markup: buildRestingActionChoiceKeyboard() });
    } else {
      await ctx.reply(queueText, { reply_markup: buildActionQueueKeyboard() });
    }
  });
}
