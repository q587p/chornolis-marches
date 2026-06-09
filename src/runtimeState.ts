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

export type CreatureQueuePhaseDurations = {
  creatureCompleteMs: number;
  creatureStartMs: number;
  totalMs: number;
};

export type CreatureQueueRuntimeMode = "normal" | "limited" | "pause-starts";

export type CreatureQueuePassMetrics = {
  mode: CreatureQueueRuntimeMode;
  reason: string;
  completedCreatureActions: number;
  startedCreatureActions: number;
  skippedCreatureStarts: boolean;
  phaseDurations: CreatureQueuePhaseDurations;
};

export type CreatureQueueRuntimeSnapshot = {
  running: boolean;
  runningSince: Date | null;
  lastStartedAt: Date | null;
  lastFinishedAt: Date | null;
  lastError: string | null;
  lastMode: CreatureQueueRuntimeMode | null;
  lastReason: string | null;
  lastCompletedCreatureActions: number;
  lastStartedCreatureActions: number;
  lastSkippedCreatureStarts: boolean;
  lastPhaseDurations: CreatureQueuePhaseDurations | null;
};

export type RecoveryPhaseDurations = {
  playersMs: number;
  creaturesMs: number;
  totalMs: number;
};

export type RecoveryPassMetrics = {
  phaseDurations: RecoveryPhaseDurations;
  playersScanned: number;
  playersUpdated: number;
  playersSkippedActive: number;
  idleRemindersSent: number;
  sleepAutoWakes: number;
  playerMessagesSent: number;
  creaturesScanned: number;
  creaturesUpdated: number;
  activeCreaturesRefreshed: number;
};

export type RecoveryRuntimeSnapshot = {
  running: boolean;
  runningSince: Date | null;
  lastStartedAt: Date | null;
  lastFinishedAt: Date | null;
  lastError: string | null;
  lastPhaseDurations: RecoveryPhaseDurations | null;
  lastPlayersScanned: number;
  lastPlayersUpdated: number;
  lastPlayersSkippedActive: number;
  lastIdleRemindersSent: number;
  lastSleepAutoWakes: number;
  lastPlayerMessagesSent: number;
  lastCreaturesScanned: number;
  lastCreaturesUpdated: number;
  lastActiveCreaturesRefreshed: number;
};

export type ActionCompletionOutcome = "ok" | "error" | "missing";

export type ActionCompletionObservation = {
  observedAt: Date;
  actionId: number;
  actorType: "PLAYER" | "CREATURE";
  playerId: number | null;
  creatureId: number | null;
  type: string;
  durationMs: number;
  overdueMs: number;
  outcome: ActionCompletionOutcome;
  error: string | null;
};

