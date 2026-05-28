import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA, HEALTH_REGEN_PER_INTERVAL, PASSIVE_HEALTH_REGEN_INTERVAL_MS, PASSIVE_STAMINA_REGEN_PER_INTERVAL, PLAYER_HUNGER_MAX, REST_HEALTH_REGEN_INTERVAL_MS, REST_STAMINA_REGEN_INTERVAL_MS, REST_STAMINA_REGEN_PER_INTERVAL, STAMINA_REGEN_INTERVAL_MS } from "../gameConfig";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { renderLocationBrief } from "../services/locations";
import { buildMainReplyKeyboard } from "../ui/replyKeyboard";
import { disablePlayerAuto, isPlayerAutoEnabled, requestOrEnablePlayerAuto } from "./auto";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { formatFatigueText, formatHungerState, formatPlayerStats, formatPostureText, formatVitalsLine } from "../utils/playerText";
import { ownHeldTorchText } from "../utils/torchText";
import { resourceTypeDisplayName } from "../services/corpses";
import {
  addTwigsToCampfire,
  canAddTwigsToNearbyCampfire,
  canDousePlayerTorchFromInventory,
  canLightPlayerTorchFromInventory,
  dousePlayerTorchFromInventory,
  getPlayerTorchState,
  lightPlayerTorchFromInventory,
  TORCH_DURATION_MS,
  TORCH_FADING_MS,
} from "../services/fire";
import { isScribeAdmin } from "../services/adminAccess";
import { playerCanShowTechnicalDetails } from "../services/technicalDetails";
import { dropInventoryResourceDetailed, inspectInventoryResource, useInventoryResource, type UsableInventoryResource } from "../services/inventoryUse";
import { dropObserverText, recordVisibleItemAction } from "../services/visibleItemActions";
import { tutorialLookPaceComments } from "../services/tutorialVoices";
import { escapeHtml } from "../utils/text";
import { hasCompletedTutorial, isTutorialLocation } from "../services/tutorial";

const tutorialInventoryVoiceSeen = new Set<number>();

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
  const restStaminaMinutes = Math.ceil(staminaRemaining / REST_STAMINA_REGEN_PER_INTERVAL) * minutes(REST_STAMINA_REGEN_INTERVAL_MS);
  const passiveHpMinutes = Math.ceil(hpRemaining / HEALTH_REGEN_PER_INTERVAL) * minutes(PASSIVE_HEALTH_REGEN_INTERVAL_MS);
  const restHpMinutes = Math.ceil(hpRemaining / HEALTH_REGEN_PER_INTERVAL) * minutes(REST_HEALTH_REGEN_INTERVAL_MS);
  const passiveMinutes = Math.max(passiveStaminaMinutes, passiveHpMinutes);
  const restMinutes = Math.max(restStaminaMinutes, restHpMinutes);

  if (player.isResting) return `\nВідновлення: приблизно ${restMinutes} хв під час відпочинку.`;
  return `\nВідновлення без відпочинку: приблизно ${passiveMinutes} хв. Через /rest або 🧘 Відпочити: приблизно ${restMinutes} хв.`;
}

function buildCharacterAutoKeyboard(autoEnabled: boolean, options: { canToggleTechnicalDetails?: boolean; showTechnicalDetails?: boolean; showSleep?: boolean } = {}) {
  const keyboard = new InlineKeyboard()
    .text("🎒 Речі", "character:inventory")
    .row()
    .text("🧘 Відпочити", "rest:start")
    .row();

  if (options.showSleep !== false) {
    keyboard
      .text("🌙 Сон", "character:sleep")
      .row();
  }

  keyboard
    .text(autoEnabled ? "⏹ Зупинити авто" : "🤖 Увімкнути авто", autoEnabled ? "character:auto:stop" : "character:auto:start");

  if (options.canToggleTechnicalDetails) {
    keyboard
      .row()
      .text(options.showTechnicalDetails ? "🔧 Сховати технічні деталі" : "🔧 Технічні деталі", "character:debug:toggle");
  }

  return keyboard;
}

function hasInventoryResource(resources: any[], key: UsableInventoryResource) {
  return resources.some((resource) => resource.amount > 0 && resource.resourceType.key === key);
}

