import { Bot } from "grammy";
import { renderCurrentWorldTime } from "../services/calendar";
import { getCurrentWorldTimeSnapshot } from "../services/worldTime";
import { renderCurrentWeather } from "../services/weather";

export async function showTime(ctx: any) {
  const snapshot = await getCurrentWorldTimeSnapshot();
  await ctx.reply(renderCurrentWorldTime(snapshot));
}

export async function showWeather(ctx: any) {
  const snapshot = await getCurrentWorldTimeSnapshot();
  await ctx.reply(renderCurrentWeather(snapshot));
}

export function registerTimeHandlers(bot: Bot) {
  bot.command("time", showTime);
  bot.command("weather", showWeather);
  bot.callbackQuery("time:show", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showTime(ctx);
  });
  bot.hears(["🌒 Час", "🕯 Час", "Час"], showTime);
  bot.hears(["🌦 Погода", "Погода", "weather"], showWeather);
}
