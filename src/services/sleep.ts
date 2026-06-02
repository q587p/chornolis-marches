import { PlayerPosture, PlayerSleepState, WorldActionType } from "@prisma/client";
import { prisma } from "../db";
import { BASE_STAMINA, HEALTH_REGEN_PER_INTERVAL, REST_STAMINA_REGEN_PER_INTERVAL } from "../gameConfig";
import { fatigueStateFor } from "./actionRecovery";
import { hasActiveCampfire, getLocationRestStaminaCap, getLocationRestStaminaRegenMultiplier } from "./locationFeatures";
import { getCurrentWorldState } from "./worldTime";

export const ORDINARY_SLEEP_FULL_AUTO_WAKE_MINUTES = 8 * 60;
export const ORDINARY_SLEEP_FORCE_AUTO_WAKE_MINUTES = 10 * 60;

const SLEEP_CANCEL_ACTION_TYPES: WorldActionType[] = [
  "MOVE",
  "GATHER",
  "GATHER_SPECIFIC",
  "ATTACK",
  "FRESHEN",
  "DROP_ITEM",
  "COOK",
  "LIGHT_TORCH",
  "DOUSE_TORCH",
  "ADD_TWIGS",
  "LIGHT_CAMPFIRE",
  "BUILD_CAMPFIRE",
  "DOUSE_CAMPFIRE",
  "DISMANTLE_CAMPFIRE",
  "DISMANTLE_TOTEM",
  "SET_TRAP",
  "REST",
];

export type SleepChangeResult = {
  changed: boolean;
  message: string;
  locationId?: number | null;
};

export function isOrdinarySleeping(player: { sleepState?: string | null }) {
  return player.sleepState === PlayerSleepState.ORDINARY_SLEEP;
}

export function ordinarySleepDurationMinutes(startedAtMinute: number | null | undefined, currentMinute: number) {
  if (startedAtMinute == null) return 0;
  return Math.max(0, Math.floor(currentMinute) - Math.floor(startedAtMinute));
}

export function shouldAutoWakeOrdinarySleep(input: {
  startedAtMinute?: number | null;
  currentMinute: number;
  stamina: number;
  staminaCap: number;
  hp: number;
  hpMax: number;
}) {
  const sleptMinutes = ordinarySleepDurationMinutes(input.startedAtMinute, input.currentMinute);
  const recoveredEnough = input.stamina >= input.staminaCap && input.hp >= input.hpMax;
  if (sleptMinutes >= ORDINARY_SLEEP_FORCE_AUTO_WAKE_MINUTES) return true;
  return recoveredEnough && sleptMinutes >= ORDINARY_SLEEP_FULL_AUTO_WAKE_MINUTES;
}

export function sleepRecoveryProfileFromSignals(input: {
  baseStaminaMax: number;
  restStaminaCap: number;
  restRegenMultiplier: number;
  hasActiveCampfire: boolean;
}) {
  const campfireCap = input.hasActiveCampfire ? Math.floor(input.baseStaminaMax * 1.25) : input.baseStaminaMax;
  const staminaCap = Math.max(input.baseStaminaMax, input.restStaminaCap, campfireCap);
  const staminaRate = REST_STAMINA_REGEN_PER_INTERVAL * (input.hasActiveCampfire ? Math.max(3, input.restRegenMultiplier + 2) : 2);
  const hpRate = HEALTH_REGEN_PER_INTERVAL * (input.hasActiveCampfire ? 2 : 1);
  const comfort = input.hasActiveCampfire ? "campfire" : "bare";
  return { staminaCap, staminaRate, hpRate, comfort };
}

