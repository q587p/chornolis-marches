import { WorldActionType } from "@prisma/client";
import { config } from "./config";

export const BASE_STAMINA = 13;
export const BASE_HP = 20;
export const LOW_HP_WARNING = 3;
export const VERY_TIRED_STAMINA = -(BASE_STAMINA * 3);

export const ACTION_BASE_TICKS = 9;
export const MIN_ACTION_DURATION_MS = 1_000;
export const QUICK_PLAYER_ACTION_DURATION_MS = MIN_ACTION_DURATION_MS;
export const MAX_QUEUED_ACTIONS_PER_ACTOR = 12;

export const STAMINA_REGEN_INTERVAL_TICKS = 40;
export const PASSIVE_STAMINA_REGEN_PER_INTERVAL = 1;
export const REST_STAMINA_REGEN_PER_INTERVAL = BASE_STAMINA;

// With WORLD_TICK_INTERVAL_MS=5000 this means:
// passive HP: +1 per 13 minutes; rest HP: +1 per 6.5 minutes.
export const PASSIVE_HEALTH_REGEN_INTERVAL_TICKS = 156;
export const REST_HEALTH_REGEN_INTERVAL_TICKS = 78;
export const HEALTH_REGEN_PER_INTERVAL = 1;

export const TRACK_TTL_TICKS = 400;
export const AUTO_INTERVAL_TICKS = 6;

export let TICK_MS = config.tickMs;
export let ACTION_BASE_DURATION_MS = TICK_MS * ACTION_BASE_TICKS;
export let DEFAULT_ACTION_DURATION_MS = ACTION_BASE_DURATION_MS;
export let ACTION_QUEUE_POLL_MS = TICK_MS;
export let STAMINA_REGEN_INTERVAL_MS = TICK_MS * STAMINA_REGEN_INTERVAL_TICKS;
export let PASSIVE_HEALTH_REGEN_INTERVAL_MS = TICK_MS * PASSIVE_HEALTH_REGEN_INTERVAL_TICKS;
export let REST_HEALTH_REGEN_INTERVAL_MS = TICK_MS * REST_HEALTH_REGEN_INTERVAL_TICKS;
export let TRACK_TTL_MS = TICK_MS * TRACK_TTL_TICKS;
export let AUTO_INTERVAL_MS = TICK_MS * AUTO_INTERVAL_TICKS;

function recalculateTickDerivedConfig() {
  ACTION_BASE_DURATION_MS = TICK_MS * ACTION_BASE_TICKS;
  DEFAULT_ACTION_DURATION_MS = ACTION_BASE_DURATION_MS;
  ACTION_QUEUE_POLL_MS = TICK_MS;
  STAMINA_REGEN_INTERVAL_MS = TICK_MS * STAMINA_REGEN_INTERVAL_TICKS;
  PASSIVE_HEALTH_REGEN_INTERVAL_MS = TICK_MS * PASSIVE_HEALTH_REGEN_INTERVAL_TICKS;
  REST_HEALTH_REGEN_INTERVAL_MS = TICK_MS * REST_HEALTH_REGEN_INTERVAL_TICKS;
  TRACK_TTL_MS = TICK_MS * TRACK_TTL_TICKS;
  AUTO_INTERVAL_MS = TICK_MS * AUTO_INTERVAL_TICKS;
}

export function setRuntimeTickMs(value: number) {
  if (!Number.isFinite(value) || value < 1000) {
    throw new Error("Tick must be a finite number >= 1000 ms.");
  }
  TICK_MS = Math.floor(value);
  recalculateTickDerivedConfig();
  return getRuntimeTimingConfig();
}

function actionMs(type: WorldActionType) {
  return Math.max(MIN_ACTION_DURATION_MS, (playerStaminaCostConfig[type] ?? 1) * ACTION_BASE_TICKS * TICK_MS);
}

export function getRuntimeTimingConfig() {
  return {
    tickMs: TICK_MS,
    actionQueuePollMs: ACTION_QUEUE_POLL_MS,
    actionBaseTicks: ACTION_BASE_TICKS,
    staminaRegenTicks: STAMINA_REGEN_INTERVAL_TICKS,
    staminaRegenMs: STAMINA_REGEN_INTERVAL_MS,
    passiveHealthRegenTicks: PASSIVE_HEALTH_REGEN_INTERVAL_TICKS,
    passiveHealthRegenMs: PASSIVE_HEALTH_REGEN_INTERVAL_MS,
    restHealthRegenTicks: REST_HEALTH_REGEN_INTERVAL_TICKS,
    restHealthRegenMs: REST_HEALTH_REGEN_INTERVAL_MS,
    trackTtlTicks: TRACK_TTL_TICKS,
    trackTtlMs: TRACK_TTL_MS,
    autoIntervalTicks: AUTO_INTERVAL_TICKS,
    autoIntervalMs: AUTO_INTERVAL_MS,
    actions: {
      moveMs: actionMs("MOVE"),
      lookMs: actionMs("LOOK"),
      gatherMs: actionMs("GATHER"),
      attackMs: actionMs("ATTACK"),
    },
  };
}

export const actionPriorityConfig: Partial<Record<WorldActionType, number>> = {
  ATTACK: 100,
  TRACK: 40,
  MOVE: 30,
  EAT: 25,
  GATHER: 20,
  GATHER_SPECIFIC: 23,
  FRESHEN: 20,
  LOOK: 10,
  INSPECT: 10,
  GREET: 5,
  SAY: 5,
  REST: 0,
  SET_TRAP: 20,
  WAIT: -10,
};

export const playerStaminaCostConfig: Partial<Record<WorldActionType, number>> = {
  MOVE: 1,
  LOOK: 3,
  INSPECT: 3,
  TRACK: 3,
  GREET: 1,
  SAY: 1,
  GATHER: 5,
  GATHER_SPECIFIC: 5,
  FRESHEN: 5,
  SET_TRAP: 5,
  EAT: 1,
  ATTACK: 7,
  REST: 0,
  WAIT: 0,
};

export const gatherConfig: Record<string, { chance: number; ticks: number }> = {
  mushrooms: { chance: 1 / 3, ticks: 2 },
  berries: { chance: 1 / 4, ticks: 2 },
  herbs: { chance: 1 / 5, ticks: 3 },
};
