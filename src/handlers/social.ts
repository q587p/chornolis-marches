import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { getPlayerByTelegramId } from "../services/players";
import { buildTargetActionKeyboard } from "../ui/keyboards";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { creatureForms, playerForms, type NameForms } from "../services/grammar";
import { actionDurationMs, performOrQueuePlayerAction } from "../services/actionQueue";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";

function formatSex(sex: string | null | undefined) {
  if (sex === "MALE") return "самець";
  if (sex === "FEMALE") return "самиця";
  return "невідомо";
}

function formatPercent(success: number, attempts: number) {
  if (!attempts) return "0%";
  return `${Math.round((success / attempts) * 100)}%`;
}

function formatPlayerStats(target: any) {
  return [
    `Пройдено локацій: ${target.steps}`,
    `Оглядів: ${target.looks}`,
    `Сказано фраз: ${target.says}`,
    `Привітань: ${target.greetings}`,
    `Спроб збору: ${target.gatherAttempts}`,
    `Вдалого збору: ${target.successfulGathers} (${formatPercent(target.successfulGathers, target.gatherAttempts)})`,
    `Зібрано ягід: ${target.berriesGathered}`,
    `Зібрано грибів: ${target.mushroomsGathered}`,
    `Зібрано трав: ${target.herbsGathered}`,
    `Убито тварин: ${target.animalsKilled}`,
  ].join("\n");
}

type ResolvedTarget = {
  kind: "player" | "creature";
  id: number;
  name: string;
  canGreet: boolean;
  isAnimal: boolean;
  isCorpse: boolean;
  canFreshen: boolean;
  inspect: string;
  forms: NameForms;
};

function buildCorpseActionKeyboard(target: ResolvedTarget) {
  const keyboard = new InlineKeyboard().text("👁 Оглянути ще раз", `social:inspect:${target.kind}:${target.id}:known`).row();
  if (target.canFreshen) keyboard.text("🔪 Освіжувати", `social:freshen:${target.kind}:${target.id}:known`).row();
  keyboard.text("↩️ Назад", "location:details").row();
  return keyboard;
}

function buildActionKeyboard(target: ResolvedTarget, again = false) {
  if (target.isCorpse) return buildCorpseActionKeyboard(target);
  return buildTargetActionKeyboard({ type: target.kind, id: target.id, canGreet: target.canGreet }, again);
}

async function resolveTarget(type: string, id: number, locationId: number): Promise<ResolvedTarget | null> {
  if (type === "player") {
    const target = await prisma.player.findFirst({ where: { id, currentLocationId: locationId } });
    if (!target) return null;
    const forms = playerForms(target);
    return {
      kind: "player",
      id: target.id,
      name: forms.nominative,
      forms,
      canGreet: true,
      isAnimal: false,
      isCorpse: false,
      canFreshen: false,
      inspect: `Ви бачите ${forms.accusative}.\n\nHP: ${target.hp}\nВитривалість: ${target.stamina}\nГолод: ${target.hunger}\n\nСтатистика:\n${formatPlayerStats(target)}`,
    };
  }

  if (type === "creature") {
    const target = await prisma.creature.findFirst({ where: { id, locationId, isGone: false }, include: { species: true } });
    if (!target) return null;
    const forms = creatureForms(target);
    const isAnimal = target.species.kind === "ANIMAL";
    const isCorpse = !target.isAlive && target.age === "CORPSE";
    const corpseLeft = target.corpseDecayTicksLeft ?? target.species.corpseDecayTicks;
    const canFreshen = isCorpse && corpseLeft > Math.floor(target.species.corpseDecayTicks / 2);

    if (isCorpse) {
      return {
        kind: "creature",
        id: target.id,
        name: `труп: ${forms.genitive}`,
        forms: {
          nominative: `труп: ${forms.genitive}`,
          genitive: `трупа ${forms.genitive}`,
          dative: `трупу ${forms.genitive}`,
          accusative: `труп ${forms.genitive}`,
          instrumental: `трупом ${forms.genitive}`,
          locative: `трупі ${forms.genitive}`,
          vocative: `трупе ${forms.genitive}`,
        },
        canGreet: false,
        isAnimal,
        isCorpse: true,
        canFreshen,
        inspect: `Це труп ${forms.genitive}.\n\nВін розкладається.\nДо зникнення лишилось приблизно: ${corpseLeft} тіків.\n${canFreshen ? "\nТруп ще відносно свіжий. Його можна спробувати освіжувати." : "\nТруп уже надто далеко розклався для освіжування."}`,
      };
    }

    return {
      kind: "creature",
      id: target.id,
      name: forms.nominative,
      forms,
      canGreet: !isAnimal,
      isAnimal,
      isCorpse: false,
      canFreshen: false,
      inspect: isAnimal
        ? `Це ${forms.nominative}.\n\nСтан: ${target.isAlive ? "жива" : "мертва"}\nHP: ${target.hp}\nСтать: ${formatSex(target.sex)}\nВік: ${target.age}\nТіків віку: ${target.ageTicks}\nДія: ${target.currentAction ?? "невідомо"}`
        : `${forms.nominative}\n\nСтан: ${target.isAlive ? "живий/активний" : "неактивний"}\nHP: ${target.hp}\nДія: ${target.currentAction ?? "невідомо"}\n\nСтатистика:\nПройдено локацій: ${target.steps}\nОглядів: ${target.looks}\nСказано фраз: ${target.says}\nСпроб збору: ${target.gatherAttempts}\nВдалого збору: ${target.successfulGathers}`,
    };
  }

  return null;
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
    if (action === "attack" && (target.kind !== "creature" || !target.isAnimal || target.isCorpse)) return void (await safeAnswerCallbackQuery(ctx, "Поки що можна атакувати тільки живих тварин."));
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
