import { Bot, InlineKeyboard } from "grammy";
import { getPlayerByTelegramId } from "../services/players";
import { buildCorpseActionKeyboard, buildSocialSignalKeyboard, buildTargetActionKeyboard } from "../ui/keyboards";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { actionDurationMs, performOrQueuePlayerAction } from "../services/actionQueue";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { resolveTarget, type ResolvedTarget } from "../services/targets";
import { prisma } from "../db";
import { addCorpseToInventory, resourceTypeDisplayName } from "../services/corpses";
import { performSocialSignal, socialDefinitionById } from "../services/socialSignals";

function buildActionKeyboard(target: ResolvedTarget, again = false) {
  if (target.isCorpse) return buildCorpseActionKeyboard(target);
  return buildTargetActionKeyboard({ type: target.kind, id: target.id, canGreet: target.canGreet, canAttack: target.canAttack, isAnimal: target.isAnimal }, again);
}

function attackUnavailableText(target: ResolvedTarget) {
  if (target.isCorpse) return "Це вже труп.";
  if (target.kind === "player" || !target.isAnimal || !target.canAttack) return "Бій із хижаками й іншими персонажами ще не реалізований.";
  return "Цю ціль зараз не можна затоптати.";
}

async function editOrReply(ctx: any, text: string, keyboard?: InlineKeyboard) {
  try {
    await ctx.editMessageText(text, { reply_markup: keyboard, parse_mode: "HTML" });
  } catch {
    await ctx.reply(text, keyboard ? { reply_markup: keyboard, parse_mode: "HTML" } : { parse_mode: "HTML" });
  }
}

