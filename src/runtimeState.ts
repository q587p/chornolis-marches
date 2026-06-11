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

export type WorldTickPhaseDurations = Record<string, number>;

export type WorldTickRuntimeSnapshot = {
  running: boolean;
  runningSince: Date | null;
  lastStartedAt: Date | null;
  lastFinishedAt: Date | null;
  lastError: string | null;
  lastPhase: string | null;
  lastPhaseStartedAt: Date | null;
  lastPhaseDurations: WorldTickPhaseDurations | null;
  lastTickNumber: number;
  skippedBecauseRunning: number;
  lastRunDurationMs: number | null;
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

export type TelegramSendOutcome = "ok" | "blocked" | "error";

export type TelegramSendObservation = {
  observedAt: Date;
  context: string;
  durationMs: number;
  outcome: TelegramSendOutcome;
  error: string | null;
  hasReplyMarkup?: boolean;
};

export type TelegramSendRuntimeSnapshot = {
  slowThresholdMs: number;
  lastObservedAt: Date | null;
  totalObservedSinceStart: number;
  slowObservedSinceStart: number;
  blockedSinceStart: number;
  errorSinceStart: number;
  recentSlow: TelegramSendObservation[];
  recentErrors: TelegramSendObservation[];
};

export type DatabaseQueryOutcome = "ok" | "error";

export type DatabaseQueryObservation = {
  observedAt: Date;
  model: string | null;
  action: string;
  durationMs: number;
  outcome: DatabaseQueryOutcome;
  error: string | null;
};

export type DatabaseQueryRuntimeSnapshot = {
  enabled: boolean;
  slowThresholdMs: number;
  sampleLimit: number;
  lastObservedAt: Date | null;
  totalObservedSinceStart: number;
  slowObservedSinceStart: number;
  errorSinceStart: number;
  recentSlow: DatabaseQueryObservation[];
  recentErrors: DatabaseQueryObservation[];
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

let worldTickRuntimeSnapshot: WorldTickRuntimeSnapshot = {
  running: false,
  runningSince: null,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastError: null,
  lastPhase: null,
  lastPhaseStartedAt: null,
  lastPhaseDurations: null,
  lastTickNumber: 0,
  skippedBecauseRunning: 0,
  lastRunDurationMs: null,
};

let actionCompletionRuntimeState: Omit<ActionCompletionRuntimeSnapshot, "slowThresholdMs"> = {
  lastObservedAt: null,
  totalObservedSinceStart: 0,
  slowObservedSinceStart: 0,
  recentSlow: [],
  recentErrors: [],
};

const DEFAULT_ACTION_COMPLETION_SLOW_MS = 1000;
const DEFAULT_TELEGRAM_SEND_SLOW_MS = 1000;
const DEFAULT_DATABASE_QUERY_SLOW_MS = 100;
const DEFAULT_WORLD_TICK_STALE_MS = 180_000;

let telegramSendRuntimeState: Omit<TelegramSendRuntimeSnapshot, "slowThresholdMs"> = {
  lastObservedAt: null,
  totalObservedSinceStart: 0,
  slowObservedSinceStart: 0,
  blockedSinceStart: 0,
  errorSinceStart: 0,
  recentSlow: [],
  recentErrors: [],
};

let databaseQueryRuntimeState: Omit<DatabaseQueryRuntimeSnapshot, "enabled" | "slowThresholdMs" | "sampleLimit"> = {
  lastObservedAt: null,
  totalObservedSinceStart: 0,
  slowObservedSinceStart: 0,
  errorSinceStart: 0,
  recentSlow: [],
  recentErrors: [],
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

function intEnv(name: string, fallback: number) {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = Number(env?.[name]);
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

function boolEnv(name: string, fallback: boolean) {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = env?.[name]?.trim().toLowerCase();
  if (value === undefined || value === "") return fallback;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
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

export function telegramSendSlowThresholdMs() {
  return Math.max(0, intEnv("TELEGRAM_SEND_SLOW_MS", intEnv("SLOW_COMMAND_LOG_MS", DEFAULT_TELEGRAM_SEND_SLOW_MS)));
}

export function telegramSendSampleLimit() {
  return Math.max(1, Math.min(50, intEnv("TELEGRAM_SEND_SAMPLE_LIMIT", 10)));
}

export function compactTelegramSendError(error: unknown) {
  return compactRuntimeError(error);
}

export function databaseQueryObservabilityEnabled() {
  return boolEnv("DATABASE_QUERY_OBSERVABILITY_ENABLED", true);
}

export function databaseQuerySlowThresholdMs() {
  return Math.max(0, intEnv("DATABASE_QUERY_SLOW_MS", intEnv("SLOW_COMMAND_LOG_MS", DEFAULT_DATABASE_QUERY_SLOW_MS)));
}

export function databaseQuerySampleLimit() {
  return Math.max(1, Math.min(50, intEnv("DATABASE_QUERY_SAMPLE_LIMIT", 10)));
}

export function worldTickStaleThresholdMs() {
  return Math.max(0, intEnv("WORLD_TICK_STALE_MS", DEFAULT_WORLD_TICK_STALE_MS));
}

function compactDatabaseQueryLabel(value: unknown, fallback: string) {
  const text = String(value ?? fallback).replace(/[^a-zA-Z0-9_$.-]/g, "").slice(0, 64);
  return text || fallback;
}

export function compactDatabaseQueryError(error: unknown) {
  const text = String(error instanceof Error ? error.message : error)
    .replace(/\s+/g, " ")
    .replace(/\b(chatId|chat id|telegramId|telegram id|payload|token|secret|private whisper|whisper|message text|messageText|raw body|rawBody|query args|args|sql|params|parameters|row data)\b/gi, "[redacted]")
    .replace(/[0-9]{5,}/g, "#")
    .trim();
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}

function cloneActionCompletionObservation(observation: ActionCompletionObservation): ActionCompletionObservation {
  return {
    ...observation,
    observedAt: new Date(observation.observedAt.getTime()),
  };
}

function cloneTelegramSendObservation(observation: TelegramSendObservation): TelegramSendObservation {
  return {
    ...observation,
    observedAt: new Date(observation.observedAt.getTime()),
  };
}

function cloneDatabaseQueryObservation(observation: DatabaseQueryObservation): DatabaseQueryObservation {
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

function cloneWorldTickPhaseDurations(value: WorldTickPhaseDurations | null): WorldTickPhaseDurations | null {
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

export function markWorldTickStarted(tickNumber: number, now = new Date()): void {
  worldTickRuntimeSnapshot = {
    ...worldTickRuntimeSnapshot,
    running: true,
    runningSince: now,
    lastStartedAt: now,
    lastError: null,
    lastPhase: null,
    lastPhaseStartedAt: null,
    lastPhaseDurations: {},
    lastTickNumber: tickNumber,
    lastRunDurationMs: null,
  };
}

export function markWorldTickPhaseStarted(phase: string, now = new Date()): void {
  worldTickRuntimeSnapshot = {
    ...worldTickRuntimeSnapshot,
    lastPhase: phase,
    lastPhaseStartedAt: now,
    lastPhaseDurations: worldTickRuntimeSnapshot.lastPhaseDurations ?? {},
  };
}

export function markWorldTickPhaseFinished(phase: string, durationMs: number): void {
  const durations = worldTickRuntimeSnapshot.lastPhaseDurations ?? {};
  worldTickRuntimeSnapshot = {
    ...worldTickRuntimeSnapshot,
    lastPhaseDurations: {
      ...durations,
      [phase]: Math.max(0, Math.round(durationMs)),
    },
  };
}

export function markWorldTickFinished(tickNumber: number, now = new Date()): WorldTickRuntimeSnapshot {
  const startedAt = worldTickRuntimeSnapshot.lastStartedAt;
  const durationMs = startedAt ? Math.max(0, now.getTime() - startedAt.getTime()) : null;
  worldTickRuntimeSnapshot = {
    ...worldTickRuntimeSnapshot,
    running: false,
    runningSince: null,
    lastFinishedAt: now,
    lastError: null,
    lastTickNumber: tickNumber,
    lastRunDurationMs: durationMs,
    lastPhaseDurations: cloneWorldTickPhaseDurations(worldTickRuntimeSnapshot.lastPhaseDurations) ?? {},
  };
  return getWorldTickRuntimeSnapshot();
}

export function markWorldTickError(error: unknown, now = new Date()): WorldTickRuntimeSnapshot {
  const startedAt = worldTickRuntimeSnapshot.lastStartedAt;
  const durationMs = startedAt ? Math.max(0, now.getTime() - startedAt.getTime()) : null;
  worldTickRuntimeSnapshot = {
    ...worldTickRuntimeSnapshot,
    running: false,
    runningSince: null,
    lastFinishedAt: now,
    lastError: compactRuntimeError(error),
    lastRunDurationMs: durationMs,
  };
  return getWorldTickRuntimeSnapshot();
}

export function markWorldTickSkippedBecauseRunning(): WorldTickRuntimeSnapshot {
  worldTickRuntimeSnapshot = {
    ...worldTickRuntimeSnapshot,
    skippedBecauseRunning: worldTickRuntimeSnapshot.skippedBecauseRunning + 1,
  };
  return getWorldTickRuntimeSnapshot();
}

export function getWorldTickRuntimeSnapshot(): WorldTickRuntimeSnapshot {
  return {
    ...worldTickRuntimeSnapshot,
    runningSince: worldTickRuntimeSnapshot.runningSince ? new Date(worldTickRuntimeSnapshot.runningSince.getTime()) : null,
    lastStartedAt: worldTickRuntimeSnapshot.lastStartedAt ? new Date(worldTickRuntimeSnapshot.lastStartedAt.getTime()) : null,
    lastFinishedAt: worldTickRuntimeSnapshot.lastFinishedAt ? new Date(worldTickRuntimeSnapshot.lastFinishedAt.getTime()) : null,
    lastPhaseStartedAt: worldTickRuntimeSnapshot.lastPhaseStartedAt ? new Date(worldTickRuntimeSnapshot.lastPhaseStartedAt.getTime()) : null,
    lastPhaseDurations: cloneWorldTickPhaseDurations(worldTickRuntimeSnapshot.lastPhaseDurations),
  };
}

export function resetWorldTickRuntimeSnapshotForTests(): void {
  worldTickRuntimeSnapshot = {
    running: false,
    runningSince: null,
    lastStartedAt: null,
    lastFinishedAt: null,
    lastError: null,
    lastPhase: null,
    lastPhaseStartedAt: null,
    lastPhaseDurations: null,
    lastTickNumber: 0,
    skippedBecauseRunning: 0,
    lastRunDurationMs: null,
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

export function markTelegramSendObserved(observation: TelegramSendObservation): void {
  const threshold = telegramSendSlowThresholdMs();
  const limit = telegramSendSampleLimit();
  const cloned = cloneTelegramSendObservation(observation);
  const isSlow = threshold > 0 && cloned.durationMs >= threshold;

  telegramSendRuntimeState = {
    ...telegramSendRuntimeState,
    lastObservedAt: cloned.observedAt,
    totalObservedSinceStart: telegramSendRuntimeState.totalObservedSinceStart + 1,
    slowObservedSinceStart: telegramSendRuntimeState.slowObservedSinceStart + (isSlow ? 1 : 0),
    blockedSinceStart: telegramSendRuntimeState.blockedSinceStart + (cloned.outcome === "blocked" ? 1 : 0),
    errorSinceStart: telegramSendRuntimeState.errorSinceStart + (cloned.outcome === "error" ? 1 : 0),
    recentSlow: [...telegramSendRuntimeState.recentSlow],
    recentErrors: [...telegramSendRuntimeState.recentErrors],
  };

  if (isSlow) pushCapped(telegramSendRuntimeState.recentSlow, cloned, limit);
  if (cloned.outcome === "error") pushCapped(telegramSendRuntimeState.recentErrors, cloned, limit);
}

export function getTelegramSendRuntimeSnapshot(): TelegramSendRuntimeSnapshot {
  return {
    slowThresholdMs: telegramSendSlowThresholdMs(),
    lastObservedAt: telegramSendRuntimeState.lastObservedAt ? new Date(telegramSendRuntimeState.lastObservedAt.getTime()) : null,
    totalObservedSinceStart: telegramSendRuntimeState.totalObservedSinceStart,
    slowObservedSinceStart: telegramSendRuntimeState.slowObservedSinceStart,
    blockedSinceStart: telegramSendRuntimeState.blockedSinceStart,
    errorSinceStart: telegramSendRuntimeState.errorSinceStart,
    recentSlow: telegramSendRuntimeState.recentSlow.map(cloneTelegramSendObservation),
    recentErrors: telegramSendRuntimeState.recentErrors.map(cloneTelegramSendObservation),
  };
}

export function resetTelegramSendRuntimeSnapshotForTests(): void {
  telegramSendRuntimeState = {
    lastObservedAt: null,
    totalObservedSinceStart: 0,
    slowObservedSinceStart: 0,
    blockedSinceStart: 0,
    errorSinceStart: 0,
    recentSlow: [],
    recentErrors: [],
  };
}

export function markDatabaseQueryObserved(observation: DatabaseQueryObservation): void {
  if (!databaseQueryObservabilityEnabled()) return;

  const threshold = databaseQuerySlowThresholdMs();
  const limit = databaseQuerySampleLimit();
  const cloned: DatabaseQueryObservation = {
    observedAt: new Date(observation.observedAt.getTime()),
    model: observation.model ? compactDatabaseQueryLabel(observation.model, "unknown") : null,
    action: compactDatabaseQueryLabel(observation.action, "unknown"),
    durationMs: Math.max(0, observation.durationMs),
    outcome: observation.outcome,
    error: observation.error ? compactDatabaseQueryError(observation.error) : null,
  };
  const isSlow = threshold > 0 && cloned.durationMs >= threshold;

  databaseQueryRuntimeState = {
    ...databaseQueryRuntimeState,
    lastObservedAt: cloned.observedAt,
    totalObservedSinceStart: databaseQueryRuntimeState.totalObservedSinceStart + 1,
    slowObservedSinceStart: databaseQueryRuntimeState.slowObservedSinceStart + (isSlow ? 1 : 0),
    errorSinceStart: databaseQueryRuntimeState.errorSinceStart + (cloned.outcome === "error" ? 1 : 0),
    recentSlow: [...databaseQueryRuntimeState.recentSlow],
    recentErrors: [...databaseQueryRuntimeState.recentErrors],
  };

  if (isSlow) pushCapped(databaseQueryRuntimeState.recentSlow, cloned, limit);
  if (cloned.outcome === "error") pushCapped(databaseQueryRuntimeState.recentErrors, cloned, limit);

  if (isSlow || cloned.outcome === "error") {
    const model = cloned.model ?? "unknown";
    const errorText = cloned.error ? ` error=${cloned.error}` : "";
    console.warn(`slow:databaseQuery model=${model} action=${cloned.action} durationMs=${Math.round(cloned.durationMs)} outcome=${cloned.outcome}${errorText}`);
  }
}

export function getDatabaseQueryRuntimeSnapshot(): DatabaseQueryRuntimeSnapshot {
  return {
    enabled: databaseQueryObservabilityEnabled(),
    slowThresholdMs: databaseQuerySlowThresholdMs(),
    sampleLimit: databaseQuerySampleLimit(),
    lastObservedAt: databaseQueryRuntimeState.lastObservedAt ? new Date(databaseQueryRuntimeState.lastObservedAt.getTime()) : null,
    totalObservedSinceStart: databaseQueryRuntimeState.totalObservedSinceStart,
    slowObservedSinceStart: databaseQueryRuntimeState.slowObservedSinceStart,
    errorSinceStart: databaseQueryRuntimeState.errorSinceStart,
    recentSlow: databaseQueryRuntimeState.recentSlow.map(cloneDatabaseQueryObservation),
    recentErrors: databaseQueryRuntimeState.recentErrors.map(cloneDatabaseQueryObservation),
  };
}

export function resetDatabaseQueryRuntimeSnapshotForTests(): void {
  databaseQueryRuntimeState = {
    lastObservedAt: null,
    totalObservedSinceStart: 0,
    slowObservedSinceStart: 0,
    errorSinceStart: 0,
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