export type ActionCompletionRuntimeSnapshot = {
  slowThresholdMs: number;
  lastObservedAt: Date | null;
  totalObservedSinceStart: number;
  slowObservedSinceStart: number;
  recentSlow: ActionCompletionObservation[];
  recentErrors: ActionCompletionObservation[];
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

const EMPTY_CREATURE_QUEUE_PHASE_DURATIONS: CreatureQueuePhaseDurations = {
  creatureCompleteMs: 0,
  creatureStartMs: 0,
  totalMs: 0,
};

let creatureQueueRuntimeSnapshot: CreatureQueueRuntimeSnapshot = {
  running: false,
  runningSince: null,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastError: null,
  lastMode: null,
  lastReason: null,
  lastCompletedCreatureActions: 0,
  lastStartedCreatureActions: 0,
  lastSkippedCreatureStarts: false,
  lastPhaseDurations: null,
};

const EMPTY_RECOVERY_PHASE_DURATIONS: RecoveryPhaseDurations = {
  playersMs: 0,
  creaturesMs: 0,
  totalMs: 0,
};

let recoveryRuntimeSnapshot: RecoveryRuntimeSnapshot = {
  running: false,
  runningSince: null,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastError: null,
  lastPhaseDurations: null,
  lastPlayersScanned: 0,
  lastPlayersUpdated: 0,
  lastPlayersSkippedActive: 0,
  lastIdleRemindersSent: 0,
  lastSleepAutoWakes: 0,
  lastPlayerMessagesSent: 0,
  lastCreaturesScanned: 0,
  lastCreaturesUpdated: 0,
  lastActiveCreaturesRefreshed: 0,
};

let actionCompletionRuntimeState: Omit<ActionCompletionRuntimeSnapshot, "slowThresholdMs"> = {
  lastObservedAt: null,
  totalObservedSinceStart: 0,
  slowObservedSinceStart: 0,
  recentSlow: [],
  recentErrors: [],
};

const DEFAULT_ACTION_COMPLETION_SLOW_MS = 1000;

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

function intEnv(name: string, fallback: number) {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = Number(env?.[name]);
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

export function actionCompletionSlowThresholdMs() {
  return Math.max(0, intEnv("ACTION_COMPLETION_SLOW_MS", intEnv("SLOW_COMMAND_LOG_MS", DEFAULT_ACTION_COMPLETION_SLOW_MS)));
}

export function actionCompletionSampleLimit() {
  return Math.max(1, Math.min(50, intEnv("ACTION_COMPLETION_SAMPLE_LIMIT", 10)));
}

export function compactActionCompletionError(error: unknown) {
  return compactRuntimeError(error);
}

function cloneActionCompletionObservation(observation: ActionCompletionObservation): ActionCompletionObservation {
  return {
    ...observation,
    observedAt: new Date(observation.observedAt.getTime()),
  };
}

function pushCapped<T>(items: T[], item: T, limit: number) {
  items.unshift(item);
  if (items.length > limit) items.length = limit;
}

function clonePhaseDurations(value: ActionQueuePhaseDurations | null): ActionQueuePhaseDurations | null {
  return value ? { ...value } : null;
}

function cloneCreaturePhaseDurations(value: CreatureQueuePhaseDurations | null): CreatureQueuePhaseDurations | null {
  return value ? { ...value } : null;
}

function cloneRecoveryPhaseDurations(value: RecoveryPhaseDurations | null): RecoveryPhaseDurations | null {
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

export function markCreatureQueuePassStarted(now = new Date()) {
  creatureQueueRuntimeSnapshot = {
    ...creatureQueueRuntimeSnapshot,
    running: true,
    runningSince: now,
    lastStartedAt: now,
    lastError: null,
  };
}

export function markCreatureQueuePassFinished(metrics: CreatureQueuePassMetrics, now = new Date()) {
  creatureQueueRuntimeSnapshot = {
    running: false,
    runningSince: null,
    lastStartedAt: creatureQueueRuntimeSnapshot.lastStartedAt,
    lastFinishedAt: now,
    lastError: null,
    lastMode: metrics.mode,
    lastReason: metrics.reason,
    lastCompletedCreatureActions: metrics.completedCreatureActions,
    lastStartedCreatureActions: metrics.startedCreatureActions,
    lastSkippedCreatureStarts: metrics.skippedCreatureStarts,
    lastPhaseDurations: { ...EMPTY_CREATURE_QUEUE_PHASE_DURATIONS, ...metrics.phaseDurations },
  };
}

export function markCreatureQueuePassError(error: unknown, now = new Date()) {
  creatureQueueRuntimeSnapshot = {
    ...creatureQueueRuntimeSnapshot,
    running: false,
    runningSince: null,
    lastFinishedAt: now,
    lastError: compactRuntimeError(error),
  };
}

export function getCreatureQueueRuntimeSnapshot(): CreatureQueueRuntimeSnapshot {
  return {
    ...creatureQueueRuntimeSnapshot,
    lastPhaseDurations: cloneCreaturePhaseDurations(creatureQueueRuntimeSnapshot.lastPhaseDurations),
  };
}

export function markRecoveryPassStarted(now = new Date()) {
  recoveryRuntimeSnapshot = {
    ...recoveryRuntimeSnapshot,
    running: true,
    runningSince: now,
    lastStartedAt: now,
    lastError: null,
  };
}

export function markRecoveryPassFinished(metrics: RecoveryPassMetrics, now = new Date()) {
  recoveryRuntimeSnapshot = {
    running: false,
    runningSince: null,
    lastStartedAt: recoveryRuntimeSnapshot.lastStartedAt,
    lastFinishedAt: now,
    lastError: null,
    lastPhaseDurations: { ...EMPTY_RECOVERY_PHASE_DURATIONS, ...metrics.phaseDurations },
    lastPlayersScanned: metrics.playersScanned,
    lastPlayersUpdated: metrics.playersUpdated,
    lastPlayersSkippedActive: metrics.playersSkippedActive,
    lastIdleRemindersSent: metrics.idleRemindersSent,
    lastSleepAutoWakes: metrics.sleepAutoWakes,
    lastPlayerMessagesSent: metrics.playerMessagesSent,
    lastCreaturesScanned: metrics.creaturesScanned,
    lastCreaturesUpdated: metrics.creaturesUpdated,
    lastActiveCreaturesRefreshed: metrics.activeCreaturesRefreshed,
  };
}

export function markRecoveryPassError(error: unknown, now = new Date()) {
  recoveryRuntimeSnapshot = {
    ...recoveryRuntimeSnapshot,
    running: false,
    runningSince: null,
    lastFinishedAt: now,
    lastError: compactRuntimeError(error),
  };
}

export function getRecoveryRuntimeSnapshot(): RecoveryRuntimeSnapshot {
  return {
    ...recoveryRuntimeSnapshot,
    lastPhaseDurations: cloneRecoveryPhaseDurations(recoveryRuntimeSnapshot.lastPhaseDurations),
  };
}

export function markActionCompletionObserved(observation: ActionCompletionObservation): void {
  const threshold = actionCompletionSlowThresholdMs();
  const limit = actionCompletionSampleLimit();
  const cloned = cloneActionCompletionObservation(observation);
  const isSlow = threshold > 0 && cloned.durationMs >= threshold;

  actionCompletionRuntimeState = {
    ...actionCompletionRuntimeState,
    lastObservedAt: cloned.observedAt,
    totalObservedSinceStart: actionCompletionRuntimeState.totalObservedSinceStart + 1,
    slowObservedSinceStart: actionCompletionRuntimeState.slowObservedSinceStart + (isSlow ? 1 : 0),
    recentSlow: [...actionCompletionRuntimeState.recentSlow],
    recentErrors: [...actionCompletionRuntimeState.recentErrors],
  };

  if (isSlow) pushCapped(actionCompletionRuntimeState.recentSlow, cloned, limit);
  if (cloned.outcome === "error") pushCapped(actionCompletionRuntimeState.recentErrors, cloned, limit);
}

export function getActionCompletionRuntimeSnapshot(): ActionCompletionRuntimeSnapshot {
  return {
    slowThresholdMs: actionCompletionSlowThresholdMs(),
    lastObservedAt: actionCompletionRuntimeState.lastObservedAt ? new Date(actionCompletionRuntimeState.lastObservedAt.getTime()) : null,
    totalObservedSinceStart: actionCompletionRuntimeState.totalObservedSinceStart,
    slowObservedSinceStart: actionCompletionRuntimeState.slowObservedSinceStart,
    recentSlow: actionCompletionRuntimeState.recentSlow.map(cloneActionCompletionObservation),
    recentErrors: actionCompletionRuntimeState.recentErrors.map(cloneActionCompletionObservation),
  };
}

export function resetActionCompletionRuntimeSnapshotForTests(): void {
  actionCompletionRuntimeState = {
    lastObservedAt: null,
    totalObservedSinceStart: 0,
    slowObservedSinceStart: 0,
    recentSlow: [],
    recentErrors: [],
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
