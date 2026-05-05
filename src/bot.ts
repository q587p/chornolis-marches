import { Bot, InlineKeyboard } from "grammy";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";
import http from "http";

dotenv.config();

const port = process.env.PORT || 3000;

http
  .createServer((_req, res) => {
    res.writeHead(200);
    res.end("Chornolis Marches bot is alive 🌲");
  })
  .listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not set");
}

const { Pool } = pg;
const isRenderInternalDb = process.env.DATABASE_URL.includes(".internal");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderInternalDb ? false : { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const bot = new Bot(process.env.BOT_TOKEN);

const TICK_MS = Number(process.env.TICK_MS ?? 5000);
const NPC_TICK_MS = Number(process.env.NPC_TICK_MS ?? 12000);

const directionLabels: Record<string, string> = {
  NORTH: "Північ",
  EAST: "Схід",
  SOUTH: "Південь",
  WEST: "Захід",
  UP: "Вгору",
  DOWN: "Вниз",
  INSIDE: "Всередину",
  OUTSIDE: "Назовні",
};

const directionButtons: Record<string, string> = {
  NORTH: "⬆️ Північ",
  EAST: "Схід ➡️",
  SOUTH: "⬇️ Південь",
  WEST: "⬅️ Захід",
  UP: "⬆️ Вгору",
  DOWN: "⬇️ Вниз",
  INSIDE: "🚪 Всередину",
  OUTSIDE: "🚪 Назовні",
};

const gatherRules: Record<string, { chance: number; ticks: number; label: string }> = {
  mushrooms: { chance: 1 / 3, ticks: 2, label: "гриби" },
  berries: { chance: 1 / 4, ticks: 1, label: "ягоди" },
  herbs: { chance: 1 / 5, ticks: 3, label: "трави" },
};

const herbalistPhrases = [
  "Не кожна трава лікує, але кожна щось пам’ятає.",
  "Після дощу гриби не питають дозволу.",
  "Там, де мох темний, краще ступати тихо.",
  "Чорноліс не любить поспіху.",
  "Ягоди гарні, та не всі для живих.",
  "Сліди на землі брешуть менше, ніж люди.",
  "Якщо ліс мовчить — слухай уважніше.",
  "Траву треба зрізати з подякою, не рвати зі злістю.",
  "Старі дерева знають дорогу назад.",
  "Лісовика краще вітати першим.",
];

const greetingPhrases = [
  "Здоров будь.",
  "Нехай стежка буде легкою.",
  "Мир тобі під цим гіллям.",
  "Хай Чорноліс тебе не забере.",
  "Доброго шляху.",
];

function escapeMd(text: string) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

function plainName(player: { firstName: string | null; username: string | null }) {
  return player.firstName ?? player.username ?? "мандрівник";
}

function resourceAmountLabel(amount: number) {
  if (amount >= 20) return "багато";
  if (amount >= 8) return "трохи";
  return "майже немає";
}

function creatureActivityText(activity: string) {
  switch (activity) {
    case "LOOKING":
      return "придивляється до місцевості";
    case "MOVING":
      return "збирається рушати далі";
    case "GATHERING":
      return "щось збирає";
    case "SPEAKING":
      return "щось бурмоче собі під ніс";
    case "FIGHTING":
      return "б’ється";
    case "SETTING_TRAP":
      return "ставить пастку";
    default:
      return "стоїть поруч";
  }
}

async function safeAnswerCallbackQuery(ctx: any, text?: string) {
  try {
    await ctx.answerCallbackQuery(text ? { text } : undefined);
  } catch (error) {
    console.warn("answerCallbackQuery ignored:", error);
  }
}

async function safeEditOrReply(ctx: any, text: string, keyboard?: InlineKeyboard) {
  try {
    await ctx.editMessageText(text, {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
  } catch (error: any) {
    const description = error?.description ?? "";
    if (description.includes("message is not modified")) return;

    console.warn("editMessageText failed, sending new message:", error);
    await ctx.reply(text, {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
  }
}

async function sendMarkdown(chatId: string, text: string, keyboard?: InlineKeyboard) {
  try {
    await bot.api.sendMessage(chatId, text, {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
  } catch (error) {
    console.warn("sendMessage failed:", error);
  }
}

async function logEvent(data: {
  type: string;
  title: string;
  description?: string;
  locationId?: number | null;
  playerId?: number | null;
}) {
  try {
    await prisma.worldEvent.create({
      data: data as any,
    });
  } catch (error) {
    console.warn("Failed to write world event:", error);
  }
}

async function getStartLocationId() {
  const location = await prisma.cellLocation.findUnique({
    where: { key: "center_chornolis_edge" },
  });

  if (!location) {
    throw new Error("Start location not found. Run npm run seed first.");
  }

  return location.id;
}

async function consumeTicks(playerId: number, ticks: number) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, message: "Персонажа не знайдено." };

  const now = Date.now();
  const last = player.lastActionAt?.getTime() ?? 0;
  const cooldown = ticks * TICK_MS;
  const elapsed = now - last;

  if (elapsed < cooldown) {
    const left = Math.ceil((cooldown - elapsed) / 1000);
    return { ok: false, message: `Ти ще зайнятий\. Зачекай ${left} с\.` };
  }

  await prisma.player.update({
    where: { id: playerId },
    data: { lastActionAt: new Date() },
  });

  return { ok: true, message: "" };
}

function buildMovementKeyboard(exits: Array<{ direction: string }>) {
  const keyboard = new InlineKeyboard();
  const north = exits.find((e) => e.direction === "NORTH");
  const east = exits.find((e) => e.direction === "EAST");
  const south = exits.find((e) => e.direction === "SOUTH");
  const west = exits.find((e) => e.direction === "WEST");

  if (north) keyboard.text(directionButtons.NORTH, "move:NORTH").row();
  if (west) keyboard.text(directionButtons.WEST, "move:WEST");
  if (east) keyboard.text(directionButtons.EAST, "move:EAST");
  if (west || east) keyboard.row();
  if (south) keyboard.text(directionButtons.SOUTH, "move:SOUTH").row();

  const extraDirections = exits.filter(
    (e) => !["NORTH", "EAST", "SOUTH", "WEST"].includes(e.direction)
  );
  for (const exit of extraDirections) {
    keyboard.text(directionButtons[exit.direction] ?? directionLabels[exit.direction], `move:${exit.direction}`).row();
  }

  keyboard.text("🔎 Оглянутися", "look").row();
  return keyboard;
}

function socialKeyboard(targetType: "player" | "creature", targetId: number) {
  return new InlineKeyboard()
    .text("👋 Привітатися", `greet:${targetType}:${targetId}`)
    .text("👁 Придивитися", `inspect:${targetType}:${targetId}`);
}

async function renderLocationBrief(locationId: number, viewerPlayerId?: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isAlive: true }, include: { species: true } },
      exitsFrom: {
        where: { isHidden: false },
        include: { toLocation: true },
        orderBy: { direction: "asc" },
      },
    },
  });

  if (!location) throw new Error("Location not found");

  const exitsText = location.exitsFrom.length
    ? location.exitsFrom
        .map((exit) => `\- ${escapeMd(directionLabels[exit.direction])} → ${escapeMd(exit.toLocation.name)}`)
        .join("\n")
    : "Виходів не видно\.";

  const otherPlayers = location.players.filter((p) => p.id !== viewerPlayerId);
  const charactersCount = otherPlayers.length + location.creatures.length;
  const charactersText = charactersCount > 0 ? `\n\nПоруч хтось є\.` : "";

  return {
    text: `🌲 *${escapeMd(location.name)}*\n\n${escapeMd(location.description ?? "")}\n\nВиходи:\n${exitsText}${charactersText}`,
    keyboard: buildMovementKeyboard(location.exitsFrom),
  };
}

