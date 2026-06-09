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
import { directionLabels } from "../ui/labels";
import { buildInventoryItemKeyboard } from "../ui/inventoryItemKeyboard";
import { actionQueueReplyOptions, sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { durationSecondsSuffix } from "../utils/durationText";
import { escapeHtml, stripUnsafeText } from "../utils/text";
import { sendHelp } from "./help";
import { disablePlayerAuto, isPlayerAutoEnabled, replyPlayerAutoStatus, requestOrEnablePlayerAuto } from "./auto";
import { showCharacter, showInventory, showLocationForPlayer } from "./player";
import { buildAllPage, buildChatLogPage, buildStatBrief, buildWhoPage } from "./status";
import { renderDepletedVegetationInspection, renderLocationBrief, renderLocationExits, renderLocationFeatureInteraction, renderLocationFeatureInteractionByQuery, renderLocationGlance, shakeTreeAtCurrentLocation } from "../services/locations";
import { buildNewsIndexPage, newsHtmlReplyOptions } from "./news";
import { hideReplyKeyboard, showMainKeyboard, showMenu } from "./menu";
import { showCalendar, showTime, showWeather } from "./time";
import { submitMove as submitCanonicalMove } from "./movement";
import { submitGather as submitCanonicalGather } from "./gather";
import { submitPosture } from "./posture";
import { addCorpseToInventory, addVisibleCorpsesToInventory, resourceTypeDisplayName } from "../services/corpses";
import { performPlayerLocationSignal, performSocialSignal } from "../services/socialSignals";
import { requireScribeAdmin } from "../services/adminAccess";
import { playerCanShowTechnicalDetails } from "../services/technicalDetails";
import { pickUpAllVisibleGroundResources, pickUpAllVisibleGroundResourcesByKey, pickUpFirstGroundResourceByKey, pickUpFirstVisibleGroundResourceByKey, type VisibleGroundResourceKey } from "../services/groundItems";
import { parseSpeechTarget } from "../services/speechTargets";
import { tryTriggerManualCellarWaterWordPassage } from "../services/cellarWaterPassage";
import { inspectInventoryResource, inventoryResourceKeyFromText, type UsableInventoryResource } from "../services/inventoryUse";
import { openDreamGate, rememberTutorialCommandHintIfInTutorial } from "../services/tutorial";
import { requestTutorialEnd, submitSleepCommand, submitWakeCommand } from "./tutorial";
import { pickupObserverText, recordVisibleItemAction } from "../services/visibleItemActions";
import { notifyPlayerObservers, playerRestStartObserverText, playerRestStopObserverText } from "../services/playerVisibility";
import { noteKnownMessage } from "../utils/messageTracker";
import { playerForms } from "../services/grammar";
import { putInventoryIntoLocalFeature } from "../services/carcassDropoff";
import {
  clearPendingReplyMode,
  consumePendingReplyModeResult,
  isPendingReplyCancelText,
  latestRememberedReplyTarget,
  PENDING_REPLY_TIMEOUT_TEXT,
  pendingReplyModePrompt,
  setPendingReplyMode,
  type RememberedReplyTarget,
} from "../services/replyTargets";
import { replyToActionError } from "../utils/actionErrorReply";
import { assertCanPerformPhysicalAction } from "../services/postureRules";
import { inventoryGainReplyOptions } from "../utils/tutorialInventory";
import { bestTargetActionMatch, bestTargetMatch, inspectMissingText, isSelfTargetQueryForPlayer, normalizeTargetKey, targetDisplayLabel, targetListText, textTargetsForAction, visibleTextTargets, type TextTargetRef } from "../services/textTargets";
import { spendPlayerStaminaAmount } from "../services/actionRecovery";
import { afkReplyOptions, canSendProactiveToTelegramId, endPlayerSession, SESSION_AFK_CONFIRMATION, SESSION_ENDED_CONFIRMATION, setPlayerAfk } from "../services/sessionPresence";
import { setAutoActionMessageSetting, setDaypartNoticeSetting, showSettings } from "./settings";
import { beginnerReturnPromptText, beginnerReturnRefusalText, checkBeginnerReturnForPlayer, performBeginnerReturn } from "../services/beginnerReturn";
import {
  performScribeReturn,
  requestScribeReturnHelp,
  scribeHelpNoScribesText,
  scribeHelpRequestedText,
  scribeReturnHelpKeyboard,
  SCRIBE_HELP_COMMAND,
} from "../services/scribeReturnHelp";
import { safeAnswerCallbackQuery, safeSendMessage } from "../utils/telegram";
import { formatVitalsSentence } from "../utils/playerText";
import {
  BEGINNER_CACHE_FEATURE_KEY,
  contributeToBeginnerCache,
  takeFromBeginnerCache,
} from "../services/beginnerCache";
import { equipPlayerWeapon, unequipPlayerWeapon } from "../services/weapons";
import { queueAllRawMeatCooking } from "../services/cookingQueue";
import { queueAllUsableInventoryResource } from "../services/eatingQueue";
import {
  EMPTY_BOTTLE_NO_SOURCE_TEXT,
  EMPTY_BOTTLE_SOURCE_TAKE_EVENT_TITLE,
  isEmptyBottleTarget,
  takeBottleFromCurrentLocation,
} from "../services/bottles";
import { HERBAL_TINCTURE_KEY, attemptHerbalTinctureBrewForPlayer } from "../services/tinctures";
import { queueAllBeginnerCacheContributions } from "../services/beginnerCacheQueue";
import {
  clearPlayerFollowIntent,
  followIntentSetText,
  followIntentHelpText,
  followIntentStatusLine,
  followIntentUsageText,
  followAssistStateText,
  getPlayerFollowIntent,
  isFollowIntentTargetVisibleAtLocation,
  setFollowAssistEnabled,
  setPlayerFollowIntent,
} from "../services/following";
import { followStepDirectionForPlayer, followStepFailureText } from "../services/followRouteMemory";
import { verticalYellPromptPlaceholder, verticalYellPromptText, type VerticalYellPromptDirection } from "../services/speechRanges";
import {
  campfireBuildConfirmationText,
  dismantlableHandmadeCampfireId,
  douseableHandmadeCampfireId,
  relightableCampfireFromTorchId,
} from "../services/fire";
import { buildWetCampfireConfirmKeyboard } from "../ui/fireKeyboards";
import { submitGiveItem } from "./give";
import { firstStrangeTotemFeatureIdAtPlayerLocation } from "../services/strangeTotems";
import { maybeTriggerPassiveApiarySting } from "../services/apiaryHazards";
import { enterAttentionRootGap } from "../services/attentionGatedLocation";
import { enterTrackGatedPassage } from "../services/trackGatedLocation";
import {
  acceptTravelGroupInvite,
  createTravelGroupForPlayer,
  declineTravelGroupInvite,
  disbandTravelGroup,
  followTravelGroupLeader,
  invitePlayerToTravelGroup,
  leaveTravelGroup,
  travelGroupStatusViewForPlayer,
} from "../services/travelGroups";
import {
  acceptMentorship,
  declineMentorship,
  endActiveMentorship,
  maybeOfferMentorshipAfterFollow,
  mentorshipOfferKeyboard,
  mentorshipStatusText,
  respondToMentorshipOffer,
} from "../services/mentorship";

const pendingVerticalYell = new Map<number, { direction: VerticalYellPromptDirection }>();
const pendingReturnYell = new Set<number>();
const pendingTargetActions = new Map<number, { action: TargetAction; targets: TextTargetRef[]; detail: "brief" | "full"; createdAt: number }>();
const PENDING_TARGET_ACTION_TTL_MS = 60_000;

async function maybeReplyWithMentorshipOffer(ctx: any, playerId: number, mentorCreatureId: number) {
  const result = await maybeOfferMentorshipAfterFollow({ playerId, mentorCreatureId });
  if (result.kind === "offer") {
    await ctx.reply(result.text, { reply_markup: mentorshipOfferKeyboard(result.mentorship.id) });
    return;
  }
  if (result.kind === "active" || result.kind === "not-better") {
    await ctx.reply(result.text);
  }
}

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
  await ctx.reply(page.text, newsHtmlReplyOptions(page.keyboard));
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
  if (!(await requireScribeAdmin(ctx))) return;
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

async function submitBeginnerCacheContributeAll(bot: Bot, ctx: any, item?: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    const feature = await localBeginnerCacheFeature(player);
    if (!feature) throw new Error("Поруч немає спільної скрині.");
    const result = await queueAllBeginnerCacheContributions(bot, player, feature.id, item, "all", ctx.chat?.id);
    const queueText = await renderPlayerActionQueue(player.id);
    const queueLimitText = result.limitedByQueue ? "\n\nЧерга взяла не все: у плані дій уже тісно." : "";
    const capacityText = result.limitedByCapacity ? "\n\nСкриня візьме не все: для цього запасу там лишилося не так багато місця." : "";
    await ctx.reply(
      `Додано до спільної скрині: ${result.count}. Будете лишати ${result.label} по одній речі${durationSecondsSuffix(player, result.durationMs)}.${queueLimitText}${capacityText}\n\n${queueText}`,
      await actionQueueReplyOptions(player.id),
    );
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося лишити все у скрині.");
  }
}

