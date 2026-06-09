import { Bot, InlineKeyboard } from "grammy";
import { getPlayerByTelegramId } from "../services/players";
import { buildCorpseActionKeyboard, buildExamineLocationKeyboard, buildSocialSignalKeyboard, buildTargetActionKeyboard } from "../ui/keyboards";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { actionDurationMs, performOrQueuePlayerAction } from "../services/actionQueue";
import { actionQueueReplyOptions, sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { resolveTarget, type ResolvedTarget } from "../services/targets";
import { prisma } from "../db";
import { addCorpseToInventory, resourceTypeDisplayName } from "../services/corpses";
import { performSocialSignal, socialDefinitionById } from "../services/socialSignals";
import { durationSecondsSuffix } from "../utils/durationText";
import { pickupObserverText, recordVisibleItemAction } from "../services/visibleItemActions";
import { assertCanPerformPhysicalAction, isPlayerMustStandError } from "../services/postureRules";
import { actionErrorMessage, replyToActionError } from "../utils/actionErrorReply";
import { canEditCallbackMessage, noteKnownMessage } from "../utils/messageTracker";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { rememberTutorialInventoryForPlayer } from "../utils/tutorialInventory";
import { stripUnsafeText } from "../utils/text";
import { spendPlayerStaminaAmount } from "../services/actionRecovery";
import { visibleTextTargets } from "../services/textTargets";
import { visibilityRulesForLocation } from "../services/visibility";
import { playerHasRawMeat } from "../services/meat";
import { submitGiveRawMeatToCreature } from "./give";
import { followIntentSetText, setPlayerFollowIntent } from "../services/following";
import { maybeOfferMentorshipAfterFollow, mentorshipOfferKeyboard } from "../services/mentorship";

type TargetSpeechMode = "say" | "whisper";

type PendingTargetSpeech = {
  mode: TargetSpeechMode;
  targetType: "player" | "creature";
  targetId: number;
};

const pendingTargetSpeech = new Map<number, PendingTargetSpeech>();

function targetReturnCallback(mode?: string, page?: number) {
  if ((mode !== "brief" && mode !== "details") || !Number.isFinite(page)) return "location:details";
  return `targetPage:${mode}:${Math.max(0, Math.floor(page ?? 0))}`;
}

async function buildActionKeyboard(playerId: number, target: ResolvedTarget, again = false, returnCallback = "location:details") {
  if (target.isCorpse) return buildCorpseActionKeyboard(target, returnCallback);
  const canReceiveRawMeat = Boolean(target.canReceiveRawMeat && await playerHasRawMeat(playerId));
  return buildTargetActionKeyboard({ type: target.kind, id: target.id, canGreet: target.canGreet, canAttack: target.canAttack, isAnimal: target.isAnimal, canReceiveRawMeat }, again, returnCallback);
}

function attackUnavailableText(target: ResolvedTarget) {
  if (target.isCorpse) return "Це вже труп.";
  if (target.kind === "player" || !target.isAnimal || !target.canAttack) return "Бій із хижаками й іншими персонажами ще не реалізований.";
  return "Цю ціль зараз не можна затоптати.";
}

function targetSpeechPrompt(mode: TargetSpeechMode, target: ResolvedTarget) {
  if (mode === "whisper") return `Що прошепотіти ${target.forms.dative}?`;
  return `Що сказати ${target.forms.dative}?`;
}

function targetSpeechPlaceholder(mode: TargetSpeechMode) {
  return mode === "whisper" ? "Тихий текст..." : "Текст репліки...";
}

async function editOrReply(ctx: any, text: string, keyboard?: InlineKeyboard) {
  const options = keyboard ? { reply_markup: keyboard, parse_mode: "HTML" } : { parse_mode: "HTML" };
  if (canEditCallbackMessage(ctx)) {
    try {
      await ctx.editMessageText(text, options);
      noteKnownMessage(ctx.callbackQuery?.message);
      return;
    } catch {
      // Fall through to a fresh message when Telegram cannot edit the source.
    }
  }

  noteKnownMessage(await ctx.reply(text, options));
}

async function submitTargetSpeech(bot: Bot, ctx: any, pending: PendingTargetSpeech, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text).slice(0, 300);
  if (!safeText) return void (await ctx.reply("Репліка порожня. Натисніть кнопку ще раз, якщо хочете сказати щось цій цілі."));

  const target = await resolveTarget(pending.targetType, pending.targetId, player.currentLocationId);
  if (!target || target.isCorpse) return void (await ctx.reply("Цілі вже немає поруч. Можна роздивитися місцину ще раз.", { reply_markup: buildExamineLocationKeyboard() }));

  const durationMs = actionDurationMs("SAY", player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type: "SAY",
      payload: {
        text: safeText,
        mode: pending.mode,
        targetType: target.kind,
        targetId: target.id,
        targetName: target.forms.nominative,
        targetDative: target.forms.dative,
      },
      durationMs,
      chatId: ctx.chat?.id,
    });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося виконати дію.");
  }
}

