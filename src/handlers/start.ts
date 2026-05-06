import { Bot, Keyboard } from "grammy";
import { prisma } from "../db";
import { getStartLocationId } from "../services/players";
import { renderLocationBrief } from "../services/locations";

const mainMenu = new Keyboard()
  .text("/start")
  .text("/me")
  .resized()
  .persistent();

export function registerStartHandlers(bot: Bot) {
  bot.api
    .setMyCommands([
      { command: "start", description: "Почати / оновити локацію" },
      { command: "me", description: "Показати персонажа та інвентар" },
    ])
    .catch((error) => console.warn("Failed to set bot commands:", error));

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
    await ctx.reply(`🌲 Порубіжжя Чорнолісу ожили.\n\nВітаю, ${player.firstName ?? "мандрівнику"}. Твій слід збережено в Чорнолісі.`, {
      reply_markup: mainMenu,
    });
    await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  });
}
