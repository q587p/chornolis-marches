import { Bot } from "grammy";
import { renderCurrentWorldTime } from "../services/calendar";
import { getCurrentWorldTimeSnapshot } from "../services/worldTime";

export async function showTime(ctx: any) {
  const snapshot = await getCurrentWorldTimeSnapshot();
  await ctx.reply(renderCurrentWorldTime(snapshot));
}

export function registerTimeHandlers(bot: Bot) {
  bot.command("time", showTime);
  bot.callbackQuery("time:show", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showTime(ctx);
  });
  bot.hears(["🌒 Час", "🕯 Час", "Час"], showTime);
}
