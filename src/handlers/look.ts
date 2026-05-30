import { Bot } from "grammy";
import { actionDurationMs, performOrQueuePlayerAction } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { lightLocationCampfire, renderDepletedVegetationInspection, renderLocationBrief, renderLocationDetails, renderLocationFeatureInteraction, renderLocationFeatureInteractionByQuery, takeTorchFromLocationFeature } from "../services/locations";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { durationSecondsSuffix } from "../utils/durationText";
import { addTwigsToCampfire, lightPlayerTorchAtCampfire } from "../services/fire";
import { isPickableResourceKey, isTutorialLooseResourceKey, pickUpAllVisibleGroundResourcesByKey, pickUpGroundResource, type VisibleGroundResourceKey } from "../services/groundItems";
import { pickupObserverText, recordVisibleItemAction } from "../services/visibleItemActions";
import { escapeHtml } from "../utils/text";
import { canEditCallbackMessage, noteKnownMessage } from "../utils/messageTracker";
import { assertCanPerformPhysicalAction } from "../services/postureRules";
import { replyToActionError, actionErrorMessage } from "../utils/actionErrorReply";
import { rememberTutorialCommandHintIfInTutorial } from "../services/tutorial";
import { inventoryGainReplyOptions } from "../utils/tutorialInventory";
import { spendPlayerStaminaAmount } from "../services/actionRecovery";

function pickedItemsAmount(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + Math.max(0, item.amount), 0);
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

  async function examineCurrentLocation(ctx: any) {
    const from = ctx.from;
    if (!from) return;

    const arg = String(ctx.message?.text ?? "").replace(/^\/examine(?:@\w+)?/i, "").trim().toLowerCase();
    if (["tracks", "track", "сліди", "слід"].includes(arg)) return examineTracks(ctx);
    if (["grass", "depleted grass", "vegetation", "трава", "траву", "винищена трава", "винищену траву", "відновлення"].includes(arg)) return examineVegetation(ctx);

    const player = await getPlayerByTelegramId(from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    if (arg && player.currentLocationId) {
      const view = await renderLocationFeatureInteractionByQuery(player.currentLocationId, player.id, arg);
      if (view) {
        await rememberTutorialCommandHintIfInTutorial(player.id, "examine", player.currentLocationId);
        await replyAndTrack(ctx, view.text, { reply_markup: view.keyboard });
        await sendVoiceQuoteMessages(ctx, "quoteMessages" in view ? (view as any).quoteMessages : undefined);
        await sendHtmlFollowupMessages(ctx, "followupMessages" in view ? (view as any).followupMessages : undefined);
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

  bot.command("examine", examineCurrentLocation);

  bot.hears(["🔎 Роздивитися", "👁 Роздивитися", "Роздивитися"], examineCurrentLocation);

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
    await editCallbackMessageOrReply(ctx, view.text, { reply_markup: view.keyboard });
    await sendVoiceQuoteMessages(ctx, "quoteMessages" in view ? view.quoteMessages : undefined);
    await sendHtmlFollowupMessages(ctx, "followupMessages" in view ? view.followupMessages : undefined);
  });

  bot.callbackQuery(/^fire:addTwigs:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      assertCanPerformPhysicalAction(player, "FIRE");
      const text = await addTwigsToCampfire(player.id, Number(ctx.match[1]));
      await safeAnswerCallbackQuery(ctx);
      await ctx.reply(text);
    } catch (error) {
      const message = actionErrorMessage(error, "Не вдалося підкинути хмиз.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося підкинути хмиз.", { replyFallback: false });
    }
  });

  bot.callbackQuery(/^fire:light:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      assertCanPerformPhysicalAction(player, "FIRE");
      const text = await lightLocationCampfire(Number(ctx.match[1]), player.id);
      await safeAnswerCallbackQuery(ctx);
      await ctx.reply(text, await inventoryGainReplyOptions(player, "take-torch"));
    } catch (error) {
      const message = actionErrorMessage(error, "Не вдалося запалити вогонь.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося запалити вогонь.", { replyFallback: false });
    }
  });

  bot.callbackQuery(/^torch:light:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
      assertCanPerformPhysicalAction(player, "TORCH");
      const text = await lightPlayerTorchAtCampfire(player.id, Number(ctx.match[1]));
      await safeAnswerCallbackQuery(ctx);
      await ctx.reply(text);
    } catch (error) {
      const message = actionErrorMessage(error, "Не вдалося запалити факел.");
      await safeAnswerCallbackQuery(ctx, message);
      await replyToActionError(ctx, error, "Не вдалося запалити факел.", { replyFallback: false });
    }
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
          eventTitle: "Player took torch",
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

}
