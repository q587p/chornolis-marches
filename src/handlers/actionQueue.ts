import { Bot } from "grammy";
import { buildActionQueueKeyboard } from "../ui/keyboards";
import { cancelCurrentPlayerAction, clearQueuedPlayerActions, hasPlayerActionQueueControls, renderPlayerActionQueue } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { safeAnswerCallbackQuery } from "../utils/telegram";

async function queueOptions(playerId: number) {
  return (await hasPlayerActionQueueControls(playerId)) ? { reply_markup: buildActionQueueKeyboard(true) } : undefined;
}

export function registerActionQueueHandlers(bot: Bot) {
  async function sendQueue(ctx: any) {
    if (!ctx.from) return;

    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    await ctx.reply(await renderPlayerActionQueue(player.id), await queueOptions(player.id));
  }

  bot.command("queue", async (ctx) => {
    if (!ctx.from) return;

    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const arg = String(ctx.match || "").trim().toLowerCase();
    if (arg === "clear") {
      const result = await clearQueuedPlayerActions(player.id);
      const text = `Прибрано з черги: ${result.count}.\n\n${await renderPlayerActionQueue(player.id)}`;
      await ctx.reply(text, await queueOptions(player.id));
      return;
    }

    if (arg === "cancel" || arg === "cancel-current") {
      const result = await cancelCurrentPlayerAction(player.id);
      const text = `Скасовано поточних дій: ${result.count}.\n\n${await renderPlayerActionQueue(player.id)}`;
      await ctx.reply(text, await queueOptions(player.id));
      return;
    }

    await ctx.reply(await renderPlayerActionQueue(player.id), await queueOptions(player.id));
  });
  bot.hears("📋 Черга", sendQueue);

  bot.callbackQuery("queue:status", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await safeAnswerCallbackQuery(ctx);
    await ctx.reply(await renderPlayerActionQueue(player.id), await queueOptions(player.id));
  });

  bot.callbackQuery("queue:clear", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const result = await clearQueuedPlayerActions(player.id);
    await safeAnswerCallbackQuery(ctx, `Прибрано з черги: ${result.count}.`);
    await ctx.reply(await renderPlayerActionQueue(player.id), await queueOptions(player.id));
  });

  bot.callbackQuery("queue:cancel-current", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const result = await cancelCurrentPlayerAction(player.id);
    await safeAnswerCallbackQuery(ctx, `Скасовано дій: ${result.count}.`);
    await ctx.reply(await renderPlayerActionQueue(player.id), await queueOptions(player.id));
  });
}
