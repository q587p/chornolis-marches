import { Bot } from "grammy";
import { renderCurrentWorldTime } from "../services/calendar";

export async function showTime(ctx: any) {
  await ctx.reply(renderCurrentWorldTime());
}

export function registerTimeHandlers(bot: Bot) {
  bot.command("time", showTime);
  bot.hears(["🕯 Час", "Час"], showTime);
}
