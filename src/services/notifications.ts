import { Bot, InlineKeyboard } from "grammy";
import { config } from "../config";
import { prisma } from "../db";
import { buildMainReplyKeyboard, buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { canSendProactiveToTelegramId } from "./sessionPresence";

async function mainKeyboardForPlayer(telegramId: string) {
  const numericTelegramId = Number(telegramId);
  return Number.isFinite(numericTelegramId)
    ? await buildMainReplyKeyboardForTelegramId(numericTelegramId, false)
    : buildMainReplyKeyboard(false);
}

export async function notifyLocation(bot: Bot, locationId: number, exceptPlayerId: number, text: string, keyboard?: InlineKeyboard) {
  const players = await prisma.player.findMany({ where: { currentLocationId: locationId, NOT: { id: exceptPlayerId } }, select: { telegramId: true } });
  for (const player of players) {
    try {
      if (!(await canSendProactiveToTelegramId(player.telegramId))) continue;
      await bot.api.sendMessage(player.telegramId, text, keyboard ? { reply_markup: keyboard } : { reply_markup: await mainKeyboardForPlayer(player.telegramId) });
    } catch (error) {
      console.warn("Failed to notify location player:", error);
    }
  }
}

export async function notifyLocationExcept(bot: Bot, locationId: number, exceptPlayerIds: number[], text: string, options: { parseMode?: "HTML"; keyboard?: InlineKeyboard } = {}) {
  const players = await prisma.player.findMany({
    where: { currentLocationId: locationId, id: { notIn: exceptPlayerIds } },
    select: { telegramId: true },
  });
  for (const player of players) {
    try {
      if (!(await canSendProactiveToTelegramId(player.telegramId))) continue;
      await bot.api.sendMessage(player.telegramId, text, {
        parse_mode: options.parseMode,
        reply_markup: options.keyboard ?? await mainKeyboardForPlayer(player.telegramId),
      });
    } catch (error) {
      console.warn("Failed to notify location player:", error);
    }
  }
}

export async function notifyLocationAll(bot: Bot, locationId: number, text: string, keyboard?: InlineKeyboard) {
  const players = await prisma.player.findMany({ where: { currentLocationId: locationId }, select: { telegramId: true } });
  for (const player of players) {
    try {
      if (!(await canSendProactiveToTelegramId(player.telegramId))) continue;
      await bot.api.sendMessage(player.telegramId, text, keyboard ? { reply_markup: keyboard } : { reply_markup: await mainKeyboardForPlayer(player.telegramId) });
    } catch (error) {
      console.warn("Failed to notify location player:", error);
    }
  }
}

export async function notifyRegion(bot: Bot, regionId: number, text: string) {
  const players = await prisma.player.findMany({ where: { currentLocation: { regionId } }, select: { telegramId: true } });
  for (const player of players) {
    try {
      if (!(await canSendProactiveToTelegramId(player.telegramId))) continue;
      await bot.api.sendMessage(player.telegramId, text, { reply_markup: await mainKeyboardForPlayer(player.telegramId) });
    } catch (error) {
      console.warn("Failed to notify region player:", error);
    }
  }
}

export async function notifyRegionExcept(bot: Bot, regionId: number, exceptPlayerIds: number[], text: string, options: { parseMode?: "HTML" } = {}) {
  const players = await prisma.player.findMany({
    where: { currentLocation: { regionId }, id: { notIn: exceptPlayerIds } },
    select: { telegramId: true },
  });
  for (const player of players) {
    try {
      if (!(await canSendProactiveToTelegramId(player.telegramId))) continue;
      await bot.api.sendMessage(player.telegramId, text, {
        parse_mode: options.parseMode,
        reply_markup: await mainKeyboardForPlayer(player.telegramId),
      });
    } catch (error) {
      console.warn("Failed to notify region player:", error);
    }
  }
}

export async function notifyRegionScribeAdmins(bot: Bot, regionId: number, text: string) {
  const players = await prisma.player.findMany({
    where: {
      currentLocation: { regionId },
      OR: [
        { role: "SCRIBE" },
        ...(config.adminTelegramIds.length ? [{ telegramId: { in: config.adminTelegramIds } }] : []),
      ],
    },
    select: { telegramId: true },
  });

  for (const player of players) {
    try {
      if (!(await canSendProactiveToTelegramId(player.telegramId))) continue;
      await bot.api.sendMessage(player.telegramId, text, { reply_markup: await mainKeyboardForPlayer(player.telegramId) });
    } catch (error) {
      console.warn("Failed to notify region scribe/admin:", error);
    }
  }
}

export async function notifyRegionTechnicalScribes(bot: Bot, regionId: number, text: string) {
  const players = await prisma.player.findMany({
    where: {
      currentLocation: { regionId },
      showTechnicalDetails: true,
      OR: [
        { role: "SCRIBE" },
        ...(config.adminTelegramIds.length ? [{ telegramId: { in: config.adminTelegramIds } }] : []),
      ],
    },
    select: { telegramId: true },
  });

  for (const player of players) {
    try {
      if (!(await canSendProactiveToTelegramId(player.telegramId))) continue;
      await bot.api.sendMessage(player.telegramId, text, { reply_markup: await mainKeyboardForPlayer(player.telegramId) });
    } catch (error) {
      console.warn("Failed to notify region technical scribe/admin:", error);
    }
  }
}
