import { Bot } from "grammy";
import { actionDurationMs, performOrQueuePlayerAction } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { renderLocationDetails, renderLocationFeatureInteraction } from "../services/locations";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";

export function registerLookHandlers(bot: Bot) {
  bot.command("look", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const player = await getPlayerByTelegramId(from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const durationMs = actionDurationMs("LOOK", player.stamina);
    try {
      const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "LOOK", payload: {}, durationMs, chatId: ctx.chat?.id });
      await sendActionSubmitFeedback(ctx, player.id, result);
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося виконати дію.");
    }
  });

  bot.callbackQuery("look", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const durationMs = actionDurationMs("LOOK", player.stamina);
    try {
      const result = await performOrQueuePlayerAction(bot, {
        playerId: player.id,
        type: "LOOK",
        payload: {},
        durationMs,
        chatId: ctx.chat?.id,
        messageId: ctx.callbackQuery.message?.message_id,
      });
      await safeAnswerCallbackQuery(ctx, result.mode === "immediate" ? "Ви придивляєтесь." : `Огляд додано в чергу (${Math.ceil(durationMs / 1000)} с).`);
      await sendActionSubmitFeedback(ctx, player.id, result);
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося виконати дію.");
    }
  });
  bot.callbackQuery("location:details", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const view = await renderLocationDetails(player.currentLocationId, player.id);
    await safeAnswerCallbackQuery(ctx);
    try {
      await ctx.editMessageText(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    } catch {
      await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    }
  });


  bot.callbackQuery(/^feature:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const view = await renderLocationFeatureInteraction(Number(ctx.match[1]), player.id);
    await safeAnswerCallbackQuery(ctx);
    if (!view) return void (await ctx.reply("Цього вже не видно поруч."));

    try {
      await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
    } catch {
      await ctx.reply(view.text, { reply_markup: view.keyboard });
    }
  });

}
