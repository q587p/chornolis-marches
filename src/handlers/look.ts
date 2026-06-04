import { Bot } from "grammy";
import type { Prisma, WorldActionType } from "@prisma/client";
import { actionDurationMs, performOrQueuePlayerAction, renderPlayerActionQueue } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { renderDepletedVegetationInspection, renderLocationBrief, renderLocationDetails, renderLocationFeatureInteraction, renderLocationFeatureInteractionByQuery, shakeTreeFeature, takeTorchFromLocationFeature } from "../services/locations";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { actionQueueReplyOptions, sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { durationSecondsSuffix } from "../utils/durationText";
import { addVisibleCorpsesToInventory } from "../services/corpses";
import { isPickableResourceKey, isTutorialLooseResourceKey, pickUpAllVisibleGroundResources, pickUpAllVisibleGroundResourcesByKey, pickUpGroundResource, type VisibleGroundResourceKey } from "../services/groundItems";
import { pickupObserverText, recordVisibleItemAction } from "../services/visibleItemActions";
import { escapeHtml } from "../utils/text";
import { canEditCallbackMessage, noteKnownMessage } from "../utils/messageTracker";
import { assertCanPerformPhysicalAction } from "../services/postureRules";
import { replyToActionError, actionErrorMessage } from "../utils/actionErrorReply";
import { rememberTutorialCommandHintIfInTutorial } from "../services/tutorial";
import { tutorialActionHintComment } from "../services/tutorialVoices";
import { inventoryGainReplyOptions } from "../utils/tutorialInventory";
import { spendPlayerStaminaAmount } from "../services/actionRecovery";
import { firstNightGuidanceForPlayer } from "../services/beginnerGuidance";
import { maybeTriggerPassiveApiarySting } from "../services/apiaryHazards";
import { contributeToBeginnerCache, takeFromBeginnerCache } from "../services/beginnerCache";
import { queueAllBeginnerCacheContributions } from "../services/beginnerCacheQueue";
import { campfireBuildConfirmationText, TORCH_SOURCE_TAKE_EVENT_TITLE } from "../services/fire";
import { buildWetCampfireConfirmKeyboard } from "../ui/fireKeyboards";
import { putInventoryIntoLocalFeature } from "../services/carcassDropoff";
import { playerForms } from "../services/grammar";
import { enterAttentionRootGap } from "../services/attentionGatedLocation";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";

function pickedItemsAmount(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + Math.max(0, item.amount), 0);
}

function pickedItemsText(items: Array<{ name: string; amount: number }>) {
  return items.map((item) => `${item.name}${item.amount > 1 ? ` ×${item.amount}` : ""}`).join(", ");
}

function isNoPickableNearbyError(error: unknown) {
  return error instanceof Error && error.message.includes("Поруч немає");
}

function quoteBlock(text: string) {
  return `<blockquote>${escapeHtml(text)}</blockquote>`;
}

async function replyAndTrack(ctx: any, text: string, options?: any) {
  const message = await ctx.reply(text, options);
  noteKnownMessage(message);
  return message;
}

async function editCallbackMessageOrReply(ctx: any, text: string, options?: any) {
  if (canEditCallbackMessage(ctx)) {
    try {
      await ctx.editMessageText(text, options);
      noteKnownMessage(ctx.callbackQuery?.message);
      return;
    } catch {
      // Fall back to a new message if Telegram cannot edit the source message.
    }
  }

  await replyAndTrack(ctx, text, options);
}

async function sendVoiceQuoteMessages(ctx: any, messages?: Array<{ title: string; text: string }>) {
  for (const message of messages ?? []) {
    await replyAndTrack(ctx, `${escapeHtml(message.title)}:\n${quoteBlock(message.text)}`, { parse_mode: "HTML" });
  }
}

async function sendHtmlFollowupMessages(ctx: any, messages?: Array<{ text: string }>) {
  for (const message of messages ?? []) {
    await replyAndTrack(ctx, message.text, { parse_mode: "HTML" });
  }
}

async function sendVoiceComment(ctx: any, comment: { title: string; text: string } | null) {
  if (!comment) return;
  await replyAndTrack(ctx, `${escapeHtml(comment.title)}:\n${quoteBlock(comment.text)}`, { parse_mode: "HTML" });
}

async function sendFirstNightGuidance(ctx: any, playerId: number, locationId: number | null | undefined) {
  const text = await firstNightGuidanceForPlayer(playerId, locationId);
  if (text) await replyAndTrack(ctx, text);
}

