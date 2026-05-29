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
import { buildMainReplyKeyboard, buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { logEvent } from "../services/worldEvents";
import { maybePerformPlayerAutoSignal } from "../services/socialAutonomy";
import { buildAutoConfirmKeyboard } from "../ui/keyboards";
import { safeAnswerCallbackQuery } from "../utils/telegram";

const DEBUG = process.env.WORLD_DEBUG === "true" || process.env.WORLD_TICK_DEBUG === "true";
const AUTO_SAY_CHANCE = Number(process.env.PLAYER_AUTO_SAY_CHANCE || 15);
const AUTO_CONSENT_TITLE = "Player auto consent";

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
    { reply_markup: await buildMainReplyKeyboardForTelegramId(telegramId, true) }
  );

  return true;
}

export function isPlayerAutoEnabled(telegramId: number) {
  return autoPlayers.has(telegramId);
}

async function persistPlayerAutoState(telegramId: number, isAutoEnabled: boolean) {
  await prisma.player.updateMany({
    where: { telegramId: String(telegramId) },
    data: { isAutoEnabled },
  });
}

async function playerAutoConsent(playerId: number) {
  const event = await prisma.worldEvent.findFirst({
    where: { type: "SYSTEM", title: AUTO_CONSENT_TITLE, playerId },
    select: { id: true },
  });
  return Boolean(event);
}

async function markPlayerAutoConsent(playerId: number) {
  if (await playerAutoConsent(playerId)) return;
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: AUTO_CONSENT_TITLE,
      description: "confirmed",
      playerId,
    },
  });
}

function autoConfirmText() {
  return [
    "🤖 Авто-режим буде час від часу сам обирати прості дії для персонажа: роздивлятися місцину, збирати ресурси, рухатися, говорити або відпочивати, коли персонаж дуже виснажений.",
    `Автодії плануються ${playerAutoTimingText()}; вручну зазвичай можна діяти швидше.`,
    "",
    "Ви певні, що хочете увімкнути авто?",
  ].join("\n");
}

async function replyWithAutoConfirmation(ctx: any) {
  await ctx.reply(autoConfirmText(), { reply_markup: buildAutoConfirmKeyboard() });
}

async function notifyAutoChoice(bot: Bot, telegramId: number, playerId: number, mode: "queued" | "immediate", description: string, locationId?: number) {
  await logEvent("PLAYER_ACTION", mode === "queued" ? "Auto queued player action" : "Auto selected player action", description, locationId).catch(() => undefined);
  const queueText = mode === "queued"
    ? `\n\nВи вже втомлені або зайняті, тож дія стала в чергу.\n\n${await renderPlayerActionQueue(playerId)}`
    : "";
  await bot.api.sendMessage(telegramId, `🤖 Авто: обрано дію — ${description}.${queueText}`, {
    reply_markup: await buildMainReplyKeyboardForTelegramId(telegramId, true),
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
    note: "auto:say",
  });

  await notifyAutoChoice(bot, telegramId, player.id, result.mode, `сказати: «${line}»`, locationId);
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
    note: `auto:gather:${key}`,
  });

  await notifyAutoChoice(bot, telegramId, player.id, result.mode, `зібрати ${resource.resourceType.name}`, locationId);
  return true;
}

async function autoLook(bot: Bot, telegramId: number, player: any, locationId: number) {
  const result = await performOrQueuePlayerAction(bot, {
    playerId: player.id,
    type: "LOOK",
    payload: {},
    durationMs: actionDurationMs("LOOK", player.stamina),
    chatId: telegramId,
    note: "auto:look",
  });

  await notifyAutoChoice(bot, telegramId, player.id, result.mode, "роздивитися місцину", locationId);
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
    note: `auto:move:${exit.direction}`,
  });

  await notifyAutoChoice(bot, telegramId, player.id, result.mode, `піти на ${String(directionLabels[exit.direction]).toLocaleLowerCase("uk-UA")}`, locationId);

  return true;
}