async function renderLocationDetails(locationId: number, viewerPlayerId?: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isAlive: true }, include: { species: true } },
      resources: { include: { resourceType: true } },
      exitsFrom: {
        where: { isHidden: false },
        include: { toLocation: true },
        orderBy: { direction: "asc" },
      },
    },
  });

  if (!location) throw new Error("Location not found");

  const otherPlayers = location.players.filter((p) => p.id !== viewerPlayerId);
  const characterLines = [
    ...otherPlayers.map((p) => `\- ${escapeMd(plainName(p))}: ${escapeMd("стоїть поруч")}`),
    ...location.creatures.map((c) => {
      const name = c.name ?? c.species.name;
      return `\- ${escapeMd(name)}: ${escapeMd(creatureActivityText(c.activity))}`;
    }),
  ];

  const charactersText = characterLines.length ? `\n\nПоруч:\n${characterLines.join("\n")}` : "";

  const resourceLines = location.resources
    .filter((r) => r.amount > 0)
    .map((r) => `\- _${escapeMd(r.resourceType.name)}: ${escapeMd(resourceAmountLabel(r.amount))}_`);

  const resourcesText = resourceLines.length
    ? `\n\nТи помічаєш:\n${resourceLines.join("\n")}`
    : "";

  const keyboard = new InlineKeyboard();
  for (const resource of location.resources.filter((r) => r.amount > 0)) {
    keyboard.text(`Зібрати: ${resource.resourceType.name}`, `gather:${resource.resourceType.key}`).row();
  }

  const movementKeyboard = buildMovementKeyboard(location.exitsFrom);
  for (const row of movementKeyboard.inline_keyboard) {
    for (const button of row) {
      if ("text" in button && "callback_data" in button) {
        keyboard.text(button.text, button.callback_data);
      }
    }
    keyboard.row();
  }

  return {
    text: `🔎 *${escapeMd(location.name)}*\n\n_${escapeMd("Ти витрачаєш трохи часу й придивляєшся до місця.")}_\n\nКоординати: ${location.x}, ${location.y}, ${location.z}\nНебезпека: ${location.dangerLevel}${resourcesText}${charactersText}`,
    keyboard,
  };
}

