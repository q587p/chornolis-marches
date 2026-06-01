import { Bot, InlineKeyboard } from "grammy";
import type { Prisma, WorldActionType } from "@prisma/client";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import { normalizeChatLogMode, normalizeChatLogWindow } from "../services/chatLog";
import { parseAlias, normalizeInput, type QueueAliasMode, type RestAliasMode, type SocialSignalAlias, type TargetAction } from "../input/aliases";
import {
  accelerateFirstQueuedPlayerAction,
  actionDurationMs,
  cancelCurrentPlayerAction,
  clearQueuedPlayerActions,
  hasPlayerActionQueueControls,
  performOrQueuePlayerAction,
  playerRestStatusText,
  queuePlayerRest,
  renderPlayerActionQueue,
  startPlayerRest,
  stopPlayerRest,
} from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { resolveTarget, type ResolvedTarget } from "../services/targets";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { buildExamineLocationKeyboard, buildRestWithQueueChoiceKeyboard, buildStandUpKeyboard } from "../ui/keyboards";
import { buildInventoryItemKeyboard } from "../ui/inventoryItemKeyboard";
import { actionQueueReplyOptions, sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { durationSecondsSuffix } from "../utils/durationText";
import { escapeHtml, stripUnsafeText } from "../utils/text";
import { sendHelp } from "./help";
import { disablePlayerAuto, isPlayerAutoEnabled, requestOrEnablePlayerAuto } from "./auto";
import { showCharacter, showInventory, showLocationForPlayer } from "./player";
import { buildAllPage, buildChatLogPage, buildStatBrief, buildWhoPage } from "./status";
import { renderDepletedVegetationInspection, renderLocationBrief, renderLocationExits, renderLocationFeatureInteraction, renderLocationFeatureInteractionByQuery, renderLocationGlance, shakeTreeAtCurrentLocation } from "../services/locations";
import { buildNewsIndexPage } from "./news";
import { hideReplyKeyboard, showMainKeyboard, showMenu } from "./menu";
import { showTime, showWeather } from "./time";
import { submitMove as submitCanonicalMove } from "./movement";
import { submitGather as submitCanonicalGather } from "./gather";
import { submitPosture } from "./posture";
import { addCorpseToInventory, addVisibleCorpsesToInventory, resourceTypeDisplayName } from "../services/corpses";
import { performPlayerLocationSignal, performSocialSignal } from "../services/socialSignals";
import { requireScribeAdmin } from "../services/adminAccess";
import { playerCanShowTechnicalDetails } from "../services/technicalDetails";
import { pickUpAllVisibleGroundResources, pickUpAllVisibleGroundResourcesByKey, pickUpFirstGroundResourceByKey, pickUpFirstVisibleGroundResourceByKey, type VisibleGroundResourceKey } from "../services/groundItems";
import { parseSpeechTarget } from "../services/speechTargets";
import { inspectInventoryResource, inventoryResourceKeyFromText, type UsableInventoryResource } from "../services/inventoryUse";
import { openDreamGate, rememberTutorialCommandHintIfInTutorial } from "../services/tutorial";
import { requestTutorialEnd, submitSleepCommand, submitWakeCommand } from "./tutorial";
import { pickupObserverText, recordVisibleItemAction } from "../services/visibleItemActions";
import { notifyPlayerObservers, playerRestStartObserverText, playerRestStopObserverText } from "../services/playerVisibility";
import { noteKnownMessage } from "../utils/messageTracker";
import { playerForms } from "../services/grammar";
import { putInventoryIntoLocalFeature } from "../services/carcassDropoff";
import { latestRememberedReplyTarget } from "../services/replyTargets";
import { replyToActionError } from "../utils/actionErrorReply";
import { assertCanPerformPhysicalAction } from "../services/postureRules";
import { inventoryGainReplyOptions } from "../utils/tutorialInventory";
import { bestTargetMatch, inspectMissingText, isSelfTargetQuery, normalizeTargetKey, targetDisplayLabel, targetListText, visibleTextTargets } from "../services/textTargets";
import { spendPlayerStaminaAmount } from "../services/actionRecovery";
import { afkReplyOptions, endPlayerSession, SESSION_AFK_CONFIRMATION, SESSION_ENDED_CONFIRMATION, setPlayerAfk } from "../services/sessionPresence";
import { setDaypartNoticeSetting, showSettings } from "./settings";
import { beginnerReturnPromptText, beginnerReturnRefusalText, checkBeginnerReturnForPlayer, performBeginnerReturn } from "../services/beginnerReturn";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { formatVitalsSentence } from "../utils/playerText";
import {
  BEGINNER_CACHE_FEATURE_KEY,
  contributeToBeginnerCache,
  takeFromBeginnerCache,
} from "../services/beginnerCache";
import { equipPlayerWeapon, unequipPlayerWeapon } from "../services/weapons";
import { queueAllRawMeatCooking } from "../services/cookingQueue";
import { queueAllUsableInventoryResource } from "../services/eatingQueue";

function quoteBlock(text: string) {
  return `<blockquote>${escapeHtml(text)}</blockquote>`;
}

async function sendFeatureFollowups(ctx: any, view: any) {
  for (const message of view.quoteMessages ?? []) {
    noteKnownMessage(await ctx.reply(`${escapeHtml(message.title)}:\n${quoteBlock(message.text)}`, { parse_mode: "HTML" }));
  }
  for (const message of view.followupMessages ?? []) {
    noteKnownMessage(await ctx.reply(message.text, { parse_mode: "HTML" }));
  }
}

async function replyWithNews(ctx: any) {
  const page = await buildNewsIndexPage(0);
  await ctx.reply(page.text, page.keyboard ? { reply_markup: page.keyboard } : undefined);
}

async function replyWithStat(ctx: any) {
  if (!(await requireScribeAdmin(ctx))) return;
  const stat = await buildStatBrief();
  await ctx.reply(stat.text, { reply_markup: stat.keyboard });
}

async function replyWithWho(ctx: any) {
  const page = await buildWhoPage(0);
  await ctx.reply(page.text, page.keyboard ? { reply_markup: page.keyboard } : undefined);
}

async function replyWithChat(ctx: any, mode?: string, window?: string) {
  const page = await buildChatLogPage(normalizeChatLogMode(mode), normalizeChatLogWindow(window), 0);
  await ctx.reply(page.text, { reply_markup: page.keyboard });
}

async function replyWithLocationGlance(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const view = await renderLocationGlance(player.currentLocationId);
  await ctx.reply(view.text, { parse_mode: "HTML" });
}

async function replyWithLocationExits(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const view = await renderLocationExits(player.currentLocationId);
  await ctx.reply(view.text, { parse_mode: "HTML" });
}

async function replyWithVegetationInspection(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const view = await renderDepletedVegetationInspection(player.currentLocationId, player.id);
  if (!view) return void (await ctx.reply("Тут не видно винищеної трави, яку можна оцінити."));
  await ctx.reply(view.text, { reply_markup: view.keyboard });
}

async function replyWithBorderMarkerInspection(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const feature = await prisma.locationFeature.findFirst({
    where: { locationId: player.currentLocationId, isActive: true, type: "BORDER_MARKER" },
    orderBy: { id: "asc" },
  });
  if (!feature) return void (await ctx.reply("Тут не видно межового знака, який можна роздивитися."));

  const view = await renderLocationFeatureInteraction(feature.id, player.id);
  if (!view) return void (await ctx.reply("Тут не видно межового знака, який можна роздивитися."));
  noteKnownMessage(await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard }));
  await sendFeatureFollowups(ctx, view);
}

