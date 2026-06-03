import { Bot } from "grammy";
import { renderCurrentWorldCalendar, renderCurrentWorldTime } from "../services/calendar";
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

export async function showCalendar(ctx: any) {
  const snapshot = await getCurrentWorldTimeSnapshot();
  await ctx.reply(renderCurrentWorldCalendar(snapshot));
}

export function registerTimeHandlers(bot: Bot) {
  bot.command("time", showTime);
  bot.command("calendar", showCalendar);
  bot.command("weather", showWeather);
  bot.callbackQuery("time:show", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showTime(ctx);
  });
  bot.callbackQuery("calendar:show", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showCalendar(ctx);
  });
  bot.callbackQuery("weather:show", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showWeather(ctx);
  });
  bot.hears(["🌒 Час", "🕯 Час", "Час"], showTime);
  bot.hears(["📅 Календар", "Календар", "calendar", "Дата"], showCalendar);
  bot.hears(["🌦 Погода", "Погода", "weather"], showWeather);
}