async function getOrCreatePlayer(from: NonNullable<any["from"]>) {
  const startLocationId = await getStartLocationId();
  return prisma.player.upsert({
    where: { telegramId: String(from.id) },
    update: {
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      currentLocationId: startLocationId,
    },
    create: {
      telegramId: String(from.id),
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      currentLocationId: startLocationId,
    },
  });
}

async function notifyLocation(locationId: number, exceptPlayerId: number | null, text: string, keyboard?: InlineKeyboard) {
  const players = await prisma.player.findMany({
    where: {
      currentLocationId: locationId,
      ...(exceptPlayerId ? { NOT: { id: exceptPlayerId } } : {}),
    },
  });

  for (const player of players) {
    await sendMarkdown(player.telegramId, text, keyboard);
  }
}

bot.command("start", async (ctx) => {
  const from = ctx.from;
  if (!from) {
    await ctx.reply("Не бачу дані Telegram-користувача.");
    return;
  }

  const player = await getOrCreatePlayer(from);
  const view = await renderLocationBrief(player.currentLocationId!, player.id);

  await ctx.reply(
    `🌲 Порубіжжя Чорнолісу ожили\.\n\nВітаю, ${escapeMd(player.firstName ?? "мандрівнику")}\. Твій слід збережено в Чорнолісі\.\n\n${view.text}`,
    { parse_mode: "MarkdownV2", reply_markup: view.keyboard }
  );
});

bot.command("me", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const player = await prisma.player.findUnique({
    where: { telegramId: String(from.id) },
    include: { currentLocation: true, inventory: { include: { resourceType: true } } },
  });

  if (!player) {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  const inventoryText = player.inventory.length
    ? player.inventory.map((i) => `\- ${escapeMd(i.resourceType.name)} ×${i.amount}`).join("\n")
    : "порожньо";

  await ctx.reply(
    `🧍 *${escapeMd(plainName(player))}*\n\nHP: ${player.hp}\nВитривалість: ${player.stamina}\nГолод: ${player.hunger}\nЛокація: ${escapeMd(player.currentLocation?.name ?? "невідомо")}\n\nСтатистика:\n\- кроків: ${player.steps}\n\- оглядів: ${player.looks}\n\- вітань: ${player.greetings}\n\- сказано фраз: ${player.says}\n\- пошуків ресурсів: ${player.gatherAttempts}\n\- успішних зборів: ${player.successfulGathers}\n\nІнвентар:\n${inventoryText}`,
    { parse_mode: "MarkdownV2" }
  );
});

