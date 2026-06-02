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
import { notifyPlayerObservers, playerSleepObserverText, playerTutorialSleepObserverText, playerTutorialWakeObserverText, playerWakeObserverText } from "../services/playerVisibility";
import { startOrdinarySleep, wakeOrdinarySleep } from "../services/sleep";
import { buildLyingPostureKeyboard, buildWakeUpKeyboard } from "../ui/keyboards";
import { buildDaypartNoticeHintKeyboard, recordOrdinaryWakeAndClaimDaypartHint } from "../services/playerNotificationSettings";

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
    return void (await ctx.reply("Звичайний сон ще не вплетений у правила світу. Для повторення використайте <i>навчальний сон</i> (/sleep_tutorial).", {
      parse_mode: "HTML",
      reply_markup: buildTutorialSleepKeyboard(),
    }));
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

async function ordinarySleep(bot: Bot, ctx: any) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  await disablePlayerAuto(ctx.from.id);
  const result = await startOrdinarySleep(player.id);
  if (!result) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  await ctx.reply(result.message, {
    reply_markup: result.changed ? buildWakeUpKeyboard() : await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
  });
  if (result.changed) {
    await notifyPlayerObservers(bot, {
      playerId: player.id,
      locationId: result.locationId ?? player.currentLocationId,
      observerText: playerSleepObserverText,
    });
  }
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

export async function submitSleepCommand(bot: Bot, ctx: any, tutorial = false) {
  return tutorial ? sleepTutorial(bot, ctx, true) : ordinarySleep(bot, ctx);
}

export async function submitWakeCommand(bot: Bot, ctx: any) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const ordinary = await wakeOrdinarySleep(player.id);
  if (ordinary?.changed) {
    await ctx.reply(ordinary.message, { reply_markup: buildLyingPostureKeyboard() });
    await notifyPlayerObservers(bot, {
      playerId: player.id,
      locationId: ordinary.locationId ?? player.currentLocationId,
      observerText: playerWakeObserverText,
    });
    const hint = await recordOrdinaryWakeAndClaimDaypartHint(player.id);
    if (hint) await ctx.reply(hint, { reply_markup: buildDaypartNoticeHintKeyboard() });
    return;
  }

  return wakeTutorial(bot, ctx);
}

export async function requestTutorialEnd(ctx: any) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  if (await hasCompletedTutorial(player.id)) {
    return void (await ctx.reply("Навчання вже завершено. Якщо хочеться повторити короткий сон, напишіть <i>навчальний сон</i> (/sleep_tutorial).", {
      parse_mode: "HTML",
      reply_markup: buildTutorialSleepKeyboard(),
    }));
  }

  await ctx.reply(TUTORIAL_END_CONFIRMATION_TEXT, { parse_mode: "HTML", reply_markup: buildTutorialEndConfirmKeyboard() });
}

async function confirmTutorialEnd(bot: Bot, ctx: any) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const result = await completeTutorialForPlayer(player.id);
  await ctx.reply(result.text, { parse_mode: "HTML", reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
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
    await submitSleepCommand(bot, ctx, arg === "tutorial");
  });

  bot.command("sleep_tutorial", async (ctx) => {
    await submitSleepCommand(bot, ctx, true);
  });

  bot.command(["tutorialEnd", "tutorialend", "tutorial_end"], async (ctx) => {
    await requestTutorialEnd(ctx);
  });

  bot.command(["wake", "wakeup", "open"], async (ctx) => {
    const command = ctx.message?.text?.split(/\s+/)[0]?.replace(/^\//, "").toLowerCase();
    if (command === "open") return openGate(ctx, commandArgs(ctx));
    return submitWakeCommand(bot, ctx);
  });

  bot.hears(["🌅 Прокинутися", "Прокинутися", "прокинутися"], (ctx) => submitWakeCommand(bot, ctx));
  bot.hears(["✅ Закінчити навчання", "Закінчити навчання", "завершити навчання"], (ctx) => requestTutorialEnd(ctx));
  bot.hears(["💬 Сказати «Відчинитися»", "Сказати «Відчинитися»", "сказати відчинитися"], (ctx) => sayOpenGatePhrase(bot, ctx));
  bot.hears(["🚪 Відкрити", "Відкрити", "відкрити"], (ctx) => openGate(ctx));

  bot.callbackQuery("tutorial:wake", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await wakeTutorial(bot, ctx);
  });

  bot.callbackQuery("sleep:wake", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await submitWakeCommand(bot, ctx);
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
    await submitSleepCommand(bot, ctx, ctx.callbackQuery.data === "tutorial:sleep");
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
