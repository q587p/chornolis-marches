import { Bot, InlineKeyboard } from "grammy";
import { getPlayerByTelegramId } from "../services/players";
import { completeTutorialForPlayer, enterTutorialDream, hasCompletedTutorial, openDreamGate, TUTORIAL_END_CONFIRMATION_TEXT, wakeFromTutorialDream } from "../services/tutorial";
import { renderLocationBrief } from "../services/locations";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { actionDurationMs, performOrQueuePlayerAction } from "../services/actionQueue";
import { parseSpeechTarget } from "../services/speechTargets";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { disablePlayerAuto } from "./auto";
import { notifyPlayerObservers, playerTutorialSleepObserverText, playerTutorialWakeObserverText } from "../services/playerVisibility";

function buildTutorialSleepKeyboard() {
  return new InlineKeyboard().text("🌙 Навчальний сон", "tutorial:sleep");
}

function buildTutorialEndConfirmKeyboard() {
  return new InlineKeyboard()
    .text("✅ Закінчити навчання", "tutorial:end:confirm")
    .row()
    .text("↩️ Ще лишитися у сні", "tutorial:end:cancel");
}

async function replyWithLocation(ctx: any, locationId: number, playerId: number) {
  const view = await renderLocationBrief(locationId, playerId);
  await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
}

async function sleepTutorial(bot: Bot, ctx: any, forceTutorial = false) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  if (!forceTutorial && await hasCompletedTutorial(player.id)) {
    return void (await ctx.reply("Звичайний сон ще не вплетений у правила світу. Для навчального сну використайте /sleep tutorial.", { reply_markup: buildTutorialSleepKeyboard() }));
  }

  await disablePlayerAuto(ctx.from.id);
  const result = await enterTutorialDream(player.id);
  await ctx.reply(result.text, { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
  if (result.entered) {
    await notifyPlayerObservers(bot, {
      playerId: player.id,
      locationId: result.fromLocationId,
      observerText: playerTutorialSleepObserverText,
    });
  }
  await replyWithLocation(ctx, result.locationId, player.id);
}

async function wakeTutorial(bot: Bot, ctx: any) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const result = await wakeFromTutorialDream(player.id);
  await ctx.reply(result.text, { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
  if (result.woke) {
    await notifyPlayerObservers(bot, {
      playerId: player.id,
      locationId: result.locationId,
      observerText: playerTutorialWakeObserverText,
    });
    await replyWithLocation(ctx, result.locationId, player.id);
  }
}

export async function requestTutorialEnd(ctx: any) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  if (await hasCompletedTutorial(player.id)) {
    return void (await ctx.reply("Навчання вже завершено. Якщо хочеться повторити короткий сон, напишіть /sleep tutorial.", {
      reply_markup: buildTutorialSleepKeyboard(),
    }));
  }

  await ctx.reply(TUTORIAL_END_CONFIRMATION_TEXT, { reply_markup: buildTutorialEndConfirmKeyboard() });
}

async function confirmTutorialEnd(bot: Bot, ctx: any) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const result = await completeTutorialForPlayer(player.id);
  await ctx.reply(result.text, { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
  if (result.woke) {
    await notifyPlayerObservers(bot, {
      playerId: player.id,
      locationId: result.locationId,
      observerText: playerTutorialWakeObserverText,
    });
    await replyWithLocation(ctx, result.locationId, player.id);
  }
}

function commandArgs(ctx: any) {
  return ctx.message?.text?.split(/\s+/).slice(1).join(" ").trim() || undefined;
}

async function openGate(ctx: any, target?: string) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const text = await openDreamGate(player.id, target);
  await ctx.reply(text, { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
}

async function sayOpenGatePhrase(bot: Bot, ctx: any) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const text = "Відчинитися";
  const durationMs = actionDurationMs("SAY", player.stamina);
  try {
    const payload = await parseSpeechTarget(text, player.currentLocationId, player.id);
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "SAY", payload, durationMs, chatId: ctx.chat?.id });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося виконати дію.");
  }
}

export function registerTutorialHandlers(bot: Bot) {
  bot.command("sleep", async (ctx) => {
    const arg = ctx.message?.text?.split(/\s+/).slice(1).join(" ").trim().toLowerCase();
    await sleepTutorial(bot, ctx, arg === "tutorial");
  });

  bot.command("sleep_tutorial", async (ctx) => {
    await sleepTutorial(bot, ctx, true);
  });

  bot.command(["tutorialEnd", "tutorialend", "tutorial_end"], async (ctx) => {
    await requestTutorialEnd(ctx);
  });

  bot.command(["wake", "wakeup", "open"], async (ctx) => {
    const command = ctx.message?.text?.split(/\s+/)[0]?.replace(/^\//, "").toLowerCase();
    if (command === "open") return openGate(ctx, commandArgs(ctx));
    return wakeTutorial(bot, ctx);
  });

  bot.hears(["🌅 Прокинутися", "Прокинутися", "прокинутися"], (ctx) => wakeTutorial(bot, ctx));
  bot.hears(["✅ Закінчити навчання", "Закінчити навчання", "завершити навчання"], (ctx) => requestTutorialEnd(ctx));
  bot.hears(["💬 Сказати «Відчинитися»", "Сказати «Відчинитися»", "сказати відчинитися"], (ctx) => sayOpenGatePhrase(bot, ctx));
  bot.hears(["🚪 Відкрити", "Відкрити", "відкрити"], (ctx) => openGate(ctx));

  bot.callbackQuery("tutorial:wake", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await wakeTutorial(bot, ctx);
  });

  bot.callbackQuery("tutorial:end", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await requestTutorialEnd(ctx);
  });

  bot.callbackQuery("tutorial:end:confirm", async (ctx) => {
    await safeAnswerCallbackQuery(ctx, "Навчання завершено.");
    await confirmTutorialEnd(bot, ctx);
  });

  bot.callbackQuery("tutorial:end:cancel", async (ctx) => {
    await safeAnswerCallbackQuery(ctx, "Лишаємося у сні.");
    await ctx.reply("Ви лишаєтеся в навчальному сні. Сон не квапить: можна ще озирнутися, роздивитися місцину або пройтися стежкою.", {
      reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
    });
  });

  bot.callbackQuery(["tutorial:sleep", "character:sleep"], async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await sleepTutorial(bot, ctx, ctx.callbackQuery.data === "tutorial:sleep");
  });

  bot.callbackQuery("tutorial:openGate", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await openGate(ctx);
  });

  bot.callbackQuery("tutorial:sayOpenGate", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await sayOpenGatePhrase(bot, ctx);
  });
}
