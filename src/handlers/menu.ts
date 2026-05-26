import { Bot } from "grammy";
import { isPlayerAutoEnabled } from "./auto";
import { buildMainReplyKeyboardForTelegramId, buildMenuReplyKeyboard } from "../ui/replyKeyboard";

export async function showMenu(ctx: any) {
  await ctx.reply("☰ Меню", { reply_markup: buildMenuReplyKeyboard() });
}

export async function backToMain(ctx: any) {
  const auto = ctx.from ? isPlayerAutoEnabled(ctx.from.id) : false;
  const keyboard = ctx.from
    ? await buildMainReplyKeyboardForTelegramId(ctx.from.id, auto)
    : undefined;
  await ctx.reply("Повертаємось до основних дій.", { reply_markup: keyboard });
}

export function registerMenuHandlers(bot: Bot) {
  bot.command("menu", showMenu);
  bot.hears(["☰ Меню", "Меню"], showMenu);
  bot.hears(["↩️ Назад", "Назад"], backToMain);
}
