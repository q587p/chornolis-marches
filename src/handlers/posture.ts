import { Bot } from "grammy";
import type { PostureAliasMode } from "../input/aliases";
import { getPlayerByTelegramId } from "../services/players";
import { sitPlayer, standPlayer } from "../services/posture";
import { notifyPlayerObservers, playerSitObserverText, playerStandObserverText } from "../services/playerVisibility";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { safeAnswerCallbackQuery } from "../utils/telegram";

export async function submitPosture(bot: Bot, ctx: any, mode: PostureAliasMode) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const result = mode === "sit" ? await sitPlayer(player.id) : await standPlayer(player.id);
  if (!result) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  await ctx.reply(result.message, {
    reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, Boolean(player.isAutoEnabled)),
  });
  if (result.changed) {
    await notifyPlayerObservers(bot, {
      playerId: player.id,
      locationId: player.currentLocationId,
      observerText: mode === "sit" ? playerSitObserverText : playerStandObserverText,
    });
  }
}

export function registerPostureHandlers(bot: Bot) {
  bot.command("sit", (ctx) => submitPosture(bot, ctx, "sit"));
  bot.command("stand", (ctx) => submitPosture(bot, ctx, "stand"));
  bot.hears(["Сісти", "Встати"], async (ctx) => {
    await submitPosture(bot, ctx, ctx.message?.text === "Сісти" ? "sit" : "stand");
  });

  bot.callbackQuery("posture:sit", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await submitPosture(bot, ctx, "sit");
  });

  bot.callbackQuery("posture:stand", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await submitPosture(bot, ctx, "stand");
  });
}
