import { Bot } from "grammy";
import { Direction } from "@prisma/client";
import { prisma } from "../db";
import { directionLabels } from "../ui/labels";
import { movementDurationMs, performOrQueuePlayerAction } from "../services/actionQueue";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { isLocationExitLocked } from "../services/tutorial";

const COMMAND_DIRECTIONS: Record<string, Direction> = {
  north: "NORTH",
  n: "NORTH",
  south: "SOUTH",
  s: "SOUTH",
  west: "WEST",
  w: "WEST",
  east: "EAST",
  e: "EAST",
  inside: "INSIDE",
  in: "INSIDE",
  outside: "OUTSIDE",
  out: "OUTSIDE",
};

export async function submitMove(bot: Bot, ctx: any, direction: Direction, answerCallback = false) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) {
    if (answerCallback) await safeAnswerCallbackQuery(ctx);
    return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  }

  const currentLocationId = player.currentLocationId ?? (await getStartLocationId());
  const exit = await prisma.locationExit.findUnique({ where: { fromLocationId_direction: { fromLocationId: currentLocationId, direction } } });
  if (!exit || exit.isHidden) {
    if (answerCallback) return void (await safeAnswerCallbackQuery(ctx, "Туди немає видимого шляху."));
    return void (await ctx.reply("Туди немає видимого шляху.", { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) }));
  }

  const lockedMessage = await isLocationExitLocked(currentLocationId, direction);
  if (lockedMessage) {
    if (answerCallback) return void (await safeAnswerCallbackQuery(ctx, lockedMessage));
    return void (await ctx.reply(lockedMessage, { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) }));
  }

  const durationMs = movementDurationMs(exit.travelCost, player.stamina);

  try {
    const result = await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type: "MOVE",
      payload: { direction },
      durationMs,
      chatId: ctx.chat?.id,
      messageId: ctx.callbackQuery?.message?.message_id,
    });

    if (answerCallback) {
      await safeAnswerCallbackQuery(ctx, result.mode === "immediate" ? `Ви рушили: ${directionLabels[direction].toLowerCase()}.` : `Додано: ${directionLabels[direction].toLowerCase()}.`);
    }
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося виконати дію.";
    if (answerCallback) await safeAnswerCallbackQuery(ctx, message);
    else await ctx.reply(message);
  }
}

export function registerMovementHandlers(bot: Bot) {
  bot.callbackQuery(/^move:(NORTH|EAST|SOUTH|WEST|UP|DOWN|INSIDE|OUTSIDE)$/, async (ctx) => {
    await submitMove(bot, ctx, ctx.match[1] as Direction, true);
  });

  bot.callbackQuery(/^cmd:(north|south|west|east)$/, async (ctx) => {
    await submitMove(bot, ctx, COMMAND_DIRECTIONS[ctx.match[1]], true);
  });

  bot.command(["north", "n", "south", "s", "west", "w", "east", "e", "inside", "in", "outside", "out"], async (ctx) => {
    const command = ctx.message?.text?.split(/\s+/)[0]?.replace(/^\//, "").toLowerCase();
    const direction = command ? COMMAND_DIRECTIONS[command] : undefined;
    if (!direction) return void (await ctx.reply("Невідомий напрямок."));
    await submitMove(bot, ctx, direction, false);
  });

  bot.hears(["⬆️ Північ", "(⬆️ Північ)"], async (ctx) => {
    await submitMove(bot, ctx, "NORTH", false);
  });

  bot.hears(["⬇️ Південь", "(⬇️ Південь)"], async (ctx) => {
    await submitMove(bot, ctx, "SOUTH", false);
  });

  bot.hears(["⬅️ Захід", "(⬅️ Захід)"], async (ctx) => {
    await submitMove(bot, ctx, "WEST", false);
  });

  bot.hears(["Схід ➡️", "(Схід ➡️)"], async (ctx) => {
    await submitMove(bot, ctx, "EAST", false);
  });
}
