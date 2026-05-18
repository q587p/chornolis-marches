import { Bot } from "grammy";
import { gatherConfig } from "../gameConfig";
import { actionDurationMs, performOrQueuePlayerAction, gatherDurationMs } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { buildGatherMenuForLocation } from "../services/locations";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";

type GatherKey = "berries" | "mushrooms" | "herbs";

const GATHER_ALIASES: Record<string, GatherKey> = {
  berries: "berries",
  berry: "berries",
  ягоди: "berries",
  ягід: "berries",
  mushrooms: "mushrooms",
  mushroom: "mushrooms",
  гриби: "mushrooms",
  грибів: "mushrooms",
  herbs: "herbs",
  herb: "herbs",
  трави: "herbs",
  трав: "herbs",
};

async function submitGather(bot: Bot, ctx: any, resourceKey?: GatherKey, answerCallback = false) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) {
    if (answerCallback) await safeAnswerCallbackQuery(ctx);
    return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  }

  if (resourceKey && !gatherConfig[resourceKey]) {
    if (answerCallback) await safeAnswerCallbackQuery(ctx, "Невідомий матеріял.");
    else await ctx.reply("Невідомий матеріял.");
    return;
  }

  const type = resourceKey ? "GATHER_SPECIFIC" : "GATHER";
  const durationMs = resourceKey ? gatherDurationMs(resourceKey) : actionDurationMs("GATHER", player.stamina);

  try {
    const result = await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type,
      payload: resourceKey ? { resourceKey } : {},
      durationMs,
      chatId: ctx.chat?.id,
      messageId: ctx.callbackQuery?.message?.message_id,
    });

    const text = result.mode === "immediate" ? "Ви почали пошук." : `Додано в чергу (${Math.ceil(durationMs / 1000)} с).`;
    if (answerCallback) await safeAnswerCallbackQuery(ctx, text);
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося виконати дію.";
    if (answerCallback) await safeAnswerCallbackQuery(ctx, message);
    else await ctx.reply(message);
  }
}

export function registerGatherHandlers(bot: Bot) {
  bot.command("gather", async (ctx) => {
    const arg = String(ctx.match || "").trim().toLowerCase();
    const resourceKey = arg ? GATHER_ALIASES[arg] : undefined;
    if (arg && !resourceKey) {
      await ctx.reply("Не знаю, що саме збирати. Спробуйте /gather, /gather herbs, /gather berries або /gather mushrooms.");
      return;
    }
    await submitGather(bot, ctx, resourceKey, false);
  });

  bot.callbackQuery("gather:menu", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const keyboard = await buildGatherMenuForLocation(player.currentLocationId);
    await safeAnswerCallbackQuery(ctx);

    try {
      await ctx.editMessageText("Що саме зібрати?", { reply_markup: keyboard });
    } catch {
      await ctx.reply("Що саме зібрати?", { reply_markup: keyboard });
    }
  });

  bot.callbackQuery(/^gather:(berries|mushrooms|herbs)$/, async (ctx) => {
    await submitGather(bot, ctx, ctx.match[1] as GatherKey, true);
  });
}
