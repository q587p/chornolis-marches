import type { Bot } from "grammy";
import { observedSendMessage, sanitizeTelegramSendContext, type SendMessageOptions } from "../utils/telegram";

export type DeferredTelegramReason = "tutorial" | "ambient" | "guidance" | "recovery-extra" | "milestone";

export type DeferredTelegramFollowup = {
  chatId: string | number;
  text: string;
  options?: SendMessageOptions;
  context: string;
  reason: DeferredTelegramReason;
  dedupeKey?: string;
  expiresAt?: Date;
};

export type DeferredTelegramRecentStatus = "queued" | "sent" | "dropped" | "expired" | "error";

export type DeferredTelegramRecent = {
  at: Date;
  context: string;
  reason: DeferredTelegramReason;
  status: DeferredTelegramRecentStatus;
  error: string | null;
};

export type DeferredTelegramSnapshot = {
  enabled: boolean;
  running: boolean;
  runningSince: Date | null;
  pendingCount: number;
  totalQueuedSinceStart: number;
  totalSentSinceStart: number;
  totalDroppedSinceStart: number;
  totalExpiredSinceStart: number;
  totalErrorsSinceStart: number;
  lastStartedAt: Date | null;
  lastFinishedAt: Date | null;
  lastError: string | null;
  recent: DeferredTelegramRecent[];
};

type DeferredTelegramQueueItem = {
  chatId: string | number;
  text: string;
  options?: SendMessageOptions;
  context: string;
  reason: DeferredTelegramReason;
  dedupeKey?: string;
  queuedAt: Date;
  expiresAt: Date;
};

const DEFAULT_POLL_MS = 250;
const DEFAULT_MAX_PENDING = 200;
const DEFAULT_MAX_PER_PASS = 5;
const DEFAULT_MAX_AGE_MS = 5 * 60_000;
const RECENT_LIMIT = 10;

let deferredTelegramBot: Bot | null = null;
let deferredTelegramTimer: NodeJS.Timeout | null = null;
let deferredTelegramRunning = false;
let deferredTelegramRunningSince: Date | null = null;
let deferredTelegramLastStartedAt: Date | null = null;
let deferredTelegramLastFinishedAt: Date | null = null;
let deferredTelegramLastError: string | null = null;
let totalQueuedSinceStart = 0;
let totalSentSinceStart = 0;
let totalDroppedSinceStart = 0;
let totalExpiredSinceStart = 0;
let totalErrorsSinceStart = 0;
let queue: DeferredTelegramQueueItem[] = [];
let recent: DeferredTelegramRecent[] = [];

function envValue(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

function boolEnv(name: string, fallback: boolean) {
  const value = envValue(name)?.trim().toLowerCase();
  if (!value) return fallback;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
}

function intEnv(name: string, fallback: number, min: number) {
  const value = Number(envValue(name));
  return Number.isFinite(value) ? Math.max(min, Math.floor(value)) : fallback;
}

export function deferredTelegramEnabled() {
  return boolEnv("DEFERRED_TELEGRAM_ENABLED", true);
}

export function deferredTelegramPollMs() {
  return intEnv("DEFERRED_TELEGRAM_POLL_MS", DEFAULT_POLL_MS, 50);
}

export function deferredTelegramMaxPending() {
  return intEnv("DEFERRED_TELEGRAM_MAX_PENDING", DEFAULT_MAX_PENDING, 1);
}

export function deferredTelegramMaxPerPass() {
  return intEnv("DEFERRED_TELEGRAM_MAX_PER_PASS", DEFAULT_MAX_PER_PASS, 1);
}

export function deferredTelegramMaxAgeMs() {
  return intEnv("DEFERRED_TELEGRAM_MAX_AGE_MS", DEFAULT_MAX_AGE_MS, 1);
}

function compactDeferredTelegramError(error: unknown) {
  return sanitizeTelegramSendContext(error instanceof Error ? error.message : String(error || "deferred telegram failed"));
}

function cloneRecent(item: DeferredTelegramRecent): DeferredTelegramRecent {
  return {
    ...item,
    at: new Date(item.at.getTime()),
  };
}

function rememberRecent(item: Omit<DeferredTelegramRecent, "at">, at = new Date()) {
  recent.unshift({ ...item, at });
  if (recent.length > RECENT_LIMIT) recent.length = RECENT_LIMIT;
}

function dropItem(item: Pick<DeferredTelegramQueueItem, "context" | "reason">, status: "dropped" | "expired", error: string | null = null) {
  if (status === "expired") totalExpiredSinceStart += 1;
  else totalDroppedSinceStart += 1;
  rememberRecent({ context: item.context, reason: item.reason, status, error });
}

export function deferTelegramFollowup(input: DeferredTelegramFollowup): boolean {
  const context = sanitizeTelegramSendContext(input.context);
  const reason = input.reason;
  if (!deferredTelegramEnabled()) {
    dropItem({ context, reason }, "dropped", "disabled");
    return false;
  }

  const now = new Date();
  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt.getTime())
    : new Date(now.getTime() + deferredTelegramMaxAgeMs());
  if (expiresAt.getTime() <= now.getTime()) {
    dropItem({ context, reason }, "expired");
    return false;
  }

  const dedupeKey = input.dedupeKey ? sanitizeTelegramSendContext(input.dedupeKey) : undefined;
  if (dedupeKey && queue.some((item) => item.dedupeKey === dedupeKey)) {
    dropItem({ context, reason }, "dropped", "duplicate");
    return false;
  }

  if (queue.length >= deferredTelegramMaxPending()) {
    dropItem({ context, reason }, "dropped", "full");
    return false;
  }

  queue.push({
    chatId: input.chatId,
    text: input.text,
    options: input.options,
    context,
    reason,
    dedupeKey,
    queuedAt: now,
    expiresAt,
  });
  totalQueuedSinceStart += 1;
  rememberRecent({ context, reason, status: "queued", error: null }, now);
  return true;
}

