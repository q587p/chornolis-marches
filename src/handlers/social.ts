import { Bot } from "grammy";
import { prisma } from "../db";
import { getPlayerByTelegramId } from "../services/players";
import { notifyLocation } from "../services/notifications";
import { logEvent } from "../services/worldEvents";
import { safeAnswerCallbackQuery } from "../utils/telegram";

export function registerSocialHandlers(bot: Bot) {
  bot.callbackQuery(/^social:(greet|inspect|attack)$/, async (ctx) => {
    const action = ctx.match[1];
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    if (action === "greet") {
      await prisma.player.update({ where: { id: player.id }, data: { greetings: { increment: 1 } } });
      await notifyLocation(bot, player.currentLocationId, player.id, "Хтось вітається з присутніми.");
      await safeAnswerCallbackQuery(ctx, "Ви вітаєтесь.");
      await ctx.reply("Ви вітаєтесь із тими, хто поруч.");
      await logEvent("GREET", "Player greeted nearby characters", undefined, player.currentLocationId);
      return;
    }

    if (action === "inspect") {
      const location = await prisma.cellLocation.findUnique({
        where: { id: player.currentLocationId },
        include: { players: true, creatures: { where: { isAlive: true }, include: { species: true } } },
      });
      const otherPlayers = location?.players.filter((p) => p.id !== player.id).map((p) => p.firstName ?? p.username ?? "мандрівник") ?? [];
      const npcs = location?.creatures.filter((c) => c.species.kind !== "ANIMAL").map((c) => c.name ?? c.species.name) ?? [];
      const visible = [...otherPlayers, ...npcs];
      await safeAnswerCallbackQuery(ctx);
      await ctx.reply(visible.length ? `Поруч видно:\n${visible.map((x) => `- ${x}`).join("\n")}` : "Поруч нікого не видно.");
      await logEvent("INSPECT", "Player inspected nearby characters", undefined, player.currentLocationId);
      return;
    }

    await safeAnswerCallbackQuery(ctx, "Бойова система ще не готова.");
    await ctx.reply("⚔️ Ви стискаєте зброю, але бойова система ще не готова.");
    await logEvent("PLAYER_ACTION", "Player tried to attack", undefined, player.currentLocationId);
  });
}