function inventoryActionLabel(resource: any) {
  return resourceTypeDisplayName(resource.resourceType);
}

function buildInventoryKeyboard(resources: any[] = [], options: { canAddTwigs?: boolean; canDouseTorch?: boolean; canLightTorch?: boolean } = {}) {
  const keyboard = new InlineKeyboard();
  if (hasInventoryResource(resources, "berries")) keyboard.text("🫐 Використати ягоди", "inventory:use:berries").row();
  if (hasInventoryResource(resources, "mushrooms")) keyboard.text("🍄 Використати гриби", "inventory:use:mushrooms").row();
  if (hasInventoryResource(resources, "herbs")) keyboard.text("🌿 Використати лікарські трави", "inventory:use:herbs").row();
  if (options.canAddTwigs) keyboard.text("🪵 Підкинути хмиз", "inventory:add-twigs").row();
  if (options.canLightTorch) keyboard.text("🔥 Запалити факел", "inventory:light:torch").row();
  if (options.canDouseTorch) keyboard.text("🫧 Притушити факел", "inventory:douse:torch").row();
  for (const resource of resources.filter((item) => item.amount > 0)) {
    const label = inventoryActionLabel(resource);
    keyboard.text(`🔎 ${label}`, `inventory:inspect:${resource.resourceType.key}`).text("Викинути", `inventory:drop:${resource.resourceType.key}`).row();
  }
  return keyboard.text("↩️ Назад", "character:back");
}

function nameCasesText(player: any) {
  return [
    player.nameNominative,
    player.nameGenitive,
    player.nameDative,
    player.nameAccusative,
    player.nameInstrumental,
    player.nameLocative,
    player.nameVocative,
  ].map((value) => value ?? "—").join(" / ");
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
  if (hryvnias <= 0 && shahs <= 0) return "немає";
  return [
    hryvnias > 0 ? `${hryvnias} ґривень` : "",
    shahs > 0 ? `${shahs} шагів` : "",
  ].filter(Boolean).join(", ");
}

function approximateDuration(ms: number) {
  const safeMs = Math.max(0, ms);
  const minutesLeft = Math.ceil(safeMs / 60_000);
  if (minutesLeft <= 0) return "менш ніж хвилину";
  if (minutesLeft === 1) return "приблизно 1 хвилину";
  if (minutesLeft >= 5) return `приблизно ${minutesLeft} хвилин`;
  return `приблизно ${minutesLeft} хвилини`;
}

function amountSuffix(amount: number) {
  return amount > 1 ? ` ×${amount}` : "";
}

function quoteBlock(text: string) {
  return `<blockquote>${escapeHtml(text)}</blockquote>`;
}

async function actionOriginStats(playerId: number) {
  const [autoActions, allActions] = await Promise.all([
    prisma.worldAction.count({ where: { actorType: "PLAYER", playerId, note: { startsWith: "auto:" } } }),
    prisma.worldAction.count({ where: { actorType: "PLAYER", playerId } }),
  ]);
  return { autoActions, manualActions: Math.max(0, allActions - autoActions) };
}

function inventoryResourceLine(resource: any) {
  const name = resourceTypeDisplayName(resource.resourceType);
  const amount = Number(resource.amount ?? 0);
  if (resource.resourceType.key !== "lit_torch") return `- ${name}${amountSuffix(amount)}`;

  const leftMs = resource.updatedAt.getTime() + TORCH_DURATION_MS - Date.now();
  const fading = leftMs > 0 && leftMs <= TORCH_FADING_MS;
  if (fading) return `- ${name}${amountSuffix(amount)} (скоро погасне)`;
  const state = "горітиме";
  return `- ${name}${amountSuffix(amount)}; ${state} ще ${approximateDuration(leftMs)}`;
}

