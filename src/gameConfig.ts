import { WorldActionType } from "@prisma/client";

export const TICK_MS = 1500;

export const DEFAULT_ACTION_DURATION_MS = 13_000;
export const MIN_ACTION_DURATION_MS = 1_000;
export const ACTION_QUEUE_POLL_MS = 1_000;
export const MAX_QUEUED_ACTIONS_PER_ACTOR = 12;

export const actionDurationConfig: Partial<Record<WorldActionType, number>> = {
  LOOK: 3_000,
  INSPECT: 3_000,
  GREET: 2_000,
  SAY: 1_500,
  ATTACK: 4_000,
  FRESHEN: 13_000,
  EAT: 5_000,
  REST: 13_000,
  TRACK: 6_000,
  SET_TRAP: 13_000,
  WAIT: 3_000,
};

export const gatherConfig: Record<string, { chance: number; ticks: number }> = {
  mushrooms: { chance: 1 / 3, ticks: 2 },
  berries: { chance: 1 / 4, ticks: 2 },
  herbs: { chance: 1 / 5, ticks: 3 },
};
