import { Bot } from "grammy";
import { prisma } from "../db";
import { AUTO_INTERVAL_MS, AUTO_INTERVAL_TICKS, VERY_TIRED_STAMINA, gatherConfig } from "../gameConfig";
import {
  actionDurationMs,
  gatherDurationMs,
  movementDurationMs,
  performOrQueuePlayerAction,
  renderPlayerActionQueue,
  startPlayerRest,
} from "../services/actionQueue";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { directionLabels } from "../ui/labels";
import { buildMainReplyKeyboard } from "../ui/replyKeyboard";
import { logEvent } from "../services/worldEvents";

const DEBUG = process.env.WORLD_DEBUG === "true" || process.env.WORLD_TICK_DEBUG === "true";
const AUTO_SAY_CHANCE = Number(process.env.PLAYER_AUTO_SAY_CHANCE || 15);

type AutoState = { timer: NodeJS.Timeout; running: boolean };
const autoPlayers = new Map<number, AutoState>();
let autoBot: Bot | null = null;

const AUTO_LINES = [
  "Треба триматися стежки... якщо вона справді стежка.",
  "Чорноліс сьогодні надто уважний.",
  "Я тут лише на мить. Напевно.",
  "Пахне сирою корою й ягодами.",
  "Якщо хтось мене чує — відгукнись.",
  "Не подобається мені ця тиша.",
  "Ще трохи — і назад. Мабуть.",
  "Трави тут добрі. Або хитрі.",
  "Сліди свіжі. Не мої.",
  "Ліс ворухнувся. Я бачив.",
];

function chance(p: number) {
  return Math.random() * 100 < p;
}

function pick<T>(items: T[]) {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}

function autoRestChance(player: any) {
  if (player.hp <= 0 || player.stamina <= VERY_TIRED_STAMINA) return 100;
  if (player.stamina >= 0) return 0;

  const veryTiredDebt = Math.max(1, Math.abs(VERY_TIRED_STAMINA));
  const debtRatio = Math.min(1, Math.abs(player.stamina) / veryTiredDebt);

  return Math.min(95, 15 + Math.round(debtRatio * 75));
}

async function maybeStartAutoRest(bot: Bot, telegramId: number, player: any, locationId: number) {
  if (player.isResting) return true;

  const restChance = autoRestChance(player);
  if (restChance <= 0 || !chance(restChance)) return false;

  await startPlayerRest(player.id);
  await logEvent("PLAYER_ACTION", "Auto started player rest", `stamina=${player.stamina}; chance=${restChance}`, locationId).catch(() => undefined);

  const reason = player.stamina <= VERY_TIRED_STAMINA
    ? "ви дуже втомлені"
    : "втома вже бере своє";

  await bot.api.sendMessage(
    telegramId,
    [
      `🤖 Авто: ${reason}, тому персонаж сам починає відпочинок.`,
      "",
      "Поточну дію та чергу очищено. Нові дії під час відпочинку ставатимуть у чергу.",
      await renderPlayerActionQueue(player.id),
    ].join("\n"),
    { reply_markup: buildMainReplyKeyboard(true) }
  );

  return true;
}

export function isPlayerAutoEnabled(telegramId: number) {
  return autoPlayers.has(telegramId);
}

async function notifyQueuedIfNeeded(bot: Bot, telegramId: number, playerId: number, mode: "queued" | "immediate", description: string, locationId?: number) {
  if (mode !== "queued") return;

  await logEvent("PLAYER_ACTION", "Auto queued player action", description, locationId).catch(() => undefined);
  await bot.api.sendMessage(telegramId, `🤖 Авто: ви вже втомлені або зайняті, тож дія стала в чергу.\n\n${await renderPlayerActionQueue(playerId)}`, {
    reply_markup: buildMainReplyKeyboard(true),
  });
}

async function maybeAutoSay(bot: Bot, telegramId: number, player: any, locationId: number) {
  if (!chance(AUTO_SAY_CHANCE)) return false;

  const line = pick(AUTO_LINES);
  if (!line) return false;

  const result = await performOrQueuePlayerAction(bot, {
    playerId: player.id,
    type: "SAY",
    payload: { text: line },
    durationMs: actionDurationMs("SAY", player.stamina),
    chatId: telegramId,
  });

  await notifyQueuedIfNeeded(bot, telegramId, player.id, result.mode, `say: ${line}`, locationId);
  return true;
}

async function autoGather(bot: Bot, telegramId: number, player: any, locationId: number) {
  const resource = await prisma.resourceNode.findFirst({
    where: { locationId, amount: { gt: 0 } },
    include: { resourceType: true, location: true },
    orderBy: { amount: "desc" },
  });
  if (!resource) return false;

  const key = resource.resourceType.key as "berries" | "mushrooms" | "herbs";
  if (!gatherConfig[key]) return false;

  const result = await performOrQueuePlayerAction(bot, {
    playerId: player.id,
    type: "GATHER_SPECIFIC",
    payload: { resourceKey: key },
    durationMs: gatherDurationMs(key, player.stamina),
    chatId: telegramId,
  });

  await notifyQueuedIfNeeded(bot, telegramId, player.id, result.mode, `gather:${key}`, locationId);
  return true;
}

async function autoLook(bot: Bot, telegramId: number, player: any, locationId: number) {
  const result = await performOrQueuePlayerAction(bot, {
    playerId: player.id,
    type: "LOOK",
    payload: {},
    durationMs: actionDurationMs("LOOK", player.stamina),
    chatId: telegramId,
  });

  await notifyQueuedIfNeeded(bot, telegramId, player.id, result.mode, "look", locationId);
  return true;
}

