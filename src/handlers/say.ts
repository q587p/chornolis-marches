import { Bot } from "grammy";
import { prisma } from "../db";
import { canSpendTicks } from "../services/cooldown";
import { getPlayerByTelegramId } from "../services/players";
import { notifyLocation } from "../services/notifications";
import { logEvent } from "../services/worldEvents";
import { stripUnsafeText } from "../utils/text";

export function registerSayHandlers(bot: Bot) {
  bot.command("say", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const text = stripUnsafeText(String(ctx.match || "").slice(0, 300));
    if (!text) return void (await ctx.reply("Напиши так: /say текст"));

    const player = await getPlayerByTelegramId(from.id);
    if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    if (!canSpendTicks(`say:${from.id}`, 1)) return void (await ctx.reply("Ти ще не можеш говорити так швидко."));

    await prisma.player.update({ where: { id: player.id }, data: { says: { increment: 1 } } });
    await notifyLocation(bot, player.currentLocationId, player.id, `Хтось каже: «${text}»`);
    await ctx.reply(`Ви кажете: «${text}»`);
    await logEvent("SAY", "Player said something", text, player.currentLocationId);
  });
}