export function registerSocialHandlers(bot: Bot) {
  bot.callbackQuery(/^target:(player|creature):(\d+)$/, async (ctx) => {
    const type = ctx.match[1];
    const targetId = Number(ctx.match[2]);
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const target = await resolveTarget(type, targetId, player.currentLocationId);
    if (!target) {
      await safeAnswerCallbackQuery(ctx, "Цілі вже немає поруч.");
      return void (await editOrReply(ctx, "Цілі вже немає поруч. Можна спробувати відслідкувати слід."));
    }

    await safeAnswerCallbackQuery(ctx);
    await editOrReply(ctx, `Ви зосереджуєтесь на: ${target.forms.locative}`, buildActionKeyboard(target));
  });

  bot.callbackQuery(/^social:pickup:creature:(\d+)$/, async (ctx) => {
    const targetId = Number(ctx.match[1]);
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const creature = await prisma.creature.findFirst({
      where: {
        id: targetId,
        locationId: player.currentLocationId,
        isAlive: false,
        isGone: false,
        isHidden: false,
        age: "CORPSE",
      },
      include: { species: true },
    });

    if (!creature) {
      await safeAnswerCallbackQuery(ctx, "Трупа вже немає поруч.");
      return void (await editOrReply(ctx, "Трупа вже немає поруч. Можна роздивитися місцину ще раз."));
    }

    let resourceType: Awaited<ReturnType<typeof addCorpseToInventory>>;
    try {
      resourceType = await addCorpseToInventory(player.id, creature);
    } catch {
      await safeAnswerCallbackQuery(ctx, "Трупа вже немає поруч.");
      return void (await editOrReply(ctx, "Трупа вже немає поруч. Можна роздивитися місцину ще раз."));
    }

    await safeAnswerCallbackQuery(ctx, "Підібрано.");
    await editOrReply(
      ctx,
      `🤲 Ви підібрали ${resourceTypeDisplayName(resourceType)}.\n\nВін лежить у ваших речах, але ще псується. Якщо забаритися, від нього лишиться тільки слід.`,
      new InlineKeyboard().text("↩️ Назад", "location:details").row(),
    );
  });

  bot.callbackQuery(/^signalMenu:(player|creature):(\d+)(?::(known|mystery))?$/, async (ctx) => {
    const type = ctx.match[1] as "player" | "creature";
    const targetId = Number(ctx.match[2]);
    const mode = (ctx.match[3] ?? "known") as "known" | "mystery";
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const target = await resolveTarget(type, targetId, player.currentLocationId);
    if (!target || target.isCorpse) {
      await safeAnswerCallbackQuery(ctx, "Цілі вже немає поруч.");
      return void (await editOrReply(ctx, "Цілі вже немає поруч. Можна роздивитися місцину ще раз."));
    }

    await safeAnswerCallbackQuery(ctx);
    await editOrReply(ctx, `Сигнали для: ${target.forms.dative}`, buildSocialSignalKeyboard({ type, id: targetId }, mode));
  });

  bot.callbackQuery(/^signal:([a-z]+):(player|creature):(\d+)(?::(known|mystery))?$/, async (ctx) => {
    const socialId = ctx.match[1];
    const type = ctx.match[2] as "player" | "creature";
    const targetId = Number(ctx.match[3]);
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const social = socialDefinitionById(socialId);
    if (!social) return void (await safeAnswerCallbackQuery(ctx, "Невідомий сигнал."));

    const target = await resolveTarget(type, targetId, player.currentLocationId);
    if (!target || target.isCorpse) {
      await safeAnswerCallbackQuery(ctx, "Цілі вже немає поруч.");
      return void (await editOrReply(ctx, "Цілі вже немає поруч. Можна роздивитися місцину ще раз."));
    }

    try {
      await performSocialSignal(bot, player, target, socialId, ctx.chat?.id);
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося подати сигнал.");
      return;
    }

    await safeAnswerCallbackQuery(ctx, "Сигнал подано.");
  });

  bot.callbackQuery(/^social:(greet|inspect|attack|freshen):(player|creature):(\d+)(?::(known|mystery))?$/, async (ctx) => {
    const action = ctx.match[1] as "greet" | "inspect" | "attack" | "freshen";
    const type = ctx.match[2] as "player" | "creature";
    const targetId = Number(ctx.match[3]);
    const mode = (ctx.match[4] ?? "known") as "known" | "mystery";
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const target = await resolveTarget(type, targetId, player.currentLocationId);
    if (!target) {
      await safeAnswerCallbackQuery(ctx, "Цілі вже немає поруч.");
      return void (await editOrReply(ctx, "Цілі вже немає поруч. Можна спробувати відслідкувати слід."));
    }

    if (action === "greet" && !target.canGreet) return void (await safeAnswerCallbackQuery(ctx, "Ця ціль не відповість на привітання."));
    if (action === "attack" && !target.canAttack) return void (await safeAnswerCallbackQuery(ctx, attackUnavailableText(target)));
    if (action === "freshen" && (!target.isCorpse || !target.canFreshen)) return void (await safeAnswerCallbackQuery(ctx, "Труп уже не підходить."));

    const typeMap = { greet: "GREET", inspect: "INSPECT", attack: "ATTACK", freshen: "FRESHEN" } as const;
    const durationMs = actionDurationMs(typeMap[action], player.stamina);

    let result: Awaited<ReturnType<typeof performOrQueuePlayerAction>>;
    try {
      result = await performOrQueuePlayerAction(bot, {
        playerId: player.id,
        type: typeMap[action],
        payload: { targetType: type, targetId, mode },
        durationMs,
        chatId: ctx.chat?.id,
        messageId: ctx.callbackQuery.message?.message_id,
        interruptCurrent: action === "attack",
        interruptQueued: action === "attack",
      });
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося додати дію.");
      return;
    }

    await safeAnswerCallbackQuery(ctx, result.mode === "immediate" ? "Дію виконано." : `Дію додано в чергу (${Math.ceil(durationMs / 1000)} с).`);
    await sendActionSubmitFeedback(ctx, player.id, result);
  });

  bot.callbackQuery("track", async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const durationMs = actionDurationMs("TRACK", player.stamina);
    let result: Awaited<ReturnType<typeof performOrQueuePlayerAction>>;
    try {
      result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "TRACK", payload: {}, durationMs, chatId: ctx.chat?.id, interruptQueued: true });
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося додати дію.");
      return;
    }

    await safeAnswerCallbackQuery(ctx, result.mode === "immediate" ? "Ви вдивляєтесь у сліди." : `Вистежування додано в чергу (${Math.ceil(durationMs / 1000)} с).`);
    await sendActionSubmitFeedback(ctx, player.id, result);
  });
}
