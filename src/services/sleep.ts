import { PlayerPosture, PlayerSleepState, WorldActionType } from "@prisma/client";
import { prisma } from "../db";
import { BASE_STAMINA } from "../gameConfig";
import { fatigueStateFor } from "./actionRecovery";

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
