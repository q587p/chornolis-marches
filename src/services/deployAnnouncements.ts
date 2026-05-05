import { Bot } from "grammy";
import { prisma } from "../db";
import { config } from "../config";
import { logEvent } from "./worldEvents";

export async function announceWorldUpdatedOnce(bot: Bot) {
  const eventTitle = `DEPLOY:${config.appVersion}`;
  const alreadySent = await prisma.worldEvent.findFirst({ where: { type: "SYSTEM", title: eventTitle } });
  if (alreadySent) return;

  const players = await prisma.player.findMany({ select: { telegramId: true } });
  let success = 0;
  let failed = 0;
  for (const player of players) {
    try {
      await bot.api.sendMessage(player.telegramId, `⚙️ Світ Чорнолісу оновився.\n\nВерсія: ${config.appVersion}\n\nМожна продовжувати гру.`);
      success++;
    } catch (error) {
      failed++;
      console.warn("Failed to notify player about deploy:", error);
    }
  }

  await logEvent("SYSTEM", eventTitle, `World update notification sent. Success: ${success}. Failed: ${failed}.`);
}