export async function getPlayerSleepRecoveryProfile(player: { currentLocationId?: number | null; staminaMax?: number | null }) {
  const baseStaminaMax = player.staminaMax ?? BASE_STAMINA;
  const [restStaminaCap, restRegenMultiplier, activeCampfire] = await Promise.all([
    getLocationRestStaminaCap(player.currentLocationId, baseStaminaMax),
    getLocationRestStaminaRegenMultiplier(player.currentLocationId),
    hasActiveCampfire(player.currentLocationId),
  ]);

  return sleepRecoveryProfileFromSignals({
    baseStaminaMax,
    restStaminaCap,
    restRegenMultiplier,
    hasActiveCampfire: activeCampfire,
  });
}

export async function startOrdinarySleep(playerId: number): Promise<SleepChangeResult | null> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      sleepState: true,
      stamina: true,
      staminaMax: true,
      currentLocationId: true,
    },
  });
  if (!player) return null;
  if (player.sleepState === PlayerSleepState.ORDINARY_SLEEP) {
    return { changed: false, message: "Ви вже спите.", locationId: player.currentLocationId };
  }

  const worldState = await getCurrentWorldState();
  await prisma.worldAction.updateMany({
    where: {
      actorType: "PLAYER",
      playerId,
      status: { in: ["QUEUED", "RUNNING"] },
      type: { in: SLEEP_CANCEL_ACTION_TYPES },
    },
    data: { status: "CANCELLED", note: "перервано сном" },
  });

  await prisma.player.update({
    where: { id: playerId },
    data: {
      posture: PlayerPosture.LYING,
      sleepState: PlayerSleepState.ORDINARY_SLEEP,
      ordinarySleepStartedAtMinute: worldState.absoluteMinute,
      isResting: false,
      isAutoEnabled: false,
      fatigueState: fatigueStateFor(player.stamina, player.staminaMax ?? BASE_STAMINA),
      lastStaminaRegenAt: new Date(),
      lastHpRegenAt: new Date(),
    },
  });

  return {
    changed: true,
    locationId: player.currentLocationId,
    message: "Ви лягаєте й засинаєте. Світ відступає тихіше; тіло бере своє.",
  };
}

export async function wakeOrdinarySleep(playerId: number): Promise<SleepChangeResult | null> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      sleepState: true,
      stamina: true,
      staminaMax: true,
      currentLocationId: true,
    },
  });
  if (!player) return null;
  if (player.sleepState !== PlayerSleepState.ORDINARY_SLEEP) {
    return { changed: false, message: "Ви не спите.", locationId: player.currentLocationId };
  }

  await prisma.player.update({
    where: { id: playerId },
    data: {
      posture: PlayerPosture.LYING,
      sleepState: PlayerSleepState.AWAKE,
      ordinarySleepStartedAtMinute: null,
      isResting: false,
      fatigueState: fatigueStateFor(player.stamina, player.staminaMax ?? BASE_STAMINA),
      lastStaminaRegenAt: new Date(),
      lastHpRegenAt: new Date(),
    },
  });

  return {
    changed: true,
    locationId: player.currentLocationId,
    message: "Ви прокидаєтеся. Тіло ще лежить; можна сісти або встати.",
  };
}

export async function autoWakeOrdinarySleep(playerId: number): Promise<SleepChangeResult | null> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      sleepState: true,
      stamina: true,
      staminaMax: true,
      currentLocationId: true,
    },
  });
  if (!player || player.sleepState !== PlayerSleepState.ORDINARY_SLEEP) return null;

  await prisma.player.update({
    where: { id: playerId },
    data: {
      posture: PlayerPosture.LYING,
      sleepState: PlayerSleepState.AWAKE,
      ordinarySleepStartedAtMinute: null,
      isResting: false,
      fatigueState: fatigueStateFor(player.stamina, player.staminaMax ?? BASE_STAMINA),
      lastStaminaRegenAt: new Date(),
      lastHpRegenAt: new Date(),
    },
  });

  return {
    changed: true,
    locationId: player.currentLocationId,
    message: "Сон відпускає вас сам. Тіло ще лежить, але притомність уже поруч.",
  };
}
