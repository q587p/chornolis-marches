import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { getPlayerByTelegramId } from "../services/players";
import { notifyLocation } from "../services/notifications";
import { buildTargetActionKeyboard } from "../ui/keyboards";
import { logEvent } from "../services/worldEvents";
import { safeAnswerCallbackQuery } from "../utils/telegram";

const GREETINGS = [
  "Вітаю тебе в тіні Чорнолісу.",
  "Хай стежка буде м’якою під ногами.",
  "Доброго здоров’я, подорожній.",
  "Ліс бачить нас обох.",
  "Мир тобі, поки мир тримається.",
  "Нехай коріння не плутає твої кроки.",
  "Слава добрій зустрічі.",
  "Хай вітер несе добрі вісті.",
  "Не бійся тіні, якщо вона твоя.",
  "Радий бачити живу душу тут.",
  "Вітаю, поки ніч не стала густішою.",
  "Хай Чорноліс сьогодні мовчить до тебе лагідно.",
];

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

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

function formatTargetIntro(target: ResolvedTarget, isMystery: boolean) {
  if (!isMystery) return `👁 Ви придивляєтесь до ${target.name}.`;
  if (target.kind === "creature" && target.isCorpse) return "👁 Ви придивляєтесь до того, що лежить нерухомо.";
  if (target.kind === "creature" && target.isAnimal) return "👁 Ви придивляєтесь до цієї істоти.";
  return "👁 Ви придивляєтесь до цієї постаті.";
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
};