function isBeginnerCacheContainerQuery(container: string) {
  const normalized = container
    .toLocaleLowerCase("uk-UA")
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^(?:cache|supply cache|beginner cache|скриня|скриню|скрині|спільна скриня|спільну скриню|скриня прибулих|скриню прибулих|запаси|припаси)$/u.test(normalized);
}

async function submitFeatureInspection(bot: Bot, ctx: any, targetQuery: string, detail: "brief" | "full" = "full") {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  if (isSelfTargetQueryForPlayer(targetQuery, player)) return showCharacter(ctx.from.id, (text, options) => ctx.reply(text, options));

  const returnMode = detail === "brief" ? "brief" : "details";
  const view = await renderLocationFeatureInteractionByQuery(player.currentLocationId, player.id, targetQuery, returnMode, detail);
  if (!view) return submitTargetAction(bot, ctx, "inspect", targetQuery, detail);

  await rememberTutorialCommandHintIfInTutorial(player.id, "examine", player.currentLocationId);
  noteKnownMessage(await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard }));
  await sendFeatureFollowups(ctx, view);
  await maybeTriggerPassiveApiarySting(bot, { playerId: player.id, locationId: player.currentLocationId, chatId: ctx.chat?.id, reason: "look" });
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

async function submitAuto(bot: Bot, ctx: any, mode: "show" | "start" | "stop") {
  if (mode === "show") {
    await replyPlayerAutoStatus(ctx);
    return;
  }

  if (mode === "start") {
    await requestOrEnablePlayerAuto(bot, ctx);
    return;
  }

  const stopped = await disablePlayerAuto(ctx.from.id);
  await ctx.reply(stopped ? "Поклик духа стих." : "Поклик духа не озивався.", {
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

export async function submitTrack(bot: Bot, ctx: any, detail = false, target?: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const durationMs = actionDurationMs("TRACK", player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "TRACK", payload: { detail, ...(target?.trim() ? { target: target.trim() } : {}) }, durationMs, chatId: ctx.chat?.id, interruptQueued: true });
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

function isUsableInventoryResourceKey(value: string): value is UsableInventoryResource {
  return value === "berries" || value === "herbs" || value === "mushrooms" || value === "cooked_meat" || value === HERBAL_TINCTURE_KEY;
}

function isHerbalTinctureCommandTarget(value: string | undefined | null) {
  if (!value) return false;
  return inventoryResourceKeyFromText(value) === HERBAL_TINCTURE_KEY;
}

async function submitBrewTincture(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    assertCanPerformPhysicalAction(player, "BREW");
    const result = await attemptHerbalTinctureBrewForPlayer(player.id);
    if (!result.ok) {
      await ctx.reply(result.text);
      return;
    }

    const staminaSpend = await spendPlayerStaminaAmount(bot, player.id, 1, ctx.chat?.id);
    await ctx.reply(result.text, staminaSpend.replyMarkup ? { reply_markup: staminaSpend.replyMarkup } : undefined);
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося приготувати настоянку.");
  }
}

async function submitDrinkOrUseCommand(bot: Bot, ctx: any, target: string, fallbackUsage: string) {
  if (!target.trim()) return void (await ctx.reply(fallbackUsage));
  const resourceKey = inventoryResourceKeyFromText(target);
  if (!isUsableInventoryResourceKey(resourceKey)) return void (await ctx.reply(fallbackUsage));
  return submitUseItem(bot, ctx, resourceKey);
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

export async function submitBuildCampfire(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    const confirmationText = await campfireBuildConfirmationText(player.id);
    if (confirmationText) {
      await ctx.reply(confirmationText, { reply_markup: buildWetCampfireConfirmKeyboard() });
      return;
    }
    await submitInventoryQueuedAction(bot, ctx, player, "BUILD_CAMPFIRE", {}, "Не вдалося скласти вогнище.");
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося скласти вогнище.");
  }
}

export async function submitLightCampfire(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const featureId = await relightableCampfireFromTorchId(player.id);
  if (!featureId) {
    await ctx.reply("Поруч немає складеного чи згаслого вогнища, яке можна підпалити запаленим факелом.");
    return;
  }
  await submitInventoryQueuedAction(bot, ctx, player, "LIGHT_CAMPFIRE", { featureId }, "Не вдалося запалити вогонь.");
}

export async function submitDouseCampfire(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const featureId = await douseableHandmadeCampfireId(player.id);
  if (!featureId) {
    await ctx.reply("Поруч немає рукотворного палаючого вогнища, яке можна погасити.");
    return;
  }
  await submitInventoryQueuedAction(bot, ctx, player, "DOUSE_CAMPFIRE", { featureId }, "Не вдалося погасити вогнище.");
}

export async function submitDismantleCampfire(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const featureId = await dismantlableHandmadeCampfireId(player.id);
  if (!featureId) {
    await ctx.reply("Поруч немає складеного або згаслого рукотворного вогнища, яке можна розібрати.");
    return;
  }
  await submitInventoryQueuedAction(bot, ctx, player, "DISMANTLE_CAMPFIRE", { featureId }, "Не вдалося розібрати вогнище.");
}

export async function submitDismantleTotem(bot: Bot, ctx: any, target = "") {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const featureId = await firstStrangeTotemFeatureIdAtPlayerLocation(player.id, target);
  if (!featureId) {
    await ctx.reply("Поруч немає підозрілого тотема, який можна розібрати.");
    return;
  }
  await submitInventoryQueuedAction(bot, ctx, player, "DISMANTLE_TOTEM", { featureId }, "Не вдалося розібрати тотем.");
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
    if (isBeginnerCacheContainerQuery(container)) {
      const feature = await localBeginnerCacheFeature(player);
      if (!feature) throw new Error("Поруч немає спільної скрині.");
      if (amount === undefined) {
        const result = await contributeToBeginnerCache(player.id, feature.id, item);
        await spendPlayerStaminaAmount(bot, player.id, 1, ctx.chat?.id);
        await ctx.reply(result.text);
        return;
      }

      const result = await queueAllBeginnerCacheContributions(bot, player, feature.id, item, amount, ctx.chat?.id);
      const queueText = await renderPlayerActionQueue(player.id);
      const queueLimitText = result.limitedByQueue ? "\n\nЧерга взяла не все: у плані дій уже тісно." : "";
      const capacityText = result.limitedByCapacity ? "\n\nСкриня візьме не все: для цього запасу там лишилося не так багато місця." : "";
      await ctx.reply(
        `Додано до спільної скрині: ${result.count}. Будете лишати ${result.label} по одній речі${durationSecondsSuffix(player, result.durationMs)}.${queueLimitText}${capacityText}\n\n${queueText}`,
        await actionQueueReplyOptions(player.id),
      );
      return;
    }

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

export async function submitSay(bot: Bot, ctx: any, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text).slice(0, 300);
  if (!safeText) return void (await ctx.reply("Напиши так: <i>сказати</i> текст", { parse_mode: "HTML" }));

  const durationMs = actionDurationMs("SAY", player.stamina);
  try {
    const payload = await parseSpeechTarget(safeText, player.currentLocationId, player.id);
    const hasTarget = Boolean(payload.targetType || payload.targetId || payload.targetName || payload.targetDative);
    if (await tryTriggerManualCellarWaterWordPassage(bot, {
      playerId: player.id,
      text: payload.text,
      chatId: ctx.chat?.id,
      hasTarget,
    })) {
      return;
    }
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
  if (!safeText) return void (await ctx.reply("Напиши так: <i>whisper</i> персонаж текст", { parse_mode: "HTML" }));

  const durationMs = actionDurationMs("SAY", player.stamina);
  try {
    const payload = await parseSpeechTarget(safeText, player.currentLocationId, player.id);
    if (!payload.targetId) return void (await ctx.reply("Напиши так: <i>whisper</i> персонаж текст. Ціль має бути видимим персонажем або істотою поруч.", { parse_mode: "HTML" }));
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

async function submitReply(bot: Bot, ctx: any, text: string, targetOverride?: RememberedReplyTarget | null) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text);
  if (!safeText) return void (await ctx.reply("Можна натиснути «Відповісти» під останнім зверненням або написати <i>/reply</i> текст.", { parse_mode: "HTML" }));

  const target = targetOverride ?? await lastAddressedSpeakerName(player);
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

export async function submitYell(bot: Bot, ctx: any, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text);
  if (!safeText) return void (await ctx.reply("Напиши так: <i>yell</i> текст або <i>гукнути</i> текст", { parse_mode: "HTML" }));

  const durationMs = actionDurationMs("SAY", player.stamina) * 2;
  try {
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "SAY", payload: { text: safeText, mode: "yell" }, durationMs, chatId: ctx.chat?.id });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося гукнути поруч.");
  }
}

async function submitShout(bot: Bot, ctx: any, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text);
  if (!safeText) return void (await ctx.reply("Напиши так: <i>shout</i> текст", { parse_mode: "HTML" }));

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

function targetActionEmptyText(action: TargetAction) {
  if (action === "attack") return "Поруч немає видимої живої істоти, яку зараз можна атакувати.";
  if (action === "greet") return "Поруч немає видимої цілі, яку зараз можна привітати.";
  if (action === "freshen") return "Поруч немає видимого свіжого трупа, який можна освіжити.";
  return "Поруч немає видимих цілей.";
}

function targetActionMissingText(action: TargetAction, targets: TextTargetRef[]) {
  const list = targets.length ? `\n\nЦілі для цієї дії:\n${targetListText(targets)}` : "";
  if (action === "attack") return `Не бачу такої цілі для атаки поруч.${list}`;
  if (action === "greet") return `Не бачу такої цілі для привітання поруч.${list}`;
  if (action === "freshen") return `Не бачу такого трупа поруч.${list}`;
  return `Не бачу такої цілі поруч.${list}`;
}

function targetActionManyText(action: TargetAction, targets: TextTargetRef[]) {
  const list = targetListText(targets);
  if (action === "attack") return `Знайшов кілька схожих цілей для атаки. Уточни назвою або номером.\n\nЦілі для атаки:\n${list}`;
  if (action === "greet") return `Знайшов кілька схожих цілей для привітання. Уточни назвою або номером.\n\nЦілі для привітання:\n${list}`;
  if (action === "freshen") return `Знайшов кілька схожих трупів. Уточни назвою або номером.\n\nТрупи поруч:\n${list}`;
  return `Знайшов кілька схожих істот чи постатей. Уточни назвою або номером.\n\nПоруч можна роздивитися:\n${list}`;
}

async function submitResolvedTargetAction(bot: Bot, ctx: any, player: any, locationId: number, action: TargetAction, targetRef: TextTargetRef, detail: "brief" | "full" = "full") {
  const target = await resolveTarget(targetRef.type, targetRef.id, locationId);
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
      payload: { targetType: targetRef.type, targetId: targetRef.id, mode: "known", detail },
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

async function submitTargetAction(bot: Bot, ctx: any, action: TargetAction, targetQuery: string, detail: "brief" | "full" = "full") {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  if (action === "inspect" && isSelfTargetQueryForPlayer(targetQuery, player)) return showCharacter(ctx.from.id, (text, options) => ctx.reply(text, options));

  const locationId = player.currentLocationId;
  if (action === "freshen" && isAllTarget(targetQuery)) return submitFreshenAll(bot, ctx, player, locationId);

  const visibleTargets = await visibleTextTargets(locationId, player.id);
  const actionTargets = textTargetsForAction(action, visibleTargets);
  if (!actionTargets.length) {
    if (action === "inspect" && (await tryReplyWithInventoryInspection(ctx, player.id, targetQuery))) return;
    return void (await ctx.reply(action === "inspect" ? inspectMissingText(targetQuery) : targetActionEmptyText(action)));
  }

  const match = bestTargetActionMatch(action, targetQuery, visibleTargets);
  if (match.kind === "none") {
    if (action === "inspect" && (await tryReplyWithInventoryInspection(ctx, player.id, targetQuery))) return;
    await ctx.reply(action === "inspect"
      ? inspectMissingText(targetQuery, visibleTargets)
      : targetActionMissingText(action, actionTargets));
    return;
  }

  if (match.kind === "many") {
    const keyboard = new InlineKeyboard();
    match.targets.forEach((target, index) => keyboard.text(`${index + 1}. ${targetDisplayLabel(target)}`, `target:${target.type}:${target.id}`).row());
    pendingTargetActions.set(ctx.from.id, { action, targets: match.targets, detail, createdAt: Date.now() });
    await ctx.reply(targetActionManyText(action, match.targets), { reply_markup: keyboard });
    return;
  }

  pendingTargetActions.delete(ctx.from.id);
  await submitResolvedTargetAction(bot, ctx, player, locationId, action, match.target, detail);
}

function followUsageText() {
  return followIntentUsageText();
}

function followMissingText() {
  return "Ви не бачите, за ким тут слідувати.";
}

function followManyText(targets: TextTargetRef[]) {
  return `Поруч є кілька схожих слідів. Уточніть назвою або номером.\n\n${targetListText(targets)}`;
}

export async function submitFollowIntent(ctx: any, targetQuery: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const query = targetQuery.trim();
  if (!query) {
    const intent = await getPlayerFollowIntent(player.id);
    if (!intent) return void (await ctx.reply(followUsageText()));
    const targetVisible = await isFollowIntentTargetVisibleAtLocation(intent, player.currentLocationId);
    return void (await ctx.reply(followIntentHelpText({
      label: intent.lastKnownTargetLabel,
      targetVisible,
      assistEnabled: intent.assistEnabled,
    })));
  }
  if (isSelfTargetQueryForPlayer(query, player)) return void (await ctx.reply("Власний слід і так під ногами."));

  const visibleTargets = (await visibleTextTargets(player.currentLocationId, player.id)).filter((target) => !target.isCorpse);
  if (!visibleTargets.length) return void (await ctx.reply(followMissingText()));

  const match = bestTargetMatch(query, visibleTargets);
  if (match.kind === "none") return void (await ctx.reply(followMissingText()));
  if (match.kind === "many") return void (await ctx.reply(followManyText(match.targets)));
  if (match.target.type === "player" && match.target.id === player.id) return void (await ctx.reply("Власний слід і так під ногами."));

  await setPlayerFollowIntent(player.id, match.target, player.currentLocationId);
  await ctx.reply(followIntentSetText(match.target));
  if (match.target.type === "creature") {
    await maybeReplyWithMentorshipOffer(ctx, player.id, match.target.id);
  }
}

async function submitMentorCommand(ctx: any, mode: "show" | "end" = "show") {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  if (mode === "end") {
    const result = await endActiveMentorship(player.id);
    return void (await ctx.reply(result.text));
  }

  await ctx.reply(await mentorshipStatusText(player.id));
}

async function maybeHandleMentorshipAnswer(ctx: any) {
  const text = String(ctx.message?.text ?? "").trim();
  if (!text || text.startsWith("/")) return false;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return false;

  const result = await respondToMentorshipOffer(player.id, text);
  if (!result.handled) return false;
  await ctx.reply(result.text);
  return true;
}

async function submitFollowAssist(ctx: any, mode: "show" | "on" | "off") {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const intent = await getPlayerFollowIntent(player.id);
  if (!intent) return void (await ctx.reply("Спершу оберіть чужий слід: /follow <ціль>."));

  if (mode === "on") {
    await setFollowAssistEnabled(player.id, true);
    return void (await ctx.reply("Ви домовляєтесь із власними ногами: якщо чужий слід поруч рушить звичайною стежкою, ви спробуєте не відстати. Це не гурт і не Поклик духа — тільки уважний крок слідом."));
  }
  if (mode === "off") {
    await setFollowAssistEnabled(player.id, false);
    return void (await ctx.reply("Ви більше не підхоплюєте чужий крок автоматично. Далі — власний темп."));
  }

  const targetVisible = await isFollowIntentTargetVisibleAtLocation(intent, player.currentLocationId);
  await ctx.reply([
    followIntentStatusLine(intent.lastKnownTargetLabel, { stale: Boolean(!targetVisible) }),
    followAssistStateText(intent.assistEnabled),
    "Увімкнути: /follow_assist_on",
    "Вимкнути: /follow_assist_off",
  ].filter(Boolean).join("\n"));
}

async function submitTravelGroupStatus(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  const view = await travelGroupStatusViewForPlayer(player.id);
  await ctx.reply(view.text, { reply_markup: travelGroupStatusKeyboard(view) });
}

function travelGroupStatusKeyboard(view: Awaited<ReturnType<typeof travelGroupStatusViewForPlayer>>) {
  const keyboard = new InlineKeyboard();
  if (view.state === "invited") {
    keyboard.text("Прийняти гурт", "travelGroup:accept").text("Відхилити", "travelGroup:decline");
    return keyboard;
  }
  if (view.state === "active") {
    if (!view.isLeader) keyboard.text("Триматися провідника", "travelGroup:follow-leader").row();
    keyboard.text(view.isLeader ? "Розпустити гурт" : "Вийти з гурту", view.isLeader ? "travelGroup:disband" : "travelGroup:leave");
    return keyboard;
  }
  return undefined;
}

function travelGroupInviteKeyboard() {
  return new InlineKeyboard()
    .text("Прийняти гурт", "travelGroup:accept")
    .text("Відхилити", "travelGroup:decline");
}

async function submitTravelGroupCreate(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  const result = await createTravelGroupForPlayer(player.id);
  await ctx.reply(result.text);
}

async function submitTravelGroupInvite(bot: Bot, ctx: any, targetQuery: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  const query = targetQuery.trim();
  if (!query) return void (await ctx.reply("Кого покликати до гурту? Спробуйте: /group_invite <ім'я>."));
  if (isSelfTargetQueryForPlayer(query, player)) return void (await ctx.reply("Власний крок уже з вами. До гурту кличуть інших."));

  const visiblePlayers = (await visibleTextTargets(player.currentLocationId, player.id))
    .filter((target) => target.type === "player" && !target.isCorpse);
  if (!visiblePlayers.length) return void (await ctx.reply("Поруч не видно мандрівника, якого можна покликати до гурту."));

  const match = bestTargetMatch(query, visiblePlayers);
  if (match.kind === "none") return void (await ctx.reply("Поруч не видно такого мандрівника."));
  if (match.kind === "many") return void (await ctx.reply(`Кого саме покликати?\n${targetListText(match.targets)}`));

  const result = await invitePlayerToTravelGroup({ leaderPlayerId: player.id, targetPlayerId: match.target.id });
  await ctx.reply(result.text);
  if (result.ok && await canSendProactiveToTelegramId(result.target.telegramId)) {
    await safeSendMessage(bot, result.target.telegramId, result.targetMessage, { reply_markup: travelGroupInviteKeyboard() }, "travel group invite");
  }
}

async function submitTravelGroupAccept(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  const result = await acceptTravelGroupInvite(player.id);
  await ctx.reply(result.text);
}

async function submitTravelGroupDecline(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  const result = await declineTravelGroupInvite(player.id);
  await ctx.reply(result.text);
}

async function submitTravelGroupLeave(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  const result = await leaveTravelGroup(player.id);
  await ctx.reply(result.text);
}

async function submitTravelGroupDisband(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  const result = await disbandTravelGroup(player.id);
  await ctx.reply(result.text);
}

async function submitTravelGroupFollowLeader(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  const result = await followTravelGroupLeader(player.id);
  await ctx.reply(result.text);
}

async function submitTravelGroupCommand(bot: Bot, ctx: any, action: "show" | "create" | "invite" | "accept" | "decline" | "leave" | "disband" | "follow-leader", target = "") {
  if (action === "show") return submitTravelGroupStatus(ctx);
  if (action === "create") return submitTravelGroupCreate(ctx);
  if (action === "invite") return submitTravelGroupInvite(bot, ctx, target);
  if (action === "accept") return submitTravelGroupAccept(ctx);
  if (action === "decline") return submitTravelGroupDecline(ctx);
  if (action === "leave") return submitTravelGroupLeave(ctx);
  if (action === "disband") return submitTravelGroupDisband(ctx);
  return submitTravelGroupFollowLeader(ctx);
}

export async function submitUnfollow(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const cleared = await clearPlayerFollowIntent(player.id);
  if (!cleared) return void (await ctx.reply("Ви зараз не тримаєтеся чужого сліду."));

  const targetText = followIntentStatusLine(cleared.lastKnownTargetLabel);
  await ctx.reply(targetText
    ? `Ви відпускаєте чужий слід. Далі — власний крок.\n\nБуло: ${targetText}`
    : "Ви відпускаєте чужий слід. Далі — власний крок.");
}

function followStepDirectionPhrase(direction: keyof typeof directionLabels) {
  const label = directionLabels[direction].toLowerCase();
  if (["UP", "DOWN", "INSIDE", "OUTSIDE"].includes(direction)) return label;
  return `на ${label}`;
}

async function submitFollowStep(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const remembered = await followStepDirectionForPlayer(player.id);
  if (!remembered.ok) {
    await ctx.reply(followStepFailureText(remembered.reason), {
      reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
    });
    return;
  }

  await ctx.reply(`Ви тримаєте власний крок за чужим слідом: ${followStepDirectionPhrase(remembered.direction)}.`);
  await submitCanonicalMove(bot, ctx, remembered.direction, false);
}

async function submitCrawlRootGap(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    const result = await enterAttentionRootGap(bot, { playerId: player.id });
    if (!result.ok) {
      await ctx.reply(result.text, {
        reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
      });
      return;
    }

    await ctx.reply(result.text, {
      reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
    });
    const view = await renderLocationBrief(result.destinationLocationId, player.id);
    noteKnownMessage(await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard }));
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося пролізти крізь щілину.");
  }
}

