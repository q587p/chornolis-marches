import { Bot } from "grammy";
import type { PostureAliasMode } from "../input/aliases";
import { getPlayerByTelegramId } from "../services/players";
import { liePlayer, sitPlayer, standPlayer } from "../services/posture";
import { notifyPlayerObservers, playerLieObserverText, playerSitObserverText, playerStandObserverText } from "../services/playerVisibility";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { safeAnswerCallbackQuery } from "../utils/telegram";

export async function submitPosture(bot: Bot, ctx: any, mode: PostureAliasMode) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const result = mode === "sit"
    ? await sitPlayer(player.id)
    : mode === "lie"
      ? await liePlayer(player.id)
      : await standPlayer(player.id);
  if (!result) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  await ctx.reply(result.message, {
    reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, Boolean(player.isAutoEnabled)),
  });
  if (result.changed) {
    await notifyPlayerObservers(bot, {
      playerId: player.id,
      locationId: player.currentLocationId,
      observerText: mode === "sit" ? playerSitObserverText : mode === "lie" ? playerLieObserverText : playerStandObserverText,
    });
  }
}

export function registerPostureHandlers(bot: Bot) {
  bot.command("sit", (ctx) => submitPosture(bot, ctx, "sit"));
  bot.command("lie", (ctx) => submitPosture(bot, ctx, "lie"));
  bot.command("stand", (ctx) => submitPosture(bot, ctx, "stand"));
  bot.hears(["Сісти", "Лягти", "Встати"], async (ctx) => {
    const text = ctx.message?.text;
    await submitPosture(bot, ctx, text === "Сісти" ? "sit" : text === "Лягти" ? "lie" : "stand");
  });

  bot.callbackQuery("posture:sit", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await submitPosture(bot, ctx, "sit");
  });

  bot.callbackQuery("posture:stand", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await submitPosture(bot, ctx, "stand");
  });

  bot.callbackQuery("posture:lie", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await submitPosture(bot, ctx, "lie");
  });
}
