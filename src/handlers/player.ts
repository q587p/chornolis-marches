import { Bot, InlineKeyboard } from "grammy";
import type { Prisma, WorldActionType } from "@prisma/client";
import { prisma } from "../db";
import { approximateWorldDurationFromRealMs } from "../data/worldClock";
import { BASE_HP, BASE_STAMINA, HEALTH_REGEN_PER_INTERVAL, PASSIVE_STAMINA_REGEN_PER_INTERVAL, PLAYER_HUNGER_MAX, REST_HEALTH_REGEN_INTERVAL_MS, REST_STAMINA_REGEN_INTERVAL_MS, REST_STAMINA_REGEN_PER_INTERVAL, STAMINA_REGEN_INTERVAL_MS } from "../gameConfig";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { renderLocationBrief, renderLocationFeatureInteractionByQuery } from "../services/locations";
import { buildMainReplyKeyboard, buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { buildLocationSocialSignalKeyboard } from "../ui/keyboards";
import { buildInventoryItemKeyboard } from "../ui/inventoryItemKeyboard";
import { disablePlayerAuto, isPlayerAutoEnabled, requestOrEnablePlayerAuto } from "./auto";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { replyToActionError } from "../utils/actionErrorReply";
import { formatFatigueText, formatHungerState, formatPlayerStats, formatPostureText, formatVitalsLine } from "../utils/playerText";
import { ownHeldTorchText } from "../utils/torchText";
import { resourceTypeDisplayName } from "../services/corpses";
import { actionDurationMs, hasPlayerActionQueueControls, performOrQueuePlayerAction, renderPlayerActionQueue } from "../services/actionQueue";
import {
  canBuildCampfireFromInventory,
  canAddTwigsToNearbyCampfire,
  canDousePlayerTorchFromInventory,
  canLightPlayerTorchFromInventory,
  getPlayerTorchState,
  hasActiveLightAtLocation,
  TORCH_DURATION_MS,
  TORCH_FADING_MS,
} from "../services/fire";
import { isScribeAdmin } from "../services/adminAccess";
import { playerCanShowTechnicalDetails } from "../services/technicalDetails";
import { inspectInventoryResource, inventoryResourceKeyFromText, type UsableInventoryResource } from "../services/inventoryUse";
import { tutorialActionHintComment, tutorialLookPaceComments } from "../services/tutorialVoices";
import { escapeHtml } from "../utils/text";
import { noteKnownMessage } from "../utils/messageTracker";
import { hasCompletedTutorial, isTutorialLocation, rememberTutorialCommandHintIfInTutorial } from "../services/tutorial";
import { CAMPFIRE_REST_STAMINA_REGEN_MULTIPLIER, getPlayerRestStaminaCap, getPlayerRestStaminaRegenMultiplier } from "../services/locationFeatures";
import { canCookPlayerMeat, COOKED_MEAT_KEY, RAW_MEAT_KEY } from "../services/meat";
import { queueAllRawMeatCooking } from "../services/cookingQueue";
import { eatAllButtonLabel, queueAllUsableInventoryResource } from "../services/eatingQueue";
import { GATHERING_OBSERVATION_GROWTH_MESSAGE, recordGatheringObservation } from "../services/gatheringLearning";
import { maybeCreateMentorshipPracticePrompt } from "../services/mentorship";
import { COOKING_OBSERVATION_GROWTH_MESSAGE, FRESHENING_OBSERVATION_GROWTH_MESSAGE, recordCookingObservation, recordFresheningObservation } from "../services/foodLearning";
import { rememberTutorialInventoryForPlayer } from "../utils/tutorialInventory";
import { bestTargetMatch, inspectMissingText, isSelfTargetQueryForPlayer, targetDisplayLabel, targetListText, visibleTextTargets } from "../services/textTargets";
import { actionQueueReplyOptions, sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { durationSecondsSuffix } from "../utils/durationText";
import { characterNameApprovalStatusText } from "../services/characterNames";
import { performPlayerLocationSignal, socialDefinitionById } from "../services/socialSignals";
import { firstNightGuidanceForPlayer } from "../services/beginnerGuidance";
import { equipPlayerWeapon, ownHeldWeaponLine, unequipPlayerWeapon } from "../services/weapons";
import { playerMoneyText } from "../utils/moneyText";
import { followAssistStateText, followIntentStatusLine, getPlayerFollowIntent, isFollowIntentTargetVisibleAtLocation } from "../services/following";
import { formatLearningSummary, formatLearningTechnicalRows, learningRowsForActor } from "../services/learning";

const tutorialInventoryVoiceSeen = new Set<number>();

function minutes(ms: number) {
  return Math.max(1, Math.ceil(ms / 60_000));
}

function recoveryMinutes(remaining: number, amount: number, intervalMs: number) {
  if (remaining <= 0) return 0;
  return minutes(Math.ceil(remaining / Math.max(1, amount)) * intervalMs);
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

async function recoveryText(player: any) {
  if (player.sleepState === "ORDINARY_SLEEP") return "\nВідновлення: тіло відпочиває глибше, поки ви спите.";
  const staminaMax = player.staminaMax ?? BASE_STAMINA;
  const restStaminaCap = await getPlayerRestStaminaCap(player.id);
  const hpMax = player.hpMax ?? BASE_HP;
  const staminaRemaining = Math.max(0, staminaMax - player.stamina);
  const restStaminaRemaining = Math.max(0, restStaminaCap - player.stamina);
  const hpRemaining = Math.max(0, hpMax - player.hp);
  if (staminaRemaining <= 0 && restStaminaRemaining <= 0 && hpRemaining <= 0) return "";

  const restMultiplier = await getPlayerRestStaminaRegenMultiplier(player.id);
  const passiveStaminaMinutes = recoveryMinutes(staminaRemaining, PASSIVE_STAMINA_REGEN_PER_INTERVAL, STAMINA_REGEN_INTERVAL_MS);
  const restStaminaMinutes = recoveryMinutes(restStaminaRemaining, REST_STAMINA_REGEN_PER_INTERVAL * restMultiplier, REST_STAMINA_REGEN_INTERVAL_MS);
  const campfireStaminaMinutes = recoveryMinutes(
    restStaminaRemaining,
    REST_STAMINA_REGEN_PER_INTERVAL * Math.max(restMultiplier, CAMPFIRE_REST_STAMINA_REGEN_MULTIPLIER),
    REST_STAMINA_REGEN_INTERVAL_MS,
  );
  const restHpMinutes = recoveryMinutes(hpRemaining, HEALTH_REGEN_PER_INTERVAL, REST_HEALTH_REGEN_INTERVAL_MS);

  if (player.isResting) {
    const lines: string[] = [];
    if (restStaminaRemaining > 0) lines.push(`Відновлення снаги: приблизно ${restStaminaMinutes} хв під час відпочинку.`);
    if (hpRemaining > 0) lines.push(`Життя з відпочинком: приблизно ${restHpMinutes} хв.`);
    return `\n${lines.join("\n")}`;
  }

  const lines: string[] = [];
  if (staminaRemaining > 0 || restStaminaRemaining > 0) {
    lines.push("Відновлення снаги:");
    if (staminaRemaining > 0) lines.push(`Без відпочинку: приблизно ${passiveStaminaMinutes} хв.`);
    if (restStaminaRemaining > 0) {
      lines.push(`З відпочинком: приблизно ${restStaminaMinutes} хв.`);
      lines.push(`Біля вогнища: щонайбільше приблизно ${campfireStaminaMinutes} хв.`);
    }
  }
  if (hpRemaining > 0) lines.push(`Життя з відпочинком: приблизно ${restHpMinutes} хв.`);
  return `\n${lines.join("\n")}`;
}

export function buildCharacterAutoKeyboard(autoEnabled: boolean, options: { posture?: string | null; sleepState?: string | null; isResting?: boolean | null; showSleep?: boolean; hasActionQueue?: boolean } = {}) {
  const keyboard = new InlineKeyboard()
    .text("🎒 Речі", "character:inventory")
    .row();
  if (options.hasActionQueue) {
    keyboard.text("📋 Черга", "queue:status").row();
  }
  if (options.sleepState === "ORDINARY_SLEEP") {
    keyboard.text("Прокинутися", "sleep:wake");
    return keyboard;
  }

  const isSitting = options.posture === "SITTING" || Boolean(options.isResting);
  const isLying = options.posture === "LYING";
  keyboard.text("✨ Сигнали", "character:signals").row();

  keyboard.text(isSitting || isLying ? "Встати" : "Сісти", isSitting || isLying ? "posture:stand" : "posture:sit");
  if (!options.isResting) keyboard.text("🧘 Відпочити", "rest:start");
  keyboard.row();

  if (isLying) {
    keyboard.text("Сісти", "posture:sit");
  } else {
    keyboard.text("Лягти", "posture:lie");
  }
  if (options.showSleep !== false) keyboard.text("🌙 Сон", "character:sleep");
  keyboard.row();

  keyboard
    .text(autoEnabled ? "🌫️ Відпустити духа" : "🌫️ Поклик духа", autoEnabled ? "character:auto:stop" : "character:auto:start");

  return keyboard;
}

function hasInventoryResource(resources: any[], key: string) {
  return resources.some((resource) => resource.amount > 0 && resource.resourceType.key === key);
}

function inventoryResourceAmount(resources: any[], key: string) {
  return resources
    .filter((resource) => resource.resourceType.key === key)
    .reduce((total, resource) => total + Math.max(0, resource.amount ?? 0), 0);
}

function inventoryActionLabel(resource: any) {
  return resourceTypeDisplayName(resource.resourceType);
}

function buildInventoryKeyboard(resources: any[] = [], options: { canAddTwigs?: boolean; canBuildCampfire?: boolean; canDouseTorch?: boolean; canLightTorch?: boolean; canCookMeat?: boolean } = {}) {
  const keyboard = new InlineKeyboard();
  const berriesAmount = inventoryResourceAmount(resources, "berries");
  if (berriesAmount > 0) {
    keyboard.text("🫐 З’їсти ягоди", "inventory:use:berries");
    if (berriesAmount > 1) keyboard.text(eatAllButtonLabel("berries"), "inventory:use-all:berries");
    keyboard.row();
  }
  const mushroomsAmount = inventoryResourceAmount(resources, "mushrooms");
  if (mushroomsAmount > 0) {
    keyboard.text("🍄 З’їсти гриби", "inventory:use:mushrooms");
    if (mushroomsAmount > 1) keyboard.text(eatAllButtonLabel("mushrooms"), "inventory:use-all:mushrooms");
    keyboard.row();
  }
  const herbsAmount = inventoryResourceAmount(resources, "herbs");
  if (herbsAmount > 0) {
    keyboard.text("🌿 З’їсти лікарські трави", "inventory:use:herbs");
    if (herbsAmount > 1) keyboard.text(eatAllButtonLabel("herbs"), "inventory:use-all:herbs");
    keyboard.row();
  }
  const cookedMeatAmount = inventoryResourceAmount(resources, COOKED_MEAT_KEY);
  if (cookedMeatAmount > 0) {
    keyboard.text("🥩 З’їсти смажене м’ясо", `inventory:use:${COOKED_MEAT_KEY}`);
    if (cookedMeatAmount > 1) keyboard.text(eatAllButtonLabel(COOKED_MEAT_KEY), `inventory:use-all:${COOKED_MEAT_KEY}`);
    keyboard.row();
  }
  const rawMeatAmount = inventoryResourceAmount(resources, RAW_MEAT_KEY);
  if (options.canCookMeat && rawMeatAmount > 0) {
    keyboard.text("🔥🥩 Підсмажити м’ясо", "inventory:cook:meat");
    if (rawMeatAmount > 1) keyboard.text("🔥🥩 Посмажити все", "inventory:cook:all");
    keyboard.row();
  }
  if (options.canBuildCampfire) keyboard.text("🪵 Скласти вогнище", "fire:build").row();
  if (options.canAddTwigs) keyboard.text("🪵 Підкинути хмиз", "inventory:add-twigs").row();
  if (options.canLightTorch) keyboard.text("🔥🕯 Запалити факел", "inventory:light:torch").row();
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

function amountSuffix(amount: number) {
  return amount > 1 ? ` ×${amount}` : "";
}

function quoteBlock(text: string) {
  return `<blockquote>${escapeHtml(text)}</blockquote>`;
}

async function sendFeatureFollowups(reply: (text: string, options?: any) => Promise<unknown>, view: any) {
  for (const message of view.quoteMessages ?? []) {
    noteKnownMessage(await reply(`${escapeHtml(message.title)}:\n${quoteBlock(message.text)}`, { parse_mode: "HTML" }));
  }
  for (const message of view.followupMessages ?? []) {
    noteKnownMessage(await reply(message.text, { parse_mode: "HTML" }));
  }
}

async function sendVoiceComment(reply: (text: string, options?: any) => Promise<unknown>, comment: { title: string; text: string } | null) {
  if (!comment) return;
  noteKnownMessage(await reply(`${comment.title}:\n${quoteBlock(comment.text)}`, { parse_mode: "HTML" }));
}

function normalizeLookCommandTargetArg(value: string) {
  return value.replace(/^(?:at|на)\s+/iu, "").trim();
}

async function tryReplyWithInventoryInspection(ctx: any, playerId: number, targetQuery: string) {
  try {
    const text = await inspectInventoryResource(playerId, targetQuery);
    const keyboard = await buildInventoryItemKeyboard(playerId, inventoryResourceKeyFromText(targetQuery));
    await ctx.reply(text, { reply_markup: keyboard });
    return true;
  } catch {
    return false;
  }
}

async function submitLookTarget(bot: Bot, ctx: any, player: any, targetQuery: string) {
  if (isSelfTargetQueryForPlayer(targetQuery, player)) return showCharacter(ctx.from.id, (text, options) => ctx.reply(text, options));

  const visibleTargets = await visibleTextTargets(player.currentLocationId, player.id);
  if (!visibleTargets.length) {
    if (await tryReplyWithInventoryInspection(ctx, player.id, targetQuery)) return;
    await ctx.reply(inspectMissingText(targetQuery));
    return;
  }

  const match = bestTargetMatch(targetQuery, visibleTargets);
  if (match.kind === "none") {
    if (await tryReplyWithInventoryInspection(ctx, player.id, targetQuery)) return;
    await ctx.reply(inspectMissingText(targetQuery, visibleTargets));
    return;
  }

  if (match.kind === "many") {
    const keyboard = new InlineKeyboard();
    match.targets.forEach((target, index) => keyboard.text(`${index + 1}. ${targetDisplayLabel(target)}`, `target:${target.type}:${target.id}`).row());
    await ctx.reply(`Знайшов кілька схожих істот чи постатей. Уточни назвою або номером.\n\nПоруч можна роздивитися:\n${targetListText(visibleTargets)}`, { reply_markup: keyboard });
    return;
  }

  const durationMs = actionDurationMs("INSPECT", player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type: "INSPECT",
      payload: { targetType: match.target.type, targetId: match.target.id, mode: "known", detail: "brief" },
      durationMs,
      chatId: ctx.chat?.id,
    });
    await ctx.reply(result.mode === "immediate" ? "Дію виконано." : `Дію додано в чергу${durationSecondsSuffix(player, durationMs)}.`);
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося роздивитися це.");
  }
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
  return `- ${name}${amountSuffix(amount)}; ${state} ще ${approximateWorldDurationFromRealMs(leftMs)}`;
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
  const autoText = autoEnabled ? "озивається 🌫️" : "мовчить";
  const torchState = await getPlayerTorchState(player.id);
  const canToggleTechnicalDetails = await isScribeAdmin(telegramId);
  const showTechnicalDetails = playerCanShowTechnicalDetails(player);
  const technicalDetailsText = canToggleTechnicalDetails ? `\nТехнічні деталі: ${showTechnicalDetails ? "увімкнено 🔧" : "вимкнено"}` : "";
  const vitals = formatVitalsLine(player, { showTechnicalDetails, hpFallback: BASE_HP, staminaFallback: BASE_STAMINA });
  const hungerText = showTechnicalDetails ? `Голод: ${Math.min(PLAYER_HUNGER_MAX, Math.max(0, player.hunger))}/${PLAYER_HUNGER_MAX}` : formatHungerState(player.hunger, PLAYER_HUNGER_MAX);
  const originStats = showTechnicalDetails ? await actionOriginStats(player.id) : null;
  const learningRows = await learningRowsForActor({ actorType: "PLAYER", playerId: player.id });
  const learningSummary = formatLearningSummary(learningRows, { limit: 5 });
  const learningText = learningSummary ? `\n${learningSummary}` : "";
  const learningTechnicalText = showTechnicalDetails
    ? `\n\nНавчання:\n${formatLearningTechnicalRows({ actorType: "PLAYER", playerId: player.id }, learningRows).join("\n")}`
    : "";
  const statsText = showTechnicalDetails ? `\n\nСтатистика:\n${formatPlayerStats(player, { includeRestStats: true })}\nДій Поклику: ${originStats?.autoActions ?? 0}\nРучних дій: ${originStats?.manualActions ?? 0}` : "";
  const completedTutorial = await hasCompletedTutorial(player.id);
  const tutorialStatusText = completedTutorial ? "" : "\nВи ще не пройшли навчальний сон.";
  const torchText = ownHeldTorchText(torchState);
  const weaponText = ownHeldWeaponLine(player.equippedWeaponKey);
  const locationText = player.currentLocation
    ? `${player.currentLocation.region.name} / ${player.currentLocation.name}`
    : "невідомо";
  const nameApprovedText = characterNameApprovalStatusText(player.isNameApproved);
  const isTutorialDream = player.currentLocation ? isTutorialLocation(player.currentLocation) : false;
  const hasActionQueue = await hasPlayerActionQueueControls(player.id);
  const followIntent = await getPlayerFollowIntent(player.id);
  const followIntentTargetVisible = await isFollowIntentTargetVisibleAtLocation(followIntent, player.currentLocationId);
  const followIntentText = followIntentStatusLine(followIntent?.lastKnownTargetLabel, { stale: Boolean(followIntent && !followIntentTargetVisible) });
  const followAssistText = followIntent ? followAssistStateText(followIntent.assistEnabled) : null;

  return {
    text: `🧍 Ти:\n\nІм’я: ${player.nameNominative ?? player.firstName ?? "невідомо"}\n${nameApprovedText}\nВідмінки імені: ${nameCasesText(player)}${tutorialStatusText}\n\n${formatPostureText({ ...player, isSleeping: isTutorialDream })}${torchText}\n${weaponText}\n${vitals.join("\n")}\nСтан: ${formatFatigueText(player)}${await recoveryText(player)}\n${hungerText}\nМісцина: ${locationText}\nГроші: ${playerMoneyText(player.resources)}\nПоклик духа: ${autoText}${followIntentText ? `\n${followIntentText}` : ""}${followAssistText ? `\n${followAssistText}` : ""}${learningText}${technicalDetailsText}\nЗареєстровано: ${formatDateTime(player.createdAt)}${statsText}${learningTechnicalText}`,
    keyboard: buildCharacterAutoKeyboard(autoEnabled, { posture: player.posture, sleepState: player.sleepState, isResting: player.isResting, showSleep: !isTutorialDream, hasActionQueue }),
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
  const [canAddTwigs, canBuildCampfire, canDouseTorch, canLightTorch, canCookMeat] = await Promise.all([
    canAddTwigsToNearbyCampfire(player.id),
    canBuildCampfireFromInventory(player.id),
    canDousePlayerTorchFromInventory(player.id),
    canLightPlayerTorchFromInventory(player.id),
    canCookPlayerMeat(player.id),
  ]);

  const itemLines = player.resources
    .filter((i) => i.amount > 0)
    .map(inventoryResourceLine);

  return {
    text: `🎒 Речі\n\n${itemLines.length ? itemLines.join("\n") : "Поки порожньо."}`,
    keyboard: buildInventoryKeyboard(player.resources, { canAddTwigs, canBuildCampfire, canDouseTorch, canLightTorch, canCookMeat }),
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
  if (player?.currentLocationId) {
    const location = await prisma.cellLocation.findUnique({ where: { id: player.currentLocationId }, include: { region: true } });
    if (location && isTutorialLocation(location)) {
      const firstInventoryAccess = await rememberTutorialInventoryForPlayer(player, "inventory-command");
      const replyMarkup = await buildMainReplyKeyboardForTelegramId(telegramId, false);
      if (tutorialInventoryVoiceSeen.has(player.id)) {
        if (firstInventoryAccess) await reply("Речі тепер можна відкрити з клавіатури.", { reply_markup: replyMarkup });
        return;
      }
      tutorialInventoryVoiceSeen.add(player.id);
      await reply(`Сон радить:\n${quoteBlock("Речі тримають те, що ви вже взяли. Тут можна роздивитися знахідку, використати її або викинути.")}`, { parse_mode: "HTML" });
      await reply(`Дрімота бурмоче:\n${quoteBlock("Носити зайве важко. Викинь — і стане легше йти.")}`, { parse_mode: "HTML", reply_markup: replyMarkup });
    }
  }
}

export async function showLocationForPlayer(telegramId: number, reply: (text: string, options?: any) => Promise<unknown>) {
  const player = await getPlayerByTelegramId(telegramId);
  if (!player) return void (await reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));

  const locationId = player.currentLocationId ?? (await getStartLocationId());
  const view = await renderLocationBrief(locationId, player.id);
  noteKnownMessage(await reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard }));
  await sendVoiceComment(reply, await tutorialActionHintComment({ ...player, currentLocationId: locationId }, "look"));
  const firstNightGuidance = await firstNightGuidanceForPlayer(player.id, locationId);
  if (firstNightGuidance) noteKnownMessage(await reply(firstNightGuidance));
  if (await hasActiveLightAtLocation(locationId)) {
    const observation = await recordGatheringObservation({ playerId: player.id, locationId });
    if (observation.milestone) {
      noteKnownMessage(await reply(GATHERING_OBSERVATION_GROWTH_MESSAGE, { parse_mode: "HTML" }));
    }
    if (observation.mentorshipLessonText) {
      noteKnownMessage(await reply(observation.mentorshipLessonText));
    }
    if (observation.mentorshipLessonContext) {
      const prompt = await maybeCreateMentorshipPracticePrompt(observation.mentorshipLessonContext);
      if (prompt.text) {
        noteKnownMessage(await reply(prompt.text, prompt.ok && prompt.keyboard ? { parse_mode: "HTML", reply_markup: prompt.keyboard } : { parse_mode: "HTML" }));
      }
    }
    const fresheningObservation = await recordFresheningObservation({ playerId: player.id, locationId });
    if (fresheningObservation.milestone) {
      noteKnownMessage(await reply(FRESHENING_OBSERVATION_GROWTH_MESSAGE, { parse_mode: "HTML" }));
    }
    const cookingObservation = await recordCookingObservation({ playerId: player.id, locationId });
    if (cookingObservation.milestone) {
      noteKnownMessage(await reply(COOKING_OBSERVATION_GROWTH_MESSAGE, { parse_mode: "HTML" }));
    }
  }
  const voiceComments = await tutorialLookPaceComments({ ...player, currentLocationId: locationId });
  for (const comment of voiceComments) {
    noteKnownMessage(await reply(`${comment.title}:\n${quoteBlock(comment.text)}`, { parse_mode: "HTML" }));
  }
}

function locationSocialSignalsText() {
  return [
    "✨ Сигнали",
    "",
    "Короткі жести без окремої цілі. Якщо хочеш звернутися саме до когось, роздивись ціль у місцині або напиши жест із її ім’ям.",
  ].join("\n");
}

export async function showLocationSocialSignals(telegramId: number, reply: (text: string, options?: any) => Promise<unknown>) {
  const player = await getPlayerByTelegramId(telegramId);
  if (!player) return void (await reply("Ти ще не увійшов у світ. Напиши /start"));
  await reply(locationSocialSignalsText(), { reply_markup: buildLocationSocialSignalKeyboard() });
}

async function submitInventoryQueuedAction(
  bot: Bot,
  ctx: any,
  player: any,
  type: WorldActionType,
  payload: Prisma.InputJsonObject,
  fallback: string,
) {
  const durationMs = actionDurationMs(type, player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type,
      payload,
      durationMs,
      chatId: ctx.chat?.id,
    });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await replyToActionError(ctx, error, fallback);
  }
}

