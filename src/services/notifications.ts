import { Bot, InlineKeyboard } from "grammy";
import { config } from "../config";
import { prisma } from "../db";
import { buildMainReplyKeyboard, buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { canSendProactiveToTelegramId } from "./sessionPresence";
import { isTutorialLocation } from "./tutorial";
import { canReceiveDaypartNotice } from "./playerNotificationSettings";

type LocationNotificationOptions = {
  keyboard?: InlineKeyboard;
  parseMode?: "HTML";
  replaceKey?: string;
  clearKeys?: string[];
};

const latestInlineMessageByChatAndKey = new Map<string, number>();
const inlineReplacementLocks = new Map<string, Promise<void>>();

function inlineMessageKey(chatId: string | number, key: string) {
  return `${chatId}:${key}`;
}

export async function runInlineReplacementForKey<T>(mapKey: string, task: () => Promise<T>) {
  const previous = inlineReplacementLocks.get(mapKey) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const next = previous.catch(() => undefined).then(() => gate);
  inlineReplacementLocks.set(mapKey, next);

  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
    if (inlineReplacementLocks.get(mapKey) === next) {
      inlineReplacementLocks.delete(mapKey);
    }
  }
}

async function mainKeyboardForPlayer(telegramId: string) {
  const numericTelegramId = Number(telegramId);
  return Number.isFinite(numericTelegramId)
    ? await buildMainReplyKeyboardForTelegramId(numericTelegramId, false)
    : buildMainReplyKeyboard(false);
}

export function isDreamLocationForWorldNotice(location?: { key?: string | null; z?: number | null; region?: { key?: string | null } | null } | null) {
  if (!location) return false;
  if (typeof location.z === "number" && location.z <= -10) return true;
  return isTutorialLocation({
    key: location.key ?? "",
    z: location.z ?? 0,
    region: location.region?.key ? { key: location.region.key } : null,
  });
}

async function clearPreviousInlineKey(bot: Bot, telegramId: string, key: string) {
  const mapKey = inlineMessageKey(telegramId, key);
  const messageId = latestInlineMessageByChatAndKey.get(mapKey);
  if (!messageId) return;

  try {
    await bot.api.editMessageReplyMarkup(telegramId, messageId, { reply_markup: { inline_keyboard: [] } });
  } catch {
    // Best-effort cleanup: Telegram may reject old, deleted or already-edited messages.
  } finally {
    latestInlineMessageByChatAndKey.delete(mapKey);
  }
}

async function sendLocationNotification(bot: Bot, player: { telegramId: string }, text: string, options: LocationNotificationOptions = {}) {
  try {
    if (!(await canSendProactiveToTelegramId(player.telegramId))) return;
    const send = async () => {
      for (const key of options.clearKeys ?? []) {
        await clearPreviousInlineKey(bot, player.telegramId, key);
      }
      if (options.replaceKey) {
        await clearPreviousInlineKey(bot, player.telegramId, options.replaceKey);
      }
      const message = await bot.api.sendMessage(player.telegramId, text, {
        parse_mode: options.parseMode,
        reply_markup: options.keyboard ?? await mainKeyboardForPlayer(player.telegramId),
      });
      if (options.replaceKey && options.keyboard) {
        latestInlineMessageByChatAndKey.set(inlineMessageKey(player.telegramId, options.replaceKey), message.message_id);
      }
    };

    if (options.replaceKey) {
      await runInlineReplacementForKey(inlineMessageKey(player.telegramId, options.replaceKey), send);
    } else {
      await send();
    }
  } catch (error) {
    console.warn("Failed to notify location player:", error);
  }
}

export async function notifyLocation(bot: Bot, locationId: number, exceptPlayerId: number, text: string, optionsOrKeyboard?: InlineKeyboard | LocationNotificationOptions) {
  const options = optionsOrKeyboard instanceof InlineKeyboard ? { keyboard: optionsOrKeyboard } : optionsOrKeyboard;
  const players = await prisma.player.findMany({ where: { currentLocationId: locationId, NOT: { id: exceptPlayerId } }, select: { telegramId: true } });
  for (const player of players) {
    await sendLocationNotification(bot, player, text, options);
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

export async function notifyLocationAll(bot: Bot, locationId: number, text: string, optionsOrKeyboard?: InlineKeyboard | LocationNotificationOptions) {
  const options = optionsOrKeyboard instanceof InlineKeyboard ? { keyboard: optionsOrKeyboard } : optionsOrKeyboard;
  const players = await prisma.player.findMany({ where: { currentLocationId: locationId }, select: { telegramId: true } });
  for (const player of players) {
    await sendLocationNotification(bot, player, text, options);
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

export async function notifyAllCurrentPlayers(bot: Bot, text: string, options: { parseMode?: "HTML" } = {}) {
  const players = await prisma.player.findMany({
    where: { currentLocationId: { not: null } },
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
      console.warn("Failed to notify current player:", error);
    }
  }
}

export async function notifyAllWakingCurrentPlayers(bot: Bot, text: string, options: { parseMode?: "HTML" } = {}) {
  const players = await prisma.player.findMany({
    where: { currentLocationId: { not: null } },
    select: {
      telegramId: true,
      currentLocation: {
        select: {
          key: true,
          z: true,
          region: { select: { key: true } },
        },
      },
    },
  });

  for (const player of players) {
    if (isDreamLocationForWorldNotice(player.currentLocation)) continue;
    try {
      if (!(await canSendProactiveToTelegramId(player.telegramId))) continue;
      await bot.api.sendMessage(player.telegramId, text, {
        parse_mode: options.parseMode,
        reply_markup: await mainKeyboardForPlayer(player.telegramId),
      });
    } catch (error) {
      console.warn("Failed to notify waking current player:", error);
    }
  }
}

export async function notifyAllDaypartNoticePlayers(bot: Bot, text: string, options: { parseMode?: "HTML" } = {}) {
  const players = await prisma.player.findMany({
    where: { currentLocationId: { not: null } },
    select: {
      telegramId: true,
      currentLocationId: true,
      sleepState: true,
      daypartNoticesEnabled: true,
      currentLocation: {
        select: {
          key: true,
          z: true,
          region: { select: { key: true } },
        },
      },
    },
  });

  for (const player of players) {
    if (!canReceiveDaypartNotice({
      currentLocationId: player.currentLocationId,
      sleepState: player.sleepState,
      daypartNoticesEnabled: player.daypartNoticesEnabled,
      isDreamLocation: isDreamLocationForWorldNotice(player.currentLocation),
    })) continue;

    try {
      if (!(await canSendProactiveToTelegramId(player.telegramId))) continue;
      await bot.api.sendMessage(player.telegramId, text, {
        parse_mode: options.parseMode,
        reply_markup: await mainKeyboardForPlayer(player.telegramId),
      });
    } catch (error) {
      console.warn("Failed to notify daypart player:", error);
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
