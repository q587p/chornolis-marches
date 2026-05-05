import { Bot } from "grammy";
import { prisma } from "../db";
import { getStartLocationId } from "../services/players";
import { renderLocationBrief } from "../services/locations";

export function registerStartHandlers(bot: Bot) {
  bot.command("start", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const startLocationId = await getStartLocationId();
    const player = await prisma.player.upsert({
      where: { telegramId: String(from.id) },
      update: { username: from.username ?? null, firstName: from.first_name ?? null, lastName: from.last_name ?? null, currentLocationId: startLocationId },
      create: { telegramId: String(from.id), username: from.username ?? null, firstName: from.first_name ?? null, lastName: from.last_name ?? null, currentLocationId: startLocationId },
    });
    const view = await renderLocationBrief(startLocationId, player.id);
    await ctx.reply(`🌲 Порубіжжя Чорнолісу ожили.\n\nВітаю, ${player.firstName ?? "мандрівнику"}. Твій слід збережено в Чорнолісі.`);
    await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  });
}
