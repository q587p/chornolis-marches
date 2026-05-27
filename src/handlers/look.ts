import { Bot } from "grammy";
import { actionDurationMs, performOrQueuePlayerAction } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { lightLocationCampfire, renderDepletedVegetationInspection, renderLocationBrief, renderLocationDetails, renderLocationFeatureInteraction, takeTorchFromLocationFeature } from "../services/locations";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { durationSecondsSuffix } from "../utils/durationText";
import { addTwigsToCampfire, lightPlayerTorchAtCampfire } from "../services/fire";
import { pickUpGroundResource } from "../services/groundItems";
import { pickupObserverText, recordVisibleItemAction } from "../services/visibleItemActions";

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
    try {
      await ctx.editMessageText(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    } catch {
      await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    }
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
    try {
      await ctx.editMessageText(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    } catch {
      await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    }
  });


  bot.callbackQuery(/^feature:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const view = await renderLocationFeatureInteraction(Number(ctx.match[1]), player.id);
    await safeAnswerCallbackQuery(ctx);
    if (!view) return void (await ctx.reply("Цього вже не видно поруч."));

    try {
      await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
    } catch {
      await ctx.reply(view.text, { reply_markup: view.keyboard });
    }
  });

  bot.callbackQuery(/^fire:addTwigs:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const text = await addTwigsToCampfire(player.id, Number(ctx.match[1]));
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply(text);
  });

  bot.callbackQuery(/^fire:light:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const text = await lightLocationCampfire(Number(ctx.match[1]), player.id);
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply(text);
  });

  bot.callbackQuery(/^torch:light:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const text = await lightPlayerTorchAtCampfire(player.id, Number(ctx.match[1]));
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply(text);
  });

  bot.callbackQuery(/^torch:take:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

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
    }
    await ctx.reply(text);
  });

  bot.callbackQuery(/^item:pickup:(\d+)$/, async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    try {
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
      await ctx.reply(`Ви підняли ${item.name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не вдалося підняти це.";
      await safeAnswerCallbackQuery(ctx, message);
    }
  });

}
