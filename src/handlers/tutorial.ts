import { Bot } from "grammy";
import { getPlayerByTelegramId } from "../services/players";
import { enterTutorialDream, hasCompletedTutorial, openDreamGate, wakeFromTutorialDream } from "../services/tutorial";
import { renderLocationBrief } from "../services/locations";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { safeAnswerCallbackQuery } from "../utils/telegram";

async function replyWithLocation(ctx: any, locationId: number, playerId: number) {
  const view = await renderLocationBrief(locationId, playerId);
  await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
}

async function sleepTutorial(ctx: any, forceTutorial = false) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  if (!forceTutorial && await hasCompletedTutorial(player.id)) {
    return void (await ctx.reply("Звичайний сон ще не вплетений у правила світу. Для навчального сну використайте /sleep tutorial."));
  }

  const result = await enterTutorialDream(player.id);
  await ctx.reply(result.text, { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
  await replyWithLocation(ctx, result.locationId, player.id);
}

async function wakeTutorial(ctx: any) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const result = await wakeFromTutorialDream(player.id);
  await ctx.reply(result.text, { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
  if (result.woke) await replyWithLocation(ctx, result.locationId, player.id);
}

async function openGate(ctx: any) {
  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const text = await openDreamGate(player.id);
  await ctx.reply(text, { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
}

export function registerTutorialHandlers(bot: Bot) {
  bot.command("sleep", async (ctx) => {
    const arg = ctx.message?.text?.split(/\s+/).slice(1).join(" ").trim().toLowerCase();
    await sleepTutorial(ctx, arg === "tutorial");
  });

  bot.command(["wake", "wakeup", "open"], async (ctx) => {
    const command = ctx.message?.text?.split(/\s+/)[0]?.replace(/^\//, "").toLowerCase();
    if (command === "open") return openGate(ctx);
    return wakeTutorial(ctx);
  });

  bot.hears(["🌅 Прокинутися", "Прокинутися", "прокинутися"], wakeTutorial);
  bot.hears(["🚪 Відкрити", "Відкрити", "відкрити"], openGate);

  bot.callbackQuery("tutorial:wake", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await wakeTutorial(ctx);
  });

  bot.callbackQuery("tutorial:openGate", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await openGate(ctx);
  });
}