async function submitFreshenAll(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) {
    await safeAnswerCallbackQuery(ctx);
    return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  }

  try {
    assertCanPerformPhysicalAction(player, "FRESHEN");
    const visibleTargets = await visibleTextTargets(player.currentLocationId, player.id);
    const freshenable: Array<{ type: "creature"; id: number }> = [];

    for (const target of visibleTargets) {
      if (target.type !== "creature") continue;
      const resolved = await resolveTarget(target.type, target.id, player.currentLocationId);
      if (resolved?.isCorpse && resolved.canFreshen) freshenable.push({ type: target.type, id: target.id });
    }

    if (!freshenable.length) {
      await safeAnswerCallbackQuery(ctx, "Поруч немає придатних туш.");
      await ctx.reply("Поруч немає придатних туш, які можна освіжувати.");
      return;
    }

    const durationMs = actionDurationMs("FRESHEN", player.stamina);
    for (const target of freshenable) {
      await performOrQueuePlayerAction(bot, {
        playerId: player.id,
        type: "FRESHEN",
        payload: { targetType: target.type, targetId: target.id, mode: "known" },
        durationMs,
        chatId: ctx.chat?.id,
        messageId: ctx.callbackQuery.message?.message_id,
      });
    }

    await safeAnswerCallbackQuery(ctx, `Додано: ${freshenable.length}.`);
    await ctx.reply(
      `Додано свіжування туш: ${freshenable.length}. Будете обробляти їх по черзі${durationSecondsSuffix(player, durationMs)}.`,
      await actionQueueReplyOptions(player.id)
    );
  } catch (error) {
    await safeAnswerCallbackQuery(ctx, actionErrorMessage(error, "Не вдалося додати свіжування."));
    await replyToActionError(ctx, error, "Не вдалося додати свіжування.");
  }
}

async function submitTargetFollowIntent(ctx: any, type: "player" | "creature", targetId: number) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) {
    await safeAnswerCallbackQuery(ctx);
    return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  }

  const target = await resolveTarget(type, targetId, player.currentLocationId);
  if (!target || target.isCorpse) {
    await safeAnswerCallbackQuery(ctx, "Цілі вже немає поруч.");
    return void (await editOrReply(ctx, "Цілі вже немає поруч. Можна роздивитися місцину ще раз.", buildExamineLocationKeyboard()));
  }

  if (target.kind === "player" && target.id === player.id) {
    await safeAnswerCallbackQuery(ctx, "Власний слід і так під ногами.");
    return void (await ctx.reply("Власний слід і так під ногами."));
  }

  await setPlayerFollowIntent(player.id, { type: target.kind, id: target.id, label: target.forms.nominative }, player.currentLocationId);
  await safeAnswerCallbackQuery(ctx, "Слід узято.");
  await ctx.reply(followIntentSetText({ label: target.forms.nominative, forms: target.forms }));
  if (target.kind === "creature") {
    const mentorship = await maybeOfferMentorshipAfterFollow({ playerId: player.id, mentorCreatureId: target.id });
    if (mentorship.kind === "offer") {
      await ctx.reply(mentorship.text, { parse_mode: "HTML", reply_markup: mentorshipOfferKeyboard(mentorship.mentorship.id) });
    } else if (mentorship.kind === "active" || mentorship.kind === "not-better") {
      await ctx.reply(mentorship.text, { parse_mode: "HTML" });
    }
  }
}

