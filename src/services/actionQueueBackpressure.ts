export type CreatureQueueBackpressureMode = "normal" | "limited" | "pause-starts";

declare const process: { env: Record<string, string | undefined> };

export type CreatureQueueBackpressureConfig = {
  enabled: boolean;
  playerOverdueMs: number;
  pauseStartsMs: number;
  normalRunningBatch: number;
  normalCompletionConcurrency: number;
  normalStartBatch: number;
  runningBatch: number;
  completionConcurrency: number;
  startBatch: number;
};

export type CreatureQueueBackpressureInput = {
  playerOverdue: number;
  playerMaxOverdueMs: number;
  playerQueued: number;
  playerRunning: number;
  creatureQueued: number;
  creatureRunning: number;
  now?: Date;
  config?: Partial<CreatureQueueBackpressureConfig>;
};

export type CreatureQueueBackpressurePlan = {
  mode: CreatureQueueBackpressureMode;
  reason: string;
  runningBatch: number;
  completionConcurrency: number;
  startBatch: number;
  playerOverdue: number;
  playerMaxOverdueMs: number;
};

function booleanEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function nonNegativeIntEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function nonNegativeInt(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) >= 0 ? Math.floor(Number(value)) : fallback;
}

function safeConcurrencyForBatch(value: number | undefined, batch: number, fallback: number) {
  const safeValue = nonNegativeInt(value, fallback);
  return batch > 0 ? Math.max(1, safeValue) : 0;
}

export function creatureQueueBackpressureConfig(
  overrides: Partial<CreatureQueueBackpressureConfig> = {},
): CreatureQueueBackpressureConfig {
  const normalRunningBatch = nonNegativeInt(overrides.normalRunningBatch, 1000);
  const normalStartBatch = nonNegativeInt(overrides.normalStartBatch, 1000);
  const runningBatch = nonNegativeInt(
    overrides.runningBatch,
    nonNegativeIntEnv("CREATURE_QUEUE_BACKPRESSURE_RUNNING_BATCH", 50),
  );
  const startBatch = nonNegativeInt(
    overrides.startBatch,
    nonNegativeIntEnv("CREATURE_QUEUE_BACKPRESSURE_START_BATCH", 0),
  );

  return {
    enabled: overrides.enabled ?? booleanEnv("CREATURE_QUEUE_BACKPRESSURE_ENABLED", true),
    playerOverdueMs: nonNegativeInt(
      overrides.playerOverdueMs,
      nonNegativeIntEnv("CREATURE_QUEUE_BACKPRESSURE_PLAYER_OVERDUE_MS", 1000),
    ),
    pauseStartsMs: nonNegativeInt(
      overrides.pauseStartsMs,
      nonNegativeIntEnv("CREATURE_QUEUE_BACKPRESSURE_PAUSE_STARTS_MS", 5000),
    ),
    normalRunningBatch,
    normalCompletionConcurrency: safeConcurrencyForBatch(
      overrides.normalCompletionConcurrency,
      normalRunningBatch,
      25,
    ),
    normalStartBatch,
    runningBatch,
    completionConcurrency: safeConcurrencyForBatch(
      overrides.completionConcurrency
        ?? nonNegativeIntEnv("CREATURE_QUEUE_BACKPRESSURE_COMPLETION_CONCURRENCY", 5),
      runningBatch,
      5,
    ),
    startBatch,
  };
}

function safeCount(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function safeMs(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function planCreatureQueueBackpressure(input: CreatureQueueBackpressureInput): CreatureQueueBackpressurePlan {
  const config = creatureQueueBackpressureConfig(input.config);
  const playerOverdue = safeCount(input.playerOverdue);
  const playerMaxOverdueMs = safeMs(input.playerMaxOverdueMs);
  const normal = {
    mode: "normal" as CreatureQueueBackpressureMode,
    reason: "no player overdue backpressure",
    runningBatch: config.normalRunningBatch,
    completionConcurrency: config.normalCompletionConcurrency,
    startBatch: config.normalStartBatch,
    playerOverdue,
    playerMaxOverdueMs,
  };

  if (!config.enabled) return { ...normal, reason: "backpressure disabled" };
  if (playerOverdue <= 0 || playerMaxOverdueMs < config.playerOverdueMs) return normal;

  const reason = `player overdue ${playerMaxOverdueMs} ms`;
  if (playerMaxOverdueMs >= config.pauseStartsMs) {
    return {
      mode: "pause-starts",
      reason,
      runningBatch: config.runningBatch,
      completionConcurrency: config.completionConcurrency,
      startBatch: 0,
      playerOverdue,
      playerMaxOverdueMs,
    };
  }

  return {
    mode: "limited",
    reason,
    runningBatch: config.runningBatch,
    completionConcurrency: config.completionConcurrency,
    startBatch: config.startBatch,
    playerOverdue,
    playerMaxOverdueMs,
  };
}
