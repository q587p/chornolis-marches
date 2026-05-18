import { Bot } from "grammy";
import { prisma } from "../db";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { renderLocationBrief } from "../services/locations";
import { buildMainReplyKeyboard } from "../ui/replyKeyboard";
import { isPlayerAutoEnabled } from "./auto";

function formatPercent(success: number, attempts: number) {
  if (!attempts) return "0%";
  return `${Math.round((success / attempts) * 100)}%`;
}

function fatigueText(player: any) {
  if (player.isResting) return "Відпочиває";
  if (player.fatigueState === "VERY_TIRED") return "Дуже втомлений";
  if (player.fatigueState === "TIRED") return "Втомлений";
  return "Відпочивший";
}

function formatPlayerStats(player: any) {
  return [
    `Пройдено локацій: ${player.steps}`,
    `Оглядів: ${player.looks}`,
    `Сказано фраз: ${player.says}`,
    `Привітань: ${player.greetings}`,
    `Спроб збору: ${player.gatherAttempts}`,
    `Вдалого збору: ${player.successfulGathers} (${formatPercent(player.successfulGathers, player.gatherAttempts)})`,
    `Зібрано ягід: ${player.berriesGathered}`,
    `Зібрано грибів: ${player.mushroomsGathered}`,
    `Зібрано трав: ${player.herbsGathered}`,
    `Убито тварин: ${player.animalsKilled}`,
  ].join("\n");
}

async function showCharacter(bot: Bot, telegramId: number, reply: (text: string, options?: any) => Promise<unknown>) {
  const player = await prisma.player.findUnique({
    where: { telegramId: String(telegramId) },
    include: { currentLocation: true, resources: { include: { resourceType: true } } },
  });

  if (!player) return void (await reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));

  const autoEnabled = isPlayerAutoEnabled(telegramId);
  const autoText = autoEnabled ? "\nРежим авто: увімкнено 🤖" : "";
  const items = player.resources.length ? player.resources.map((i) => `${i.resourceType.name} ×${i.amount}`).join("\n") : "порожньо";
  const staminaMax = player.staminaMax ?? 13;

  await reply(`🧍 Ти:\n\nІм’я: ${player.nameNominative ?? player.firstName ?? "невідомо"}\nHP: ${player.hp}\nВитривалість: ${player.stamina}/${staminaMax}\nСтан: ${fatigueText(player)}\nГолод: ${player.hunger}\nЛокація: ${player.currentLocation?.name ?? "невідомо"}${autoText}\n\nІнвентар:\n${items}\n\nСтатистика:\n${formatPlayerStats(player)}`, {
    reply_markup: buildMainReplyKeyboard(autoEnabled),
  });
}

export async function showLocationForPlayer(telegramId: number, reply: (text: string, options?: any) => Promise<unknown>) {
  const player = await getPlayerByTelegramId(telegramId);
  if (!player) return void (await reply("Ти ще не увійшов у світ. Напиши /start", { reply_markup: buildMainReplyKeyboard(false) }));

  const locationId = player.currentLocationId ?? (await getStartLocationId());
  const view = await renderLocationBrief(locationId, player.id);
  await reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
}

export function registerPlayerHandlers(bot: Bot) {
  bot.command("me", async (ctx) => {
    if (!ctx.from) return;
    await showCharacter(bot, ctx.from.id, (text, options) => ctx.reply(text, options));
  });

  bot.hears(["Персонаж", "🧍 Персонаж"], async (ctx) => {
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
