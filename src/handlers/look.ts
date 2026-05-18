import { Bot } from "grammy";
import { actionDurationMs, enqueuePlayerAction, renderPlayerActionQueue } from "../services/actionQueue";
import { buildActionQueueKeyboard, buildRestingActionChoiceKeyboard } from "../ui/keyboards";
import { getPlayerByTelegramId } from "../services/players";
import { safeAnswerCallbackQuery } from "../utils/telegram";

export function registerLookHandlers(bot: Bot) {
  bot.command("look", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const player = await getPlayerByTelegramId(from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const durationMs = actionDurationMs("LOOK", player.stamina);
    let enqueueResult: Awaited<ReturnType<typeof enqueuePlayerAction>>;
    try {
      enqueueResult = await enqueuePlayerAction({ playerId: player.id, type: "LOOK", payload: {}, durationMs, chatId: ctx.chat?.id });
    } catch (error) {
      return void (await ctx.reply(error instanceof Error ? error.message : "Не вдалося додати дію."));
    }

    if (enqueueResult.shouldPromptRestChoice) {
      await ctx.reply(`Ви зараз відпочиваєте. До повного відновлення лишилось ${enqueueResult.remainingToMax} витривалості. Перервати відпочинок чи поставити дію в чергу після відпочинку?`, { reply_markup: buildRestingActionChoiceKeyboard() });
    } else {
      await ctx.reply(await renderPlayerActionQueue(player.id), { reply_markup: buildActionQueueKeyboard() });
    }
  });

  bot.callbackQuery("look", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const durationMs = actionDurationMs("LOOK", player.stamina);
    let enqueueResult: Awaited<ReturnType<typeof enqueuePlayerAction>>;
    try {
      enqueueResult = await enqueuePlayerAction({
        playerId: player.id,
        type: "LOOK",
        payload: {},
        durationMs,
        chatId: ctx.chat?.id,
        messageId: ctx.callbackQuery.message?.message_id,
      });
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося додати дію.");
      return;
    }

    await safeAnswerCallbackQuery(ctx, `Огляд додано в чергу (${Math.ceil(durationMs / 1000)} с).`);
    if (enqueueResult.shouldPromptRestChoice) {
      await ctx.reply(`Ви зараз відпочиваєте. До повного відновлення лишилось ${enqueueResult.remainingToMax} витривалості. Перервати відпочинок чи поставити дію в чергу після відпочинку?`, { reply_markup: buildRestingActionChoiceKeyboard() });
    } else {
      await ctx.reply(await renderPlayerActionQueue(player.id), { reply_markup: buildActionQueueKeyboard() });
    }
  });
}
