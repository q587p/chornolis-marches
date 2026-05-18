import { Bot } from "grammy";
import { Direction } from "@prisma/client";
import { prisma } from "../db";
import { directionLabels } from "../ui/labels";
import { movementDurationMs, performOrQueuePlayerAction } from "../services/actionQueue";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";

export function registerMovementHandlers(bot: Bot) {
  bot.callbackQuery(/^move:(NORTH|EAST|SOUTH|WEST|UP|DOWN|INSIDE|OUTSIDE)$/, async (ctx) => {
    const direction = ctx.match[1] as Direction;
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const currentLocationId = player.currentLocationId ?? (await getStartLocationId());
    const exit = await prisma.locationExit.findUnique({ where: { fromLocationId_direction: { fromLocationId: currentLocationId, direction } } });
    if (!exit || exit.isHidden) return void (await safeAnswerCallbackQuery(ctx, "Туди немає видимого шляху."));

    const durationMs = movementDurationMs(exit.travelCost, player.stamina);

    try {
      const result = await performOrQueuePlayerAction(bot, {
        playerId: player.id,
        type: "MOVE",
        payload: { direction },
        durationMs,
        chatId: ctx.chat?.id,
        messageId: ctx.callbackQuery.message?.message_id,
      });

      await safeAnswerCallbackQuery(ctx, result.mode === "immediate" ? `Ви рушили: ${directionLabels[direction].toLowerCase()}.` : `Додано: ${directionLabels[direction].toLowerCase()}.`);
      await sendActionSubmitFeedback(ctx, player.id, result);
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося виконати дію.");
    }
  });
}
