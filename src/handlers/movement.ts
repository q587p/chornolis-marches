import { Bot } from "grammy";
import { Direction } from "@prisma/client";
import { prisma } from "../db";
import { directionLabels } from "../ui/labels";
import { buildTargetKeyboard, buildTrackKeyboard } from "../ui/keyboards";
import { notifyLocation } from "../services/notifications";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { renderLocationBrief } from "../services/locations";
import { logEvent } from "../services/worldEvents";
import { safeAnswerCallbackQuery } from "../utils/telegram";

function arrivalFromDirection(direction: Direction) {
  if (direction === "NORTH") return "з півдня";
  if (direction === "SOUTH") return "з півночі";
  if (direction === "EAST") return "із заходу";
  if (direction === "WEST") return "зі сходу";
  if (direction === "UP") return "знизу";
  if (direction === "DOWN") return "згори";
  if (direction === "INSIDE") return "ззовні";
  if (direction === "OUTSIDE") return "зсередини";
  return "звідкись";
}

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

    await notifyLocation(bot, currentLocationId, player.id, "Хтось пішов звідси.", buildTrackKeyboard());
    await prisma.player.update({ where: { id: player.id }, data: { currentLocationId: exit.toLocationId, steps: { increment: 1 } } });
    await notifyLocation(
      bot,
      exit.toLocationId,
      player.id,
      `Хтось зайшов сюди ${arrivalFromDirection(direction)}.`,
      buildTargetKeyboard([{ type: "player", id: player.id, canGreet: true }])
    );
    await logEvent("MOVE", "Player moved", direction, exit.toLocationId);

    const view = await renderLocationBrief(exit.toLocationId, player.id);
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply(`Ти рушив: ${directionLabels[direction]}`);
    await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  });
}
