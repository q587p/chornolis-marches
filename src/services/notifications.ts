import { Bot, InlineKeyboard } from "grammy";
import { config } from "../config";
import { prisma } from "../db";
import { buildMainReplyKeyboard, buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { safeSendMessage } from "../utils/telegram";
import { canSendProactiveToTelegramId } from "./sessionPresence";
import { isTutorialLocation } from "./tutorial";
import { canReceiveDaypartNotice } from "./playerNotificationSettings";
import { creatureForms } from "./grammar";
import { visibilityRulesForLocation } from "./visibility";

export type LocationNotificationOptions = {
  keyboard?: InlineKeyboard;
  parseMode?: "HTML";
  replaceKey?: string;
  clearKeys?: string[];
  includeSleeping?: boolean;
  suppressIfPlayerViewedLocationAfter?: { locationId: number; at: number };
};

export type LocationNotificationRecipient = {
  id: number;
  telegramId: string;
  sleepState?: string | null;
};

const latestInlineMessageByChatAndKey = new Map<string, number>();
const inlineReplacementLocks = new Map<string, Promise<void>>();

type NonPlayerMovementNotificationEvent = {
  bot?: Bot;
  locationId: number;
  line: string;
  creatureId?: number;
};

type NonPlayerMovementNotificationFlush = {
  bot?: Bot;
  locationId: number;
  lines: string[];
  creatureIds: number[];
  latestQueuedAt: number;
};

type PendingNonPlayerMovementNotification = {
  bot?: Bot;
  locationId: number;
  lines: string[];
  creatureIds: Set<number>;
  latestQueuedAt: number;
  timer?: ReturnType<typeof setTimeout>;
};

type NonPlayerMovementNotificationBufferOptions = {
  delayMs: number;
  flush: (event: NonPlayerMovementNotificationFlush) => Promise<void> | void;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
};

type MovementNotificationCreatureCandidate = {
  id: number;
  locationId: number;
  isAlive: boolean;
  isGone: boolean;
  isHidden: boolean;
  label: string;
  species?: { kind?: string | null } | null;
};

type MovementNotificationTarget = {
  id: number;
  label: string;
};

const recentLocationViewByPlayerAndLocation = new Map<string, number>();
const MAX_RECENT_LOCATION_VIEWS = 2000;

function locationViewKey(playerId: number, locationId: number) {
  return `${playerId}:${locationId}`;
}

function pruneRecentLocationViews() {
  if (recentLocationViewByPlayerAndLocation.size <= MAX_RECENT_LOCATION_VIEWS) return;
  const sorted = [...recentLocationViewByPlayerAndLocation.entries()].sort((a, b) => a[1] - b[1]);
  for (const [key] of sorted.slice(0, Math.ceil(sorted.length / 4))) {
    recentLocationViewByPlayerAndLocation.delete(key);
  }
}

export function markLocationViewedForMovementNotifications(playerId: number | null | undefined, locationId: number | null | undefined, at: number = Date.now()) {
  if (!Number.isFinite(playerId) || !Number.isFinite(locationId)) return;
  recentLocationViewByPlayerAndLocation.set(locationViewKey(Number(playerId), Number(locationId)), at);
  pruneRecentLocationViews();
}

export function hasPlayerViewedLocationSince(playerId: number | null | undefined, locationId: number | null | undefined, at: number) {
  if (!Number.isFinite(playerId) || !Number.isFinite(locationId) || !Number.isFinite(at)) return false;
  return (recentLocationViewByPlayerAndLocation.get(locationViewKey(Number(playerId), Number(locationId))) ?? 0) >= at;
}

function labelAppearsInMovementLines(label: string, lines: string[] = []) {
  const normalizedLabel = label.trim().toLocaleLowerCase("uk-UA");
  if (!normalizedLabel) return false;
  return lines.some((line) => line.trim().toLocaleLowerCase("uk-UA").startsWith(normalizedLabel));
}

function inlineMessageKey(chatId: string | number, key: string) {
  return `${chatId}:${key}`;
}

export function combineMovementNotificationLines(lines: string[]) {
  return lines.map((line) => line.trim()).filter(Boolean).join("\n");
}

export function movementNotificationTargetsStillPresent(
  locationId: number,
  creatureIds: number[] = [],
  candidates: MovementNotificationCreatureCandidate[] = [],
  options: { showNearbyDetails?: boolean; lines?: string[] } = {},
): MovementNotificationTarget[] {
  if (options.showNearbyDetails === false) return [];
  const uniqueCreatureIds = Array.from(new Set(creatureIds.filter((id) => Number.isFinite(id))));
  const candidatesById = new Map(candidates.map((creature) => [creature.id, creature]));
  const targets: MovementNotificationTarget[] = [];

  for (const id of uniqueCreatureIds) {
    const creature = candidatesById.get(id);
    if (!creature) continue;
    if (creature.locationId !== locationId) continue;
    if (!creature.isAlive || creature.isGone || creature.isHidden) continue;
    if (creature.species?.kind === "ANIMAL") continue;
    if (options.lines && !labelAppearsInMovementLines(creature.label, options.lines)) continue;
    targets.push({ id: creature.id, label: creature.label });
  }

  return targets;
}

export function nonPlayerMovementNotificationOptions(locationId: number, creatureIds: number[] = [], targets: MovementNotificationTarget[] = [], latestQueuedAt: number = Date.now()) {
  const uniqueCreatureIds = Array.from(new Set(creatureIds.filter((id) => Number.isFinite(id))));
  const keyboard = new InlineKeyboard();
  for (const target of targets) {
    keyboard.text(target.label, `target:creature:${target.id}`).row();
  }
  keyboard.text("🐾 Сліди", "track");
  return {
    keyboard,
    replaceKey: `tracks:${locationId}`,
    clearKeys: uniqueCreatureIds.map((id) => `target:creature:${id}`),
    suppressIfPlayerViewedLocationAfter: { locationId, at: latestQueuedAt },
  };
}

async function movementNotificationTargetsAtFlush(locationId: number, creatureIds: number[] = [], lines: string[] = []) {
  const uniqueCreatureIds = Array.from(new Set(creatureIds.filter((id) => Number.isFinite(id))));
  if (!uniqueCreatureIds.length) return [];

  const visibility = await visibilityRulesForLocation(locationId, "brief");
  const creatures = await prisma.creature.findMany({
    where: { id: { in: uniqueCreatureIds } },
    include: { species: true },
  });
  return movementNotificationTargetsStillPresent(locationId, uniqueCreatureIds, creatures.map((creature) => ({
    id: creature.id,
    locationId: creature.locationId,
    isAlive: creature.isAlive,
    isGone: creature.isGone,
    isHidden: creature.isHidden,
    label: creatureForms(creature).nominative,
    species: creature.species,
  })), { showNearbyDetails: visibility.showNearbyDetails, lines });
}

export function createNonPlayerMovementNotificationBuffer(options: NonPlayerMovementNotificationBufferOptions) {
  const pending = new Map<number, PendingNonPlayerMovementNotification>();
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;

  async function flushLocation(locationId: number) {
    const bucket = pending.get(locationId);
    if (!bucket) return;
    if (bucket.timer) clearTimer(bucket.timer);
    pending.delete(locationId);
    await options.flush({
      bot: bucket.bot,
      locationId: bucket.locationId,
      lines: [...bucket.lines],
      creatureIds: Array.from(bucket.creatureIds),
      latestQueuedAt: bucket.latestQueuedAt,
    });
  }

  function queue(event: NonPlayerMovementNotificationEvent) {
    if (!event.line.trim()) return;
    const existing = pending.get(event.locationId);
    const bucket = existing ?? {
      bot: event.bot,
      locationId: event.locationId,
      lines: [],
      creatureIds: new Set<number>(),
      latestQueuedAt: Date.now(),
    };

    bucket.bot = event.bot ?? bucket.bot;
    bucket.lines.push(event.line.trim());
    if (typeof event.creatureId === "number") bucket.creatureIds.add(event.creatureId);
    bucket.latestQueuedAt = Date.now();
    if (bucket.timer) clearTimer(bucket.timer);

    if (options.delayMs <= 0) {
      pending.set(event.locationId, bucket);
      void flushLocation(event.locationId);
      return;
    }

    bucket.timer = setTimer(() => {
      void flushLocation(event.locationId);
    }, options.delayMs);
    pending.set(event.locationId, bucket);
  }

  return {
    queue,
    flushLocation,
    pendingCount: () => pending.size,
  };
}

const nonPlayerMovementNotificationBuffer = createNonPlayerMovementNotificationBuffer({
  delayMs: config.nonPlayerMovementNotificationWindowMs,
  flush: async (event) => {
    if (!event.bot) return;
    const text = combineMovementNotificationLines(event.lines);
    if (!text) return;
    const targets = await movementNotificationTargetsAtFlush(event.locationId, event.creatureIds, event.lines);
    await notifyLocationAll(event.bot, event.locationId, text, nonPlayerMovementNotificationOptions(event.locationId, event.creatureIds, targets, event.latestQueuedAt));
  },
});

export function queueNonPlayerMovementNotification(bot: Bot, locationId: number, line: string, options: { creatureId?: number } = {}) {
  nonPlayerMovementNotificationBuffer.queue({
    bot,
    locationId,
    line,
    creatureId: options.creatureId,
  });
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

export function canReceiveLocationNotification(player: { sleepState?: string | null }, options: { includeSleeping?: boolean } = {}) {
  if (!options.includeSleeping && player.sleepState === "ORDINARY_SLEEP") return false;
  return true;
}

async function sendLocationNotification(bot: Bot, player: { id?: number | null; telegramId: string; sleepState?: string | null }, text: string, options: LocationNotificationOptions = {}) {
  try {
    if (!canReceiveLocationNotification(player, options)) return;
    if (
      options.suppressIfPlayerViewedLocationAfter &&
      hasPlayerViewedLocationSince(player.id, options.suppressIfPlayerViewedLocationAfter.locationId, options.suppressIfPlayerViewedLocationAfter.at)
    ) return;
    if (!(await canSendProactiveToTelegramId(player.telegramId))) return;
    const send = async () => {
      for (const key of options.clearKeys ?? []) {
        await clearPreviousInlineKey(bot, player.telegramId, key);
      }
      if (options.replaceKey) {
        await clearPreviousInlineKey(bot, player.telegramId, options.replaceKey);
      }
      const message = await safeSendMessage(bot, player.telegramId, text, {
        parse_mode: options.parseMode,
        reply_markup: options.keyboard ?? await mainKeyboardForPlayer(player.telegramId),
      }, "notifyLocation");
      if (message && options.replaceKey && options.keyboard) {
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
  const players = await prisma.player.findMany({ where: { currentLocationId: locationId, NOT: { id: exceptPlayerId } }, select: { id: true, telegramId: true, sleepState: true } });
  for (const player of players) {
    await sendLocationNotification(bot, player, text, options);
  }
}

export async function notifyLocationDynamic(
  bot: Bot,
  locationId: number,
  exceptPlayerId: number,
  build: (player: LocationNotificationRecipient) => Promise<{ text: string; options?: LocationNotificationOptions } | null>,
) {
  const players = await prisma.player.findMany({
    where: { currentLocationId: locationId, NOT: { id: exceptPlayerId } },
    select: { id: true, telegramId: true, sleepState: true },
  });
  for (const player of players) {
    const message = await build(player);
    if (!message) continue;
    await sendLocationNotification(bot, player, message.text, message.options);
  }
}

export async function notifyLocationExcept(bot: Bot, locationId: number, exceptPlayerIds: number[], text: string, options: LocationNotificationOptions = {}) {
  const players = await prisma.player.findMany({
    where: { currentLocationId: locationId, id: { notIn: exceptPlayerIds } },
    select: { id: true, telegramId: true, sleepState: true },
  });
  for (const player of players) {
    await sendLocationNotification(bot, player, text, options);
  }
}

export async function notifyLocationAll(bot: Bot, locationId: number, text: string, optionsOrKeyboard?: InlineKeyboard | LocationNotificationOptions) {
  const options = optionsOrKeyboard instanceof InlineKeyboard ? { keyboard: optionsOrKeyboard } : optionsOrKeyboard;
  const players = await prisma.player.findMany({ where: { currentLocationId: locationId }, select: { id: true, telegramId: true, sleepState: true } });
  for (const player of players) {
    await sendLocationNotification(bot, player, text, options);
  }
}

export async function notifyRegion(bot: Bot, regionId: number, text: string) {
  const players = await prisma.player.findMany({ where: { currentLocation: { is: { regionId } } }, select: { telegramId: true } });
  for (const player of players) {
    try {
      if (!(await canSendProactiveToTelegramId(player.telegramId))) continue;
      await safeSendMessage(bot, player.telegramId, text, { reply_markup: await mainKeyboardForPlayer(player.telegramId) }, "notifyRegion");
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
      await safeSendMessage(bot, player.telegramId, text, {
        parse_mode: options.parseMode,
        reply_markup: await mainKeyboardForPlayer(player.telegramId),
      }, "notifyAllCurrentPlayers");
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
      await safeSendMessage(bot, player.telegramId, text, {
        parse_mode: options.parseMode,
        reply_markup: await mainKeyboardForPlayer(player.telegramId),
      }, "notifyAllWakingCurrentPlayers");
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
      await safeSendMessage(bot, player.telegramId, text, {
        parse_mode: options.parseMode,
        reply_markup: await mainKeyboardForPlayer(player.telegramId),
      }, "notifyAllDaypartNoticePlayers");
    } catch (error) {
      console.warn("Failed to notify daypart player:", error);
    }
  }
}

export async function notifyRegionExcept(bot: Bot, regionId: number, exceptPlayerIds: number[], text: string, options: { parseMode?: "HTML" } = {}) {
  const players = await prisma.player.findMany({
    where: { currentLocation: { is: { regionId } }, id: { notIn: exceptPlayerIds } },
    select: { telegramId: true },
  });
  for (const player of players) {
    try {
      if (!(await canSendProactiveToTelegramId(player.telegramId))) continue;
      await safeSendMessage(bot, player.telegramId, text, {
        parse_mode: options.parseMode,
        reply_markup: await mainKeyboardForPlayer(player.telegramId),
      }, "notifyRegionExcept");
    } catch (error) {
      console.warn("Failed to notify region player:", error);
    }
  }
}

export async function notifyRegionScribeAdmins(bot: Bot, regionId: number, text: string) {
  const players = await prisma.player.findMany({
    where: {
      currentLocation: { is: { regionId } },
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
      await safeSendMessage(bot, player.telegramId, text, { reply_markup: await mainKeyboardForPlayer(player.telegramId) }, "notifyRegionScribeAdmins");
    } catch (error) {
      console.warn("Failed to notify region scribe/admin:", error);
    }
  }
}

export async function notifyRegionTechnicalScribes(bot: Bot, regionId: number, text: string) {
  const players = await prisma.player.findMany({
    where: {
      currentLocation: { is: { regionId } },
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
      await safeSendMessage(bot, player.telegramId, text, { reply_markup: await mainKeyboardForPlayer(player.telegramId) }, "notifyRegionTechnicalScribes");
    } catch (error) {
      console.warn("Failed to notify region technical scribe/admin:", error);
    }
  }
}