async function renderCharacterView(telegramId: number) {
  const playerRef = await prisma.player.findUnique({ where: { telegramId: String(telegramId) }, select: { id: true } });
  if (!playerRef) return null;

  const player = await prisma.player.findUnique({
    where: { telegramId: String(telegramId) },
    include: { currentLocation: { include: { region: true } }, resources: { include: { resourceType: true } } },
  });

  if (!player) return null;

  const autoEnabled = Boolean(player.isAutoEnabled || isPlayerAutoEnabled(telegramId));
  const autoText = autoEnabled ? "увімкнено 🤖" : "вимкнено";
  const torchState = await getPlayerTorchState(player.id);
  const canToggleTechnicalDetails = await isScribeAdmin(telegramId);
  const showTechnicalDetails = playerCanShowTechnicalDetails(player);
  const technicalDetailsText = canToggleTechnicalDetails ? `\nТехнічні деталі: ${showTechnicalDetails ? "увімкнено 🔧" : "вимкнено"}` : "";
  const vitals = formatVitalsLine(player, { showTechnicalDetails, hpFallback: BASE_HP, staminaFallback: BASE_STAMINA });
  const hungerText = showTechnicalDetails ? `Голод: ${Math.min(PLAYER_HUNGER_MAX, Math.max(0, player.hunger))}/${PLAYER_HUNGER_MAX}` : formatHungerState(player.hunger, PLAYER_HUNGER_MAX);
  const originStats = showTechnicalDetails ? await actionOriginStats(player.id) : null;
  const statsText = showTechnicalDetails ? `\n\nСтатистика:\n${formatPlayerStats(player, { includeRestStats: true })}\nАвто-дій: ${originStats?.autoActions ?? 0}\nРучних дій: ${originStats?.manualActions ?? 0}` : "";
  const completedTutorial = await hasCompletedTutorial(player.id);
  const tutorialStatusText = completedTutorial ? "" : "\nВи ще не пройшли навчальний сон.";
  const torchText = ownHeldTorchText(torchState);
  const locationText = player.currentLocation
    ? `${player.currentLocation.region.name} / ${player.currentLocation.name}`
    : "невідомо";
  const nameApprovedText = player.isNameApproved ? "Ім’я схвалене." : "Ім’я ще не схвалене. Зверніться до писарів Порубіжжя.";
  const isTutorialDream = player.currentLocation ? isTutorialLocation(player.currentLocation) : false;

  return {
    text: `🧍 Ти:\n\nІм’я: ${player.nameNominative ?? player.firstName ?? "невідомо"}\n${nameApprovedText}\nВідмінки імені: ${nameCasesText(player)}${tutorialStatusText}\n\n${formatPostureText({ ...player, isSleeping: isTutorialDream })}${torchText}\n${vitals.join("\n")}\nСтан: ${formatFatigueText(player)}${recoveryText(player)}\n${hungerText}\nМісцина: ${locationText}\nГроші: ${moneyText(player.resources)}\nАвто-режим: ${autoText}${technicalDetailsText}\nЗареєстровано: ${formatDateTime(player.createdAt)}${statsText}`,
    keyboard: buildCharacterAutoKeyboard(autoEnabled, { canToggleTechnicalDetails, showTechnicalDetails, showSleep: !isTutorialDream }),
  };
}

async function renderInventoryView(telegramId: number) {
  const playerRef = await prisma.player.findUnique({ where: { telegramId: String(telegramId) }, select: { id: true } });
  if (!playerRef) return null;
  const torchState = await getPlayerTorchState(playerRef.id);
  const player = await prisma.player.findUnique({
    where: { id: playerRef.id },
    include: { resources: { include: { resourceType: true }, orderBy: { id: "asc" } } },
  });

  if (!player) return null;
  const [canAddTwigs, canDouseTorch, canLightTorch] = await Promise.all([
    canAddTwigsToNearbyCampfire(player.id),
    canDousePlayerTorchFromInventory(player.id),
    canLightPlayerTorchFromInventory(player.id),
  ]);

  const itemLines = player.resources
    .filter((i) => i.amount > 0)
    .map(inventoryResourceLine);

  return {
    text: `🎒 Речі\n\n${itemLines.length ? itemLines.join("\n") : "Поки порожньо."}`,
    keyboard: buildInventoryKeyboard(player.resources, { canAddTwigs, canDouseTorch, canLightTorch }),
  };
}

export async function showCharacter(telegramId: number, reply: (text: string, options?: any) => Promise<unknown>) {
  const view = await renderCharacterView(telegramId);
  if (!view) return void (await reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));

  await reply(view.text, { reply_markup: view.keyboard });
}

