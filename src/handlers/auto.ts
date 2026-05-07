import { Bot } from "grammy";
import { prisma } from "../db";
import { gatherConfig } from "../gameConfig";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { renderLocationBrief, renderLocationDetails } from "../services/locations";
import { summonLisovykIfResourceDepleted } from "../services/resources";
import { notifyLocation } from "../services/notifications";
import { directionLabels } from "../ui/labels";
import { buildMainReplyKeyboard } from "../ui/replyKeyboard";
import { buildTrackKeyboard } from "../ui/keyboards";
import { logEvent } from "../services/worldEvents";

const AUTO_INTERVAL_MS = Number(process.env.PLAYER_AUTO_INTERVAL_MS || 30000);
const DEBUG = process.env.WORLD_DEBUG === "true" || process.env.WORLD_TICK_DEBUG === "true";
const AUTO_SAY_CHANCE = Number(process.env.PLAYER_AUTO_SAY_CHANCE || 15);

type AutoState = { timer: NodeJS.Timeout; running: boolean };
const autoPlayers = new Map<number, AutoState>();

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

function chance(p: number) { return Math.random() * 100 < p; }
function pick<T>(items: T[]) { return items.length ? items[Math.floor(Math.random() * items.length)] : undefined; }
export function isPlayerAutoEnabled(telegramId: number) { return autoPlayers.has(telegramId); }

async function maybeAutoSay(bot: Bot, telegramId: number, player: any, locationId: number) {
  if (!chance(AUTO_SAY_CHANCE)) return false;
  const line = pick(AUTO_LINES);
  if (!line) return false;
  await notifyLocation(bot, locationId, player.id, `Хтось промовляє: «${line}»`);
  await bot.api.sendMessage(telegramId, `🤖 Авто: ви промовили вголос: «${line}»`, { reply_markup: buildMainReplyKeyboard(true) });
  await logEvent("SAY", "Auto player said something", line, locationId);
  return true;
}

async function autoGather(bot: Bot, telegramId: number, player: any, locationId: number) {
  const resource = await prisma.resourceNode.findFirst({ where: { locationId, amount: { gt: 0 } }, include: { resourceType: true, location: true }, orderBy: { amount: "desc" } });
  if (!resource) return false;
  const cfg = gatherConfig[resource.resourceType.key];
  if (!cfg || Math.random() > cfg.chance) {
    await prisma.player.update({ where: { id: player.id }, data: { gatherAttempts: { increment: 1 } } });
    await bot.api.sendMessage(telegramId, `🤖 Авто: ви пошукали ${resource.resourceType.name}, але нічого корисного не знайшли.`, { reply_markup: buildMainReplyKeyboard(true) });
    await logEvent("GATHER", "Auto gather failed", resource.resourceType.key, locationId);
    return true;
  }
  const found = Math.min(resource.amount, Math.floor(Math.random() * 2) + 1);
  const nextAmount = resource.amount - found;
  await prisma.resourceNode.update({ where: { id: resource.id }, data: { amount: nextAmount } });
  await prisma.playerResource.upsert({ where: { playerId_resourceTypeId: { playerId: player.id, resourceTypeId: resource.resourceTypeId } }, update: { amount: { increment: found } }, create: { playerId: player.id, resourceTypeId: resource.resourceTypeId, amount: found } });
  await prisma.player.update({ where: { id: player.id }, data: { gatherAttempts: { increment: 1 }, successfulGathers: { increment: 1 } } });
  await bot.api.sendMessage(telegramId, `🤖 Авто: ви знайшли ${resource.resourceType.name} ×${found}.`, { reply_markup: buildMainReplyKeyboard(true) });
  await logEvent("GATHER", "Auto gather succeeded", `${resource.resourceType.name} ×${found}`, locationId);
  if (resource.amount > 0 && nextAmount <= 0) await summonLisovykIfResourceDepleted(bot, resource.resourceType.name, resource.location.regionId);
  return true;
}

async function autoLook(bot: Bot, telegramId: number, player: any, locationId: number) {
  await prisma.player.update({ where: { id: player.id }, data: { looks: { increment: 1 } } });
  const view = await renderLocationDetails(locationId, player.id);
  await bot.api.sendMessage(telegramId, "🤖 Авто: ви зупинилися й озирнулися.", { reply_markup: buildMainReplyKeyboard(true) });
  await bot.api.sendMessage(telegramId, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  await logEvent("LOOK", "Auto look", undefined, locationId);
  return true;
}

async function autoMove(bot: Bot, telegramId: number, player: any, locationId: number) {
  const exits = await prisma.locationExit.findMany({ where: { fromLocationId: locationId, isHidden: false }, include: { toLocation: true } });
  const exit = pick(exits);
  if (!exit) return false;
  await notifyLocation(bot, locationId, player.id, "Хтось пішов звідси.", buildTrackKeyboard());
  await prisma.player.update({ where: { id: player.id }, data: { currentLocationId: exit.toLocationId, steps: { increment: 1 } } });
  await notifyLocation(bot, exit.toLocationId, player.id, "Хтось прийшов сюди.");
  await bot.api.sendMessage(telegramId, `🤖 Авто: ви рушили — ${directionLabels[exit.direction]}.`, { reply_markup: buildMainReplyKeyboard(true) });
  const view = await renderLocationBrief(exit.toLocationId, player.id);
  await bot.api.sendMessage(telegramId, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  await logEvent("MOVE", "Auto moved", exit.direction, exit.toLocationId);
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

function startAuto(bot: Bot, telegramId: number) {
  if (autoPlayers.has(telegramId)) return false;
  const timer = setInterval(() => { runAutoStep(bot, telegramId).catch((error) => console.warn("Player auto timer failed:", error)); }, AUTO_INTERVAL_MS);
  autoPlayers.set(telegramId, { timer, running: false });
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

export function registerAutoHandlers(bot: Bot) {
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