async function submitTrackGatePassage(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    const result = await enterTrackGatedPassage(bot, { playerId: player.id });
    if (!result.ok) {
      await ctx.reply(result.text, {
        reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
      });
      return;
    }

    await ctx.reply(result.text, {
      reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
    });
    const view = await renderLocationBrief(result.destinationLocationId, player.id);
    noteKnownMessage(await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard }));
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося пройти за слідом.");
  }
}

async function submitAttackCommand(bot: Bot, ctx: any, targetQuery?: string) {
  const target = targetQuery?.trim();
  if (!target) {
    await ctx.reply("Напишіть так: <i>attack</i> mouse або <i>атакувати</i> мишу.", { parse_mode: "HTML" });
    return;
  }

  await submitTargetAction(bot, ctx, "attack", target);
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

type PickupResourceQueryKey = VisibleGroundResourceKey | "mushrooms";

function pickupResourceKey(target: string): PickupResourceQueryKey | null {
  if (["torch", "torches", "факел", "факели", "факела", "факелів"].includes(target)) return "torch";
  if (["lit torch", "lit_torch", "burning torch", "запалений факел", "палаючий факел"].includes(target)) return "lit_torch";
  if (["twigs", "twig", "хмиз"].includes(target)) return "twigs";
  if (["raw meat", "raw_meat", "сире м'ясо", "сире м’ясо", "м'ясо", "м’ясо"].includes(target)) return "raw_meat";
  if (["cooked meat", "cooked_meat", "смажене м'ясо", "смажене м’ясо"].includes(target)) return "cooked_meat";
  if (isEmptyBottleTarget(target)) return "empty_bottle";
  if (["shah", "shahs", "small coin", "coin", "шаг", "шага", "шаги", "шагів", "монета", "монету", "монети"].includes(target)) return "shah";
  if (["grivna", "grivnas", "ґривня", "ґривню", "ґривні", "ґривень"].includes(target)) return "grivna";
  if (["berries", "berry", "ягоди", "ягід"].includes(target)) return "berries";
  if (["mushrooms", "mushroom", "гриби", "грибів"].includes(target)) return "mushrooms";
  if (["herbs", "herb", "трави", "трав", "лікарські трави", "лікарських трав", "зілля", "зіллячко"].includes(target)) return "herbs";
  return null;
}

function naturalResourcePickupHint(key: PickupResourceQueryKey) {
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
        if (filterResourceKey === "mushrooms") {
          await ctx.reply(naturalResourcePickupHint(filterResourceKey));
          return;
        }
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

  if (isEmptyBottleTarget(normalizedTarget)) {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      const result = await takeBottleFromCurrentLocation(player.id);
      if (result.text !== EMPTY_BOTTLE_NO_SOURCE_TEXT) {
        if (player.currentLocationId && result.taken) {
          await recordVisibleItemAction(bot, {
            playerId: player.id,
            locationId: player.currentLocationId,
            observerText: pickupObserverText(player, "порожню пляшечку"),
            eventTitle: EMPTY_BOTTLE_SOURCE_TAKE_EVENT_TITLE,
            eventDescription: `player=${player.id}; item=empty_bottle; source=current-location`,
            actionNote: "піднято: порожня пляшечка",
          });
          await spendPlayerStaminaAmount(bot, player.id, 1, ctx.chat?.id);
        }
        await ctx.reply(result.text, result.taken ? await inventoryGainReplyOptions(player, "take-bottle") : undefined);
        return;
      }
    } catch (error) {
      await replyToActionError(ctx, error, "Не вдалося взяти пляшечку.");
      return;
    }
  }

  const resourceKey = pickupResourceKey(normalizedTarget);
  if (resourceKey) {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      if (resourceKey === "mushrooms") {
        await ctx.reply(naturalResourcePickupHint(resourceKey));
        return;
      }
      const item = resourceKey === "berries" || resourceKey === "herbs"
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

async function submitPickupCommand(bot: Bot, ctx: any, targetQuery?: string) {
  const target = targetQuery?.trim();
  if (!target) {
    await ctx.reply("Напишіть так: /<i>pick</i> twigs, /<i>pick_all</i> або <i>підібрати все</i>.", { parse_mode: "HTML" });
    return;
  }

  await submitPickupTarget(bot, ctx, target);
}

function pickupAllCommandTarget(rest?: string) {
  const target = rest?.trim();
  return target ? `all ${target}` : "all";
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

async function replyWithReturnYellPrompt(ctx: any) {
  if (!ctx.from?.id) return;
  pendingReturnYell.add(ctx.from.id);
  await ctx.reply("Гукніть так, щоб голос зачепив сусідні стежки. Напишіть, що саме крикнути поруч.", {
    reply_markup: {
      force_reply: true,
      selective: true,
      input_field_placeholder: "Допоможіть, я заблукав!",
    },
  });
}

export async function requestScribeReturnAssistance(bot: Bot, ctx: any) {
  if (!ctx.from?.id) return;
  const result = await requestScribeReturnHelp(bot, ctx.from.id);
  if (!result.ok) {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  const suffix = result.sent > 0 ? "" : `\n\n${scribeHelpNoScribesText()}`;
  await ctx.reply(`${scribeHelpRequestedText()}${suffix}`, {
    reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
  });
}

async function performScribeReturnFromCallback(bot: Bot, ctx: any) {
  await safeAnswerCallbackQuery(ctx);
  if (!(await requireScribeAdmin(ctx))) return;

  const playerId = Number(ctx.match?.[1]);
  if (!Number.isSafeInteger(playerId) || playerId <= 0) {
    await ctx.reply("Не вдалося прочитати, кого саме треба повернути.");
    return;
  }

  const result = await performScribeReturn(bot, playerId, ctx.from.id);
  if (!result.ok) {
    await ctx.reply(result.message);
    return;
  }

  await ctx.reply(`✒️ Знак Писаря застосовано. ${playerForms(result.player).nominative} повертається до межового табору: ${result.startLocation.name}.`);
}

async function requestBeginnerReturn(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const checked = await checkBeginnerReturnForPlayer(player.id);
  if (!checked) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  if (!checked.eligibility.ok) {
    await ctx.reply(beginnerReturnRefusalText(checked.eligibility), {
      parse_mode: "HTML",
      reply_markup: checked.eligibility.reason === "established"
        ? scribeReturnHelpKeyboard()
        : await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
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
      parse_mode: "HTML",
      reply_markup: result.eligibility.reason === "established"
        ? scribeReturnHelpKeyboard()
        : await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
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
  bot.command([
    "feed_raw_meat",
    "feed_raw_meet",
    "track",
    "build_campfire",
    "light_campfire",
    "douse_campfire",
    "dismantle_campfire",
    "dismantle_totem",
    "inv",
    "put",
    "respawn",
    "call_scribes",
    "scribe_help",
    "shake_tree",
    "freshen_all",
    "take_bottle",
    "make_tincture",
    "smile",
	    "glance",
	    "enter",
	    "crawl",
	    "follow_trace",
	    "exits",
	    "reply",
  ], async (_ctx, next) => next());
  bot.command(["attack", "fight", "kill", "kick"], async (ctx) => submitAttackCommand(bot, ctx, ctx.match ?? ""));
  bot.command("attack_mouse", async (ctx) => submitAttackCommand(bot, ctx, "mouse"));
  bot.command(["freshen", "butcher"], async (ctx) => submitTargetAction(bot, ctx, "freshen", (ctx.match ?? "").trim() || "corpse"));
  bot.command(["get", "pick", "pickup", "take"], async (ctx) => submitPickupCommand(bot, ctx, ctx.match ?? ""));
  bot.command("take_bottle", async (ctx) => submitPickupCommand(bot, ctx, (ctx.match ?? "").trim() || "empty bottle"));
  bot.command("brew", async (ctx) => {
    const target = String(ctx.match ?? "").trim();
    if (isHerbalTinctureCommandTarget(target)) return submitBrewTincture(bot, ctx);
    await ctx.reply("Напишіть так: /brew tincture або /make_tincture.");
  });
  bot.command("make_tincture", async (ctx) => submitBrewTincture(bot, ctx));
  bot.command("drink", async (ctx) => submitDrinkOrUseCommand(bot, ctx, String(ctx.match ?? ""), "Напишіть так: /drink tincture."));
  bot.command("use", async (ctx) => submitDrinkOrUseCommand(bot, ctx, String(ctx.match ?? ""), "Напишіть так: /use tincture."));
  bot.command(["get_all", "pick_all", "pickup_all", "take_all"], async (ctx) => submitPickupCommand(bot, ctx, pickupAllCommandTarget(ctx.match ?? "")));
  bot.command("track", async (ctx) => submitTrack(bot, ctx, false, ctx.match ?? ""));
	  bot.command("follow", async (ctx) => submitFollowIntent(ctx, ctx.match ?? ""));
	  bot.command(["follow_assist", "follow_auto", "autofollow"], async (ctx) => {
	    const mode = String(ctx.match ?? "").trim().toLowerCase();
	    await submitFollowAssist(ctx, mode === "on" ? "on" : mode === "off" ? "off" : "show");
	  });
	  bot.command("follow_assist_on", async (ctx) => submitFollowAssist(ctx, "on"));
	  bot.command(["follow_assist_off", "stop_follow_assist"], async (ctx) => submitFollowAssist(ctx, "off"));
	  bot.command(["follow_step", "keep_following", "trail"], async (ctx) => submitFollowStep(bot, ctx));
	  bot.command(["group", "travel_group"], async (ctx) => submitTravelGroupCommand(bot, ctx, "show"));
	  bot.command("group_create", async (ctx) => submitTravelGroupCommand(bot, ctx, "create"));
	  bot.command("group_invite", async (ctx) => submitTravelGroupCommand(bot, ctx, "invite", ctx.match ?? ""));
	  bot.command("group_accept", async (ctx) => submitTravelGroupCommand(bot, ctx, "accept"));
	  bot.command("group_decline", async (ctx) => submitTravelGroupCommand(bot, ctx, "decline"));
	  bot.command("group_leave", async (ctx) => submitTravelGroupCommand(bot, ctx, "leave"));
	  bot.command("group_disband", async (ctx) => submitTravelGroupCommand(bot, ctx, "disband"));
	  bot.command("group_follow_leader", async (ctx) => submitTravelGroupCommand(bot, ctx, "follow-leader"));
	  bot.command(["mentor", "mentorship"], async (ctx) => submitMentorCommand(ctx, normalizeInput(ctx.match ?? "") === "end" ? "end" : "show"));
	  bot.command("crawl", async (ctx) => submitCrawlRootGap(bot, ctx));
	  bot.command("follow_trace", async (ctx) => submitTrackGatePassage(bot, ctx));
	  bot.command("unfollow", async (ctx) => submitUnfollow(ctx));
  bot.command("yell", async (ctx) => submitYell(bot, ctx, ctx.match ?? ""));
  bot.command("shout", async (ctx) => submitShout(bot, ctx, ctx.match ?? ""));
  bot.command(["call_scribes", "scribe_help"], async (ctx) => requestScribeReturnAssistance(bot, ctx));
  bot.command("cache", async (ctx) => replyWithBeginnerCache(ctx));
  bot.command(["take_cache", "cache_take"], async (ctx) => submitBeginnerCacheTake(bot, ctx, ctx.match ?? ""));
  bot.command(["contribute_cache", "cache_contribute"], async (ctx) => submitBeginnerCacheContribute(bot, ctx, ctx.match ?? ""));
  bot.command(["contribute_cache_all", "cache_contribute_all"], async (ctx) => submitBeginnerCacheContributeAll(bot, ctx, ctx.match ?? ""));

  bot.on("message:text", async (ctx, next) => {
    if (!ctx.from || !ctx.message?.text) return next();

    if (pendingReturnYell.has(ctx.from.id)) {
      const text = String(ctx.message.text ?? "").trim();
      const normalized = normalizeInput(text);
      if (["/cancel", "cancel", "скасувати", "відмінити", "відміна", "стоп", "не треба"].includes(normalized)) {
        pendingReturnYell.delete(ctx.from.id);
        await ctx.reply("Добре, не гукаємо.");
        return;
      }
      if (text.startsWith("/")) {
        pendingReturnYell.delete(ctx.from.id);
        return next();
      }

      pendingReturnYell.delete(ctx.from.id);
      return submitYell(bot, ctx, text);
    }

    const pendingYell = pendingVerticalYell.get(ctx.from.id);
    if (pendingYell) {
      const text = String(ctx.message.text ?? "").trim();
      const normalized = normalizeInput(text);
      if (["/cancel", "cancel", "скасувати", "відмінити", "відміна", "стоп", "не треба"].includes(normalized)) {
        pendingVerticalYell.delete(ctx.from.id);
        await ctx.reply("Добре, не гукаємо.");
        return;
      }
      if (text.startsWith("/")) {
        pendingVerticalYell.delete(ctx.from.id);
        return next();
      }

      pendingVerticalYell.delete(ctx.from.id);
      return submitYell(bot, ctx, text);
    }

    const pendingTargetAction = pendingTargetActions.get(ctx.from.id);
    if (pendingTargetAction) {
      const text = String(ctx.message.text ?? "").trim();
      const normalized = normalizeInput(text);
      const expired = Date.now() - pendingTargetAction.createdAt > PENDING_TARGET_ACTION_TTL_MS;
      if (expired) {
        pendingTargetActions.delete(ctx.from.id);
      } else if (["/cancel", "cancel", "скасувати", "відмінити", "відміна", "стоп", "не треба"].includes(normalized)) {
        pendingTargetActions.delete(ctx.from.id);
        await ctx.reply("Добре, не уточнюємо ціль.");
        return;
      } else if (/^\d+$/u.test(normalized)) {
        const index = Number(normalized);
        if (index >= 1 && index <= pendingTargetAction.targets.length) {
          pendingTargetActions.delete(ctx.from.id);
          const player = await getPlayerByTelegramId(ctx.from.id);
          if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
          return submitResolvedTargetAction(
            bot,
            ctx,
            player,
            player.currentLocationId,
            pendingTargetAction.action,
            pendingTargetAction.targets[index - 1],
            pendingTargetAction.detail,
          );
        }
        await ctx.reply(`Уточни номером від 1 до ${pendingTargetAction.targets.length} або напиши команду повністю.`);
        return;
      } else if (text.startsWith("/")) {
        pendingTargetActions.delete(ctx.from.id);
      } else {
        pendingTargetActions.delete(ctx.from.id);
      }
    }

    const parsed = parseAlias(ctx.message.text);
    if (!parsed) {
      const player = await getPlayerByTelegramId(ctx.from.id);
      if (player && isPendingReplyCancelText(ctx.message.text) && clearPendingReplyMode(player.id)) {
        await ctx.reply("Добре, відповідь скасовано.");
        return;
      }
      if (await maybeHandleMentorshipAnswer(ctx)) return;
      if (player) {
        const pendingReply = consumePendingReplyModeResult(player.id);
        if (pendingReply.kind === "ready") return submitReply(bot, ctx, ctx.message.text, pendingReply.target);
        if (pendingReply.kind === "expired") return void (await ctx.reply(PENDING_REPLY_TIMEOUT_TEXT));
      }
      return next();
    }

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
    if (parsed.kind === "calendar") return showCalendar(ctx);
    if (parsed.kind === "weather") return showWeather(ctx);
    if (parsed.kind === "menu") return showMenu(ctx);
    if (parsed.kind === "settings") return showSettings(ctx);
    if (parsed.kind === "daypart-notices") {
      if (parsed.mode === "on") return setDaypartNoticeSetting(ctx, true);
      if (parsed.mode === "off") return setDaypartNoticeSetting(ctx, false);
      return showSettings(ctx);
    }
    if (parsed.kind === "auto-messages") {
      if (parsed.mode === "on") return setAutoActionMessageSetting(ctx, true);
      if (parsed.mode === "off") return setAutoActionMessageSetting(ctx, false);
      return showSettings(ctx);
    }
    if (parsed.kind === "session-presence") return submitSessionPresence(ctx, parsed.mode);
    if (parsed.kind === "beginner-return") return requestBeginnerReturn(ctx);
    if (parsed.kind === "call-scribes") return requestScribeReturnAssistance(bot, ctx);
    if (parsed.kind === "tutorial-end") return requestTutorialEnd(ctx);
    if (parsed.kind === "back") return showMainKeyboard(ctx);
    if (parsed.kind === "hide-keyboard") return hideReplyKeyboard(ctx);
    if (parsed.kind === "inspect-vegetation") return replyWithVegetationInspection(ctx);
    if (parsed.kind === "inspect-border-marker") return replyWithBorderMarkerInspection(ctx);
    if (parsed.kind === "inspect-feature") return submitFeatureInspection(bot, ctx, parsed.target, parsed.detail ?? "full");
    if (parsed.kind === "beginner-cache") {
      if (parsed.action === "take") return submitBeginnerCacheTake(bot, ctx, parsed.item);
      if (parsed.action === "contribute") return submitBeginnerCacheContribute(bot, ctx, parsed.item);
      if (parsed.action === "contribute-all") return submitBeginnerCacheContributeAll(bot, ctx, parsed.item);
      return replyWithBeginnerCache(ctx);
    }
    if (parsed.kind === "move") return submitCanonicalMove(bot, ctx, parsed.direction, false);
    if (parsed.kind === "gather") return submitCanonicalGather(bot, ctx, parsed.resourceKey, false);
    if (parsed.kind === "brew-tincture") return submitBrewTincture(bot, ctx);
    if (parsed.kind === "posture") return submitPosture(bot, ctx, parsed.mode);
    if (parsed.kind === "rest") return submitRest(bot, ctx, parsed.mode);
    if (parsed.kind === "auto") return submitAuto(bot, ctx, parsed.mode);
    if (parsed.kind === "queue") return submitQueue(ctx, parsed.mode);
    if (parsed.kind === "track") return submitTrack(bot, ctx, Boolean(parsed.detail), parsed.target);
    if (parsed.kind === "follow-step") return submitFollowStep(bot, ctx);
    if (parsed.kind === "follow-assist") return submitFollowAssist(ctx, parsed.mode);
    if (parsed.kind === "travel-group") return submitTravelGroupCommand(bot, ctx, parsed.action, parsed.target);
    if (parsed.kind === "mentor") return submitMentorCommand(ctx, parsed.action);
    if (parsed.kind === "crawl-root-gap") return submitCrawlRootGap(bot, ctx);
    if (parsed.kind === "track-gate") return submitTrackGatePassage(bot, ctx);
    if (parsed.kind === "shake-tree") return submitShakeTree(ctx);
    if (parsed.kind === "wait") return submitWait(bot, ctx);
    if (parsed.kind === "use-item") return submitUseItem(bot, ctx, parsed.item);
    if (parsed.kind === "use-item-all") return submitUseAllItems(bot, ctx, parsed.item);
    if (parsed.kind === "light-torch") return submitLightTorch(bot, ctx);
    if (parsed.kind === "douse-torch") return submitDouseTorch(bot, ctx);
    if (parsed.kind === "build-campfire") return submitBuildCampfire(bot, ctx);
    if (parsed.kind === "light-campfire") return submitLightCampfire(bot, ctx);
    if (parsed.kind === "douse-campfire") return submitDouseCampfire(bot, ctx);
    if (parsed.kind === "dismantle-campfire") return submitDismantleCampfire(bot, ctx);
    if (parsed.kind === "dismantle-totem") return submitDismantleTotem(bot, ctx, parsed.target);
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
    if (parsed.kind === "give-item") return submitGiveItem(bot, ctx, parsed.item, parsed.target, parsed.amount);
    if (parsed.kind === "add-twigs-campfire") {
      const player = await getPlayerByTelegramId(ctx.from.id);
      if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
      return submitInventoryQueuedAction(bot, ctx, player, "ADD_TWIGS", {}, "Не вдалося підкинути хмиз.");
    }
    if (parsed.kind === "say") return submitSay(bot, ctx, parsed.text);
    if (parsed.kind === "whisper") return submitWhisper(bot, ctx, parsed.text);
    if (parsed.kind === "reply") return submitReply(bot, ctx, parsed.text);
    if (parsed.kind === "yell") return submitYell(bot, ctx, parsed.text);
    if (parsed.kind === "shout") return submitShout(bot, ctx, parsed.text);
    if (parsed.kind === "follow") return submitFollowIntent(ctx, parsed.target);
    if (parsed.kind === "unfollow") return submitUnfollow(ctx);
    if (parsed.kind === "target-action") {
      if (parsed.action === "attack" && !parsed.target.trim()) return submitAttackCommand(bot, ctx, "");
      return submitTargetAction(bot, ctx, parsed.action, parsed.target);
    }
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
  bot.callbackQuery("respawn:yell_help", async (ctx) => {
    await safeAnswerCallbackQuery(ctx, "Напишіть текст крику.");
    await replyWithReturnYellPrompt(ctx);
  });
  bot.callbackQuery("scribeReturn:request", async (ctx) => {
    await safeAnswerCallbackQuery(ctx, "Передаємо прохання Писарям.");
    await requestScribeReturnAssistance(bot, ctx);
  });
  bot.callbackQuery(/^scribeReturn:(\d+)$/, async (ctx) => performScribeReturnFromCallback(bot, ctx));
  bot.callbackQuery(/^travelGroup:(accept|decline|leave|disband|follow-leader)$/, async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    const action = ctx.match[1] as "accept" | "decline" | "leave" | "disband" | "follow-leader";
    await submitTravelGroupCommand(bot, ctx, action);
  });
  bot.callbackQuery(/^mentorship:(accept|decline):(\d+)$/, async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    const action = ctx.match[1] as "accept" | "decline";
    const mentorshipId = Number(ctx.match[2]);
    const result = action === "accept"
      ? await acceptMentorship(player.id, mentorshipId)
      : await declineMentorship(player.id, mentorshipId);
    await ctx.reply(result.text);
  });
  bot.callbackQuery("replyTarget:pending", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    const target = await latestRememberedReplyTarget(player.id);
    if (!target) return void (await ctx.reply("Поки немає репліки, на яку можна відповісти."));
    setPendingReplyMode(player.id, target);
    await ctx.reply(pendingReplyModePrompt(target));
  });
  bot.callbackQuery(/^yell:prompt:(UP|DOWN)$/, async (ctx) => {
    const direction = ctx.match[1] as VerticalYellPromptDirection;
    pendingVerticalYell.set(ctx.from.id, { direction });
    await safeAnswerCallbackQuery(ctx, "Напишіть текст у чат.");
    await ctx.reply(verticalYellPromptText(direction), {
      reply_markup: {
        force_reply: true,
        selective: true,
        input_field_placeholder: verticalYellPromptPlaceholder(direction),
      },
    });
  });
}