async function localBeginnerCacheFeature(player: { currentLocationId: number | null }) {
  if (!player.currentLocationId) return null;
  return prisma.locationFeature.findFirst({
    where: {
      locationId: player.currentLocationId,
      isActive: true,
      key: BEGINNER_CACHE_FEATURE_KEY,
    },
    orderBy: { id: "asc" },
  });
}

async function replyWithBeginnerCache(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const feature = await localBeginnerCacheFeature(player);
  if (!feature) return void (await ctx.reply("Поруч немає спільної скрині, яку можна роздивитися."));

  const view = await renderLocationFeatureInteraction(feature.id, player.id);
  if (!view) return void (await ctx.reply("Поруч немає спільної скрині, яку можна роздивитися."));
  noteKnownMessage(await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard }));
  await sendFeatureFollowups(ctx, view);
}

async function submitBeginnerCacheTake(bot: Bot, ctx: any, item?: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    assertCanPerformPhysicalAction(player, "PICK_UP");
    const feature = await localBeginnerCacheFeature(player);
    if (!feature) throw new Error("Поруч немає спільної скрині.");
    const result = await takeFromBeginnerCache(player.id, feature.id, item);
    await spendPlayerStaminaAmount(bot, player.id, 1, ctx.chat?.id);
    await ctx.reply(result.text, await inventoryGainReplyOptions(player, `cache:${result.key}`));
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося взяти річ зі скрині.");
  }
}

async function submitBeginnerCacheContribute(bot: Bot, ctx: any, item?: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    assertCanPerformPhysicalAction(player, "PICK_UP");
    const feature = await localBeginnerCacheFeature(player);
    if (!feature) throw new Error("Поруч немає спільної скрині.");
    const result = await contributeToBeginnerCache(player.id, feature.id, item);
    await spendPlayerStaminaAmount(bot, player.id, 1, ctx.chat?.id);
    await ctx.reply(result.text);
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося лишити річ у скрині.");
  }
}

async function submitFeatureInspection(bot: Bot, ctx: any, targetQuery: string, detail: "brief" | "full" = "full") {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  if (isSelfTargetQuery(targetQuery)) return showCharacter(ctx.from.id, (text, options) => ctx.reply(text, options));

  const returnMode = detail === "brief" ? "brief" : "details";
  const view = await renderLocationFeatureInteractionByQuery(player.currentLocationId, player.id, targetQuery, returnMode, detail);
  if (!view) return submitTargetAction(bot, ctx, "inspect", targetQuery, detail);

  await rememberTutorialCommandHintIfInTutorial(player.id, "examine", player.currentLocationId);
  noteKnownMessage(await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard }));
  await sendFeatureFollowups(ctx, view);
}

async function replyWithAll(ctx: any, showDead?: boolean) {
  if (!(await requireScribeAdmin(ctx))) return;
  const page = await buildAllPage(Boolean(showDead), 0);
  await ctx.reply(page.text, { reply_markup: page.keyboard });
}

async function submitLookAction(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const durationMs = actionDurationMs("LOOK", player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "LOOK", payload: {}, durationMs, chatId: ctx.chat?.id });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося виконати дію.");
  }
}

async function beginRestNow(bot: Bot, ctx: any, playerId: number) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  const hadQueue = await hasPlayerActionQueueControls(playerId);
  await startPlayerRest(playerId);
  const suffix = hadQueue ? "\n\nПоточну дію та чергу скасовано." : "";
  await ctx.reply(`${await playerRestStatusText(playerId)}${suffix}`, {
    reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
  });
  if (player && !player.isResting) {
    await notifyPlayerObservers(bot, {
      playerId,
      locationId: player.currentLocationId,
      observerText: playerRestStartObserverText,
    });
  }
}

