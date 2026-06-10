import type { Bot } from "grammy";
import {
  compactTelegramSendError,
  markTelegramSendObserved,
  telegramSendSlowThresholdMs,
  type TelegramSendObservation,
  type TelegramSendOutcome,
} from "../runtimeState";

export type SendMessageOptions = Parameters<Bot["api"]["sendMessage"]>[2];

const TELEGRAM_DIAGNOSTIC_REDACTIONS = /\b(chatId|chat id|payload|token|secret|private whisper|whisper|message text|messageText|raw body)\b/gi;

function sanitizeTelegramDiagnosticText(value: unknown, fallback: string, maxLength: number) {
  const text = String(value || fallback)
    .replace(/\s+/g, " ")
    .replace(/[0-9]{5,}/g, "#")
    .replace(TELEGRAM_DIAGNOSTIC_REDACTIONS, "[redacted]")
    .trim();
  return (text || fallback).slice(0, maxLength);
}

export function sanitizeTelegramSendContext(context: string) {
  return sanitizeTelegramDiagnosticText(context, "sendMessage", 80);
}

function sanitizeTelegramSendError(error: unknown) {
  return sanitizeTelegramDiagnosticText(compactTelegramSendError(error), "telegram send failed", 160);
}

function sendHasReplyMarkup(options?: SendMessageOptions) {
  return Boolean(options && "reply_markup" in options && options.reply_markup);
}

function recordObservedTelegramSend(
  context: string,
  startedAt: number,
  outcome: TelegramSendOutcome,
  error: unknown,
  options?: SendMessageOptions,
) {
  const durationMs = Math.max(0, Date.now() - startedAt);
  const observation: TelegramSendObservation = {
    observedAt: new Date(),
    context: sanitizeTelegramSendContext(context),
    durationMs,
    outcome,
    error: error ? sanitizeTelegramSendError(error) : null,
    hasReplyMarkup: sendHasReplyMarkup(options),
  };
  markTelegramSendObserved(observation);

  const threshold = telegramSendSlowThresholdMs();
  if ((threshold > 0 && durationMs >= threshold) || outcome === "error") {
    const errorText = observation.error ? ` error=${observation.error}` : "";
    console.warn(`slow:telegramSend context=${observation.context} durationMs=${Math.round(durationMs)} outcome=${outcome}${errorText}`);
  }
}

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
  const startedAt = Date.now();
  try {
    const message = await bot.api.sendMessage(chatId, text, options);
    recordObservedTelegramSend(context, startedAt, "ok", null, options);
    return message;
  } catch (error) {
    if (isTelegramBlockedByUserError(error)) {
      recordObservedTelegramSend(context, startedAt, "blocked", error, options);
      return null;
    }
    recordObservedTelegramSend(context, startedAt, "error", error, options);
    throw error;
  }
}

export async function observedSendMessage(
  bot: Bot,
  chatId: string | number,
  text: string,
  options?: SendMessageOptions,
  context = "sendMessage",
) {
  const startedAt = Date.now();
  try {
    const message = await bot.api.sendMessage(chatId, text, options);
    recordObservedTelegramSend(context, startedAt, "ok", null, options);
    return message;
  } catch (error) {
    if (isTelegramBlockedByUserError(error)) {
      recordObservedTelegramSend(context, startedAt, "blocked", error, options);
      throw error;
    }
    recordObservedTelegramSend(context, startedAt, "error", error, options);
    throw error;
  }
}