async function runAutoStep(bot: Bot, telegramId: number) {
  const state = autoPlayers.get(telegramId);
  if (!state || state.running) return;

  state.running = true;
  try {
    const player = await getPlayerByTelegramId(telegramId);
    if (!player) {
      await disablePlayerAuto(telegramId);
      await bot.api.sendMessage(telegramId, "Авто зупинено: персонажа не знайдено. Напиши /start.", { reply_markup: buildMainReplyKeyboard(false) });
      return;
    }

    const locationId = player.currentLocationId ?? (await getStartLocationId());
    if (DEBUG) console.log(`[PLAYER AUTO] telegramId=${telegramId} locationId=${locationId}`);

    if (await maybeStartAutoRest(bot, telegramId, player, locationId)) return;

    if (await maybePerformPlayerAutoSignal(bot, player, telegramId)) return;

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

function startAutoTimer(bot: Bot, telegramId: number) {
  autoBot = bot;
  if (autoPlayers.has(telegramId)) return false;

  const timer = scheduleAutoTimer(bot, telegramId);

  autoPlayers.set(telegramId, { timer, running: false });
  // First auto step happens immediately, but the action itself enters WorldAction
  // and finishes through the tick-based queue instead of bypassing time.
  runAutoStep(bot, telegramId).catch((error) => console.warn("Initial player auto step failed:", error));
  return true;
}

function stopAutoTimer(telegramId: number) {
  const state = autoPlayers.get(telegramId);
  if (!state) return false;

  clearInterval(state.timer);
  autoPlayers.delete(telegramId);
  return true;
}

export async function enablePlayerAuto(bot: Bot, telegramId: number) {
  const started = startAutoTimer(bot, telegramId);
  await persistPlayerAutoState(telegramId, true);
  return started;
}

export async function requestOrEnablePlayerAuto(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) });
    return;
  }

  if (!(await playerAutoConsent(player.id))) {
    await replyWithAutoConfirmation(ctx);
    return;
  }

  const started = await enablePlayerAuto(bot, ctx.from.id);
  await ctx.reply(`${started ? "🤖 Авто-режим увімкнено." : "🤖 Авто-режим уже увімкнено."}\nАвтодії плануються ${playerAutoTimingText()}; вручну зазвичай можна діяти швидше.`, {
    reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, true),
  });
}

export async function disablePlayerAuto(telegramId: number) {
  const stopped = stopAutoTimer(telegramId);
  const updated = await prisma.player.updateMany({
    where: { telegramId: String(telegramId) },
    data: { isAutoEnabled: false },
  });
  return stopped || updated.count > 0;
}

export function stopPlayerAuto(telegramId: number) {
  return stopAutoTimer(telegramId);
}

export async function stopAllPlayerAuto() {
  const stopped = autoPlayers.size;
  for (const state of autoPlayers.values()) clearInterval(state.timer);
  autoPlayers.clear();

  const updated = await prisma.player.updateMany({
    where: { isAutoEnabled: true },
    data: { isAutoEnabled: false },
  });

  return Math.max(stopped, updated.count);
}

export function restartPlayerAutoTimers(bot = autoBot) {
  if (!bot) return;
  autoBot = bot;

  for (const [telegramId, state] of autoPlayers.entries()) {
    clearInterval(state.timer);
    state.timer = scheduleAutoTimer(bot, telegramId);
  }
}

async function restorePersistentAutoPlayers(bot: Bot) {
  const players = await prisma.player.findMany({
    where: { isAutoEnabled: true },
    select: { telegramId: true },
  });

  let restored = 0;
  for (const player of players) {
    const telegramId = Number(player.telegramId);
    if (!Number.isSafeInteger(telegramId)) continue;
    if (startAutoTimer(bot, telegramId)) restored++;
  }

  if (restored > 0) console.log(`[PLAYER AUTO] restored ${restored} persisted auto timers`);
}

export function playerAutoTimingText() {
  const seconds = Math.ceil(AUTO_INTERVAL_MS / 1000);
  return `кожні ${AUTO_INTERVAL_TICKS} тіків ≈ ${seconds} с`;
}

export function registerAutoHandlers(bot: Bot) {
  autoBot = bot;

  restorePersistentAutoPlayers(bot).catch((error) => console.warn("Persistent auto restore failed:", error));

  bot.command("auto", async (ctx) => {
    if (!ctx.from) return;
    await requestOrEnablePlayerAuto(bot, ctx);
  });

  bot.hears("🤖 Авто", async (ctx) => {
    if (!ctx.from) return;
    await requestOrEnablePlayerAuto(bot, ctx);
  });

  bot.callbackQuery("auto:confirm", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));
    }

    await markPlayerAutoConsent(player.id);
    const started = await enablePlayerAuto(bot, ctx.from.id);
    await safeAnswerCallbackQuery(ctx, "Авто увімкнено.");
    await ctx.reply(`${started ? "🤖 Авто-режим увімкнено." : "🤖 Авто-режим уже увімкнено."}\nАвтодії плануються ${playerAutoTimingText()}; вручну зазвичай можна діяти швидше.`, {
      reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, true),
    });
  });

  bot.callbackQuery("auto:cancel", async (ctx) => {
    await safeAnswerCallbackQuery(ctx, "Авто не увімкнено.");
    await ctx.reply("Авто-режим не увімкнено. Ви лишаєте керування вручну.", {
      reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
    });
  });

  bot.command(["autoStop", "autostop"], async (ctx) => {
    if (!ctx.from) return;
    const stopped = await disablePlayerAuto(ctx.from.id);
    await ctx.reply(stopped ? "⏹ Авто-режим зупинено." : "⏹ Авто-режим не був увімкнений.", { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
  });

  bot.hears("⏹ Стоп", async (ctx) => {
    if (!ctx.from) return;
    const stopped = await disablePlayerAuto(ctx.from.id);
    await ctx.reply(stopped ? "⏹ Авто-режим зупинено." : "⏹ Авто-режим не був увімкнений.", { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
  });
}
