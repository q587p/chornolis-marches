import { PlayerPosture, WorldActionStatus } from "@prisma/client";
import { prisma } from "../db";
import { BASE_STAMINA } from "../gameConfig";
import { fatigueStateFor } from "./actionRecovery";

export type PostureChangeResult = {
  changed: boolean;
  message: string;
};

export function activePlayerRestActionWhere(playerId: number) {
  return {
    actorType: "PLAYER" as const,
    playerId,
    type: "REST" as const,
    status: { in: [WorldActionStatus.QUEUED, WorldActionStatus.RUNNING] },
  };
}

export async function sitPlayer(playerId: number): Promise<PostureChangeResult | null> {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { posture: true } });
  if (!player) return null;
  if (player.posture === PlayerPosture.SITTING) return { changed: false, message: "Ви вже сидите." };

  await prisma.player.update({
    where: { id: playerId },
    data: { posture: PlayerPosture.SITTING },
  });
  return { changed: true, message: "Ви сідаєте." };
}

export async function standPlayer(playerId: number): Promise<PostureChangeResult | null> {
  const [player, activeRestActionCount] = await Promise.all([
    prisma.player.findUnique({
      where: { id: playerId },
      select: { posture: true, isResting: true, stamina: true, staminaMax: true },
    }),
    prisma.worldAction.count({ where: activePlayerRestActionWhere(playerId) }),
  ]);
  if (!player) return null;
  if (player.posture === PlayerPosture.STANDING && !player.isResting && activeRestActionCount === 0) {
    return { changed: false, message: "Ви вже стоїте." };
  }

  await prisma.worldAction.updateMany({
    where: activePlayerRestActionWhere(playerId),
    data: { status: "CANCELLED", note: "перервано вставанням" },
  });

  await prisma.player.update({
    where: { id: playerId },
    data: {
      posture: PlayerPosture.STANDING,
      isResting: false,
      fatigueState: fatigueStateFor(player.stamina, player.staminaMax ?? BASE_STAMINA),
      lastStaminaRegenAt: new Date(),
      lastHpRegenAt: new Date(),
    },
  });
  return { changed: true, message: "Ви встаєте." };
}