async function submitRest(bot: Bot, ctx: any, mode: RestAliasMode = "start") {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  if (mode === "queue") {
    await queuePlayerRest(player.id, ctx.chat?.id);
    await ctx.reply(await renderPlayerActionQueue(player.id), await actionQueueReplyOptions(player.id));
    return;
  }

  if (mode === "interrupt") {
    await stopPlayerRest(player.id);
    if (player.isResting) {
      await notifyPlayerObservers(bot, {
        playerId: player.id,
        locationId: player.currentLocationId,
        observerText: playerRestStopObserverText,
      });
    }
    const accelerated = await accelerateFirstQueuedPlayerAction(player.id);
    await ctx.reply(`Ви перервали відпочинок.${accelerated ? "\n\nНаступна дія починається." : ""}\n\n${await renderPlayerActionQueue(player.id)}`, await actionQueueReplyOptions(player.id));
    await ctx.reply("Ви лишаєтеся сидіти.", {
      reply_markup: buildStandUpKeyboard(),
    });
    return;
  }

  const staminaMax = player.staminaMax ?? BASE_STAMINA;
  const hpMax = player.hpMax ?? BASE_HP;
  if (player.stamina >= staminaMax && player.hp >= hpMax && !player.isResting) {
    await ctx.reply(`Ви вже відпочили й готові до дій. ${formatVitalsSentence(player, { showTechnicalDetails: playerCanShowTechnicalDetails(player), hpFallback: BASE_HP, staminaFallback: BASE_STAMINA })}`);
    return;
  }

  if (player.hp > 0 && await hasPlayerActionQueueControls(player.id)) {
    await ctx.reply("У вас зараз є черга дій. Почати відпочинок зараз і скасувати її, чи додати відпочинок у кінець черги?", {
      reply_markup: buildRestWithQueueChoiceKeyboard(),
    });
    return;
  }

  await beginRestNow(bot, ctx, player.id);
}

async function submitAuto(bot: Bot, ctx: any, mode: "start" | "stop") {
  if (mode === "start") {
    await requestOrEnablePlayerAuto(bot, ctx);
    return;
  }

  const stopped = await disablePlayerAuto(ctx.from.id);
  await ctx.reply(stopped ? "Авто-режим зупинено." : "Авто-режим не був увімкнений.", {
    reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
  });
}

async function showQueue(ctx: any, playerId: number, prefix?: string) {
  const text = `${prefix ? `${prefix}\n\n` : ""}${await renderPlayerActionQueue(playerId)}`;
  await ctx.reply(text, await actionQueueReplyOptions(playerId));
}

async function submitQueue(ctx: any, mode: QueueAliasMode) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  if (mode === "clear") {
    const result = await clearQueuedPlayerActions(player.id);
    await showQueue(ctx, player.id, `Прибрано з черги: ${result.count}.`);
    return;
  }

  if (mode === "cancel-current") {
    const result = await cancelCurrentPlayerAction(player.id);
    await showQueue(ctx, player.id, `Скасовано поточних дій/відпочинку: ${result.count}.`);
    return;
  }

  await showQueue(ctx, player.id);
}

async function submitTrack(bot: Bot, ctx: any, detail = false) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const durationMs = actionDurationMs("TRACK", player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "TRACK", payload: { detail }, durationMs, chatId: ctx.chat?.id, interruptQueued: true });
    await ctx.reply(result.mode === "immediate" ? "Ви вдивляєтесь у сліди." : `Вистежування додано в чергу${durationSecondsSuffix(player, durationMs)}.`);
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося додати дію.");
  }
}

async function submitShakeTree(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    assertCanPerformPhysicalAction(player, "GATHER");
    await ctx.reply(await shakeTreeAtCurrentLocation(player.id), {
      reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
    });
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося потрусити дерево.");
  }
}

async function submitWait(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const durationMs = actionDurationMs("WAIT", player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "WAIT", payload: {}, durationMs, chatId: ctx.chat?.id });
    await ctx.reply(result.mode === "immediate" ? "Ви чекаєте." : `Очікування додано в чергу${durationSecondsSuffix(player, durationMs)}.`);
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося додати дію.");
  }
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

async function submitUseItem(bot: Bot, ctx: any, item: UsableInventoryResource) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  await submitInventoryQueuedAction(bot, ctx, player, "USE_ITEM", { resourceKey: item }, "Не вдалося використати це.");
}

async function submitUseAllItems(bot: Bot, ctx: any, item: UsableInventoryResource) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    const result = await queueAllUsableInventoryResource(bot, player, item, ctx.chat?.id);
    const queueText = await renderPlayerActionQueue(player.id);
    await ctx.reply(
      `Додано вживання запасу: ${result.count}. Будете їсти по черзі${durationSecondsSuffix(player, result.durationMs)}.\n\n${queueText}`,
      await actionQueueReplyOptions(player.id),
    );
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося додати все в чергу.");
  }
}

async function submitLightTorch(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  await submitInventoryQueuedAction(bot, ctx, player, "LIGHT_TORCH", {}, "Не вдалося запалити факел.");
}

async function submitDouseTorch(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  await submitInventoryQueuedAction(bot, ctx, player, "DOUSE_TORCH", {}, "Не вдалося притушити факел.");
}

async function submitCookMeat(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  await submitInventoryQueuedAction(bot, ctx, player, "COOK", {}, "Не вдалося підсмажити м'ясо.");
}

async function submitCookAllMeat(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

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

async function replyWithInventoryInspection(ctx: any, playerId: number, target: string) {
  const text = await inspectInventoryResource(playerId, target);
  const resourceKey = inventoryResourceKeyFromText(target);
  const keyboard = await buildInventoryItemKeyboard(playerId, resourceKey);
  await ctx.reply(text, { reply_markup: keyboard });
}

async function tryReplyWithInventoryInspection(ctx: any, playerId: number, target: string) {
  try {
    await replyWithInventoryInspection(ctx, playerId, target);
    return true;
  } catch {
    return false;
  }
}

async function submitInventoryInspect(ctx: any, target: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    await replyWithInventoryInspection(ctx, player.id, target);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося роздивитися це.");
  }
}

