let lastRuntimeError: string | null = null;
let httpServerStartedAt: Date | null = null;
let telegramBotStatus: {
  state: "starting" | "ready" | "error";
  checkedAt: Date | null;
  username: string | null;
  error: string | null;
} = {
  state: "starting",
  checkedAt: null,
  username: null,
  error: null,
};

export function getLastRuntimeError() {
  return lastRuntimeError;
}

export function setLastRuntimeError(error: unknown) {
  lastRuntimeError = String(error);
}

export function markHttpServerStarted() {
  httpServerStartedAt = new Date();
}

export function getHttpServerStartedAt() {
  return httpServerStartedAt;
}

export function markTelegramBotStarting() {
  telegramBotStatus = {
    state: "starting",
    checkedAt: new Date(),
    username: null,
    error: null,
  };
}

export function markTelegramBotReady(username?: string | null) {
  telegramBotStatus = {
    state: "ready",
    checkedAt: new Date(),
    username: username ?? null,
    error: null,
  };
}

export function markTelegramBotError(error: unknown) {
  telegramBotStatus = {
    ...telegramBotStatus,
    state: "error",
    checkedAt: new Date(),
    error: String(error),
  };
}

export function getTelegramBotStatus() {
  return telegramBotStatus;
}
