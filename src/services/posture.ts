import { PlayerPosture } from "@prisma/client";
import { prisma } from "../db";

export type PostureChangeResult = {
  changed: boolean;
  message: string;
};

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
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { posture: true } });
  if (!player) return null;
  if (player.posture === PlayerPosture.STANDING) return { changed: false, message: "Ви вже стоїте." };

  await prisma.player.update({
    where: { id: playerId },
    data: { posture: PlayerPosture.STANDING },
  });
  return { changed: true, message: "Ви встаєте." };
}
