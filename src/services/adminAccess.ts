import { config } from "../config";
import { prisma } from "../db";

export function isConfiguredAdminTelegramId(telegramId: number | string | null | undefined) {
  if (!telegramId) return false;
  return config.adminTelegramIds.includes(String(telegramId));
}

export async function isScribeAdmin(telegramId: number | string | null | undefined) {
  if (!telegramId) return false;
  if (isConfiguredAdminTelegramId(telegramId)) return true;

  const player = await prisma.player.findUnique({
    where: { telegramId: String(telegramId) },
    select: { role: true },
  });
  return player?.role === "SCRIBE";
}

export async function requireScribeAdmin(ctx: any) {
  const telegramId = ctx.from?.id;
  if (!(await isScribeAdmin(telegramId))) {
    await ctx.reply("Ця команда доступна тільки писарям Порубіжжя.");
    return false;
  }
  return true;
}
