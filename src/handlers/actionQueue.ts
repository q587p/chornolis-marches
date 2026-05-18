import { Bot } from "grammy";
import { buildActionQueueKeyboard } from "../ui/keyboards";
import { cancelCurrentPlayerAction, clearQueuedPlayerActions, renderPlayerActionQueue } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { safeAnswerCallbackQuery } from "../utils/telegram";

export function registerActionQueueHandlers(bot: Bot) {
  async function sendQueue(ctx: any) {
    if (!ctx.from) return;

    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    await ctx.reply(await renderPlayerActionQueue(player.id), { reply_markup: buildActionQueueKeyboard() });
  }

  bot.command("queue", async (ctx) => {
    if (!ctx.from) return;

    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const arg = String(ctx.match || "").trim().toLowerCase();
    if (arg === "clear") {
      const result = await clearQueuedPlayerActions(player.id);
      await ctx.reply(`Прибрано з черги: ${result.count}.

${await renderPlayerActionQueue(player.id)}`, { reply_markup: buildActionQueueKeyboard() });
      return;
    }

    if (arg === "cancel" || arg === "cancel-current") {
      const result = await cancelCurrentPlayerAction(player.id);
      await ctx.reply(`Скасовано поточних дій: ${result.count}.

${await renderPlayerActionQueue(player.id)}`, { reply_markup: buildActionQueueKeyboard() });
      return;
    }

    await ctx.reply(await renderPlayerActionQueue(player.id), { reply_markup: buildActionQueueKeyboard() });
  });
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