async function submitInventoryDrop(bot: Bot, ctx: any, target: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const allFilter = allTargetFilter(target);
  const payload = allFilter !== null ? { allFilter } : { target };
  await submitInventoryQueuedAction(bot, ctx, player, "DROP_ITEM", payload, "Не вдалося викинути це.");
}

async function submitInventoryEquip(ctx: any, target: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    const resourceKey = inventoryResourceKeyFromText(target);
    const weapon = await equipPlayerWeapon(player.id, resourceKey);
    const keyboard = await buildInventoryItemKeyboard(player.id, resourceKey);
    await ctx.reply(`Ви взяли в руку ${weapon.name}.`, { reply_markup: keyboard });
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося взяти це в руку.");
  }
}

async function submitInventoryUnequip(ctx: any, target?: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    const resourceKey = target ? inventoryResourceKeyFromText(target) : undefined;
    const weapon = await unequipPlayerWeapon(player.id, resourceKey);
    await ctx.reply(weapon ? `Ви забрали з руки ${weapon.name}.` : "У руці вже немає зброї.");
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося звільнити руку.");
  }
}

async function submitPutItem(bot: Bot, ctx: any, item: string, amount: number | "all" | undefined, container: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    assertCanPerformPhysicalAction(player, "PUT");
    const result = await putInventoryIntoLocalFeature({
      playerId: player.id,
      itemQuery: item,
      amount,
      containerQuery: container,
    });
    await recordVisibleItemAction(bot, {
      playerId: player.id,
      locationId: result.locationId,
      observerText: `${playerForms(player).nominative} складає здобич до падального рову біля воріт.`,
      eventTitle: "Player contributed carcass",
      eventDescription: `player=${player.id}; dropoff=${result.featureKey}; amount=${result.amount}; total=${result.contributionTotal}`,
      actionNote: `покладено здобич до падального рову: ${result.amount}`,
    });
    await ctx.reply(result.text);
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося покласти це.");
  }
}

async function submitSay(bot: Bot, ctx: any, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text).slice(0, 300);
  if (!safeText) return void (await ctx.reply("Напиши так: сказати текст"));

  const durationMs = actionDurationMs("SAY", player.stamina);
  try {
    const payload = await parseSpeechTarget(safeText, player.currentLocationId, player.id);
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "SAY", payload, durationMs, chatId: ctx.chat?.id });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося виконати дію.");
  }
}

async function submitWhisper(bot: Bot, ctx: any, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text);
  if (!safeText) return void (await ctx.reply("Напиши так: whisper персонаж текст"));

  const durationMs = actionDurationMs("SAY", player.stamina);
  try {
    const payload = await parseSpeechTarget(safeText, player.currentLocationId, player.id);
    if (!payload.targetId) return void (await ctx.reply("Напиши так: whisper персонаж текст. Ціль має бути видимим персонажем або істотою поруч."));
    if (payload.targetType !== "player" && payload.targetType !== "creature") return void (await ctx.reply("Шепіт зараз можна спрямувати тільки комусь видимому поруч."));
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "SAY", payload: { ...payload, mode: "whisper" }, durationMs, chatId: ctx.chat?.id });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося прошепотіти.");
  }
}

const REPLY_SPEECH_SPLITTERS = [
  /\s+сказав\b/u,
  /\s+сказала\b/u,
  /\s+сказали\b/u,
  /\s+відповів\b/u,
  /\s+відповіла\b/u,
  /\s+відповіли\b/u,
];

function speechSpeakerFromTitle(title: string) {
  for (const splitter of REPLY_SPEECH_SPLITTERS) {
    const match = title.match(splitter);
    if (match?.index && match.index > 0) return title.slice(0, match.index).trim();
  }
  return "";
}

async function lastAddressedSpeakerName(player: any) {
  const forms = playerForms(player);
  const selfKeys = [forms.nominative, forms.dative, player.firstName, player.username].filter(Boolean).map((value) => normalizeInput(String(value)));
  const remembered = await latestRememberedReplyTarget(player.id);
  if (remembered && !selfKeys.includes(normalizeInput(remembered.speakerName))) return remembered;

  const addressedForms = [forms.dative, forms.nominative, player.firstName].filter(Boolean);
  const events = await prisma.worldEvent.findMany({
    where: {
      type: "SAY",
      locationId: player.currentLocationId,
      OR: addressedForms.map((form) => ({ title: { contains: String(form) } })),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 10,
  });

  for (const event of events) {
    const speaker = speechSpeakerFromTitle(event.title);
    if (!speaker) continue;
    if (selfKeys.includes(normalizeInput(speaker))) continue;
    return { speakerName: speaker };
  }
  return null;
}

async function submitReply(bot: Bot, ctx: any, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text);
  if (!safeText) return void (await ctx.reply("Напиши так: reply текст"));

  const target = await lastAddressedSpeakerName(player);
  if (!target) return void (await ctx.reply("Поки немає репліки, на яку можна відповісти. Спробуйте звичайне /say або зверніться до видимого персонажа."));

  const durationMs = actionDurationMs("SAY", player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type: "SAY",
      payload: {
        text: safeText,
        mode: "reply",
        targetName: target.speakerName,
        targetDative: target.speakerDative,
        ...(target.speakerPlayerId ? { targetType: "player", targetId: target.speakerPlayerId } : {}),
        ...(target.speakerCreatureId ? { targetType: "creature", targetId: target.speakerCreatureId } : {}),
      },
      durationMs,
      chatId: ctx.chat?.id,
    });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося відповісти.");
  }
}

async function submitShout(bot: Bot, ctx: any, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text);
  if (!safeText) return void (await ctx.reply("Напиши так: shout текст"));

  const durationMs = actionDurationMs("SAY", player.stamina) * 2;
  try {
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "SAY", payload: { text: safeText, mode: "shout" }, durationMs, chatId: ctx.chat?.id });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося гукнути.");
  }
}

