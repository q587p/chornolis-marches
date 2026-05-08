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

function formatTargetIntro(target: ResolvedTarget, isMystery: boolean) {
  if (!isMystery) return `👁 Ви придивляєтесь до ${target.name}.`;
  if (target.kind === "creature" && target.isAnimal) return "👁 Ви придивляєтесь до цієї істоти.";
  return "👁 Ви придивляєтесь до цієї постаті.";
}

type ResolvedTarget = {
  kind: "player" | "creature";
  id: number;
  name: string;
  canGreet: boolean;
  isAnimal: boolean;
  inspect: string;
};

async function resolveTarget(type: string, id: number, locationId: number): Promise<ResolvedTarget | null> {
  if (type === "player") {
    const target = await prisma.player.findFirst({ where: { id, currentLocationId: locationId } });
    if (!target) return null;
    return {
      kind: "player",
      id: target.id,
      name: target.firstName ?? target.username ?? "мандрівник",
      canGreet: true,
      isAnimal: false,
      inspect: `Ви бачите ${target.firstName ?? target.username ?? "мандрівника"}.\n\nHP: ${target.hp}\nВитривалість: ${target.stamina}\nГолод: ${target.hunger}`,
    };
  }

  if (type === "creature") {
    const target = await prisma.creature.findFirst({
      where: { id, locationId, isAlive: true },
      include: { species: true },
    });
    if (!target) return null;
    const name = target.name ?? target.species.name;
    const isAnimal = target.species.kind === "ANIMAL";
    return {
      kind: "creature",
      id: target.id,
      name,
      canGreet: !isAnimal,
      isAnimal,
      inspect: isAnimal
        ? `Це ${name}.\n\nСтан: ${target.isAlive ? "жива" : "мертва"}\nHP: ${target.hp}\nСтать: ${formatSex(target.sex)}\nВік: ${target.age}\nДія: ${target.currentAction ?? "невідомо"}`
        : `${name}\n\nСтан: ${target.isAlive ? "живий/активний" : "неактивний"}\nHP: ${target.hp}\nДія: ${target.currentAction ?? "невідомо"}`,
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
    await editOrReply(ctx, `Ви зосереджуєтесь на: ${target.name}`, buildTargetActionKeyboard({ type: target.kind, id: target.id, canGreet: target.canGreet }));
  });

  bot.callbackQuery(/^social:(greet|inspect|attack):(player|creature):(\d+)(?::(known|mystery))?$/, async (ctx) => {
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

    const keyboard = buildTargetActionKeyboard({ type: target.kind, id: target.id, canGreet: target.canGreet }, true);

    if (action === "greet") {
      if (!target.canGreet) {
        await safeAnswerCallbackQuery(ctx, "Тварина не відповість на привітання.");
        return void (await editOrReply(ctx, `${target.name} не виглядає співрозмовником.`, keyboard));
      }

      const greeting = pick(GREETINGS);
      await prisma.player.update({ where: { id: player.id }, data: { greetings: { increment: 1 } } });
      await notifyLocation(bot, player.currentLocationId, player.id, `Хтось звертається до ${target.name}: «${greeting}»`);
      await safeAnswerCallbackQuery(ctx, "Ви привітались.");
      await editOrReply(ctx, `Ви сказали ${target.name}: «${greeting}»`, keyboard);
      await logEvent("GREET", "Player greeted target", `${target.kind}:${target.id}`, player.currentLocationId);
      return;
    }

    if (action === "inspect") {
      await safeAnswerCallbackQuery(ctx);
      await editOrReply(ctx, `${formatTargetIntro(target, mode === "mystery")}\n\n${target.inspect}`, keyboard);
      await logEvent("INSPECT", "Player inspected target", `${target.kind}:${target.id}`, player.currentLocationId);
      return;
    }

    await safeAnswerCallbackQuery(ctx, "Бойова система ще не готова.");
    await editOrReply(ctx, `⚔️ Ви готуєтесь атакувати ${target.name}, але бойова система ще не готова.`, keyboard);
    await logEvent("PLAYER_ACTION", "Player tried to attack target", `${target.kind}:${target.id}`, player.currentLocationId);
  });

  bot.callbackQuery("track", async (ctx) => {
    await safeAnswerCallbackQuery(ctx, "Система слідів ще в розробці.");
    await ctx.reply("👣 Ви вдивляєтесь у сліди. Поки що відслідковування ще не реалізоване, але напрямок втечі відчутний у землі й траві.");
  });
}
