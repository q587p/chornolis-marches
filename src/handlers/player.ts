import { Bot } from "grammy";
import { prisma } from "../db";

export function registerPlayerHandlers(bot: Bot) {
  bot.command("me", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const player = await prisma.player.findUnique({
      where: { telegramId: String(from.id) },
      include: { currentLocation: true, resources: { include: { resourceType: true } } },
    });

    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const items = player.resources.length
      ? player.resources.map((i) => `${i.resourceType.name} ×${i.amount}`).join("\n")
      : "порожньо";

    await ctx.reply(`🧍 Ти:\n\nІм’я: ${player.firstName ?? "невідомо"}\nHP: ${player.hp}\nВитривалість: ${player.stamina}\nГолод: ${player.hunger}\nЛокація: ${player.currentLocation?.name ?? "невідомо"}\n\nІнвентар:\n${items}`);
  });
}
