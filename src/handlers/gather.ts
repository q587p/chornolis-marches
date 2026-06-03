import { Bot } from "grammy";
import { gatherConfig } from "../gameConfig";
import { actionDurationMs, performOrQueuePlayerAction, gatherDurationMs } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { buildGatherMenuForLocation } from "../services/locations";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { durationSecondsSuffix } from "../utils/durationText";
import { replyToActionError, actionErrorMessage } from "../utils/actionErrorReply";
import { BEESWAX_RESOURCE_KEY, HONEY_RESOURCE_KEY } from "../services/apiaryHazards";

export type GatherKey = "berries" | "mushrooms" | "herbs" | "honey" | "beeswax";

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
  honey: "honey",
  мед: "honey",
  меду: "honey",
  beeswax: "beeswax",
  wax: "beeswax",
  віск: "beeswax",
  воску: "beeswax",
  трави: "herbs",
  трав: "herbs",
  лікарські: "herbs",
  "лікарські трави": "herbs",
  лікарських: "herbs",
  "лікарських трав": "herbs",
  цілющі: "herbs",
  "цілющі трави": "herbs",
  цілющих: "herbs",
  "цілющих трав": "herbs",
};

function isApiaryGatherKey(resourceKey: GatherKey | undefined): resourceKey is "honey" | "beeswax" {
  return resourceKey === HONEY_RESOURCE_KEY || resourceKey === BEESWAX_RESOURCE_KEY;
}

export async function submitGather(bot: Bot, ctx: any, resourceKey?: GatherKey, answerCallback = false) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) {
    if (answerCallback) await safeAnswerCallbackQuery(ctx);
    return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  }

  if (resourceKey && !gatherConfig[resourceKey] && !isApiaryGatherKey(resourceKey)) {
    if (answerCallback) await safeAnswerCallbackQuery(ctx, "Невідомий матеріял.");
    else await ctx.reply("Невідомий матеріял.");
    return;
  }

  const type = isApiaryGatherKey(resourceKey) ? "RAID_APIARY" : resourceKey ? "GATHER_SPECIFIC" : "GATHER";
  const durationMs = isApiaryGatherKey(resourceKey)
    ? actionDurationMs("RAID_APIARY", player.stamina)
    : resourceKey
      ? gatherDurationMs(resourceKey)
      : actionDurationMs("GATHER", player.stamina);

  try {
    const result = await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type,
      payload: resourceKey ? { resourceKey } : {},
      durationMs,
      chatId: ctx.chat?.id,
      messageId: ctx.callbackQuery?.message?.message_id,
    });

    const text = result.mode === "immediate" ? "Ви почали пошук." : `Додано в чергу${durationSecondsSuffix(player, durationMs)}.`;
    if (answerCallback) await safeAnswerCallbackQuery(ctx, text);
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    const message = actionErrorMessage(error, "Не вдалося виконати дію.");
    if (answerCallback) await safeAnswerCallbackQuery(ctx, message);
    await replyToActionError(ctx, error, "Не вдалося виконати дію.", { replyFallback: !answerCallback });
  }
}

export function registerGatherHandlers(bot: Bot) {
  bot.command("gather_honey", async (ctx) => {
    await submitGather(bot, ctx, "honey", false);
  });

  bot.command("gather_beeswax", async (ctx) => {
    await submitGather(bot, ctx, "beeswax", false);
  });

  bot.command("gather", async (ctx) => {
    const arg = String(ctx.match || "").trim().toLowerCase();
    const resourceKey = arg ? GATHER_ALIASES[arg] : undefined;
    if (arg && !resourceKey) {
      await ctx.reply("Не знаю, що саме збирати. Спробуйте /gather, /gather herbs, /gather berries, /gather mushrooms або /gather honey біля борті. Факел, якщо він лежить поруч, можна підняти окремо.");
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

    const keyboard = await buildGatherMenuForLocation(player.currentLocationId, player.id);
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
