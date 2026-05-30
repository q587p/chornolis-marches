import { buildStandUpKeyboard } from "../ui/keyboards";
import { isPlayerMustStandError } from "../services/postureRules";

export function actionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function replyToActionError(ctx: any, error: unknown, fallback: string, options: { replyFallback?: boolean } = {}) {
  const message = actionErrorMessage(error, fallback);
  if (isPlayerMustStandError(error)) {
    await ctx.reply(message, { reply_markup: buildStandUpKeyboard() });
    return message;
  }

  if (options.replyFallback !== false) await ctx.reply(message);
  return message;
}
