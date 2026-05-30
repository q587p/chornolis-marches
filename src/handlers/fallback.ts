import { Bot } from "grammy";
import { buildMainReplyKeyboardForTelegramId, EMPTY_KEYBOARD_BUTTON } from "../ui/replyKeyboard";
import { formatAliasSuggestion, suggestAliasEntries } from "../input/aliases";
import { escapeHtml, stripUnsafeText } from "../utils/text";
import { getPlayerByTelegramId } from "../services/players";
import { hasCompletedTutorial } from "../services/tutorial";

function commandName(text: string) {
  const match = text.trim().match(/^\/([^\s@]+)(?:@\w+)?(?:\s|$)/u);
  return match?.[1].toLowerCase();
}

async function unfinishedTutorialHint(telegramId?: number) {
  if (!telegramId) return "";
  const player = await getPlayerByTelegramId(telegramId);
  if (!player || await hasCompletedTutorial(player.id)) return "";
  return "\n\nЯкщо хочеш повернутися до короткого навчання, напиши /sleep_tutorial або «навчальний сон».";
}

function fallbackNavigationHint() {
  return "Спробуй <i>❔ Допомога</i> (/help) або відкрий <i>☰ Меню</i> (/menu).";
}

export function registerFallbackHandlers(bot: Bot) {
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (text === EMPTY_KEYBOARD_BUTTON || text.trim() === "") return;

    const replyMarkup = ctx.from ? await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) : undefined;

    if (!text.trim().startsWith("/")) {
      const safeText = escapeHtml(stripUnsafeText(text).trim().slice(0, 80));
      const suggestions = suggestAliasEntries(text);
      const suggestionText = suggestions.length
        ? `\n\nМожливо, ти мав на увазі:\n${suggestions.map((suggestion) => `- ${formatAliasSuggestion(suggestion)}`).join("\n")}`
        : "";

      await ctx.reply(
        `Не зовсім розумію${safeText ? `: “${safeText}”` : ""}.${suggestionText}\n\n${fallbackNavigationHint()}${await unfinishedTutorialHint(ctx.from?.id)}`,
        { parse_mode: "HTML", reply_markup: replyMarkup }
      );
      return;
    }

    const command = commandName(text);
    const suggestions = suggestAliasEntries(text);
    const suggestionText = suggestions.length
      ? `\n\nМожливо, ти мав на увазі:\n${suggestions.map((suggestion) => `- ${formatAliasSuggestion(suggestion)}`).join("\n")}`
      : "";

    if (command === "respawn") {
      await ctx.reply(
        "Команди /respawn поки що немає в грі. Вона вже є в планах як раннє повернення до межового табору для нових або слабких персонажів.\n\nПоки що можна скористатися /look, /rest або /help.",
        { reply_markup: replyMarkup }
      );
      return;
    }

    await ctx.reply(
      `Не впізнаю команду ${command ? `/${escapeHtml(command)}` : "з таким записом"}.${suggestionText}\n\n${fallbackNavigationHint()}${await unfinishedTutorialHint(ctx.from?.id)}`,
      { parse_mode: "HTML", reply_markup: replyMarkup }
    );
  });
}
