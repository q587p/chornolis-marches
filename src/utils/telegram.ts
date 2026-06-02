import type { Bot } from "grammy";

type SendMessageOptions = Parameters<Bot["api"]["sendMessage"]>[2];

export async function safeAnswerCallbackQuery(ctx: any, text?: string) {
  try {
    await ctx.answerCallbackQuery(text ? { text } : undefined);
  } catch (error) {
    console.warn("answerCallbackQuery ignored:", error);
  }
}

export function isTelegramBlockedByUserError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { error_code?: unknown; description?: unknown };
  return (
    candidate.error_code === 403 &&
    typeof candidate.description === "string" &&
    candidate.description.toLowerCase().includes("bot was blocked by the user")
  );
}

export async function safeSendMessage(
  bot: Bot,
  chatId: string | number,
  text: string,
  options?: SendMessageOptions,
  context = "sendMessage",
) {
  try {
    return await bot.api.sendMessage(chatId, text, options);
  } catch (error) {
    if (isTelegramBlockedByUserError(error)) {
      console.warn(`${context} skipped: bot was blocked by the user`, { chatId });
      return null;
    }
    throw error;
  }
}