export function registerSocialHandlers(bot: Bot) {
  bot.callbackQuery(/^target:(player|creature):(\d+)(?::(brief|details):(\d+))?$/, async (ctx) => {
    const type = ctx.match[1];
    const targetId = Number(ctx.match[2]);
    const returnCallback = targetReturnCallback(ctx.match[3], Number(ctx.match[4]));
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const target = await resolveTarget(type, targetId, player.currentLocationId);
    if (!target) {
      await safeAnswerCallbackQuery(ctx, "Цілі вже немає поруч.");
      return void (await editOrReply(ctx, "Цілі вже немає поруч. Можна роздивитися місцину ще раз.", buildExamineLocationKeyboard()));
    }

    await safeAnswerCallbackQuery(ctx);
    await editOrReply(ctx, `Ви зосереджуєтесь на: ${target.forms.locative}`, await buildActionKeyboard(player.id, target, false, returnCallback));
  });

  bot.callbackQuery(/^give:raw_meat:creature:(\d+)$/, async (ctx) => {
    await safeAnswerCallbackQuery(ctx, "Передаємо.");
    await submitGiveRawMeatToCreature(bot, ctx, Number(ctx.match[1]));
  });

  bot.callbackQuery(/^social:follow:(player|creature):(\d+)(?::(known|mystery))?(?::(brief|details):(\d+))?$/, async (ctx) => {
    await submitTargetFollowIntent(ctx, ctx.match[1] as "player" | "creature", Number(ctx.match[2]));
  });

  bot.callbackQuery(/^social:pickup:creature:(\d+)(?::(brief|details):(\d+))?$/, async (ctx) => {
    const targetId = Number(ctx.match[1]);
    const returnCallback = targetReturnCallback(ctx.match[2], Number(ctx.match[3]));
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const visibility = await visibilityRulesForLocation(player.currentLocationId, "details");
    if (!visibility.showGroundObjects) {
      await safeAnswerCallbackQuery(ctx, "Без світла трупів не розібрати.");
      return void (await editOrReply(ctx, "Без світла трупів поруч не розібрати. Спершу озирніться при світлі або запаліть факел.", buildExamineLocationKeyboard()));
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
      return void (await editOrReply(ctx, "Трупа вже немає поруч. Можна роздивитися місцину ще раз.", buildExamineLocationKeyboard()));
    }

    let resourceType: Awaited<ReturnType<typeof addCorpseToInventory>>;
    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      resourceType = await addCorpseToInventory(player.id, creature);
    } catch (error) {
      const message = actionErrorMessage(error, "Трупа вже немає поруч.");
      await safeAnswerCallbackQuery(ctx, message);
      if (isPlayerMustStandError(error)) {
        await replyToActionError(ctx, error, "Не вдалося підняти це.");
        return;
      }
      return void (await editOrReply(ctx, "Трупа вже немає поруч. Можна роздивитися місцину ще раз.", buildExamineLocationKeyboard()));
    }

    await safeAnswerCallbackQuery(ctx, "Підібрано.");
    const itemName = resourceTypeDisplayName(resourceType);
    await recordVisibleItemAction(bot, {
      playerId: player.id,
      locationId: player.currentLocationId,
      observerText: pickupObserverText(player, itemName),
      eventTitle: "Player picked up corpse",
      eventDescription: `player=${player.id}; creature=${creature.id}; item=${resourceType.key}; name=${itemName}`,
      actionNote: `піднято: ${itemName}`,
    });
    await spendPlayerStaminaAmount(bot, player.id, 1, ctx.chat?.id);
    await editOrReply(
      ctx,
      `🤲 Ви підібрали ${itemName}.\n\nВін лежить у ваших речах, але ще псується. Якщо забаритися, від нього лишиться тільки слід.`,
      new InlineKeyboard().text("↩️ Назад", returnCallback).row(),
    );
    if (await rememberTutorialInventoryForPlayer(player, `pickup:${resourceType.key}`)) {
      await ctx.reply("Речі тепер можна відкрити з клавіатури.", { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
    }
  });

  bot.callbackQuery("social:freshenAll", async (ctx) => {
    await submitFreshenAll(bot, ctx);
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
      return void (await editOrReply(ctx, "Цілі вже немає поруч. Можна роздивитися місцину ще раз.", buildExamineLocationKeyboard()));
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
      return void (await editOrReply(ctx, "Цілі вже немає поруч. Можна роздивитися місцину ще раз.", buildExamineLocationKeyboard()));
    }

    try {
      await performSocialSignal(bot, player, target, socialId, ctx.chat?.id);
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося подати сигнал.");
      return;
    }

    await safeAnswerCallbackQuery(ctx, "Сигнал подано.");
  });

  bot.callbackQuery(/^targetSpeech:(say|whisper):(player|creature):(\d+)(?::(known|mystery))?$/, async (ctx) => {
    const mode = ctx.match[1] as TargetSpeechMode;
    const type = ctx.match[2] as "player" | "creature";
    const targetId = Number(ctx.match[3]);
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const target = await resolveTarget(type, targetId, player.currentLocationId);
    if (!target || target.isCorpse) {
      await safeAnswerCallbackQuery(ctx, "Цілі вже немає поруч.");
      return void (await editOrReply(ctx, "Цілі вже немає поруч. Можна роздивитися місцину ще раз.", buildExamineLocationKeyboard()));
    }

    pendingTargetSpeech.set(ctx.from.id, { mode, targetType: type, targetId });
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply(targetSpeechPrompt(mode, target), {
      reply_markup: {
        force_reply: true,
        selective: true,
        input_field_placeholder: targetSpeechPlaceholder(mode),
      },
    });
  });

  bot.callbackQuery(/^social:(look|greet|inspect|attack|freshen):(player|creature):(\d+)(?::(known|mystery))?(?::(brief|details):(\d+))?$/, async (ctx) => {
    const action = ctx.match[1] as "look" | "greet" | "inspect" | "attack" | "freshen";
    const type = ctx.match[2] as "player" | "creature";
    const targetId = Number(ctx.match[3]);
    const mode = (ctx.match[4] ?? "known") as "known" | "mystery";
    const returnCallback = targetReturnCallback(ctx.match[5], Number(ctx.match[6]));
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player || !player.currentLocationId) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const target = await resolveTarget(type, targetId, player.currentLocationId);
    if (!target) {
      await safeAnswerCallbackQuery(ctx, "Цілі вже немає поруч.");
      return void (await editOrReply(ctx, "Цілі вже немає поруч. Можна роздивитися місцину ще раз.", buildExamineLocationKeyboard()));
    }

    if (action === "greet" && !target.canGreet) return void (await safeAnswerCallbackQuery(ctx, "Ця ціль не відповість на привітання."));
    if (action === "attack" && !target.canAttack) return void (await safeAnswerCallbackQuery(ctx, attackUnavailableText(target)));
    if (action === "freshen" && (!target.isCorpse || !target.canFreshen)) return void (await safeAnswerCallbackQuery(ctx, "Труп уже не підходить."));

    const typeMap = { look: "INSPECT", greet: "GREET", inspect: "INSPECT", attack: "ATTACK", freshen: "FRESHEN" } as const;
    const durationMs = actionDurationMs(typeMap[action], player.stamina);

    let result: Awaited<ReturnType<typeof performOrQueuePlayerAction>>;
    try {
      result = await performOrQueuePlayerAction(bot, {
        playerId: player.id,
        type: typeMap[action],
        payload: { targetType: type, targetId, mode, detail: action === "look" ? "brief" : undefined, returnCallback },
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

    await safeAnswerCallbackQuery(ctx, result.mode === "immediate" ? "Дію виконано." : `Дію додано в чергу${durationSecondsSuffix(player, durationMs)}.`);
    await sendActionSubmitFeedback(ctx, player.id, result);
  });

  bot.on("message:text", async (ctx, next) => {
    const pending = pendingTargetSpeech.get(ctx.from.id);
    if (!pending) return next();

    const text = String(ctx.message.text ?? "").trim();
    const normalized = text.toLocaleLowerCase("uk-UA");
    if (["/cancel", "cancel", "скасувати", "відмінити", "стоп", "не треба"].includes(normalized)) {
      pendingTargetSpeech.delete(ctx.from.id);
      await ctx.reply("Добре, репліку скасовано.");
      return;
    }

    if (text.startsWith("/")) {
      pendingTargetSpeech.delete(ctx.from.id);
      return next();
    }

    pendingTargetSpeech.delete(ctx.from.id);
    await submitTargetSpeech(bot, ctx, pending, text);
  });

  bot.callbackQuery(["track", "track:details"], async (ctx) => {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) {
      await safeAnswerCallbackQuery(ctx);
      return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    }

    const durationMs = actionDurationMs("TRACK", player.stamina);
    let result: Awaited<ReturnType<typeof performOrQueuePlayerAction>>;
    try {
      const detail = ctx.callbackQuery.data === "track:details";
      result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "TRACK", payload: { detail }, durationMs, chatId: ctx.chat?.id, interruptQueued: true });
    } catch (error) {
      await safeAnswerCallbackQuery(ctx, error instanceof Error ? error.message : "Не вдалося додати дію.");
      return;
    }

    await safeAnswerCallbackQuery(ctx, result.mode === "immediate" ? "Ви вдивляєтесь у сліди." : `Вистежування додано в чергу${durationSecondsSuffix(player, durationMs)}.`);
    await sendActionSubmitFeedback(ctx, player.id, result);
  });
}
