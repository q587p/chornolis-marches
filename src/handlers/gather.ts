import { Bot } from "grammy";
import { gatherConfig } from "../gameConfig";
import { performOrQueuePlayerAction, gatherDurationMs } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { buildGatherMenuForLocation } from "../services/locations";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";

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

    try {
      const result = await performOrQueuePlayerAction(bot, {
        playerId: player.id,
        type: "GATHER_SPECIFIC",
        payload: { resourceKey },
        durationMs,
        chatId: ctx.chat?.id,
        messageId: ctx.callbackQuery.message?.message_id,
      });

      await safeAnswerCallbackQuery(ctx, result.mode === "immediate" ? "Ви почали пошук." : `Додано в чергу (${Math.ceil(durationMs / 1000)} с).`);
      await sendActionSubmitFeedback(ctx, player.id, result);
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося виконати дію.");
    }
  });
}
