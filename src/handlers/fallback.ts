import { Bot } from "grammy";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";

function commandName(text: string) {
  const match = text.trim().match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s|$)/);
  return match?.[1].toLowerCase();
}

export function registerFallbackHandlers(bot: Bot) {
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (!text.trim().startsWith("/")) return;

    const command = commandName(text);
    const replyMarkup = ctx.from ? await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) : undefined;

    if (command === "respawn") {
      await ctx.reply(
        "Команди /respawn поки що немає в грі. Вона вже є в планах як раннє повернення до межового табору для нових або слабких персонажів.\n\nПоки що можна скористатися /location, /rest або /help.",
        { reply_markup: replyMarkup }
      );
      return;
    }

    await ctx.reply(
      `Не впізнаю команду ${command ? `/${command}` : "з таким записом"}.\n\nСпробуй /help або відкрий /menu.`,
      { reply_markup: replyMarkup }
    );
  });
}
