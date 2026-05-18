import { Bot } from "grammy";
import { Direction } from "@prisma/client";
import { prisma } from "../db";
import { directionLabels } from "../ui/labels";
import { buildActionQueueKeyboard, buildRestingActionChoiceKeyboard } from "../ui/keyboards";
import { enqueuePlayerAction, movementDurationMs, renderPlayerActionQueue } from "../services/actionQueue";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { safeAnswerCallbackQuery } from "../utils/telegram";

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

    let enqueueResult: Awaited<ReturnType<typeof enqueuePlayerAction>>;
    try {
      enqueueResult = await enqueuePlayerAction({
        playerId: player.id,
        type: "MOVE",
        payload: { direction },
        durationMs,
        chatId: ctx.chat?.id,
        messageId: ctx.callbackQuery.message?.message_id,
      });
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося додати дію.");
      return;
    }

    const queueText = await renderPlayerActionQueue(player.id);
    await safeAnswerCallbackQuery(ctx, `Додано: ${directionLabels[direction].toLowerCase()}.`);
    if (enqueueResult.shouldPromptRestChoice) {
      await ctx.reply(`Ви зараз відпочиваєте. До повного відновлення лишилось ${enqueueResult.remainingToMax} витривалості. Перервати відпочинок чи поставити дію в чергу після відпочинку?`, { reply_markup: buildRestingActionChoiceKeyboard() });
    } else {
      await ctx.reply(queueText, { reply_markup: buildActionQueueKeyboard() });
    }
  });
}
