import { Bot } from "grammy";
import { renderWorldTimeStatus } from "../services/worldTime";

export function registerTimeHandlers(bot: Bot) {
  async function showTime(ctx: any) {
    await ctx.reply(await renderWorldTimeStatus());
  }

  bot.command(["time", "weather", "час", "погода"], showTime);
  bot.hears(["🕯 Час", "Час", "Погода", "🌦 Погода"], showTime);
}