function validateTargetAction(action: TargetAction, target: ResolvedTarget) {
  if (action === "greet" && !target.canGreet) return "Ця ціль не відповість на привітання.";
  if (action === "attack" && !target.canAttack) {
    if (target.isCorpse) return "Це вже труп.";
    if (target.kind === "player" || !target.isAnimal || !target.canAttack) return "Бій із хижаками й іншими персонажами ще не реалізований.";
    return "Цю ціль зараз не можна затоптати.";
  }
  if (action === "freshen" && (!target.isCorpse || !target.canFreshen)) return "Труп уже не підходить.";
  return null;
}

async function submitTargetAction(bot: Bot, ctx: any, action: TargetAction, targetQuery: string, detail: "brief" | "full" = "full") {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  if (action === "inspect" && isSelfTargetQuery(targetQuery)) return showCharacter(ctx.from.id, (text, options) => ctx.reply(text, options));

  const locationId = player.currentLocationId;
  if (action === "freshen" && isAllTarget(targetQuery)) return submitFreshenAll(bot, ctx, player, locationId);

  const visibleTargets = await visibleTextTargets(locationId, player.id);
  if (!visibleTargets.length) {
    if (action === "inspect" && (await tryReplyWithInventoryInspection(ctx, player.id, targetQuery))) return;
    return void (await ctx.reply(action === "inspect" ? inspectMissingText(targetQuery) : "Поруч немає видимих цілей."));
  }

  const match = bestTargetMatch(targetQuery, visibleTargets);
  if (match.kind === "none") {
    if (action === "inspect" && (await tryReplyWithInventoryInspection(ctx, player.id, targetQuery))) return;
    await ctx.reply(action === "inspect"
      ? inspectMissingText(targetQuery, visibleTargets)
      : `Не бачу такої цілі поруч. Видимі цілі:\n${targetListText(visibleTargets)}`);
    return;
  }

  if (match.kind === "many") {
    const keyboard = new InlineKeyboard();
    match.targets.forEach((target, index) => keyboard.text(`${index + 1}. ${targetDisplayLabel(target)}`, `target:${target.type}:${target.id}`).row());
    await ctx.reply(action === "inspect"
      ? `Знайшов кілька схожих істот чи постатей. Уточни назвою або номером.\n\nПоруч можна роздивитися:\n${targetListText(visibleTargets)}`
      : `Знайшов кілька схожих цілей. Уточни назвою або номером із повного списку поруч.\n\nВидимі цілі:\n${targetListText(visibleTargets)}`, { reply_markup: keyboard });
    return;
  }

  const target = await resolveTarget(match.target.type, match.target.id, locationId);
  if (!target) {
    return void (await ctx.reply(action === "inspect" ? "Цього вже немає поруч. Можна роздивитися місцину ще раз." : "Цілі вже немає поруч. Можна роздивитися місцину ще раз.", { reply_markup: buildExamineLocationKeyboard() }));
  }

  const validationError = validateTargetAction(action, target);
  if (validationError) return void (await ctx.reply(validationError));

  const typeMap = { greet: "GREET", inspect: "INSPECT", attack: "ATTACK", freshen: "FRESHEN" } as const;
  const durationMs = actionDurationMs(typeMap[action], player.stamina);

  try {
    const result = await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type: typeMap[action],
      payload: { targetType: match.target.type, targetId: match.target.id, mode: "known", detail },
      durationMs,
      chatId: ctx.chat?.id,
      interruptCurrent: action === "attack",
      interruptQueued: action === "attack",
    });
    await ctx.reply(result.mode === "immediate" ? "Дію виконано." : `Дію додано в чергу${durationSecondsSuffix(player, durationMs)}.`);
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося додати дію.");
  }
}

async function resolveVisibleTargetForAlias(ctx: any, targetQuery: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return null;
  }

  const locationId = player.currentLocationId;
  const visibleTargets = await visibleTextTargets(locationId, player.id);
  if (!visibleTargets.length) {
    await ctx.reply("Поруч немає видимих цілей.");
    return null;
  }

  const match = bestTargetMatch(targetQuery, visibleTargets);
  if (match.kind === "none") {
    await ctx.reply(`Не бачу такої цілі поруч. Видимі цілі:\n${targetListText(visibleTargets)}`);
    return null;
  }

  if (match.kind === "many") {
    await ctx.reply(`Знайшов кілька схожих цілей. Уточни назвою або номером.\n\nВидимі цілі:\n${targetListText(visibleTargets)}`);
    return null;
  }

  const target = await resolveTarget(match.target.type, match.target.id, locationId);
  if (!target) {
    await ctx.reply("Цілі вже немає поруч. Можна роздивитися місцину ще раз.", { reply_markup: buildExamineLocationKeyboard() });
    return null;
  }

  return { player, locationId, targetRef: match.target, target };
}

function pickupResourceKey(target: string): VisibleGroundResourceKey | null {
  if (["torch", "torches", "факел", "факели", "факела", "факелів"].includes(target)) return "torch";
  if (["lit torch", "lit_torch", "burning torch", "запалений факел", "палаючий факел"].includes(target)) return "lit_torch";
  if (["twigs", "twig", "хмиз"].includes(target)) return "twigs";
  if (["raw meat", "raw_meat", "сире м'ясо", "сире м’ясо", "м'ясо", "м’ясо"].includes(target)) return "raw_meat";
  if (["cooked meat", "cooked_meat", "смажене м'ясо", "смажене м’ясо"].includes(target)) return "cooked_meat";
  if (["berries", "berry", "ягоди", "ягід"].includes(target)) return "berries";
  if (["mushrooms", "mushroom", "гриби", "грибів"].includes(target)) return "mushrooms";
  if (["herbs", "herb", "трави", "трав", "лікарські трави", "лікарських трав", "зілля", "зіллячко"].includes(target)) return "herbs";
  return null;
}