export async function showInventory(telegramId: number, reply: (text: string, options?: any) => Promise<unknown>) {
  const view = await renderInventoryView(telegramId);
  if (!view) return void (await reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));

  await reply(view.text, { reply_markup: view.keyboard });
  const player = await getPlayerByTelegramId(telegramId);
  if (player?.currentLocationId && !tutorialInventoryVoiceSeen.has(player.id)) {
    const location = await prisma.cellLocation.findUnique({ where: { id: player.currentLocationId }, include: { region: true } });
    if (location && isTutorialLocation(location)) {
      tutorialInventoryVoiceSeen.add(player.id);
      await reply(`Сон радить:\n${quoteBlock("Речі тримають те, що ви вже взяли. Тут можна роздивитися знахідку, використати її або викинути.")}`, { parse_mode: "HTML" });
      await reply(`Дрімота бурмоче:\n${quoteBlock("Носити зайве важко. Викинь — і стане легше йти.")}`, { parse_mode: "HTML" });
    }
  }
}

export async function showLocationForPlayer(telegramId: number, reply: (text: string, options?: any) => Promise<unknown>) {
  const player = await getPlayerByTelegramId(telegramId);
  if (!player) return void (await reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));

  const locationId = player.currentLocationId ?? (await getStartLocationId());
  const view = await renderLocationBrief(locationId, player.id);
  await reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  const voiceComments = await tutorialLookPaceComments({ ...player, currentLocationId: locationId });
  for (const comment of voiceComments) {
    await reply(`${comment.title}:\n${quoteBlock(comment.text)}`, { parse_mode: "HTML" });
  }
}

