import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { buildMainReplyKeyboard } from "../ui/replyKeyboard";

export async function notifyLocation(bot: Bot, locationId: number, exceptPlayerId: number, text: string, keyboard?: InlineKeyboard) {
  const players = await prisma.player.findMany({ where: { currentLocationId: locationId, NOT: { id: exceptPlayerId } } });
  for (const player of players) {
    try {
      await bot.api.sendMessage(player.telegramId, text, keyboard ? { reply_markup: keyboard } : { reply_markup: buildMainReplyKeyboard(false) });
    } catch (error) {
      console.warn("Failed to notify location player:", error);
    }
  }
}

export async function notifyLocationAll(bot: Bot, locationId: number, text: string, keyboard?: InlineKeyboard) {
  const players = await prisma.player.findMany({ where: { currentLocationId: locationId } });
  for (const player of players) {
    try {
      await bot.api.sendMessage(player.telegramId, text, keyboard ? { reply_markup: keyboard } : { reply_markup: buildMainReplyKeyboard(false) });
    } catch (error) {
      console.warn("Failed to notify location player:", error);
    }
  }
}

export async function notifyRegion(bot: Bot, regionId: number, text: string) {
  const players = await prisma.player.findMany({ where: { currentLocation: { regionId } } });
  for (const player of players) {
    try {
      await bot.api.sendMessage(player.telegramId, text, { reply_markup: buildMainReplyKeyboard(false) });
    } catch (error) {
      console.warn("Failed to notify region player:", error);
    }
  }
}
