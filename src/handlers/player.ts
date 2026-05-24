import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA, HEALTH_REGEN_PER_INTERVAL, PASSIVE_HEALTH_REGEN_INTERVAL_MS, PASSIVE_STAMINA_REGEN_PER_INTERVAL, REST_HEALTH_REGEN_INTERVAL_MS, REST_STAMINA_REGEN_PER_INTERVAL, STAMINA_REGEN_INTERVAL_MS } from "../gameConfig";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { renderLocationBrief } from "../services/locations";
import { buildMainReplyKeyboard } from "../ui/replyKeyboard";
import { disablePlayerAuto, enablePlayerAuto, isPlayerAutoEnabled } from "./auto";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { formatFatigueText, formatPlayerStats } from "../utils/playerText";

function minutes(ms: number) {
  return Math.max(1, Math.ceil(ms / 60_000));
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "невідомо";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "невідомо";
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function recoveryText(player: any) {
  const staminaMax = player.staminaMax ?? BASE_STAMINA;
  const hpMax = player.hpMax ?? BASE_HP;
  const staminaRemaining = Math.max(0, staminaMax - player.stamina);
  const hpRemaining = Math.max(0, hpMax - player.hp);
  if (staminaRemaining <= 0 && hpRemaining <= 0) return "";

  const passiveStaminaMinutes = Math.ceil(staminaRemaining / PASSIVE_STAMINA_REGEN_PER_INTERVAL) * minutes(STAMINA_REGEN_INTERVAL_MS);
  const restStaminaMinutes = Math.ceil(staminaRemaining / REST_STAMINA_REGEN_PER_INTERVAL) * minutes(STAMINA_REGEN_INTERVAL_MS);
  const passiveHpMinutes = Math.ceil(hpRemaining / HEALTH_REGEN_PER_INTERVAL) * minutes(PASSIVE_HEALTH_REGEN_INTERVAL_MS);
  const restHpMinutes = Math.ceil(hpRemaining / HEALTH_REGEN_PER_INTERVAL) * minutes(REST_HEALTH_REGEN_INTERVAL_MS);
  const passiveMinutes = Math.max(passiveStaminaMinutes, passiveHpMinutes);
  const restMinutes = Math.max(restStaminaMinutes, restHpMinutes);

  if (player.isResting) return `\nВідновлення: приблизно ${restMinutes} хв під час відпочинку.`;
  return `\nВідновлення без відпочинку: приблизно ${passiveMinutes} хв. Через /rest або 🧘 Відпочити: приблизно ${restMinutes} хв.`;
}

function buildCharacterAutoKeyboard(autoEnabled: boolean) {
  return new InlineKeyboard()
    .text(autoEnabled ? "⏹ Зупинити авто" : "🤖 Увімкнути авто", autoEnabled ? "character:auto:stop" : "character:auto:start");
}

function nameCasesText(player: any) {
  return [
    `Називний: ${player.nameNominative ?? "—"}`,
    `Родовий: ${player.nameGenitive ?? "—"}`,
    `Давальний: ${player.nameDative ?? "—"}`,
    `Знахідний: ${player.nameAccusative ?? "—"}`,
    `Орудний: ${player.nameInstrumental ?? "—"}`,
    `Місцевий: ${player.nameLocative ?? "—"}`,
    `Кличний: ${player.nameVocative ?? "—"}`,
  ].join("\n");
}

function amountForResourceKeys(resources: any[], keys: string[]) {
  const normalized = new Set(keys.map((key) => key.toLowerCase()));
  return resources
    .filter((item) => normalized.has(String(item.resourceType.key).toLowerCase()))
    .reduce((sum, item) => sum + item.amount, 0);
}

function moneyText(resources: any[]) {
  const hryvnias = amountForResourceKeys(resources, ["hryvnia", "hryvnias", "gryvnia", "gryvnias", "grivna", "grivnas", "гривня", "ґривня"]);
  const shahs = amountForResourceKeys(resources, ["shah", "shahy", "shahs", "шаг", "шаги"]);
  return `${hryvnias} ґривень, ${shahs} шагів`;
}

async function renderCharacterView(telegramId: number) {
  const player = await prisma.player.findUnique({
    where: { telegramId: String(telegramId) },
    include: { currentLocation: { include: { region: true } }, resources: { include: { resourceType: true } } },
  });

  if (!player) return null;

  const autoEnabled = Boolean(player.isAutoEnabled || isPlayerAutoEnabled(telegramId));
  const autoText = autoEnabled ? "увімкнено 🤖" : "вимкнено";
  const items = player.resources.length ? player.resources.map((i) => `${i.resourceType.name} ×${i.amount}`).join("\n") : "порожньо";
  const staminaMax = player.staminaMax ?? BASE_STAMINA;
  const hpMax = player.hpMax ?? BASE_HP;
  const locationText = player.currentLocation
    ? `${player.currentLocation.region.name} / ${player.currentLocation.name}`
    : "невідомо";
  const nameApprovedText = player.isNameApproved ? "так" : "ні, потребує перевірки";

  return {
    text: `🧍 Ти:\n\nІм’я: ${player.nameNominative ?? player.firstName ?? "невідомо"}\nІм’я схвалене: ${nameApprovedText}\n\nВідмінки імені:\n${nameCasesText(player)}\n\nHP: ${player.hp}/${hpMax}\nВитривалість: ${player.stamina}/${staminaMax}\nСтан: ${formatFatigueText(player)}${recoveryText(player)}\nГолод: ${player.hunger}\nМісцина: ${locationText}\nГроші: ${moneyText(player.resources)}\nАвто-режим: ${autoText}\nЗареєстровано: ${formatDateTime(player.createdAt)}\nАктивний час у грі: поки не рахується окремо.\n\nІнвентар:\n${items}\n\nСтатистика:\n${formatPlayerStats(player, { includeRestStats: true })}`,
    keyboard: buildCharacterAutoKeyboard(autoEnabled),
  };
}

async function showCharacter(telegramId: number, reply: (text: string, options?: any) => Promise<unknown>) {
  const view = await renderCharacterView(telegramId);
  if (!view) return void (await reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));

  await reply(view.text, { reply_markup: view.keyboard });
}

export async function showLocationForPlayer(telegramId: number, reply: (text: string, options?: any) => Promise<unknown>) {
  const player = await getPlayerByTelegramId(telegramId);
  if (!player) return void (await reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));

  const locationId = player.currentLocationId ?? (await getStartLocationId());
  const view = await renderLocationBrief(locationId, player.id);
  await reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
}

export function registerPlayerHandlers(bot: Bot) {
  bot.command("me", async (ctx) => {
    if (!ctx.from) return;
    await showCharacter(ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.hears(["Персонаж", "🧍 Персонаж"], async (ctx) => {
    if (!ctx.from) return;
    await showCharacter(ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.callbackQuery(/^character:auto:(start|stop)$/, async (ctx) => {
    const mode = ctx.match[1];
    if (mode === "start") await enablePlayerAuto(bot, ctx.from.id);
    else await disablePlayerAuto(ctx.from.id);

    const view = await renderCharacterView(ctx.from.id);
    await safeAnswerCallbackQuery(ctx, mode === "start" ? "Авто увімкнено." : "Авто зупинено.");
    if (!view) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
    } catch {
      await ctx.reply(view.text, { reply_markup: view.keyboard });
    }
  });

  bot.command(["location", "loc"], async (ctx) => {
    if (!ctx.from) return;
    await showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.hears(["👀 Озирнутися", "Озирнутися", "📍 Локація"], async (ctx) => {
    if (!ctx.from) return;
    await showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
  });
}