bot.command("world", async (ctx) => {
  const [playersCount, regionsCount, locationsCount, exitsCount, creaturesCount, resourcesCount, eventsCount] =
    await Promise.all([
      prisma.player.count(),
      prisma.region.count(),
      prisma.cellLocation.count(),
      prisma.locationExit.count(),
      prisma.creature.count({ where: { isAlive: true } }),
      prisma.resourceNode.count({ where: { amount: { gt: 0 } } }),
      prisma.worldEvent.count(),
    ]);

  const lastEvent = await prisma.worldEvent.findFirst({ orderBy: { createdAt: "desc" } });

  await ctx.reply(
    `🌲 *Стан Порубіжжя Чорнолісу*\n\nПерсонажів гравців у базі: ${playersCount}\nРегіонів: ${regionsCount}\nЛокацій\-клітинок: ${locationsCount}\nПереходів між клітинками: ${exitsCount}\nЖивих істот / NPC: ${creaturesCount}\nВузлів ресурсів: ${resourcesCount}\nПодій у журналі: ${eventsCount}\n\nПоточна подія: ${escapeMd(lastEvent?.title ?? "світ дихає спокійно")}`,
    { parse_mode: "MarkdownV2" }
  );
});

bot.command("look", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const player = await prisma.player.findUnique({ where: { telegramId: String(from.id) } });
  if (!player) {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  const cooldown = await consumeTicks(player.id, 1);
  if (!cooldown.ok) {
    await ctx.reply(cooldown.message, { parse_mode: "MarkdownV2" });
    return;
  }

  const locationId = player.currentLocationId ?? (await getStartLocationId());
  await prisma.player.update({ where: { id: player.id }, data: { currentLocationId: locationId, looks: { increment: 1 } } });
  await logEvent({ type: "LOOK", title: `${plainName(player)} оглядається`, locationId, playerId: player.id });

  const view = await renderLocationDetails(locationId, player.id);
  await ctx.reply(view.text, { parse_mode: "MarkdownV2", reply_markup: view.keyboard });
});

bot.command("say", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const text = String(ctx.match ?? "").trim().slice(0, 300);
  if (!text) {
    await ctx.reply("Напиши так: /say текст");
    return;
  }

  const player = await prisma.player.findUnique({ where: { telegramId: String(from.id) } });
  if (!player || !player.currentLocationId) {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  const now = Date.now();
  const lastSay = player.lastSayAt?.getTime() ?? 0;
  if (now - lastSay < TICK_MS) {
    await ctx.reply("Ти щойно говорив. Зачекай один тік.");
    return;
  }

  await prisma.player.update({ where: { id: player.id }, data: { lastSayAt: new Date(), says: { increment: 1 } } });
  await logEvent({ type: "SAY", title: `${plainName(player)} каже щось`, description: text, locationId: player.currentLocationId, playerId: player.id });

  await notifyLocation(
    player.currentLocationId,
    null,
    `💬 ${escapeMd(plainName(player))} каже: “${escapeMd(text)}”`
  );
});

