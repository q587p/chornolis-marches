import { WorldActionType } from "@prisma/client";
import { config } from "./config";

export const BASE_STAMINA = 42;
export const BASE_HP = 20;
export const PLAYER_HUNGER_MAX = 13;
export const PLAYER_STRENUOUS_HUNGER_COST_THRESHOLD = 7;
export const REST_ADMIN_STAMINA_CAP_MULTIPLIER = 5;
export const LOW_HP_WARNING = 3;
export const VERY_TIRED_STAMINA = -(BASE_STAMINA * 3);

export const ACTION_BASE_TICKS = 3;
export const MIN_ACTION_DURATION_MS = 100;
export const QUICK_PLAYER_ACTION_DURATION_MS = MIN_ACTION_DURATION_MS;
export const MAX_QUEUED_ACTIONS_PER_ACTOR = 17;

export const STAMINA_REGEN_INTERVAL_TICKS = 40;
export const PASSIVE_STAMINA_REGEN_PER_INTERVAL = 13;
export const REST_STAMINA_REGEN_INTERVAL_TICKS = 4;
export const REST_STAMINA_REGEN_PER_INTERVAL = 26;

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
export let ACTION_QUEUE_POLL_MS = Math.min(TICK_MS, QUICK_PLAYER_ACTION_DURATION_MS);
export let STAMINA_REGEN_INTERVAL_MS = TICK_MS * STAMINA_REGEN_INTERVAL_TICKS;
export let REST_STAMINA_REGEN_INTERVAL_MS = TICK_MS * REST_STAMINA_REGEN_INTERVAL_TICKS;
export let PASSIVE_HEALTH_REGEN_INTERVAL_MS = TICK_MS * PASSIVE_HEALTH_REGEN_INTERVAL_TICKS;
export let REST_HEALTH_REGEN_INTERVAL_MS = TICK_MS * REST_HEALTH_REGEN_INTERVAL_TICKS;
export let TRACK_TTL_MS = TICK_MS * TRACK_TTL_TICKS;
export let AUTO_INTERVAL_MS = TICK_MS * AUTO_INTERVAL_TICKS;

function recalculateTickDerivedConfig() {
  ACTION_BASE_DURATION_MS = TICK_MS * ACTION_BASE_TICKS;
  DEFAULT_ACTION_DURATION_MS = ACTION_BASE_DURATION_MS;
  ACTION_QUEUE_POLL_MS = Math.min(TICK_MS, QUICK_PLAYER_ACTION_DURATION_MS);
  STAMINA_REGEN_INTERVAL_MS = TICK_MS * STAMINA_REGEN_INTERVAL_TICKS;
  REST_STAMINA_REGEN_INTERVAL_MS = TICK_MS * REST_STAMINA_REGEN_INTERVAL_TICKS;
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

export const actionDurationTickMultiplierConfig: Partial<Record<WorldActionType, number>> = {
  ATTACK: 2,
};

export function actionDurationTicks(type: WorldActionType) {
  return Math.max(1, (actionDurationTickMultiplierConfig[type] ?? playerStaminaCostConfig[type] ?? 1) * ACTION_BASE_TICKS);
}

function actionMs(type: WorldActionType) {
  return Math.max(MIN_ACTION_DURATION_MS, actionDurationTicks(type) * TICK_MS);
}

export function getRuntimeTimingConfig() {
  return {
    tickMs: TICK_MS,
    actionQueuePollMs: ACTION_QUEUE_POLL_MS,
    actionBaseTicks: ACTION_BASE_TICKS,
    staminaRegenTicks: STAMINA_REGEN_INTERVAL_TICKS,
    staminaRegenMs: STAMINA_REGEN_INTERVAL_MS,
    passiveStaminaRegenAmount: PASSIVE_STAMINA_REGEN_PER_INTERVAL,
    restStaminaRegenTicks: REST_STAMINA_REGEN_INTERVAL_TICKS,
    restStaminaRegenMs: REST_STAMINA_REGEN_INTERVAL_MS,
    restStaminaRegenAmount: REST_STAMINA_REGEN_PER_INTERVAL,
    passiveHealthRegenTicks: PASSIVE_HEALTH_REGEN_INTERVAL_TICKS,
    passiveHealthRegenMs: PASSIVE_HEALTH_REGEN_INTERVAL_MS,
    restHealthRegenTicks: REST_HEALTH_REGEN_INTERVAL_TICKS,
    restHealthRegenMs: REST_HEALTH_REGEN_INTERVAL_MS,
    trackTtlTicks: TRACK_TTL_TICKS,
    trackTtlMs: TRACK_TTL_MS,
    autoIntervalTicks: AUTO_INTERVAL_TICKS,
    autoIntervalMs: AUTO_INTERVAL_MS,
    actions: {
      quickMs: QUICK_PLAYER_ACTION_DURATION_MS,
      moveMs: actionMs("MOVE"),
      lookMs: actionMs("LOOK"),
      gatherMs: actionMs("GATHER"),
      attackMs: actionMs("ATTACK"),
      moveTicks: actionDurationTicks("MOVE"),
      lookTicks: actionDurationTicks("LOOK"),
      gatherTicks: actionDurationTicks("GATHER"),
      attackTicks: actionDurationTicks("ATTACK"),
    },
  };
}

export const actionPriorityConfig: Partial<Record<WorldActionType, number>> = {
  ATTACK: 100,
  TRACK: 40,
  MOVE: 30,
  EAT: 25,
  USE_ITEM: 25,
  DROP_ITEM: 24,
  LIGHT_TORCH: 24,
  DOUSE_TORCH: 24,
  ADD_TWIGS: 24,
  LIGHT_CAMPFIRE: 24,
  BUILD_CAMPFIRE: 24,
  DOUSE_CAMPFIRE: 24,
  DISMANTLE_CAMPFIRE: 20,
  DISMANTLE_TOTEM: 20,
  COOK: 22,
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
  FRESHEN: 3,
  USE_ITEM: 1,
  DROP_ITEM: 1,
  LIGHT_TORCH: 2,
  DOUSE_TORCH: 1,
  ADD_TWIGS: 2,
  LIGHT_CAMPFIRE: 2,
  BUILD_CAMPFIRE: 3,
  DOUSE_CAMPFIRE: 1,
  DISMANTLE_CAMPFIRE: 2,
  DISMANTLE_TOTEM: 2,
  COOK: 4,
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
