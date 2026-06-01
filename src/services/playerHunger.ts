import { PLAYER_HUNGER_MAX } from "../gameConfig";
import { prisma, type PrismaDb } from "../db";
import { isTutorialLocation } from "./tutorial";

export const PASSIVE_PLAYER_HUNGER_INTERVAL_WORLD_MINUTES = 4 * 60;
export const PASSIVE_PLAYER_HUNGER_GAIN = 1;

export type PassivePlayerHungerPlan = {
  hunger: number;
  lastPassiveHungerAtMinute: number;
  increments: number;
  initialized: boolean;
  resetBackwards: boolean;
};

export function passivePlayerHungerPlan(input: {
  hunger: number;
  currentWorldMinute: number;
  lastPassiveHungerAtMinute?: number | null;
  maxHunger?: number;
  intervalWorldMinutes?: number;
  gain?: number;
}): PassivePlayerHungerPlan {
  const maxHunger = Math.max(0, Math.floor(input.maxHunger ?? PLAYER_HUNGER_MAX));
  const interval = Math.max(1, Math.floor(input.intervalWorldMinutes ?? PASSIVE_PLAYER_HUNGER_INTERVAL_WORLD_MINUTES));
  const gain = Math.max(1, Math.floor(input.gain ?? PASSIVE_PLAYER_HUNGER_GAIN));
  const currentWorldMinute = Math.max(0, Math.floor(input.currentWorldMinute));
  const hunger = Math.max(0, Math.min(maxHunger, Math.floor(input.hunger)));
  const last = input.lastPassiveHungerAtMinute == null
    ? null
    : Math.max(0, Math.floor(input.lastPassiveHungerAtMinute));

  if (last == null) {
    return {
      hunger,
      lastPassiveHungerAtMinute: currentWorldMinute,
      increments: 0,
      initialized: true,
      resetBackwards: false,
    };
  }

  if (currentWorldMinute < last) {
    return {
      hunger,
      lastPassiveHungerAtMinute: currentWorldMinute,
      increments: 0,
      initialized: false,
      resetBackwards: true,
    };
  }

  const intervals = Math.floor((currentWorldMinute - last) / interval);
  if (intervals <= 0) {
    return {
      hunger,
      lastPassiveHungerAtMinute: last,
      increments: 0,
      initialized: false,
      resetBackwards: false,
    };
  }

  const increments = intervals * gain;
  return {
    hunger: Math.min(maxHunger, hunger + increments),
    lastPassiveHungerAtMinute: last + intervals * interval,
    increments,
    initialized: false,
    resetBackwards: false,
  };
}

export async function advancePassivePlayerHunger(
  currentWorldMinute: number,
  db: PrismaDb = prisma,
) {
  const players = await db.player.findMany({
    where: {
      onboardingComplete: true,
      hp: { gt: 0 },
      currentLocationId: { not: null },
    },
    select: {
      id: true,
      hunger: true,
      lastPassiveHungerAtMinute: true,
      currentLocation: {
        select: {
          key: true,
          z: true,
          region: { select: { key: true } },
        },
      },
    },
  });

  let initialized = 0;
  let resetBackwards = 0;
  let increasedPlayers = 0;
  let totalIncrease = 0;

  for (const player of players) {
    if (!player.currentLocation || isTutorialLocation(player.currentLocation)) continue;

    const plan = passivePlayerHungerPlan({
      hunger: player.hunger,
      currentWorldMinute,
      lastPassiveHungerAtMinute: player.lastPassiveHungerAtMinute,
    });

    if (
      plan.hunger === player.hunger &&
      plan.lastPassiveHungerAtMinute === player.lastPassiveHungerAtMinute
    ) {
      continue;
    }

    const updated = await db.player.updateMany({
      where: { id: player.id },
      data: {
        hunger: plan.hunger,
        lastPassiveHungerAtMinute: plan.lastPassiveHungerAtMinute,
      },
    });

    if (updated.count <= 0) continue;
    if (plan.initialized) initialized++;
    if (plan.resetBackwards) resetBackwards++;
    const increase = Math.max(0, plan.hunger - player.hunger);
    if (increase > 0) {
      increasedPlayers++;
      totalIncrease += increase;
    }
  }

  return {
    checked: players.length,
    initialized,
    resetBackwards,
    increasedPlayers,
    totalIncrease,
  };
}