function naturalResourcePickupHint(key: VisibleGroundResourceKey) {
  if (key === "berries") return "Ягоди тут не лежать окремо. Якщо вони ростуть у цій місцині, їх можна зібрати: напишіть «зібрати ягоди».";
  if (key === "mushrooms") return "Гриби тут не лежать окремо. Якщо вони ростуть у цій місцині, їх можна зібрати: напишіть «зібрати гриби».";
  if (key === "herbs") return "Лікарські трави тут не лежать окремо. Якщо вони ростуть у цій місцині, їх можна зібрати: напишіть «зібрати трави».";
  return null;
}

function isPickupAllTarget(target: string) {
  return ["all", "everything", "все", "усе", "всі", "усі"].includes(target);
}

function allTargetFilter(target: string) {
  const normalized = normalizeTargetKey(target);
  if (isPickupAllTarget(normalized)) return "";

  const prefix = normalized.match(/^(?:all|everything|все|усе|всі|усі)\s+(.+)$/u);
  if (prefix?.[1]?.trim()) return prefix[1].trim();

  const suffix = normalized.match(/^(.+?)\s+(?:all|everything|все|усе|всі|усі)$/u);
  if (suffix?.[1]?.trim()) return suffix[1].trim();

  return null;
}

function isAllTarget(target: string) {
  return isPickupAllTarget(normalizeTargetKey(target));
}

function pickedItemsText(items: Array<{ name: string; amount: number }>) {
  return items.map((item) => `${item.name}${item.amount > 1 ? ` ×${item.amount}` : ""}`).join(", ");
}

function pickedItemsAmount(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + Math.max(0, item.amount), 0);
}

async function submitFreshenAll(bot: Bot, ctx: any, player: NonNullable<Awaited<ReturnType<typeof getPlayerByTelegramId>>>, locationId: number) {
  try {
    assertCanPerformPhysicalAction(player, "FRESHEN");
    const visibleTargets = await visibleTextTargets(locationId, player.id);
    const freshenable: Array<{ type: "creature"; id: number }> = [];

    for (const target of visibleTargets) {
      if (target.type !== "creature") continue;
      const resolved = await resolveTarget(target.type, target.id, locationId);
      if (resolved?.isCorpse && resolved.canFreshen) freshenable.push({ type: target.type, id: target.id });
    }

    if (!freshenable.length) {
      await ctx.reply("Поруч немає придатних туш, які можна освіжувати.");
      return;
    }

    const durationMs = actionDurationMs("FRESHEN", player.stamina);
    for (const target of freshenable) {
      await performOrQueuePlayerAction(bot, {
        playerId: player.id,
        type: "FRESHEN",
        payload: { targetType: target.type, targetId: target.id, mode: "known" },
        durationMs,
        chatId: ctx.chat?.id,
      });
    }

    const queueText = await renderPlayerActionQueue(player.id);
    await ctx.reply(`Додано свіжування туш: ${freshenable.length}. Будете обробляти їх по черзі${durationSecondsSuffix(player, durationMs)}.\n\n${queueText}`, await actionQueueReplyOptions(player.id));
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося додати свіжування.");
  }
}

