import { WorldActionType } from "@prisma/client";

export const TICK_MS = 1500;

export const BASE_STAMINA = 13;
export const VERY_TIRED_STAMINA = -(BASE_STAMINA * 3);
export const ACTION_BASE_DURATION_MS = 13_000;
export const DEFAULT_ACTION_DURATION_MS = ACTION_BASE_DURATION_MS;
export const MIN_ACTION_DURATION_MS = 1_000;
export const ACTION_QUEUE_POLL_MS = 1_000;
export const MAX_QUEUED_ACTIONS_PER_ACTOR = 12;

export const STAMINA_REGEN_INTERVAL_MS = 60_000;
export const PASSIVE_STAMINA_REGEN_PER_INTERVAL = 1;
export const REST_STAMINA_REGEN_PER_INTERVAL = BASE_STAMINA;
export const TRACK_TTL_MS = 10 * 60_000;

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
