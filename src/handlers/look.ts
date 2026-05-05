import { Bot } from "grammy";
import { TICK_MS } from "../gameConfig";
import { prisma } from "../db";
import { canSpendTicks } from "../services/cooldown";
import { runDelayed } from "../services/delayedActions";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { renderLocationDetails } from "../services/locations";
import { safeAnswerCallbackQuery } from "../utils/telegram";

export function registerLookHandlers(bot: Bot) {
  bot.command("look", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const player = await getPlayerByTelegramId(from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const ticks = 1;
    const seconds = Math.round((ticks * TICK_MS) / 1000);
    if (!canSpendTicks(String(from.id), ticks)) return void (await ctx.reply("Ти ще зайнятий."));

    const locationId = player.currentLocationId ?? (await getStartLocationId());
    await ctx.reply(`Ви починаєте уважно оглядатися (${seconds} с).`);

    runDelayed("look", ticks, async () => {
      await prisma.player.update({ where: { id: player.id }, data: { currentLocationId: locationId, looks: { increment: 1 } } });
      const view = await renderLocationDetails(locationId, player.id);
      await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    });
  });

  bot.callbackQuery("look", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const ticks = 1;
    const seconds = Math.round((ticks * TICK_MS) / 1000);
    if (!canSpendTicks(String(ctx.from.id), ticks)) return void (await safeAnswerCallbackQuery(ctx, "Ти ще зайнятий."));

    await safeAnswerCallbackQuery(ctx, `Огляд займе ${seconds} с.`);
    await ctx.reply(`Ви починаєте уважно оглядатися (${seconds} с).`);

    runDelayed("look callback", ticks, async () => {
      await prisma.player.update({ where: { id: player.id }, data: { looks: { increment: 1 } } });
      const view = await renderLocationDetails(player.currentLocationId!, player.id);
      await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    });
  });
}
