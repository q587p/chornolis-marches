import { prisma } from "../db";

export async function getStartLocationId() {
  const location = await prisma.cellLocation.findUnique({ where: { key: "center_chornolis_edge" } });
  if (!location) throw new Error("Start location not found. Run npm run seed first.");
  return location.id;
}

export async function getPlayerByTelegramId(telegramId: number) {
  return prisma.player.findUnique({ where: { telegramId: String(telegramId) } });
}
