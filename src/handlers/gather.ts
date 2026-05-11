import { Bot } from "grammy";
import { prisma } from "../db";
import { TICK_MS, gatherConfig } from "../gameConfig";
import { canSpendTicks } from "../services/cooldown";
import { runDelayed } from "../services/delayedActions";
import { getPlayerByTelegramId } from "../services/players";
import { summonLisovykIfResourceDepleted } from "../services/resources";
import { buildGatherMenuForLocation } from "../services/locations";
import { logEvent } from "../services/worldEvents";
import { safeAnswerCallbackQuery } from "../utils/telegram";

export function registerGatherHandlers(bot: Bot) {
  bot.callbackQuery("gather:menu", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const keyboard = await buildGatherMenuForLocation(player.currentLocationId);
    await safeAnswerCallbackQuery(ctx);

    try {
      await ctx.editMessageText("Що саме зібрати?", { reply_markup: keyboard });
    } catch {
      await ctx.reply("Що саме зібрати?", { reply_markup: keyboard });
    }
  });

  bot.callbackQuery(/^gather:(berries|mushrooms|herbs)$/, async (ctx) => {
    const key = ctx.match[1] as "berries" | "mushrooms" | "herbs";
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const cfg = gatherConfig[key];
    const durationSeconds = Math.round((cfg.ticks * TICK_MS) / 1000);
    if (!canSpendTicks(String(ctx.from.id), cfg.ticks)) return void (await safeAnswerCallbackQuery(ctx, "Ти ще зайнятий."));

    const locationId = player.currentLocationId;
    await safeAnswerCallbackQuery(ctx, `Збір займе ${durationSeconds} с.`);
    await ctx.reply(`Ви починаєте пошуки (${durationSeconds} с).`);

    runDelayed("gather", cfg.ticks, async () => {
      const resource = await prisma.resourceNode.findFirst({
        where: { locationId, resourceType: { key }, amount: { gt: 0 } },
        include: { resourceType: true, location: true },
      });

      if (!resource || Math.random() > cfg.chance) {
        await ctx.reply(`Ви витратили час на пошуки (${durationSeconds} с), але нічого корисного не знайшли.`);
        await logEvent("GATHER", "Gather failed", key, locationId);
        return;
      }

      const found = Math.min(resource.amount, Math.floor(Math.random() * 3) + 1);
      const nextAmount = resource.amount - found;

      const statFieldMap = {
        berries: "berriesGathered",
        mushrooms: "mushroomsGathered",
        herbs: "herbsGathered",
      } as const;

      const statField = statFieldMap[key];

      await prisma.resourceNode.update({
        where: { id: resource.id },
        data: { amount: nextAmount },
      });

      await prisma.playerResource.upsert({
        where: {
          playerId_resourceTypeId: {
            playerId: player.id,
            resourceTypeId: resource.resourceTypeId,
          },
        },
        update: { amount: { increment: found } },
        create: {
          playerId: player.id,
          resourceTypeId: resource.resourceTypeId,
          amount: found,
        },
      });

      await prisma.player.update({
        where: { id: player.id },
        data: {
          successfulGathers: { increment: 1 },
          [statField]: { increment: found },
        },
      });
      await ctx.reply(`Ви витратили час на пошуки (${durationSeconds} с) і знайшли: ${resource.resourceType.name} ×${found}.`);
      await logEvent("GATHER", "Gather succeeded", `${resource.resourceType.name} ×${found}`, locationId);

      if (resource.amount > 0 && nextAmount <= 0) {
        await summonLisovykIfResourceDepleted(bot, resource.resourceType.name, resource.location.regionId);
      }
    });
  });
}
