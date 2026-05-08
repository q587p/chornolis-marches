import { Bot } from "grammy";
import { prisma } from "../db";
import { getStartLocationId } from "../services/players";
import { renderLocationBrief } from "../services/locations";
import { buildMainReplyKeyboard } from "../ui/replyKeyboard";

async function enterWorld(ctx: any, isMenuRefresh = false) {
  const from = ctx.from;
  if (!from) return;

  const startLocationId = await getStartLocationId();

  const player = await prisma.player.upsert({
    where: { telegramId: String(from.id) },
    update: {
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      currentLocationId: startLocationId,
    },
    create: {
      telegramId: String(from.id),
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      currentLocationId: startLocationId,
    },
  });

  const view = await renderLocationBrief(startLocationId, player.id);

  const text = isMenuRefresh
    ? `🌲 Меню оновлено.\n\nВітаю, ${player.firstName ?? "мандрівнику"}.`
    : `🌲 Порубіжжя Чорнолісу ожили.\n\nВітаю, ${player.firstName ?? "мандрівнику"}. Твій слід збережено в Чорнолісі.`;

  await ctx.reply(text, { reply_markup: buildMainReplyKeyboard(false) });
  await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
}

async function setBotCommandsWithRetry(bot: Bot, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await bot.api.setMyCommands([
        { command: "start", description: "Оновити меню та увійти у світ" },
        { command: "me", description: "Персонаж" },
        { command: "location", description: "Поточна локація" },
        { command: "look", description: "Оглянутися" },
        { command: "news", description: "Останні новини світу" },
      ]);

      console.log("Telegram bot commands updated.");
      return;
    } catch (error) {
      console.warn(`Failed to set bot commands, attempt ${i}/${attempts}:`, error);
      await new Promise((resolve) => setTimeout(resolve, i * 3000));
    }
  }
}

export function registerStartHandlers(bot: Bot) {
  setBotCommandsWithRetry(bot).catch((error) =>
    console.warn("Failed to set bot commands permanently:", error)
  );

  bot.command("start", async (ctx) => enterWorld(ctx, false));
}