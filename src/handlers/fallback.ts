import { Bot } from "grammy";
import { buildMainReplyKeyboardForTelegramId, EMPTY_KEYBOARD_BUTTON } from "../ui/replyKeyboard";
import { formatAliasSuggestion, suggestAliasEntries, suggestKeyboardLayoutAliasEntries } from "../input/aliases";
import { escapeHtml, stripUnsafeText } from "../utils/text";
import { getPlayerByTelegramId } from "../services/players";
import { canOpenDreamGateWithSpeech, hasCompletedTutorial } from "../services/tutorial";

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

function formatSuggestionLines(suggestions: ReturnType<typeof suggestAliasEntries>) {
  return suggestions.map((suggestion) => `- ${escapeHtml(formatAliasSuggestion(suggestion))}`).join("\n");
}

function unknownInputSuggestionText(text: string) {
  const layoutSuggestions = suggestKeyboardLayoutAliasEntries(text);
  if (layoutSuggestions.length) {
    return `\n\nСхоже, це могла бути інша розкладка. Можливо, ти мав на увазі:\n${formatSuggestionLines(layoutSuggestions)}`;
  }

  const suggestions = suggestAliasEntries(text);
  return suggestions.length
    ? `\n\nМожливо, ти мав на увазі:\n${formatSuggestionLines(suggestions)}`
    : "";
}

async function tutorialDreamGateSpeechHint(telegramId: number | undefined, text: string) {
  if (!telegramId) return null;
  const player = await getPlayerByTelegramId(telegramId);
  if (!player || !(await canOpenDreamGateWithSpeech(player.id, text))) return null;

  return [
    "Сон підказує:",
    "<blockquote>О, правильно. Тільки додай <i>сказати</i>, щоб слова стали голосом: <code>сказати Відчинитися</code> (/say Відчинитися).</blockquote>",
  ].join("\n");
}

export function registerFallbackHandlers(bot: Bot) {
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (text === EMPTY_KEYBOARD_BUTTON || text.trim() === "") return;

    const replyMarkup = ctx.from ? await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) : undefined;

    if (!text.trim().startsWith("/")) {
      const gateSpeechHint = await tutorialDreamGateSpeechHint(ctx.from?.id, text);
      if (gateSpeechHint) {
        await ctx.reply(gateSpeechHint, { parse_mode: "HTML", reply_markup: replyMarkup });
        return;
      }

      const safeText = escapeHtml(stripUnsafeText(text).trim().slice(0, 80));
      const suggestionText = unknownInputSuggestionText(text);

      await ctx.reply(
        `Не зовсім розумію${safeText ? `: “${safeText}”` : ""}.${suggestionText}\n\n${fallbackNavigationHint()}${await unfinishedTutorialHint(ctx.from?.id)}`,
        { parse_mode: "HTML", reply_markup: replyMarkup }
      );
      return;
    }

    const command = commandName(text);
    const suggestionText = unknownInputSuggestionText(text);

    await ctx.reply(
      `Не впізнаю команду ${command ? `/${escapeHtml(command)}` : "з таким записом"}.${suggestionText}\n\n${fallbackNavigationHint()}${await unfinishedTutorialHint(ctx.from?.id)}`,
      { parse_mode: "HTML", reply_markup: replyMarkup }
    );
  });
}
