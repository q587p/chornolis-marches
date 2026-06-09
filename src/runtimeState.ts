let lastRuntimeError: string | null = null;
let httpServerStartedAt: Date | null = null;
export type ActionQueuePhaseDurations = {
  playerCompleteMs: number;
  playerStartMs: number;
  playerRefreshMs: number;
  creatureKickMs: number;
  totalMs: number;
};

export type ActionQueuePassMetrics = {
  phaseDurations: ActionQueuePhaseDurations;
  completedPlayerActions: number;
  startedPlayerActions: number;
  triggeredCreatureQueue: boolean;
};

export type ActionQueueRuntimeSnapshot = {
  running: boolean;
  runningSince: Date | null;
  lastStartedAt: Date | null;
  lastFinishedAt: Date | null;
  lastError: string | null;
  lastPhaseDurations: ActionQueuePhaseDurations | null;
  lastCompletedPlayerActions: number;
  lastStartedPlayerActions: number;
  lastTriggeredCreatureQueue: boolean;
};

const EMPTY_ACTION_QUEUE_PHASE_DURATIONS: ActionQueuePhaseDurations = {
  playerCompleteMs: 0,
  playerStartMs: 0,
  playerRefreshMs: 0,
  creatureKickMs: 0,
  totalMs: 0,
};

let actionQueueRuntimeSnapshot: ActionQueueRuntimeSnapshot = {
  running: false,
  runningSince: null,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastError: null,
  lastPhaseDurations: null,
  lastCompletedPlayerActions: 0,
  lastStartedPlayerActions: 0,
  lastTriggeredCreatureQueue: false,
};

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

function compactRuntimeError(error: unknown) {
  const text = String(error instanceof Error ? error.message : error);
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}

function clonePhaseDurations(value: ActionQueuePhaseDurations | null): ActionQueuePhaseDurations | null {
  return value ? { ...value } : null;
}

export function markActionQueuePassStarted(now = new Date()) {
  actionQueueRuntimeSnapshot = {
    ...actionQueueRuntimeSnapshot,
    running: true,
    runningSince: now,
    lastStartedAt: now,
    lastError: null,
  };
}

export function markActionQueuePassFinished(metrics: ActionQueuePassMetrics, now = new Date()) {
  actionQueueRuntimeSnapshot = {
    running: false,
    runningSince: null,
    lastStartedAt: actionQueueRuntimeSnapshot.lastStartedAt,
    lastFinishedAt: now,
    lastError: null,
    lastPhaseDurations: { ...EMPTY_ACTION_QUEUE_PHASE_DURATIONS, ...metrics.phaseDurations },
    lastCompletedPlayerActions: metrics.completedPlayerActions,
    lastStartedPlayerActions: metrics.startedPlayerActions,
    lastTriggeredCreatureQueue: metrics.triggeredCreatureQueue,
  };
}

export function markActionQueuePassError(error: unknown, now = new Date()) {
  actionQueueRuntimeSnapshot = {
    ...actionQueueRuntimeSnapshot,
    running: false,
    runningSince: null,
    lastFinishedAt: now,
    lastError: compactRuntimeError(error),
  };
}

export function getActionQueueRuntimeSnapshot(): ActionQueueRuntimeSnapshot {
  return {
    ...actionQueueRuntimeSnapshot,
    lastPhaseDurations: clonePhaseDurations(actionQueueRuntimeSnapshot.lastPhaseDurations),
  };
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