bot.callbackQuery("look", async (ctx) => {
  const player = await prisma.player.findUnique({ where: { telegramId: String(ctx.from.id) } });
  if (!player || !player.currentLocationId) {
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  const cooldown = await consumeTicks(player.id, 1);
  if (!cooldown.ok) {
    await safeAnswerCallbackQuery(ctx, cooldown.message.replace(/\\/g, ""));
    return;
  }

  await prisma.player.update({ where: { id: player.id }, data: { looks: { increment: 1 } } });
  await logEvent({ type: "LOOK", title: `${plainName(player)} оглядається`, locationId: player.currentLocationId, playerId: player.id });

  const view = await renderLocationDetails(player.currentLocationId, player.id);
  await safeAnswerCallbackQuery(ctx);
  await safeEditOrReply(ctx, view.text, view.keyboard);
});

bot.callbackQuery(/^move:(NORTH|EAST|SOUTH|WEST|UP|DOWN|INSIDE|OUTSIDE)$/, async (ctx) => {
  const direction = ctx.match[1];
  const player = await prisma.player.findUnique({ where: { telegramId: String(ctx.from.id) } });

  if (!player) {
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  const cooldown = await consumeTicks(player.id, 1);
  if (!cooldown.ok) {
    await safeAnswerCallbackQuery(ctx, cooldown.message.replace(/\\/g, ""));
    return;
  }

  const currentLocationId = player.currentLocationId ?? (await getStartLocationId());
  const exit = await prisma.locationExit.findUnique({
    where: { fromLocationId_direction: { fromLocationId: currentLocationId, direction: direction as any } },
  });

  if (!exit || exit.isHidden) {
    await safeAnswerCallbackQuery(ctx, "Туди немає видимого шляху.");
    return;
  }

  await notifyLocation(currentLocationId, player.id, "🚶 Хтось пішов звідси\.");

  await prisma.player.update({
    where: { id: player.id },
    data: {
      currentLocationId: exit.toLocationId,
      stamina: Math.max(0, player.stamina - exit.travelCost),
      steps: { increment: 1 },
    },
  });

  await logEvent({
    type: "MOVE",
    title: `${plainName(player)} рухається`,
    description: direction,
    locationId: exit.toLocationId,
    playerId: player.id,
  });

  await notifyLocation(
    exit.toLocationId,
    player.id,
    "🚶 Хтось прийшов сюди\.",
    socialKeyboard("player", player.id)
  );

  const view = await renderLocationBrief(exit.toLocationId, player.id);
  await safeAnswerCallbackQuery(ctx, `Ти рушив: ${directionLabels[direction]}`);
  await safeEditOrReply(ctx, view.text, view.keyboard);
});

bot.callbackQuery(/^gather:(berries|mushrooms|herbs)$/, async (ctx) => {
  const resourceKey = ctx.match[1];
  const rule = gatherRules[resourceKey];
  const player = await prisma.player.findUnique({ where: { telegramId: String(ctx.from.id) } });

  if (!player || !player.currentLocationId) {
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  const cooldown = await consumeTicks(player.id, rule.ticks);
  if (!cooldown.ok) {
    await safeAnswerCallbackQuery(ctx, cooldown.message.replace(/\\/g, ""));
    return;
  }

  const resource = await prisma.resourceNode.findFirst({
    where: {
      locationId: player.currentLocationId,
      resourceType: { key: resourceKey },
      amount: { gt: 0 },
    },
    include: { resourceType: true },
  });

  await prisma.player.update({ where: { id: player.id }, data: { gatherAttempts: { increment: 1 }, stamina: Math.max(0, player.stamina - rule.ticks) } });
  await logEvent({ type: "GATHER_ATTEMPT", title: `${plainName(player)} шукає ${rule.label}`, locationId: player.currentLocationId, playerId: player.id });

  if (!resource || Math.random() > rule.chance) {
    await logEvent({ type: "GATHER_FAIL", title: `${plainName(player)} нічого не знаходить`, locationId: player.currentLocationId, playerId: player.id });
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply(`_${escapeMd("Ти витрачаєш час, але нічого не знаходиш.")}_`, { parse_mode: "MarkdownV2" });
    return;
  }

  const found = Math.min(resource.amount, Math.floor(Math.random() * 3) + 1);
  await prisma.resourceNode.update({ where: { id: resource.id }, data: { amount: resource.amount - found } });
  await prisma.player.update({ where: { id: player.id }, data: { successfulGathers: { increment: 1 } } });
  await prisma.playerResource.upsert({
    where: { playerId_resourceTypeId: { playerId: player.id, resourceTypeId: resource.resourceTypeId } },
    update: { amount: { increment: found } },
    create: { playerId: player.id, resourceTypeId: resource.resourceTypeId, amount: found },
  });

  await logEvent({ type: "GATHER_SUCCESS", title: `${plainName(player)} знаходить ${resource.resourceType.name}`, locationId: player.currentLocationId, playerId: player.id });
  await safeAnswerCallbackQuery(ctx);
  await ctx.reply(`🌿 _${escapeMd(`Ти знаходиш: ${resource.resourceType.name} ×${found}.`)}_`, { parse_mode: "MarkdownV2" });
});

bot.callbackQuery(/^greet:(player|creature):(\d+)$/, async (ctx) => {
  const targetType = ctx.match[1] as "player" | "creature";
  const targetId = Number(ctx.match[2]);
  const player = await prisma.player.findUnique({ where: { telegramId: String(ctx.from.id) } });
  if (!player || !player.currentLocationId) {
    await safeAnswerCallbackQuery(ctx);
    return;
  }

  const phrase = greetingPhrases[Math.floor(Math.random() * greetingPhrases.length)];
  await prisma.player.update({ where: { id: player.id }, data: { greetings: { increment: 1 } } });
  await logEvent({ type: "GREET", title: `${plainName(player)} вітається`, description: `${targetType}:${targetId}`, locationId: player.currentLocationId, playerId: player.id });
  await safeAnswerCallbackQuery(ctx, "Ти вітаєшся.");
  await notifyLocation(player.currentLocationId, null, `👋 ${escapeMd(plainName(player))}: “${escapeMd(phrase)}”`);
});

bot.callbackQuery(/^inspect:(player|creature):(\d+)$/, async (ctx) => {
  const targetType = ctx.match[1] as "player" | "creature";
  const targetId = Number(ctx.match[2]);

  let text = "Нікого такого поруч не видно\.";
  if (targetType === "player") {
    const target = await prisma.player.findUnique({ where: { id: targetId } });
    if (target) text = `👁 Ти придивляєшся: *${escapeMd(plainName(target))}*\.`;
  } else {
    const target = await prisma.creature.findUnique({ where: { id: targetId }, include: { species: true } });
    if (target) text = `👁 Ти придивляєшся: *${escapeMd(target.name ?? target.species.name)}*\. ${escapeMd(creatureActivityText(target.activity))}\.`;
  }

  await safeAnswerCallbackQuery(ctx);
  await ctx.reply(text, { parse_mode: "MarkdownV2" });
});

bot.on("message", async (ctx) => {
  await ctx.reply("Я ще вчуся, але світ уже дихає.");
});

async function runHerbalistTick() {
  const herbalist = await prisma.creature.findFirst({
    where: { species: { key: "human_herbalist" }, isAlive: true },
    include: { location: { include: { exitsFrom: { where: { isHidden: false } } } }, species: true },
  });
  if (!herbalist) return;

  const locationId = herbalist.locationId;

  if (Math.random() < 0.2) {
    const phrase = herbalistPhrases[Math.floor(Math.random() * herbalistPhrases.length)];
    await prisma.creature.update({ where: { id: herbalist.id }, data: { activity: "SPEAKING", says: { increment: 1 } } });
    await logEvent({ type: "NPC_SAY", title: "Травник говорить", description: phrase, locationId });
    await notifyLocation(locationId, null, `💬 ${escapeMd(herbalist.name ?? "Травник")}: “${escapeMd(phrase)}”`);
    return;
  }

  const herbs = await prisma.resourceNode.findFirst({
    where: { locationId, resourceType: { key: "herbs" }, amount: { gt: 0 } },
    include: { resourceType: true },
  });

  if (herbs && Math.random() < 0.67) {
    await prisma.creature.update({ where: { id: herbalist.id }, data: { activity: "GATHERING", gatherAttempts: { increment: 1 } } });

    if (Math.random() < gatherRules.herbs.chance) {
      await prisma.resourceNode.update({ where: { id: herbs.id }, data: { amount: Math.max(0, herbs.amount - 1) } });
      await prisma.creature.update({ where: { id: herbalist.id }, data: { successfulGathers: { increment: 1 } } });
      await logEvent({ type: "GATHER_SUCCESS", title: "Травник знаходить трави", locationId });
    } else {
      await logEvent({ type: "GATHER_FAIL", title: "Травник шукає трави, але нічого не знаходить", locationId });
    }
    return;
  }

  const exits = herbalist.location.exitsFrom;
  if (exits.length === 0) return;

  const exit = exits[Math.floor(Math.random() * exits.length)];
  await notifyLocation(locationId, null, `🚶 ${escapeMd(herbalist.name ?? "Травник")} пішов звідси\.`);
  await prisma.creature.update({
    where: { id: herbalist.id },
    data: { locationId: exit.toLocationId, activity: "MOVING", steps: { increment: 1 } },
  });
  await logEvent({ type: "NPC_MOVE", title: "Травник рухається", description: exit.direction, locationId: exit.toLocationId });
  await notifyLocation(exit.toLocationId, null, `🚶 Хтось прийшов сюди\.`, socialKeyboard("creature", herbalist.id));
}

bot.catch((err) => {
  console.error("Bot handler error:", err.error);
});

async function main() {
  console.log("Bot starting...");
  setInterval(() => {
    runHerbalistTick().catch((error) => console.error("Herbalist tick failed:", error));
  }, NPC_TICK_MS);

  await bot.start();
}

main().catch(async (error) => {
  console.error("Bot crashed:", error);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("World is updating...");
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});
