import { Bot } from "grammy";
import { buildMainReplyKeyboardForTelegramId, buildMenuReplyKeyboard } from "../ui/replyKeyboard";
import { isPlayerAutoEnabled } from "./auto";

export async function showMenu(ctx: any) {
  await ctx.reply("☰ Меню", { reply_markup: buildMenuReplyKeyboard() });
}

export async function showMainKeyboard(ctx: any) {
  if (!ctx.from?.id) return;
  const auto = isPlayerAutoEnabled(ctx.from.id);
  await ctx.reply("↩️ Повертаю основні кнопки.", {
    reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, auto),
  });
}

export async function hideReplyKeyboard(ctx: any) {
  await ctx.reply("Клавіатуру сховано. Щоб повернути кнопки, напишіть /menu або /start.", {
    reply_markup: { remove_keyboard: true },
  });
}

export function registerMenuHandlers(bot: Bot) {
  bot.command("menu", showMenu);
  bot.hears(["☰ Меню", "Меню"], showMenu);
  bot.hears(["↩️ Назад", "Назад"], showMainKeyboard);
  bot.hears(["Сховати клавіатуру", "сховати клавіатуру", "прибрати клавіатуру", "прибрати кнопки"], hideReplyKeyboard);
}
