import { Bot } from "grammy";
import { getPlayerByTelegramId } from "../services/players";
import { playerRestStatusText, renderPlayerActionQueue, startPlayerRest, stopPlayerRest } from "../services/actionQueue";
import { buildActionQueueKeyboard } from "../ui/keyboards";
import { safeAnswerCallbackQuery } from "../utils/telegram";

async function startRest(ctx: any) {
  const from = ctx.from;
  if (!from) return;
  const player = await getPlayerByTelegramId(from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const max = player.staminaMax ?? 13;
  if (player.stamina >= max && !player.isResting) {
    await ctx.reply(`Ви вже відпочивші й готові до дій. Витривалість: ${player.stamina}/${max}.`, { reply_markup: buildActionQueueKeyboard() });
    return;
  }

  await startPlayerRest(player.id);
  await ctx.reply(`${await playerRestStatusText(player.id)}\n\nПоточну дію та чергу скасовано.`, { reply_markup: buildActionQueueKeyboard() });
}

export function registerRestHandlers(bot: Bot) {
  bot.command("rest", startRest);
  bot.hears("🛌 Відпочити", startRest);

  bot.callbackQuery("rest:start", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await startRest(ctx);
  });

  bot.callbackQuery("rest:interrupt", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await stopPlayerRest(player.id);
    await safeAnswerCallbackQuery(ctx, "Відпочинок перервано.");
    await ctx.reply(`Ви перервали відпочинок.\n\n${await renderPlayerActionQueue(player.id)}`, { reply_markup: buildActionQueueKeyboard() });
  });

  bot.callbackQuery("rest:queue", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await safeAnswerCallbackQuery(ctx, "Дію залишено після відпочинку.");
    await ctx.reply(`${await playerRestStatusText(player.id)}\n\n${await renderPlayerActionQueue(player.id)}`, { reply_markup: buildActionQueueKeyboard() });
  });
}
