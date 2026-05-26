import { Bot } from "grammy";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { suggestAliasInputs } from "../input/aliases";
import { stripUnsafeText } from "../utils/text";

function commandName(text: string) {
  const match = text.trim().match(/^\/([^\s@]+)(?:@\w+)?(?:\s|$)/u);
  return match?.[1].toLowerCase();
}

export function registerFallbackHandlers(bot: Bot) {
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const replyMarkup = ctx.from ? await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) : undefined;

    if (!text.trim().startsWith("/")) {
      const safeText = stripUnsafeText(text).trim().slice(0, 80);
      const suggestions = suggestAliasInputs(text);
      const suggestionText = suggestions.length
        ? `\n\nМожливо, ти мав на увазі:\n${suggestions.map((suggestion) => `- ${suggestion}`).join("\n")}`
        : "";

      await ctx.reply(
        `Не зовсім розумію${safeText ? `: “${safeText}”` : ""}.${suggestionText}\n\nСпробуй /help або відкрий /menu.`,
        { reply_markup: replyMarkup }
      );
      return;
    }

    const command = commandName(text);
    const suggestions = suggestAliasInputs(text);
    const suggestionText = suggestions.length
      ? `\n\nМожливо, ти мав на увазі:\n${suggestions.map((suggestion) => `- ${suggestion}`).join("\n")}`
      : "";

    if (command === "respawn") {
      await ctx.reply(
        "Команди /respawn поки що немає в грі. Вона вже є в планах як раннє повернення до межового табору для нових або слабких персонажів.\n\nПоки що можна скористатися /look, /rest або /help.",
        { reply_markup: replyMarkup }
      );
      return;
    }

    await ctx.reply(
      `Не впізнаю команду ${command ? `/${command}` : "з таким записом"}.${suggestionText}\n\nСпробуй /help або відкрий /menu.`,
      { reply_markup: replyMarkup }
    );
  });
}