function buildCorpseActionKeyboard(target: ResolvedTarget) {
  const keyboard = new InlineKeyboard()
    .text("👁 Оглянути ще раз", `social:inspect:${target.kind}:${target.id}:known`)
    .row();

  if (target.canFreshen) {
    keyboard.text("🔪 Освіжувати", `social:freshen:${target.kind}:${target.id}:known`).row();
  }

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

    const name = target.firstName ?? target.username ?? "мандрівник";

    return {
      kind: "player",
      id: target.id,
      name,
      canGreet: true,
      isAnimal: false,
      isCorpse: false,
      canFreshen: false,
      inspect: `Ви бачите ${name}.\n\nHP: ${target.hp}\nВитривалість: ${target.stamina}\nГолод: ${target.hunger}\n\nСтатистика:\n${formatPlayerStats(target)}`,
    };
  }

  if (type === "creature") {
    const target = await prisma.creature.findFirst({
      where: { id, locationId, isGone: false },
      include: { species: true },
    });
    if (!target) return null;

    const name = target.name ?? target.species.name;
    const isAnimal = target.species.kind === "ANIMAL";
    const isCorpse = !target.isAlive && target.age === "CORPSE";
    const corpseLeft = target.corpseDecayTicksLeft ?? target.species.corpseDecayTicks;
    const canFreshen = isCorpse && corpseLeft > Math.floor(target.species.corpseDecayTicks / 2);

    if (isCorpse) {
      return {
        kind: "creature",
        id: target.id,
        name: `труп: ${name}`,
        canGreet: false,
        isAnimal,
        isCorpse: true,
        canFreshen,
        inspect: `Це труп: ${name}.\n\nВін розкладається.\nДо зникнення лишилось приблизно: ${corpseLeft} тіків.\n${canFreshen ? "\nТруп ще відносно свіжий. Його можна спробувати освіжувати." : "\nТруп уже надто далеко розклався для освіжування."}`,
      };
    }

    return {
      kind: "creature",
      id: target.id,
      name,
      canGreet: !isAnimal,
      isAnimal,
      isCorpse: false,
      canFreshen: false,
      inspect: isAnimal
        ? `Це ${name}.\n\nСтан: ${target.isAlive ? "жива" : "мертва"}\nHP: ${target.hp}\nСтать: ${formatSex(target.sex)}\nВік: ${target.age}\nТіків віку: ${target.ageTicks}\nДія: ${target.currentAction ?? "невідомо"}`
        : `${name}\n\nСтан: ${target.isAlive ? "живий/активний" : "неактивний"}\nHP: ${target.hp}\nДія: ${target.currentAction ?? "невідомо"}\n\nСтатистика:\nПройдено локацій: ${target.steps}\nОглядів: ${target.looks}\nСказано фраз: ${target.says}\nСпроб збору: ${target.gatherAttempts}\nВдалого збору: ${target.successfulGathers}`,
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
    await editOrReply(ctx, `Ви зосереджуєтесь на: ${target.name}`, buildActionKeyboard(target));
  });

  bot.callbackQuery(/^social:(greet|inspect|attack|freshen):(player|creature):(\d+)(?::(known|mystery))?$/, async (ctx) => {
    const action = ctx.match[1];
    const type = ctx.match[2];
    const targetId = Number(ctx.match[3]);
    const mode = ctx.match[4] ?? "known";
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

    const keyboard = buildActionKeyboard(target, true);

    if (action === "greet") {
      if (!target.canGreet) {
        await safeAnswerCallbackQuery(ctx, "Ця ціль не відповість на привітання.");
        return void (await editOrReply(ctx, `${target.name} не виглядає співрозмовником.`, keyboard));
      }

      const greeting = pick(GREETINGS);
      await prisma.player.update({ where: { id: player.id }, data: { greetings: { increment: 1 } } });

      await notifyLocation(bot, player.currentLocationId, player.id, `Хтось звертається до ${target.name}: «${greeting}»`);
      await safeAnswerCallbackQuery(ctx, "Ви привітались.");
      await editOrReply(ctx, `Ви сказали ${target.name}: «${greeting}»`, keyboard);
      await logEvent("GREET", "Player greeted target", `${target.kind}:${target.id}: ${greeting}`, player.currentLocationId);
      return;
    }

    if (action === "inspect") {
      await safeAnswerCallbackQuery(ctx);
      await editOrReply(ctx, `${formatTargetIntro(target, mode === "mystery")}\n\n${target.inspect}`, keyboard);
      await logEvent("INSPECT", "Player inspected target", `${target.kind}:${target.id}`, player.currentLocationId);
      return;
    }

    if (action === "freshen") {
      if (!target.isCorpse || !target.canFreshen) {
        await safeAnswerCallbackQuery(ctx, "Труп уже не підходить.");
        return void (await editOrReply(ctx, `${target.name} уже надто розклався для освіжування.`, keyboard));
      }

      await safeAnswerCallbackQuery(ctx, "Ви освіжували труп.");
      await editOrReply(ctx, `🔪 Ви освіжували ${target.name}.\n\nПоки що це debug-дія без здобичі; пізніше тут будуть шкіра, м’ясо, кістки тощо.`, keyboard);
      await logEvent("PLAYER_ACTION", "Player freshened corpse", `${target.kind}:${target.id}`, player.currentLocationId);
      return;
    }

    if (action === "attack") {
      if (target.kind !== "creature" || !target.isAnimal || target.isCorpse) {
        await safeAnswerCallbackQuery(ctx, "Поки що можна атакувати тільки живих тварин.");
        await editOrReply(ctx, "⚔️ Бойова система для цієї цілі ще не готова.", keyboard);
        return;
      }

      const creature = await prisma.creature.findFirst({
        where: {
          id: target.id,
          locationId: player.currentLocationId,
          isAlive: true,
          isGone: false,
        },
        include: {
          species: true,
        },
      });

      if (!creature) {
        await safeAnswerCallbackQuery(ctx, "Цілі вже немає поруч.");
        await editOrReply(ctx, "Цілі вже немає поруч. Можна спробувати відслідкувати слід.");
        return;
      }

      await prisma.creature.update({
        where: { id: creature.id },
        data: {
          hp: 0,
          isAlive: false,
          age: "CORPSE",
          diedAtTick: null,
          corpseDecayTicksLeft: creature.species.corpseDecayTicks,
          activity: "RESTING",
          currentAction: "лежить нерухомо",
        },
      });

      await prisma.player.update({
        where: { id: player.id },
        data: {
          animalsKilled: { increment: 1 },
        },
      });

      await notifyLocation(bot, player.currentLocationId, player.id, `Хтось атакує і вбиває ${target.name}.`);

      const corpseTarget = await resolveTarget("creature", creature.id, player.currentLocationId);
      const corpseKeyboard = corpseTarget ? buildActionKeyboard(corpseTarget, true) : keyboard;

      await safeAnswerCallbackQuery(ctx, "Тварину вбито.");
      await editOrReply(ctx, `⚔️ Ви атакували і вбили ${target.name}. Труп лишився на землі.`, corpseKeyboard);

      await logEvent("PLAYER_ACTION", "Player killed animal", `${target.kind}:${target.id}`, player.currentLocationId);

      return;
    }
  });

  bot.callbackQuery("track", async (ctx) => {
    await safeAnswerCallbackQuery(ctx, "Система слідів ще в розробці.");
    await ctx.reply("👣 Ви вдивляєтесь у сліди. Поки що відслідковування ще не реалізоване, але напрямок втечі відчутний у землі й траві.");
  });
}