async function submitFeatureQueuedAction(
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
    await safeAnswerCallbackQuery(ctx, result.mode === "queued" ? `Додано в чергу${durationSecondsSuffix(player, durationMs)}.` : undefined);
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    const message = actionErrorMessage(error, fallback);
    await safeAnswerCallbackQuery(ctx, message);
    await replyToActionError(ctx, error, fallback, { replyFallback: false });
  }
}

type ExamineCurrentLocationHandler = (ctx: any, targetArg?: string) => Promise<unknown>;

let registeredExamineCurrentLocation: ExamineCurrentLocationHandler | null = null;

export async function runExamineCurrentLocation(ctx: any, targetArg = "") {
  if (!registeredExamineCurrentLocation) {
    throw new Error("Examine handlers are not registered");
  }
  return registeredExamineCurrentLocation(ctx, targetArg);
}

export function registerLookHandlers(bot: Bot) {
  async function examineTracks(ctx: any) {
    const from = ctx.from;
    if (!from) return;

    const player = await getPlayerByTelegramId(from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const durationMs = actionDurationMs("TRACK", player.stamina);
    try {
      const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "TRACK", payload: { detail: true }, durationMs, chatId: ctx.chat?.id, interruptQueued: true });
      await ctx.reply(result.mode === "immediate" ? "Ви вдивляєтесь у сліди." : `Пошук слідів додано в чергу${durationSecondsSuffix(player, durationMs)}.`);
      await sendActionSubmitFeedback(ctx, player.id, result);
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося додати дію.");
    }
  }

  async function examineVegetation(ctx: any) {
    const from = ctx.from;
    if (!from) return;

    const player = await getPlayerByTelegramId(from.id);
    if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const view = await renderDepletedVegetationInspection(player.currentLocationId, player.id);
    if (!view) return void (await ctx.reply("Тут не видно винищеної трави, яку можна оцінити."));
    await ctx.reply(view.text, { reply_markup: view.keyboard });
  }

  async function examineCurrentLocation(ctx: any, targetArg?: string) {
    const from = ctx.from;
    if (!from) return;

    const arg = (targetArg ?? String(ctx.message?.text ?? "").replace(/^\/examine(?:@\w+)?/i, "")).trim().toLowerCase();
    if (["tracks", "track", "сліди", "слід"].includes(arg)) return examineTracks(ctx);
    if (["grass", "depleted grass", "vegetation", "трава", "траву", "винищена трава", "винищену траву", "відновлення"].includes(arg)) return examineVegetation(ctx);

    const player = await getPlayerByTelegramId(from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    if (arg && player.currentLocationId) {
      const view = await renderLocationFeatureInteractionByQuery(player.currentLocationId, player.id, arg);
      if (view) {
        await rememberTutorialCommandHintIfInTutorial(player.id, "examine", player.currentLocationId);
        await replyAndTrack(ctx, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
        await sendVoiceQuoteMessages(ctx, "quoteMessages" in view ? (view as any).quoteMessages : undefined);
        await sendHtmlFollowupMessages(ctx, "followupMessages" in view ? (view as any).followupMessages : undefined);
        await sendVoiceComment(ctx, await tutorialActionHintComment(player, "examine"));
        await maybeTriggerPassiveApiarySting(bot, { playerId: player.id, locationId: player.currentLocationId, chatId: ctx.chat?.id, reason: "look" });
        return;
      }
    }

    const durationMs = actionDurationMs("LOOK", player.stamina);
    try {
      const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "LOOK", payload: {}, durationMs, chatId: ctx.chat?.id });
      await sendActionSubmitFeedback(ctx, player.id, result);
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося виконати дію.");
    }
  }

  registeredExamineCurrentLocation = examineCurrentLocation;

  bot.command("examine", (ctx) => examineCurrentLocation(ctx));

  bot.hears(["🔎 Роздивитися", "👁 Роздивитися", "Роздивитися"], (ctx) => examineCurrentLocation(ctx));

  bot.callbackQuery(["examine", "look"], async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const durationMs = actionDurationMs("LOOK", player.stamina);
    try {
      const result = await performOrQueuePlayerAction(bot, {
        playerId: player.id,
        type: "LOOK",
        payload: {},
        durationMs,
        chatId: ctx.chat?.id,
        messageId: ctx.callbackQuery.message?.message_id,
      });
      await safeAnswerCallbackQuery(ctx, result.mode === "immediate" ? "Ви роздивляєтесь." : `Роздивляння додано в чергу${durationSecondsSuffix(player, durationMs)}.`);
      await sendActionSubmitFeedback(ctx, player.id, result);
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося виконати дію.");
    }
  });
  bot.callbackQuery("location:details", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const view = await renderLocationDetails(player.currentLocationId, player.id);
    await safeAnswerCallbackQuery(ctx);
    await editCallbackMessageOrReply(ctx, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    await sendVoiceComment(ctx, await tutorialActionHintComment(player, "examine"));
    await sendFirstNightGuidance(ctx, player.id, player.currentLocationId);
    await maybeTriggerPassiveApiarySting(bot, { playerId: player.id, locationId: player.currentLocationId, chatId: ctx.chat?.id, reason: "look" });
  });

  bot.callbackQuery("location:brief", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const view = await renderLocationBrief(player.currentLocationId, player.id);
    await safeAnswerCallbackQuery(ctx);
    await editCallbackMessageOrReply(ctx, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    await sendVoiceComment(ctx, await tutorialActionHintComment(player, "look"));
    await sendFirstNightGuidance(ctx, player.id, player.currentLocationId);
  });

  bot.callbackQuery("targetPage:noop", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
  });

  bot.callbackQuery(/^targetPage:(brief|details):(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const mode = ctx.match[1];
    const page = Number(ctx.match[2]);
    const view =
      mode === "brief"
        ? await renderLocationBrief(player.currentLocationId, player.id, { targetPage: page })
        : await renderLocationDetails(player.currentLocationId, player.id, { targetPage: page });

    await safeAnswerCallbackQuery(ctx);
    await editCallbackMessageOrReply(ctx, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  });


  bot.callbackQuery(/^feature:(\d+)(?::(brief|details))?$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const view = await renderLocationFeatureInteraction(Number(ctx.match[1]), player.id, ctx.match[2] === "brief" ? "brief" : "details");
    await safeAnswerCallbackQuery(ctx);
    if (!view) return void (await ctx.reply("Цього вже не видно поруч."));

    await rememberTutorialCommandHintIfInTutorial(player.id, "examine", player.currentLocationId);
    await editCallbackMessageOrReply(ctx, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    await sendVoiceQuoteMessages(ctx, "quoteMessages" in view ? view.quoteMessages : undefined);
    await sendHtmlFollowupMessages(ctx, "followupMessages" in view ? view.followupMessages : undefined);
    await sendVoiceComment(ctx, await tutorialActionHintComment(player, "examine"));
    if (player.currentLocationId) await maybeTriggerPassiveApiarySting(bot, { playerId: player.id, locationId: player.currentLocationId, chatId: ctx.chat?.id, reason: "look" });
  });

  bot.callbackQuery(/^attentionGate:rootGap:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      const result = await enterAttentionRootGap(bot, {
        playerId: player.id,
        featureId: Number(ctx.match[1]),
      });
      await safeAnswerCallbackQuery(ctx, result.ok ? "Ви пролазите нижче коріння." : result.text);
      if (!result.ok) return void (await ctx.reply(result.text));

      const view = await renderLocationBrief(result.destinationLocationId, player.id);
      await editCallbackMessageOrReply(ctx, result.text, { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
      await replyAndTrack(ctx, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося пролізти крізь щілину.");
      await replyToActionError(ctx, error, "Не вдалося пролізти крізь щілину.", { replyFallback: false });
    }
  });

  bot.callbackQuery("fire:build", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      const confirmationText = await campfireBuildConfirmationText(player.id);
      if (confirmationText) {
        await safeAnswerCallbackQuery(ctx);
        return void (await editCallbackMessageOrReply(ctx, confirmationText, { reply_markup: buildWetCampfireConfirmKeyboard() }));
      }

      await submitFeatureQueuedAction(bot, ctx, player, "BUILD_CAMPFIRE", {}, "Не вдалося скласти вогнище.");
    } catch (error) {
      const message = actionErrorMessage(error, "Не вдалося скласти вогнище.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося скласти вогнище.", { replyFallback: false });
    }
  });

  bot.callbackQuery("fire:build:confirmWet", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await submitFeatureQueuedAction(bot, ctx, player, "BUILD_CAMPFIRE", { confirmWet: true }, "Не вдалося скласти вогнище.");
  });

  bot.callbackQuery(/^fire:addTwigs:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await submitFeatureQueuedAction(bot, ctx, player, "ADD_TWIGS", { featureId: Number(ctx.match[1]) }, "Не вдалося підкинути хмиз.");
  });

  bot.callbackQuery(/^fire:douse:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await submitFeatureQueuedAction(bot, ctx, player, "DOUSE_CAMPFIRE", { featureId: Number(ctx.match[1]) }, "Не вдалося погасити вогнище.");
  });

  bot.callbackQuery(/^fire:dismantle:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await submitFeatureQueuedAction(bot, ctx, player, "DISMANTLE_CAMPFIRE", { featureId: Number(ctx.match[1]) }, "Не вдалося розібрати вогнище.");
  });

  bot.callbackQuery(/^totem:dismantle:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await submitFeatureQueuedAction(bot, ctx, player, "DISMANTLE_TOTEM", { featureId: Number(ctx.match[1]) }, "Не вдалося розібрати тотем.");
  });

  bot.callbackQuery(/^apiary:raid:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await submitFeatureQueuedAction(bot, ctx, player, "RAID_APIARY", { featureId: Number(ctx.match[1]) }, "Не вдалося дістати мед із борті.");
  });

  bot.callbackQuery(/^fire:light:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await submitFeatureQueuedAction(bot, ctx, player, "LIGHT_CAMPFIRE", { featureId: Number(ctx.match[1]) }, "Не вдалося запалити вогонь.");
  });

  bot.callbackQuery(/^torch:light:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await submitFeatureQueuedAction(bot, ctx, player, "LIGHT_TORCH", { featureId: Number(ctx.match[1]) }, "Не вдалося запалити факел.");
  });

  bot.callbackQuery(/^torch:take:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      const text = await takeTorchFromLocationFeature(Number(ctx.match[1]), player.id);
      await safeAnswerCallbackQuery(ctx);
      if (player.currentLocationId && text.includes("Ви взяли")) {
        await recordVisibleItemAction(bot, {
          playerId: player.id,
          locationId: player.currentLocationId,
          observerText: pickupObserverText(player, "факел"),
          eventTitle: TORCH_SOURCE_TAKE_EVENT_TITLE,
          eventDescription: `player=${player.id}; item=torch; source=feature:${ctx.match[1]}`,
          actionNote: "піднято: факел",
        });
        await spendPlayerStaminaAmount(bot, player.id, 1, ctx.chat?.id);
      }
      await ctx.reply(text);
    } catch (error) {
      const message = actionErrorMessage(error, "Не вдалося взяти факел.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося взяти факел.", { replyFallback: false });
    }
  });

  bot.callbackQuery(/^tree:shake:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      assertCanPerformPhysicalAction(player, "GATHER");
      const text = await shakeTreeFeature(Number(ctx.match[1]), player.id);
      await safeAnswerCallbackQuery(ctx);
      await ctx.reply(text);
    } catch (error) {
      const message = actionErrorMessage(error, "Не вдалося потрусити дерево.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося потрусити дерево.", { replyFallback: false });
    }
  });

  bot.callbackQuery(/^cache:take:(\d+):([A-Za-z0-9_-]+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      const result = await takeFromBeginnerCache(player.id, Number(ctx.match[1]), ctx.match[2]);
      await safeAnswerCallbackQuery(ctx, "Взято.");
      await spendPlayerStaminaAmount(bot, player.id, 1, ctx.chat?.id);
      await ctx.reply(result.text, await inventoryGainReplyOptions(player, `cache:${result.key}`));
    } catch (error) {
      const message = actionErrorMessage(error, "Не вдалося взяти річ зі скрині.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося взяти річ зі скрині.", { replyFallback: false });
    }
  });

  bot.callbackQuery(/^cache:contribute:(\d+):([A-Za-z0-9_-]+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      const result = await contributeToBeginnerCache(player.id, Number(ctx.match[1]), ctx.match[2]);
      await safeAnswerCallbackQuery(ctx, "Лишено.");
      await spendPlayerStaminaAmount(bot, player.id, 1, ctx.chat?.id);
      await ctx.reply(result.text);
    } catch (error) {
      const message = actionErrorMessage(error, "Не вдалося лишити річ у скрині.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося лишити річ у скрині.", { replyFallback: false });
    }
  });

  bot.callbackQuery(/^cache:contribute_all:(\d+):([A-Za-z0-9_-]+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      const result = await queueAllBeginnerCacheContributions(bot, player, Number(ctx.match[1]), ctx.match[2], "all", ctx.chat?.id);
      await safeAnswerCallbackQuery(ctx, `Додано в чергу: ${result.count}.`);
      const queueText = await renderPlayerActionQueue(player.id);
      const queueLimitText = result.limitedByQueue ? "\n\nЧерга взяла не все: у плані дій уже тісно." : "";
      const capacityText = result.limitedByCapacity ? "\n\nСкриня візьме не все: для цього запасу там лишилося не так багато місця." : "";
      await ctx.reply(
        `Додано до спільної скрині: ${result.count}. Будете лишати ${result.label} по одній речі${durationSecondsSuffix(player, result.durationMs)}.${queueLimitText}${capacityText}\n\n${queueText}`,
        await actionQueueReplyOptions(player.id),
      );
    } catch (error) {
      const message = actionErrorMessage(error, "Не вдалося лишити все у скрині.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося лишити все у скрині.", { replyFallback: false });
    }
  });

  bot.callbackQuery(/^dropoff:put:(\d+):(one|all)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      assertCanPerformPhysicalAction(player, "PUT");
      const result = await putInventoryIntoLocalFeature({
        playerId: player.id,
        itemQuery: "туша",
        amount: ctx.match[2] === "all" ? "all" : undefined,
        containerQuery: "рів",
        featureId: Number(ctx.match[1]),
      });
      await safeAnswerCallbackQuery(ctx, "Покладено.");
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
      const message = actionErrorMessage(error, "Не вдалося покласти це до рову.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося покласти це до рову.", { replyFallback: false });
    }
  });

  bot.callbackQuery(/^item:pickup:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      const item = await pickUpGroundResource(player.id, Number(ctx.match[1]));
      await safeAnswerCallbackQuery(ctx, "Підібрано.");
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
      const message = error instanceof Error ? error.message : "Не вдалося підняти це.";
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося підняти це.", { replyFallback: false });
    }
  });

  bot.callbackQuery(/^item:pickupAll:([A-Za-z0-9_-]+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const key = ctx.match[1];
    if (!isPickableResourceKey(key) && !isTutorialLooseResourceKey(key)) {
      await safeAnswerCallbackQuery(ctx, "Це не можна підняти так.");
      return;
    }

    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      const result = await pickUpAllVisibleGroundResourcesByKey(player.id, key as VisibleGroundResourceKey);
      const itemText = result.items.map((item) => `${item.name}${item.amount > 1 ? ` ×${item.amount}` : ""}`).join(", ");
      const pickedAmount = pickedItemsAmount(result.items);
      await safeAnswerCallbackQuery(ctx, "Підібрано.");
      await recordVisibleItemAction(bot, {
        playerId: player.id,
        locationId: result.locationId,
        observerText: pickupObserverText(player, itemText),
        eventTitle: "Player picked up visible ground item stack",
        eventDescription: `player=${player.id}; items=${result.items.map((item) => `${item.key}:${item.amount}`).join(",")}`,
        actionNote: `піднято всі однотипні речі: ${itemText}`,
      });
      await spendPlayerStaminaAmount(bot, player.id, pickedAmount, ctx.chat?.id);
      await ctx.reply(`Ви підняли: ${itemText}.`, await inventoryGainReplyOptions(player, `pickup-all:${key}`));
    } catch (error) {
      const message = actionErrorMessage(error, "Не вдалося підняти це.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося підняти це.", { replyFallback: false });
    }
  });

  bot.callbackQuery("item:pickupEverything", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      const picked: Array<{ key: string; name: string; amount: number }> = [];
      let locationId = player.currentLocationId ?? 0;

      try {
        const result = await pickUpAllVisibleGroundResources(player.id);
        picked.push(...result.items);
        locationId = result.locationId;
      } catch (error) {
        if (!isNoPickableNearbyError(error)) throw error;
      }

      try {
        const result = await addVisibleCorpsesToInventory(player.id);
        picked.push(...result.items);
        locationId = result.locationId;
      } catch (error) {
        if (!isNoPickableNearbyError(error)) throw error;
      }

      if (!picked.length) throw new Error("Поруч немає речей, які можна підняти.");
      const text = pickedItemsText(picked);
      const pickedAmount = pickedItemsAmount(picked);
      await safeAnswerCallbackQuery(ctx, "Підібрано.");
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
      const message = actionErrorMessage(error, "Не вдалося підняти це.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося підняти це.", { replyFallback: false });
    }
  });

}