async function autoMove(bot: Bot, telegramId: number, player: any, locationId: number) {
  const exits = await prisma.locationExit.findMany({
    where: { fromLocationId: locationId, isHidden: false },
    include: { toLocation: true },
  });

  const exit = pick(exits);
  if (!exit) return false;

  const result = await performOrQueuePlayerAction(bot, {
    playerId: player.id,
    type: "MOVE",
    payload: { direction: exit.direction },
    durationMs: movementDurationMs(exit.travelCost, player.stamina),
    chatId: telegramId,
  });

  if (result.mode === "queued") {
    await notifyQueuedIfNeeded(bot, telegramId, player.id, result.mode, `move:${exit.direction}`, locationId);
  } else {
    await bot.api.sendMessage(telegramId, `🤖 Авто: обрано рух — ${directionLabels[exit.direction]}.`, { reply_markup: buildMainReplyKeyboard(true) });
  }

  return true;
}

async function runAutoStep(bot: Bot, telegramId: number) {
  const state = autoPlayers.get(telegramId);
  if (!state || state.running) return;

  state.running = true;
  try {
    const player = await getPlayerByTelegramId(telegramId);
    if (!player) {
      stopAuto(telegramId);
      await bot.api.sendMessage(telegramId, "Авто зупинено: персонажа не знайдено. Напиши /start.", { reply_markup: buildMainReplyKeyboard(false) });
      return;
    }

    const locationId = player.currentLocationId ?? (await getStartLocationId());
    if (DEBUG) console.log(`[PLAYER AUTO] telegramId=${telegramId} locationId=${locationId}`);

    if (await maybeStartAutoRest(bot, telegramId, player, locationId)) return;

    if (await maybeAutoSay(bot, telegramId, player, locationId)) return;

    const roll = Math.random();
    if (roll < 0.45 && await autoGather(bot, telegramId, player, locationId)) return;
    if (roll < 0.7 && await autoLook(bot, telegramId, player, locationId)) return;
    if (await autoMove(bot, telegramId, player, locationId)) return;

    await autoLook(bot, telegramId, player, locationId);
  } catch (error) {
    console.warn("Player auto step failed:", error);
  } finally {
    const latest = autoPlayers.get(telegramId);
    if (latest) latest.running = false;
  }
}

function scheduleAutoTimer(bot: Bot, telegramId: number) {
  return setInterval(() => {
    runAutoStep(bot, telegramId).catch((error) => console.warn("Player auto timer failed:", error));
  }, AUTO_INTERVAL_MS);
}

function startAuto(bot: Bot, telegramId: number) {
  autoBot = bot;
  if (autoPlayers.has(telegramId)) return false;

  const timer = scheduleAutoTimer(bot, telegramId);

  autoPlayers.set(telegramId, { timer, running: false });
  // First auto step happens immediately, but the action itself now enters WorldAction
  // and finishes through the tick-based queue instead of bypassing time.
  runAutoStep(bot, telegramId).catch((error) => console.warn("Initial player auto step failed:", error));
  return true;
}

function stopAuto(telegramId: number) {
  const state = autoPlayers.get(telegramId);
  if (!state) return false;

  clearInterval(state.timer);
  autoPlayers.delete(telegramId);
  return true;
}

export function stopPlayerAuto(telegramId: number) {
  return stopAuto(telegramId);
}

export function restartPlayerAutoTimers(bot = autoBot) {
  if (!bot) return;
  autoBot = bot;

  for (const [telegramId, state] of autoPlayers.entries()) {
    clearInterval(state.timer);
    state.timer = scheduleAutoTimer(bot, telegramId);
  }
}

export function playerAutoTimingText() {
  const seconds = Math.ceil(AUTO_INTERVAL_MS / 1000);
  return `кожні ${AUTO_INTERVAL_TICKS} тіків ≈ ${seconds} с`;
}

export function registerAutoHandlers(bot: Bot) {
  autoBot = bot;

  bot.command("auto", async (ctx) => {
    if (!ctx.from) return;
    const started = startAuto(bot, ctx.from.id);
    await ctx.reply(started ? "🤖 Авто-режим увімкнено." : "🤖 Авто-режим уже увімкнено.", { reply_markup: buildMainReplyKeyboard(true) });
  });

  bot.hears("🤖 Авто", async (ctx) => {
    if (!ctx.from) return;
    const started = startAuto(bot, ctx.from.id);
    await ctx.reply(started ? "🤖 Авто-режим увімкнено." : "🤖 Авто-режим уже увімкнено.", { reply_markup: buildMainReplyKeyboard(true) });
  });

  bot.command(["autoStop", "autostop"], async (ctx) => {
    if (!ctx.from) return;
    const stopped = stopAuto(ctx.from.id);
    await ctx.reply(stopped ? "⏹ Авто-режим зупинено." : "⏹ Авто-режим не був увімкнений.", { reply_markup: buildMainReplyKeyboard(false) });
  });

  bot.hears("⏹ Стоп", async (ctx) => {
    if (!ctx.from) return;
    const stopped = stopAuto(ctx.from.id);
    await ctx.reply(stopped ? "⏹ Авто-режим зупинено." : "⏹ Авто-режим не був увімкнений.", { reply_markup: buildMainReplyKeyboard(false) });
  });
}
