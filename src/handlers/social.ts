import { Bot } from "grammy";
import { prisma } from "../db";
import { getPlayerByTelegramId } from "../services/players";
import { notifyLocation } from "../services/notifications";
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

function targetKindText(target: { kind: "player" | "creature"; isAnimal?: boolean }) {
  if (target.kind === "player") return "до когось поруч";
  if (target.isAnimal) return "до чогось поруч";
  return "до когось поруч";
}

async function editOrReply(ctx: any, text: string) {
  try {
    await ctx.editMessageText(text);
  } catch {
    await ctx.reply(text);
  }
}

async function resolveTarget(type: string, id: number, locationId: number) {
  if (type === "player") {
    const target = await prisma.player.findFirst({ where: { id, currentLocationId: locationId } });
    if (!target) return null;
    return {
      kind: "player" as const,
      id: target.id,
      name: target.firstName ?? target.username ?? "мандрівник",
      isAnimal: false,
      canGreet: true,
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
      kind: "creature" as const,
      id: target.id,
      name,
      isAnimal,
      canGreet: !isAnimal,
      inspect: isAnimal
        ? `${name}\n\nСтан: ${target.isAlive ? "жива" : "мертва"}\nHP: ${target.hp}\nСтать: ${formatSex(target.sex)}\nВік: ${target.age}\nДія: ${target.currentAction ?? "невідомо"}`
        : `${name}\n\nСтан: ${target.isAlive ? "живий/активний" : "неактивний"}\nHP: ${target.hp}\nДія: ${target.currentAction ?? "невідомо"}`,
    };
  }

  return null;
}

export function registerSocialHandlers(bot: Bot) {
  bot.callbackQuery(/^social:(greet|inspect|attack):(player|creature):(\d+)$/, async (ctx) => {
    const action = ctx.match[1];
    const type = ctx.match[2];
    const targetId = Number(ctx.match[3]);
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

    if (action === "greet") {
      if (!target.canGreet) {
        await safeAnswerCallbackQuery(ctx, "Тварина не відповість на привітання.");
        return void (await editOrReply(ctx, "Це не виглядає співрозмовником."));
      }

      const greeting = pick(GREETINGS);
      await prisma.player.update({ where: { id: player.id }, data: { greetings: { increment: 1 } } });
      await notifyLocation(bot, player.currentLocationId, player.id, `Хтось звертається до ${target.name}: «${greeting}»`);
      await safeAnswerCallbackQuery(ctx, "Ви привітались.");
      await editOrReply(ctx, `Ви сказали ${target.name}: «${greeting}»`);
      await logEvent("GREET", "Player greeted target", `${target.kind}:${target.id}`, player.currentLocationId);
      return;
    }

    if (action === "inspect") {
      await safeAnswerCallbackQuery(ctx);
      await editOrReply(ctx, `👁 Ви придивляєтесь ${targetKindText(target)}.\n\n${target.inspect}`);
      await logEvent("INSPECT", "Player inspected target", `${target.kind}:${target.id}`, player.currentLocationId);
      return;
    }

    await safeAnswerCallbackQuery(ctx, "Бойова система ще не готова.");
    await editOrReply(ctx, `⚔️ Ви готуєтесь атакувати, але бойова система ще не готова.`);
    await logEvent("PLAYER_ACTION", "Player tried to attack target", `${target.kind}:${target.id}`, player.currentLocationId);
  });

  bot.callbackQuery("track", async (ctx) => {
    await safeAnswerCallbackQuery(ctx, "Система слідів ще в розробці.");
    await editOrReply(ctx, "👣 Ви вдивляєтесь у сліди. Поки що відслідковування ще не реалізоване, але напрямок втечі відчутний у землі й траві.");
  });
}
