import { Bot } from "grammy";
import { buildActionQueueKeyboard } from "../ui/keyboards";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { cancelCurrentPlayerAction, clearQueuedPlayerActions, playerActionQueueControlCount, renderPlayerActionQueue } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { safeAnswerCallbackQuery } from "../utils/telegram";

async function queueOptions(playerId: number) {
  const count = await playerActionQueueControlCount(playerId);
  return count > 0 ? { reply_markup: buildActionQueueKeyboard(count) } : undefined;
}

async function showQueue(ctx: any, playerId: number, prefix?: string) {
  const text = `${prefix ? `${prefix}\n\n` : ""}${await renderPlayerActionQueue(playerId)}`;
  const options = await queueOptions(playerId);

  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, options);
      return;
    } catch {
      // Fall back to a new message if Telegram cannot edit the source message.
    }
  }

  await ctx.reply(text, options);
}

async function refreshMainKeyboard(ctx: any) {
  if (!ctx.from) return;
  await ctx.reply("Основні дії оновлено.", {
    reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
  });
}

export function registerActionQueueHandlers(bot: Bot) {
  async function sendQueue(ctx: any) {
    if (!ctx.from) return;

    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    await showQueue(ctx, player.id);
  }

  bot.command("queue", async (ctx) => {
    if (!ctx.from) return;

    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const arg = String(ctx.match || "").trim().toLowerCase();
    if (arg === "clear") {
      const result = await clearQueuedPlayerActions(player.id);
      await showQueue(ctx, player.id, `Прибрано з черги: ${result.count}.`);
      await refreshMainKeyboard(ctx);
      return;
    }

    if (arg === "cancel" || arg === "cancel-current") {
      const result = await cancelCurrentPlayerAction(player.id);
      await showQueue(ctx, player.id, `Скасовано поточних дій/відпочинку: ${result.count}.`);
      await refreshMainKeyboard(ctx);
      return;
    }

    await showQueue(ctx, player.id);
  });
  bot.hears("📋 Черга", sendQueue);

  bot.callbackQuery("queue:status", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await safeAnswerCallbackQuery(ctx);
    await showQueue(ctx, player.id);
  });

  bot.callbackQuery("queue:clear", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const result = await clearQueuedPlayerActions(player.id);
    await safeAnswerCallbackQuery(ctx, `Прибрано: ${result.count}.`);
    await showQueue(ctx, player.id, `Прибрано з черги: ${result.count}.`);
    await refreshMainKeyboard(ctx);
  });

  bot.callbackQuery("queue:cancel-current", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const result = await cancelCurrentPlayerAction(player.id);
    await safeAnswerCallbackQuery(ctx, `Скасовано: ${result.count}.`);
    await showQueue(ctx, player.id, `Скасовано поточних дій/відпочинку: ${result.count}.`);
    await refreshMainKeyboard(ctx);
  });
}
