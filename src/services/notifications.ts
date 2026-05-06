import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { renderLocationBrief } from "./locations";

type RegionNotificationOptions = {
  includeLocationBrief?: boolean;
};

export async function notifyLocation(bot: Bot, locationId: number, exceptPlayerId: number, text: string, keyboard?: InlineKeyboard) {
  const players = await prisma.player.findMany({ where: { currentLocationId: locationId, NOT: { id: exceptPlayerId } } });
  for (const player of players) {
    try {
      await bot.api.sendMessage(player.telegramId, text, keyboard ? { reply_markup: keyboard } : undefined);
    } catch (error) {
      console.warn("Failed to notify location player:", error);
    }
  }
}

export async function notifyRegion(bot: Bot, regionId: number, text: string, options: RegionNotificationOptions = {}) {
  const players = await prisma.player.findMany({ where: { currentLocation: { regionId } } });
  for (const player of players) {
    try {
      await bot.api.sendMessage(player.telegramId, text);

      if (options.includeLocationBrief && player.currentLocationId) {
        const view = await renderLocationBrief(player.currentLocationId, player.id);
        await bot.api.sendMessage(player.telegramId, view.text, {
          parse_mode: "HTML",
          reply_markup: view.keyboard,
        });
      }
    } catch (error) {
      console.warn("Failed to notify region player:", error);
    }
  }
}
