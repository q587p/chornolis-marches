import { Bot } from "grammy";
import { prisma } from "../db";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { renderLocationBrief } from "../services/locations";
import { buildMainReplyKeyboard } from "../ui/replyKeyboard";
import { isPlayerAutoEnabled } from "./auto";

async function showCharacter(bot: Bot, telegramId: number, reply: (text: string, options?: any) => Promise<unknown>) {
  const player = await prisma.player.findUnique({
    where: { telegramId: String(telegramId) },
    include: { currentLocation: true, resources: { include: { resourceType: true } } },
  });

  if (!player) return void (await reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));

  const items = player.resources.length
    ? player.resources.map((i) => `${i.resourceType.name} ×${i.amount}`).join("\n")
    : "порожньо";

  await reply(`🧍 Ти:\n\nІм’я: ${player.firstName ?? "невідомо"}\nHP: ${player.hp}\nВитривалість: ${player.stamina}\nГолод: ${player.hunger}\nЛокація: ${player.currentLocation?.name ?? "невідомо"}\n\nІнвентар:\n${items}`, {
    reply_markup: buildMainReplyKeyboard(isPlayerAutoEnabled(telegramId)),
  });
}

export async function showLocationForPlayer(telegramId: number, reply: (text: string, options?: any) => Promise<unknown>) {
  const player = await getPlayerByTelegramId(telegramId);
  if (!player) return void (await reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));

  const locationId = player.currentLocationId ?? (await getStartLocationId());
  const view = await renderLocationBrief(locationId, player.id);
  await reply(view.text, {
    parse_mode: "HTML",
    reply_markup: view.keyboard,
  });
}

export function registerPlayerHandlers(bot: Bot) {
  bot.command("me", async (ctx) => {
    if (!ctx.from) return;
    await showCharacter(bot, ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.hears("Персонаж", async (ctx) => {
    if (!ctx.from) return;
    await showCharacter(bot, ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.command(["location", "loc"], async (ctx) => {
    if (!ctx.from) return;
    await showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.hears("📍 Локація", async (ctx) => {
    if (!ctx.from) return;
    await showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
  });
}
