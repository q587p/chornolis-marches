import { Bot } from "grammy";
import { buildActionQueueKeyboard } from "../ui/keyboards";
import { cancelCurrentPlayerAction, clearQueuedPlayerActions, renderPlayerActionQueue } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { safeAnswerCallbackQuery } from "../utils/telegram";

export function registerActionQueueHandlers(bot: Bot) {
  async function sendQueue(ctx: any) {
    const player = await getPlayerByTelegramId(ctx.from?.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    await ctx.reply(await renderPlayerActionQueue(player.id), { reply_markup: buildActionQueueKeyboard() });
  }

  bot.command("queue", sendQueue);
  bot.hears("📋 Черга", sendQueue);

  bot.callbackQuery("queue:status", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await safeAnswerCallbackQuery(ctx);
    await ctx.reply(await renderPlayerActionQueue(player.id), { reply_markup: buildActionQueueKeyboard() });
  });

  bot.callbackQuery("queue:clear", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const result = await clearQueuedPlayerActions(player.id);
    await safeAnswerCallbackQuery(ctx, `Прибрано з черги: ${result.count}.`);
    await ctx.reply(await renderPlayerActionQueue(player.id), { reply_markup: buildActionQueueKeyboard() });
  });

  bot.callbackQuery("queue:cancel-current", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const result = await cancelCurrentPlayerAction(player.id);
    await safeAnswerCallbackQuery(ctx, `Скасовано дій: ${result.count}.`);
    await ctx.reply(await renderPlayerActionQueue(player.id), { reply_markup: buildActionQueueKeyboard() });
  });
}