async function submitCookAllMeat(bot: Bot, ctx: any, player: any) {
  try {
    const result = await queueAllRawMeatCooking(bot, player, ctx.chat?.id);
    const queueText = await renderPlayerActionQueue(player.id);
    const queueLimitText = result.limitedByQueue
      ? "\n\nЧерга майже повна, тож решту м’яса можна буде додати пізніше."
      : "";
    await ctx.reply(
      `Додано підсмажування м’яса: ${result.count}. Будете смажити по черзі${durationSecondsSuffix(player, result.durationMs)}.${queueLimitText}\n\n${queueText}`,
      await actionQueueReplyOptions(player.id),
    );
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося посмажити все м'ясо.");
  }
}

async function submitUseAllItems(bot: Bot, ctx: any, player: any, resourceKey: UsableInventoryResource) {
  try {
    const result = await queueAllUsableInventoryResource(bot, player, resourceKey, ctx.chat?.id);
    const queueText = await renderPlayerActionQueue(player.id);
    await ctx.reply(
      `Додано вживання запасу: ${result.count}. Будете їсти по черзі${durationSecondsSuffix(player, result.durationMs)}.\n\n${queueText}`,
      await actionQueueReplyOptions(player.id),
    );
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося додати все в чергу.");
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
    if (player?.currentLocationId) {
      const location = await prisma.cellLocation.findUnique({ where: { id: player.currentLocationId }, include: { region: true } });
      if (location && isTutorialLocation(location)) {
        const firstInventoryAccess = await rememberTutorialInventoryForPlayer(player, "inventory-callback");
        const replyMarkup = await buildMainReplyKeyboardForTelegramId(ctx.from.id, false);
        if (tutorialInventoryVoiceSeen.has(player.id)) {
          if (firstInventoryAccess) await ctx.reply("Речі тепер можна відкрити з клавіатури.", { reply_markup: replyMarkup });
          return;
        }
        tutorialInventoryVoiceSeen.add(player.id);
        await ctx.reply(`Сон радить:\n${quoteBlock("Речі тримають те, що ви вже взяли. Тут можна роздивитися знахідку, використати її або викинути.")}`, { parse_mode: "HTML" });
        await ctx.reply(`Дрімота бурмоче:\n${quoteBlock("Носити зайве важко. Викинь — і стане легше йти.")}`, { parse_mode: "HTML", reply_markup: replyMarkup });
      }
    }
  });

  bot.callbackQuery("character:signals", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const text = locationSocialSignalsText();
    try {
      await ctx.editMessageText(text, { reply_markup: buildLocationSocialSignalKeyboard() });
    } catch {
      await ctx.reply(text, { reply_markup: buildLocationSocialSignalKeyboard() });
    }
  });

  bot.callbackQuery(/^character:signal:([a-z]+)$/, async (ctx) => {
    const signalId = ctx.match[1];
    const social = socialDefinitionById(signalId);
    if (!social) return void (await safeAnswerCallbackQuery(ctx, "Невідомий сигнал."));

    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      await performPlayerLocationSignal(bot, player, signalId, ctx.chat?.id);
      await safeAnswerCallbackQuery(ctx, "Сигнал подано.");
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося подати сигнал.");
    }
  });

  bot.callbackQuery(/^inventory:use:(berries|herbs|mushrooms|cooked_meat|herbal_tincture)$/, async (ctx) => {
    const resourceKey = ctx.match[1] as UsableInventoryResource;
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    await submitInventoryQueuedAction(bot, ctx, player, "USE_ITEM", { resourceKey }, "Не вдалося використати це.");
  });

  bot.callbackQuery(/^inventory:use-all:(berries|herbs|mushrooms|cooked_meat)$/, async (ctx) => {
    const resourceKey = ctx.match[1] as UsableInventoryResource;
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    await submitUseAllItems(bot, ctx, player, resourceKey);
  });

  bot.callbackQuery("inventory:cook:meat", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    await submitInventoryQueuedAction(bot, ctx, player, "COOK", {}, "Не вдалося підсмажити м'ясо.");
  });

  bot.callbackQuery("inventory:cook:all", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    await submitCookAllMeat(bot, ctx, player);
  });

  bot.callbackQuery("inventory:light:torch", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    await submitInventoryQueuedAction(bot, ctx, player, "LIGHT_TORCH", {}, "Не вдалося запалити факел.");
  });

  bot.callbackQuery("inventory:douse:torch", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    await submitInventoryQueuedAction(bot, ctx, player, "DOUSE_TORCH", {}, "Не вдалося притушити факел.");
  });

  bot.callbackQuery("inventory:add-twigs", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    await submitInventoryQueuedAction(bot, ctx, player, "ADD_TWIGS", {}, "Не вдалося підкинути хмиз.");
  });

  bot.callbackQuery(/^inventory:inspect:([A-Za-z0-9_-]+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      const text = await inspectInventoryResource(player.id, ctx.match[1]);
      const keyboard = await buildInventoryItemKeyboard(player.id, ctx.match[1]);
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося роздивитися це.");
    }
  });

  bot.callbackQuery(/^inventory:equip:([A-Za-z0-9_-]+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      const weapon = await equipPlayerWeapon(player.id, ctx.match[1]);
      const keyboard = await buildInventoryItemKeyboard(player.id, ctx.match[1]);
      await ctx.editMessageText(`Ви взяли в руку ${weapon.name}.`, { reply_markup: keyboard });
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося взяти це в руку.");
    }
  });

  bot.callbackQuery(/^inventory:unequip:([A-Za-z0-9_-]+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      const weapon = await unequipPlayerWeapon(player.id, ctx.match[1]);
      const keyboard = await buildInventoryItemKeyboard(player.id, ctx.match[1]);
      await ctx.editMessageText(weapon ? `Ви забрали з руки ${weapon.name}.` : "У руці вже немає зброї.", { reply_markup: keyboard });
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося звільнити руку.");
    }
  });

  bot.callbackQuery(/^inventory:drop:([A-Za-z0-9_-]+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    await safeAnswerCallbackQuery(ctx);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    await submitInventoryQueuedAction(bot, ctx, player, "DROP_ITEM", { target: ctx.match[1] }, "Не вдалося викинути це.");
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
    await safeAnswerCallbackQuery(ctx, "Поклик стих.");
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
    const arg = normalizeLookCommandTargetArg(String(ctx.match || "").trim());
    if (arg) {
      const player = await getPlayerByTelegramId(ctx.from.id);
      if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));

      const view = await renderLocationFeatureInteractionByQuery(player.currentLocationId, player.id, arg, "brief", "brief");
      if (view) {
        await rememberTutorialCommandHintIfInTutorial(player.id, "examine", player.currentLocationId);
        noteKnownMessage(await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard }));
        await sendFeatureFollowups((text, options) => ctx.reply(text, options), view);
        await sendVoiceComment((text, options) => ctx.reply(text, options), await tutorialActionHintComment(player, "look"));
        return;
      }
      await submitLookTarget(bot, ctx, player, arg);
      return;
    }
    await showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.hears(["👀 Озирнутися", "Озирнутися", "📍 Місцина"], async (ctx) => {
    if (!ctx.from) return;
    await showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
  });
}
