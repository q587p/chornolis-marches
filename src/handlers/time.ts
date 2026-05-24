import { Bot } from "grammy";
import { renderCurrentWorldTime } from "../services/calendar";

export function registerTimeHandlers(bot: Bot) {
  async function showTime(ctx: any) {
    await ctx.reply(renderCurrentWorldTime());
  }

  bot.command("time", showTime);
  bot.hears(["🕯 Час", "Час"], showTime);
}
