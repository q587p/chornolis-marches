import { config } from "../config";
import { prisma } from "../db";

type TechnicalDetailsPlayer = {
  role?: string | null;
  telegramId?: string | null;
  showTechnicalDetails?: boolean | null;
};

export function playerCanShowTechnicalDetails(player: TechnicalDetailsPlayer | null | undefined) {
  if (!player?.showTechnicalDetails) return false;
  return player.role === "SCRIBE" || Boolean(player.telegramId && config.adminTelegramIds.includes(player.telegramId));
}

export async function playerShowsTechnicalDetails(playerId?: number) {
  if (!playerId) return false;
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { role: true, telegramId: true, showTechnicalDetails: true },
  });
  return playerCanShowTechnicalDetails(player);
}