async function submitPickupTarget(bot: Bot, ctx: any, targetQuery: string) {
  const normalizedTarget = normalizeTargetKey(targetQuery);
  const allFilter = allTargetFilter(normalizedTarget);
  if (allFilter !== null) {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      const picked: Array<{ key: string; name: string; amount: number }> = [];
      let locationId = player.currentLocationId ?? 0;
      const filterResourceKey = allFilter ? pickupResourceKey(allFilter) : null;

      if (filterResourceKey) {
        const result = await pickUpAllVisibleGroundResourcesByKey(player.id, filterResourceKey);
        picked.push(...result.items);
        locationId = result.locationId;
      } else if (allFilter) {
        const result = await addVisibleCorpsesToInventory(player.id, allFilter);
        picked.push(...result.items);
        locationId = result.locationId;
      } else {
        try {
          const result = await pickUpAllVisibleGroundResources(player.id);
          picked.push(...result.items);
          locationId = result.locationId;
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("Поруч немає")) throw error;
        }
        try {
          const result = await addVisibleCorpsesToInventory(player.id);
          picked.push(...result.items);
          locationId = result.locationId;
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("Поруч немає")) throw error;
        }
      }

      if (!picked.length) throw new Error("Поруч немає речей, які можна підняти.");
      const text = pickedItemsText(picked);
      const pickedAmount = pickedItemsAmount(picked);
      await recordVisibleItemAction(bot, {
        playerId: player.id,
        locationId,
        observerText: pickupObserverText(player, `кілька речей: ${text}`),
        eventTitle: "Player picked up all visible ground items",
        eventDescription: `player=${player.id}; items=${picked.map((item) => `${item.key}:${item.amount}`).join(",")}`,
        actionNote: `піднято все: ${text}`,
      });
      await spendPlayerStaminaAmount(bot, player.id, pickedAmount, ctx.chat?.id);
      await ctx.reply(`Ви підняли: ${text}.`, await inventoryGainReplyOptions(player, "pickup-all"));
    } catch (error) {
      await replyToActionError(ctx, error, "Не вдалося підняти це.");
    }
    return;
  }

  const resourceKey = pickupResourceKey(normalizedTarget);
  if (resourceKey) {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      const item = resourceKey === "berries" || resourceKey === "mushrooms" || resourceKey === "herbs"
        ? await pickUpFirstVisibleGroundResourceByKey(player.id, resourceKey)
        : await pickUpFirstGroundResourceByKey(player.id, resourceKey);
      await recordVisibleItemAction(bot, {
        playerId: player.id,
        locationId: item.locationId,
        observerText: pickupObserverText(player, item.name),
        eventTitle: "Player picked up item",
        eventDescription: `player=${player.id}; item=${item.key}; name=${item.name}`,
        actionNote: `піднято: ${item.name}`,
      });
      await spendPlayerStaminaAmount(bot, player.id, 1, ctx.chat?.id);
      await ctx.reply(`Ви підняли ${item.name}.`, await inventoryGainReplyOptions(player, `pickup:${item.key}`));
    } catch (error) {
      const hint = naturalResourcePickupHint(resourceKey);
      const message = error instanceof Error ? error.message : "Не вдалося підняти це.";
      if (hint && message === "Цього вже немає поруч.") await ctx.reply(hint);
      else await replyToActionError(ctx, error, "Не вдалося підняти це.");
    }
    return;
  }

  const resolved = await resolveVisibleTargetForAlias(ctx, targetQuery);
  if (!resolved) return;

  const { target } = resolved;
  if (target.kind !== "creature" || !target.isCorpse) return void (await ctx.reply("Підібрати зараз можна тільки видимий труп поруч."));

  const creature = await prisma.creature.findFirst({
    where: {
      id: target.id,
      locationId: resolved.locationId,
      isAlive: false,
      isGone: false,
      isHidden: false,
      age: "CORPSE",
    },
    include: { species: true },
  });
  if (!creature) return void (await ctx.reply("Трупа вже немає поруч. Можна роздивитися місцину ще раз.", { reply_markup: buildExamineLocationKeyboard() }));

  try {
    assertCanPerformPhysicalAction(resolved.player, "PICK_UP");
    const resourceType = await addCorpseToInventory(resolved.player.id, { ...creature, species: creature.species });
    const itemName = resourceTypeDisplayName(resourceType);
    await recordVisibleItemAction(bot, {
      playerId: resolved.player.id,
      locationId: resolved.locationId,
      observerText: pickupObserverText(resolved.player, itemName),
      eventTitle: "Player picked up corpse",
      eventDescription: `player=${resolved.player.id}; creature=${creature.id}; item=${resourceType.key}; name=${itemName}`,
      actionNote: `піднято: ${itemName}`,
    });
    await spendPlayerStaminaAmount(bot, resolved.player.id, 1, ctx.chat?.id);
    await ctx.reply(`Ви підібрали ${itemName}.`, await inventoryGainReplyOptions(resolved.player, `pickup:${resourceType.key}`));
  } catch (error) {
    await replyToActionError(ctx, error, "Трупа вже немає поруч. Можна роздивитися місцину ще раз.");
  }
}

async function submitSocialSignal(bot: Bot, ctx: any, signal: SocialSignalAlias, targetQuery?: string) {
  if (!targetQuery) {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    try {
      await performPlayerLocationSignal(bot, player, signal, ctx.chat?.id);
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося подати сигнал.");
    }
    return;
  }

  const resolved = await resolveVisibleTargetForAlias(ctx, targetQuery);
  if (!resolved) return;
  if (resolved.target.isCorpse) return void (await ctx.reply("Ця ціль не відповість на сигнал."));

  try {
    await performSocialSignal(bot, resolved.player, resolved.target, signal, ctx.chat?.id);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося подати сигнал.");
  }
}

async function submitSleep(bot: Bot, ctx: any, tutorial = false) {
  return submitSleepCommand(bot, ctx, tutorial);
}

async function submitWake(bot: Bot, ctx: any) {
  return submitWakeCommand(bot, ctx);
}

async function submitSessionPresence(ctx: any, mode: "afk" | "end") {
  if (!ctx.from?.id) return;
  try {
    if (mode === "afk") {
      await setPlayerAfk(ctx.from.id);
      await ctx.reply(SESSION_AFK_CONFIRMATION, await afkReplyOptions(ctx.from.id));
      return;
    }
    await endPlayerSession(ctx.from.id);
    await ctx.reply(SESSION_ENDED_CONFIRMATION, { reply_markup: { remove_keyboard: true } });
  } catch {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
  }
}

function buildBeginnerReturnConfirmKeyboard() {
  return new InlineKeyboard()
    .text("🧭 Повернутися до табору", "respawn:confirm")
    .row()
    .text("↩️ Лишитися тут", "respawn:cancel");
}

async function requestBeginnerReturn(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const checked = await checkBeginnerReturnForPlayer(player.id);
  if (!checked) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  if (!checked.eligibility.ok) {
    await ctx.reply(beginnerReturnRefusalText(checked.eligibility), {
      reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
    });
    return;
  }

  await ctx.reply(beginnerReturnPromptText(), {
    reply_markup: buildBeginnerReturnConfirmKeyboard(),
  });
}

async function confirmBeginnerReturn(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  await safeAnswerCallbackQuery(ctx);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const result = await performBeginnerReturn(player.id);
  if (!result) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  if (!result.moved) {
    await ctx.reply(beginnerReturnRefusalText(result.eligibility), {
      reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
    });
    return;
  }

  await ctx.reply(result.text, {
    reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
  });
  await showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
}