export function registerPlayerHandlers(bot: Bot) {
  bot.command("me", async (ctx) => {
    if (!ctx.from) return;
    await showCharacter(ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.command("inventory", async (ctx) => {
    if (!ctx.from) return;
    await showInventory(ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.hears(/^(?:🧍\s*)?Персонаж$|^❤️\s+/u, async (ctx) => {
    if (!ctx.from) return;
    await showCharacter(ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.hears(["🎒 Речі", "Речі"], async (ctx) => {
    if (!ctx.from) return;
    await showInventory(ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.callbackQuery("character:inventory", async (ctx) => {
    const view = await renderInventoryView(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!view) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
    } catch {
      await ctx.reply(view.text, { reply_markup: view.keyboard });
    }
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (player?.currentLocationId && !tutorialInventoryVoiceSeen.has(player.id)) {
      const location = await prisma.cellLocation.findUnique({ where: { id: player.currentLocationId }, include: { region: true } });
      if (location && isTutorialLocation(location)) {
        tutorialInventoryVoiceSeen.add(player.id);
        await ctx.reply(`Сон радить:\n${quoteBlock("Речі тримають те, що ви вже взяли. Тут можна роздивитися знахідку, використати її або викинути.")}`, { parse_mode: "HTML" });
        await ctx.reply(`Дрімота бурмоче:\n${quoteBlock("Носити зайве важко. Викинь — і стане легше йти.")}`, { parse_mode: "HTML" });
      }
    }
  });

  bot.callbackQuery(/^inventory:use:(berries|herbs|mushrooms)$/, async (ctx) => {
    const resourceKey = ctx.match[1] as UsableInventoryResource;
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      const resultText = await useInventoryResource(player.id, resourceKey);
      const view = await renderInventoryView(ctx.from.id);
      if (!view) return void (await ctx.reply(resultText));

      try {
        await ctx.editMessageText(`${resultText}\n\n${view.text}`, { reply_markup: view.keyboard });
      } catch {
        await ctx.reply(`${resultText}\n\n${view.text}`, { reply_markup: view.keyboard });
      }
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося використати це.");
    }
  });

  bot.callbackQuery("inventory:light:torch", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const resultText = await lightPlayerTorchFromInventory(player.id);
    const view = await renderInventoryView(ctx.from.id);
    const text = view ? `${resultText}\n\n${view.text}` : resultText;
    try {
      await ctx.editMessageText(text, view ? { reply_markup: view.keyboard } : undefined);
    } catch {
      await ctx.reply(text, view ? { reply_markup: view.keyboard } : undefined);
    }
  });

  bot.callbackQuery("inventory:douse:torch", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const resultText = await dousePlayerTorchFromInventory(player.id);
    const view = await renderInventoryView(ctx.from.id);
    const text = view ? `${resultText}\n\n${view.text}` : resultText;
    try {
      await ctx.editMessageText(text, view ? { reply_markup: view.keyboard } : undefined);
    } catch {
      await ctx.reply(text, view ? { reply_markup: view.keyboard } : undefined);
    }
  });

  bot.callbackQuery("inventory:add-twigs", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const resultText = await addTwigsToCampfire(player.id);
    const view = await renderInventoryView(ctx.from.id);
    const text = view ? `${resultText}\n\n${view.text}` : resultText;
    try {
      await ctx.editMessageText(text, view ? { reply_markup: view.keyboard } : undefined);
    } catch {
      await ctx.reply(text, view ? { reply_markup: view.keyboard } : undefined);
    }
  });

  bot.callbackQuery(/^inventory:inspect:([A-Za-z0-9_-]+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      const text = await inspectInventoryResource(player.id, ctx.match[1]);
      const keyboard = new InlineKeyboard().text("↩️ До речей", "character:inventory");
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося роздивитися це.");
    }
  });

  bot.callbackQuery(/^inventory:drop:([A-Za-z0-9_-]+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      const result = await dropInventoryResourceDetailed(player.id, ctx.match[1]);
      await recordVisibleItemAction(bot, {
        playerId: player.id,
        locationId: result.locationId,
        observerText: dropObserverText(player, result.droppedName),
        eventTitle: "Player dropped item",
        eventDescription: `player=${player.id}; item=${result.resourceKey}; name=${result.droppedName}`,
        actionNote: `викинуто: ${result.droppedName}`,
      });
      const view = await renderInventoryView(ctx.from.id);
      const text = view ? `${result.text}\n\n${view.text}` : result.text;
      await ctx.editMessageText(text, view ? { reply_markup: view.keyboard } : undefined);
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося викинути це.");
    }
  });

  bot.callbackQuery("character:back", async (ctx) => {
    const view = await renderCharacterView(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!view) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
    } catch {
      await ctx.reply(view.text, { reply_markup: view.keyboard });
    }
  });

  bot.callbackQuery(/^character:auto:(start|stop)$/, async (ctx) => {
    const mode = ctx.match[1];
    if (mode === "start") {
      await safeAnswerCallbackQuery(ctx);
      await requestOrEnablePlayerAuto(bot, ctx);
      return;
    }

    await disablePlayerAuto(ctx.from.id);

    const view = await renderCharacterView(ctx.from.id);
    await safeAnswerCallbackQuery(ctx, "Авто зупинено.");
    if (!view) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
    } catch {
      await ctx.reply(view.text, { reply_markup: view.keyboard });
    }
  });

  bot.callbackQuery("character:debug:toggle", async (ctx) => {
    if (!(await isScribeAdmin(ctx.from.id))) {
      await safeAnswerCallbackQuery(ctx, "Ця опція доступна тільки писарям Порубіжжя.");
      return;
    }

    const player = await prisma.player.findUnique({
      where: { telegramId: String(ctx.from.id) },
      select: { id: true, showTechnicalDetails: true },
    });
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
      return;
    }

    const enabled = !player.showTechnicalDetails;
    await prisma.player.update({ where: { id: player.id }, data: { showTechnicalDetails: enabled } });

    const view = await renderCharacterView(ctx.from.id);
    await safeAnswerCallbackQuery(ctx, enabled ? "Технічні деталі увімкнено." : "Технічні деталі приховано.");
    if (!view) return;

    try {
      await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
    } catch {
      await ctx.reply(view.text, { reply_markup: view.keyboard });
    }
  });

  bot.command(["look", "location", "loc"], async (ctx) => {
    if (!ctx.from) return;
    await showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.hears(["👀 Озирнутися", "Озирнутися", "📍 Місцина"], async (ctx) => {
    if (!ctx.from) return;
    await showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
  });
}