async function runDeferredTelegramLoop(bot: Bot) {
  if (deferredTelegramRunning) return;
  const now = new Date();
  deferredTelegramRunning = true;
  deferredTelegramRunningSince = now;
  deferredTelegramLastStartedAt = now;
  deferredTelegramLastError = null;
  try {
    const maxPerPass = deferredTelegramMaxPerPass();
    for (let index = 0; index < maxPerPass; index += 1) {
      const item = queue.shift();
      if (!item) break;
      if (item.expiresAt.getTime() <= Date.now()) {
        dropItem(item, "expired");
        continue;
      }
      try {
        await observedSendMessage(bot, item.chatId, item.text, item.options, item.context);
        totalSentSinceStart += 1;
        rememberRecent({ context: item.context, reason: item.reason, status: "sent", error: null });
      } catch (error) {
        const compact = compactDeferredTelegramError(error);
        totalErrorsSinceStart += 1;
        deferredTelegramLastError = compact;
        rememberRecent({ context: item.context, reason: item.reason, status: "error", error: compact });
      }
    }
  } finally {
    deferredTelegramRunning = false;
    deferredTelegramRunningSince = null;
    deferredTelegramLastFinishedAt = new Date();
  }
}

export function restartDeferredTelegramLoop() {
  if (!deferredTelegramBot) return;
  if (deferredTelegramTimer) clearInterval(deferredTelegramTimer);
  runDeferredTelegramLoop(deferredTelegramBot).catch((error) => {
    deferredTelegramLastError = compactDeferredTelegramError(error);
  });
  deferredTelegramTimer = setInterval(() => {
    runDeferredTelegramLoop(deferredTelegramBot!).catch((error) => {
      deferredTelegramLastError = compactDeferredTelegramError(error);
    });
  }, deferredTelegramPollMs());
}

export function startDeferredTelegramLoop(bot: Bot) {
  deferredTelegramBot = bot;
  restartDeferredTelegramLoop();
}

export function getDeferredTelegramSnapshot(): DeferredTelegramSnapshot {
  return {
    enabled: deferredTelegramEnabled(),
    running: deferredTelegramRunning,
    runningSince: deferredTelegramRunningSince ? new Date(deferredTelegramRunningSince.getTime()) : null,
    pendingCount: queue.length,
    totalQueuedSinceStart,
    totalSentSinceStart,
    totalDroppedSinceStart,
    totalExpiredSinceStart,
    totalErrorsSinceStart,
    lastStartedAt: deferredTelegramLastStartedAt ? new Date(deferredTelegramLastStartedAt.getTime()) : null,
    lastFinishedAt: deferredTelegramLastFinishedAt ? new Date(deferredTelegramLastFinishedAt.getTime()) : null,
    lastError: deferredTelegramLastError,
    recent: recent.map(cloneRecent),
  };
}

export async function drainDeferredTelegramOnceForTests(bot: Bot) {
  await runDeferredTelegramLoop(bot);
}

export function resetDeferredTelegramForTests() {
  if (deferredTelegramTimer) clearInterval(deferredTelegramTimer);
  deferredTelegramBot = null;
  deferredTelegramTimer = null;
  deferredTelegramRunning = false;
  deferredTelegramRunningSince = null;
  deferredTelegramLastStartedAt = null;
  deferredTelegramLastFinishedAt = null;
  deferredTelegramLastError = null;
  totalQueuedSinceStart = 0;
  totalSentSinceStart = 0;
  totalDroppedSinceStart = 0;
  totalExpiredSinceStart = 0;
  totalErrorsSinceStart = 0;
  queue = [];
  recent = [];
}
