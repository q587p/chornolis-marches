import { Bot } from "grammy";
import { buildMenuReplyKeyboard } from "../ui/replyKeyboard";
import { isScribeAdmin } from "../services/adminAccess";

export async function showMenu(ctx: any) {
  await ctx.reply("☰ Меню", { reply_markup: buildMenuReplyKeyboard({ canSeeStats: await isScribeAdmin(ctx.from?.id) }) });
}

export async function hideReplyKeyboard(ctx: any) {
  await ctx.reply("Клавіатуру сховано. Щоб повернути кнопки, напишіть /menu або /start.", {
    reply_markup: { remove_keyboard: true },
  });
}

export function registerMenuHandlers(bot: Bot) {
  bot.command("menu", showMenu);
  bot.hears(["☰ Меню", "Меню"], showMenu);
  bot.hears(["↩️ Назад", "Назад"], hideReplyKeyboard);
  bot.hears(["Сховати клавіатуру", "сховати клавіатуру", "прибрати клавіатуру", "прибрати кнопки"], hideReplyKeyboard);
}
