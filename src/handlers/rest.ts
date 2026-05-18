import { Bot } from "grammy";
import { getPlayerByTelegramId } from "../services/players";
import { accelerateFirstQueuedPlayerAction, hasPlayerActionQueueControls, playerRestStatusText, queuePlayerRest, renderPlayerActionQueue, startPlayerRest, stopPlayerRest } from "../services/actionQueue";
import { buildRestWithQueueChoiceKeyboard } from "../ui/keyboards";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { actionQueueReplyOptions } from "../utils/actionQueueUi";

async function beginRestNow(ctx: any, playerId: number) {
  await startPlayerRest(playerId);
  await ctx.reply(`${await playerRestStatusText(playerId)}\n\nПоточну дію та чергу скасовано.`);
}

async function startRest(ctx: any) {
  const from = ctx.from;
  if (!from) return;
  const player = await getPlayerByTelegramId(from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const max = player.staminaMax ?? 13;
  if (player.stamina >= max && !player.isResting) {
    await ctx.reply(`Ви вже відпочили й готові до дій. Витривалість: ${player.stamina}/${max}.`);
    return;
  }

  if (await hasPlayerActionQueueControls(player.id)) {
    await ctx.reply("У вас зараз є черга дій. Почати відпочинок зараз і скасувати її, чи додати відпочинок у кінець черги?", {
      reply_markup: buildRestWithQueueChoiceKeyboard(),
    });
    return;
  }

  await beginRestNow(ctx, player.id);
}

export function registerRestHandlers(bot: Bot) {
  bot.command("rest", startRest);
  bot.hears("🛌 Відпочити", startRest);

  bot.callbackQuery("rest:start", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await startRest(ctx);
  });

  bot.callbackQuery("rest:confirm-start", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await safeAnswerCallbackQuery(ctx, "Починаємо відпочинок.");
    await beginRestNow(ctx, player.id);
  });

  bot.callbackQuery("rest:queue-rest", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await queuePlayerRest(player.id, ctx.chat?.id);
    await safeAnswerCallbackQuery(ctx, "Відпочинок додано в чергу.");
    await ctx.reply(await renderPlayerActionQueue(player.id), await actionQueueReplyOptions(player.id));
  });

  bot.callbackQuery("rest:interrupt", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await stopPlayerRest(player.id);
    const accelerated = await accelerateFirstQueuedPlayerAction(player.id);
    await safeAnswerCallbackQuery(ctx, accelerated ? "Відпочинок перервано, дія починається." : "Відпочинок перервано.");
    await ctx.reply(`Ви перервали відпочинок.\n\n${await renderPlayerActionQueue(player.id)}`, await actionQueueReplyOptions(player.id));
  });

  bot.callbackQuery("rest:queue", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await safeAnswerCallbackQuery(ctx, "Дію залишено після відпочинку.");
    await ctx.reply(`${await playerRestStatusText(player.id)}\n\n${await renderPlayerActionQueue(player.id)}`, await actionQueueReplyOptions(player.id));
  });
}
