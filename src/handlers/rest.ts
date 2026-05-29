import { Bot } from "grammy";
import { getPlayerByTelegramId } from "../services/players";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import { accelerateFirstQueuedPlayerAction, hasPlayerActionQueueControls, playerRestStatusText, queuePlayerRest, renderPlayerActionQueue, startPlayerRest, stopPlayerRest } from "../services/actionQueue";
import { buildRestWithQueueChoiceKeyboard } from "../ui/keyboards";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { actionQueueReplyOptions } from "../utils/actionQueueUi";
import { isTutorialFastRestLocationKey, rememberTutorialCommandHint, TUTORIAL_DEEP_REST_LOCATION_KEY, TUTORIAL_REST_LOCATION_KEY } from "../services/tutorial";
import { prisma } from "../db";
import { getPlayerRestStaminaCap } from "../services/locationFeatures";
import { escapeHtml } from "../utils/text";

async function replyOrEdit(ctx: any, text: string, options?: any) {
  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, options);
      return;
    } catch {
      // Fall back to a new message when Telegram cannot edit the source message.
    }
  }
  await ctx.reply(text, options);
}

function quoteBlock(text: string) {
  return `<blockquote>${escapeHtml(text)}</blockquote>`;
}

async function beginRestNow(ctx: any, playerId: number) {
  const hadQueue = await hasPlayerActionQueueControls(playerId);
  await startPlayerRest(playerId);
  const suffix = hadQueue ? "\n\nПоточну дію та чергу скасовано." : "";
  const player = await getPlayerByTelegramId(ctx.from.id);
  const location = player?.currentLocationId
    ? await prisma.cellLocation.findUnique({ where: { id: player.currentLocationId }, select: { key: true } })
    : null;
  const shouldTeachRest = player
    && isTutorialFastRestLocationKey(location?.key)
    && await rememberTutorialCommandHint(player.id, "rest", player.currentLocationId);

  await replyOrEdit(ctx, `${await playerRestStatusText(playerId)}${suffix}`);

  if (shouldTeachRest) {
    const sonLine = location?.key === TUTORIAL_REST_LOCATION_KEY
      ? "Відпочинок — це не сон, а короткий присілок. Лавка лише нагадує тілу, що можна ненадовго сісти й повернути подих."
      : location?.key === TUTORIAL_DEEP_REST_LOCATION_KEY
        ? "Відпочинок — це не сон, а короткий присілок. Тут жар навчить, як швидко повертається подих."
        : "Відпочинок — це не сон, а короткий присілок.";
    await ctx.reply(`Сон радить:\n${quoteBlock(sonLine)}`, { parse_mode: "HTML" });
    await ctx.reply(`Дрімота пирхає:\n${quoteBlock("Сядеш — і ще захочеш сидіти. Але добре, хоч не падаєш.")}`, { parse_mode: "HTML" });
  }
}

async function startRest(ctx: any) {
  const from = ctx.from;
  if (!from) return;
  const player = await getPlayerByTelegramId(from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const max = await getPlayerRestStaminaCap(player.id);
  const hpMax = player.hpMax ?? BASE_HP;
  if (player.stamina >= max && player.hp >= hpMax && !player.isResting) {
    await replyOrEdit(ctx, `Ви вже відпочили й готові до дій. Життя: ${player.hp}/${hpMax}. Снага: ${player.stamina}/${max}.`);
    return;
  }

  if (player.hp > 0 && await hasPlayerActionQueueControls(player.id)) {
    await replyOrEdit(ctx, "У вас зараз є черга дій. Почати відпочинок зараз і скасувати її, чи додати відпочинок у кінець черги?", {
      reply_markup: buildRestWithQueueChoiceKeyboard(),
    });
    return;
  }

  await beginRestNow(ctx, player.id);
}

export function registerRestHandlers(bot: Bot) {
  bot.command("rest", startRest);
  bot.hears(["🧘 Відпочити", "🔥 Відпочити"], startRest);

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
    await replyOrEdit(ctx, await renderPlayerActionQueue(player.id), await actionQueueReplyOptions(player.id));
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
    await replyOrEdit(ctx, `Ви перервали відпочинок.\n\n${await renderPlayerActionQueue(player.id)}`, await actionQueueReplyOptions(player.id));
  });

  bot.callbackQuery("rest:queue", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    await safeAnswerCallbackQuery(ctx, "Дію залишено після відпочинку.");
    await replyOrEdit(ctx, `${await playerRestStatusText(player.id)}\n\n${await renderPlayerActionQueue(player.id)}`, await actionQueueReplyOptions(player.id));
  });
}