async function submitOpen(ctx: any, target?: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  await ctx.reply(await openDreamGate(player.id, target), { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
}

export function registerAliasHandlers(bot: Bot) {
  bot.command("shout", async (ctx) => submitShout(bot, ctx, ctx.match ?? ""));

  bot.on("message:text", async (ctx, next) => {
    if (!ctx.from || !ctx.message?.text) return next();

    const parsed = parseAlias(ctx.message.text);
    if (!parsed) return next();

    if (parsed.kind === "location") return showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
    if (parsed.kind === "glance") return replyWithLocationGlance(ctx);
    if (parsed.kind === "exits") return replyWithLocationExits(ctx);
    if (parsed.kind === "look-action") return submitLookAction(bot, ctx);
    if (parsed.kind === "me") return showCharacter(ctx.from.id, (text, options) => ctx.reply(text, options));
    if (parsed.kind === "inventory") return showInventory(ctx.from.id, (text, options) => ctx.reply(text, options));
    if (parsed.kind === "help") return sendHelp(ctx);
    if (parsed.kind === "news") return replyWithNews(ctx);
    if (parsed.kind === "stat") return replyWithStat(ctx);
    if (parsed.kind === "who") return replyWithWho(ctx);
    if (parsed.kind === "chat") return replyWithChat(ctx, parsed.mode, parsed.window);
    if (parsed.kind === "all") return replyWithAll(ctx, parsed.showDead);
    if (parsed.kind === "time") return showTime(ctx);
    if (parsed.kind === "weather") return showWeather(ctx);
    if (parsed.kind === "menu") return showMenu(ctx);
    if (parsed.kind === "settings") return showSettings(ctx);
    if (parsed.kind === "daypart-notices") {
      if (parsed.mode === "on") return setDaypartNoticeSetting(ctx, true);
      if (parsed.mode === "off") return setDaypartNoticeSetting(ctx, false);
      return showSettings(ctx);
    }
    if (parsed.kind === "session-presence") return submitSessionPresence(ctx, parsed.mode);
    if (parsed.kind === "beginner-return") return requestBeginnerReturn(ctx);
    if (parsed.kind === "tutorial-end") return requestTutorialEnd(ctx);
    if (parsed.kind === "back") return showMainKeyboard(ctx);
    if (parsed.kind === "hide-keyboard") return hideReplyKeyboard(ctx);
    if (parsed.kind === "inspect-vegetation") return replyWithVegetationInspection(ctx);
    if (parsed.kind === "inspect-border-marker") return replyWithBorderMarkerInspection(ctx);
    if (parsed.kind === "inspect-feature") return submitFeatureInspection(bot, ctx, parsed.target, parsed.detail ?? "full");
    if (parsed.kind === "beginner-cache") {
      if (parsed.action === "take") return submitBeginnerCacheTake(bot, ctx, parsed.item);
      if (parsed.action === "contribute") return submitBeginnerCacheContribute(bot, ctx, parsed.item);
      return replyWithBeginnerCache(ctx);
    }
    if (parsed.kind === "move") return submitCanonicalMove(bot, ctx, parsed.direction, false);
    if (parsed.kind === "gather") return submitCanonicalGather(bot, ctx, parsed.resourceKey, false);
    if (parsed.kind === "posture") return submitPosture(bot, ctx, parsed.mode);
    if (parsed.kind === "rest") return submitRest(bot, ctx, parsed.mode);
    if (parsed.kind === "auto") return submitAuto(bot, ctx, parsed.mode);
    if (parsed.kind === "queue") return submitQueue(ctx, parsed.mode);
    if (parsed.kind === "track") return submitTrack(bot, ctx, Boolean(parsed.detail));
    if (parsed.kind === "shake-tree") return submitShakeTree(ctx);
    if (parsed.kind === "wait") return submitWait(bot, ctx);
    if (parsed.kind === "use-item") return submitUseItem(bot, ctx, parsed.item);
    if (parsed.kind === "use-item-all") return submitUseAllItems(bot, ctx, parsed.item);
    if (parsed.kind === "light-torch") return submitLightTorch(bot, ctx);
    if (parsed.kind === "douse-torch") return submitDouseTorch(bot, ctx);
    if (parsed.kind === "cook-meat") return submitCookMeat(bot, ctx);
    if (parsed.kind === "cook-meat-all") return submitCookAllMeat(bot, ctx);
    if (parsed.kind === "sleep") return submitSleep(bot, ctx, parsed.tutorial);
    if (parsed.kind === "wake") return submitWake(bot, ctx);
    if (parsed.kind === "open") return submitOpen(ctx, parsed.target);
    if (parsed.kind === "inspect-inventory-item") return submitInventoryInspect(ctx, parsed.target);
    if (parsed.kind === "drop-inventory-item") return submitInventoryDrop(bot, ctx, parsed.target);
    if (parsed.kind === "equip-inventory-item") return submitInventoryEquip(ctx, parsed.target);
    if (parsed.kind === "unequip-inventory-item") return submitInventoryUnequip(ctx, parsed.target);
    if (parsed.kind === "put-item") return submitPutItem(bot, ctx, parsed.item, parsed.amount, parsed.container);
    if (parsed.kind === "add-twigs-campfire") {
      const player = await getPlayerByTelegramId(ctx.from.id);
      if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
      return submitInventoryQueuedAction(bot, ctx, player, "ADD_TWIGS", {}, "Не вдалося підкинути хмиз.");
    }
    if (parsed.kind === "say") return submitSay(bot, ctx, parsed.text);
    if (parsed.kind === "whisper") return submitWhisper(bot, ctx, parsed.text);
    if (parsed.kind === "reply") return submitReply(bot, ctx, parsed.text);
    if (parsed.kind === "shout") return submitShout(bot, ctx, parsed.text);
    if (parsed.kind === "target-action") return submitTargetAction(bot, ctx, parsed.action, parsed.target);
    if (parsed.kind === "pickup-target") return submitPickupTarget(bot, ctx, parsed.target);
    if (parsed.kind === "social-signal") return submitSocialSignal(bot, ctx, parsed.signal, parsed.target);
  });

  bot.callbackQuery("respawn:confirm", async (ctx) => confirmBeginnerReturn(ctx));
  bot.callbackQuery("respawn:cancel", async (ctx) => {
    await safeAnswerCallbackQuery(ctx, "Лишаємося тут.");
    await ctx.reply("Ви лишаєтеся на місці. Якщо треба, можна озирнутися або перевірити виходи.", {
      reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
    });
  });
}
