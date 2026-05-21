import { prisma } from "../db";

export const START_LOCATION_KEY = "start_border_camp";

export async function getStartLocationId() {
  const location = await prisma.cellLocation.findUnique({ where: { key: START_LOCATION_KEY } });
  if (!location) throw new Error("Start location not found. Run npm run seed first.");
  return location.id;
}

export async function getPlayerByTelegramId(telegramId: number) {
  return prisma.player.findUnique({ where: { telegramId: String(telegramId) } });
}
