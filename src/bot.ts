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
  ssl: isRenderInternalDb
    ? false
    : {
        rejectUnauthorized: false,
      },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const bot = new Bot(process.env.BOT_TOKEN);

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

type Direction =
  | "NORTH"
  | "EAST"
  | "SOUTH"
  | "WEST"
  | "UP"
  | "DOWN"
  | "INSIDE"
  | "OUTSIDE";

type ExitForKeyboard = {
  direction: string;
};

function buildMovementKeyboard(exits: ExitForKeyboard[]) {
  const keyboard = new InlineKeyboard();

  const north = exits.find((e) => e.direction === "NORTH");
  const east = exits.find((e) => e.direction === "EAST");
  const south = exits.find((e) => e.direction === "SOUTH");
  const west = exits.find((e) => e.direction === "WEST");

  if (north) keyboard.text("⬆️ Північ", "move:NORTH").row();

  if (west) keyboard.text("⬅️ Захід", "move:WEST");
  if (east) keyboard.text("Схід ➡️", "move:EAST");
  if (west || east) keyboard.row();

  if (south) keyboard.text("⬇️ Південь", "move:SOUTH").row();

  return keyboard;
}

async function safeAnswerCallbackQuery(ctx: any, text?: string) {
  try {
    await ctx.answerCallbackQuery(text ? { text } : undefined);
  } catch (error) {
    console.warn("answerCallbackQuery ignored:", error);
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

async function getOrCreatePlayer(from: {
  id: number | bigint;
  username?: string;
  first_name?: string;
  last_name?: string;
}) {
  const startLocationId = await getStartLocationId();

  return prisma.player.upsert({
    where: {
      telegramId: String(from.id),
    },
    update: {
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
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

async function ensurePlayerLocation(player: { id: number; currentLocationId: number | null }) {
  if (player.currentLocationId) return player.currentLocationId;

  const startLocationId = await getStartLocationId();

  await prisma.player.update({
    where: { id: player.id },
    data: { currentLocationId: startLocationId },
  });

  return startLocationId;
}

async function renderLocationBrief(locationId: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      exitsFrom: {
        where: { isHidden: false },
        include: { toLocation: true },
        orderBy: { direction: "asc" },
      },
    },
  });

  if (!location) {
    throw new Error("Location not found");
  }

  const exitsText =
    location.exitsFrom.length > 0
      ? location.exitsFrom
          .map((exit) => `- ${directionLabels[exit.direction]} → ${exit.toLocation.name}`)
          .join("\n")
      : "Виходів не видно.";

  return {
    text: `🌲 ${location.name}

${location.description ?? ""}

Виходи:
${exitsText}`,
    keyboard: buildMovementKeyboard(location.exitsFrom),
  };
}

function describeResourceAmount(amount: number) {
  if (amount >= 20) return "багато";
  if (amount >= 8) return "трохи";
  return "майже немає";
}

async function renderLocationDetails(locationId: number, viewerPlayerId?: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      resources: {
        include: {
          resourceType: true,
        },
        orderBy: {
          resourceType: {
            name: "asc",
          },
        },
      },
      exitsFrom: {
        where: { isHidden: false },
        include: { toLocation: true },
        orderBy: { direction: "asc" },
      },
    },
  });

  if (!location) {
    throw new Error("Location not found");
  }

  const otherPlayers = location.players
    .filter((p) => p.id !== viewerPlayerId)
    .map((p) => p.firstName ?? p.username ?? "невідомий мандрівник");

  const playersText =
    otherPlayers.length > 0
      ? `

Гравці поруч:
${otherPlayers.map((p) => `- ${p}`).join("\n")}`
      : "";

  const resourceLines = location.resources
    .filter((r) => r.amount > 0)
    .map((r) => `- ${r.resourceType.name}: ${describeResourceAmount(r.amount)}`);

  const resourcesText =
    resourceLines.length > 0
      ? `

Ти помічаєш:
${resourceLines.join("\n")}`
      : "";

  const keyboard = new InlineKeyboard();

  for (const resource of location.resources.filter((r) => r.amount > 0)) {
    keyboard
      .text(`Зібрати: ${resource.resourceType.name}`, `gather:${resource.resourceType.key}`)
      .row();
  }

  keyboard.text("🔎 Оглянутися", "look").row();

  const movementKeyboard = buildMovementKeyboard(location.exitsFrom);
  for (const row of movementKeyboard.inline_keyboard) {
    for (const button of row) {
      if ("text" in button && "callback_data" in button && button.callback_data) {
        keyboard.text(button.text, button.callback_data);
      }
    }
    keyboard.row();
  }

  return {
    text: `🔎 Ти придивляєшся до місця.

${location.name}

Координати: ${location.x}, ${location.y}, ${location.z}
Небезпека: ${location.dangerLevel}${resourcesText}${playersText}`,
    keyboard,
  };
}

async function showCurrentLocationDetails(ctx: any) {
  const from = ctx.from;
  if (!from) return;

  const player = await prisma.player.findUnique({
    where: { telegramId: String(from.id) },
  });

  if (!player) {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  const locationId = await ensurePlayerLocation(player);
  const view = await renderLocationDetails(locationId, player.id);

  await ctx.reply(view.text, {
    reply_markup: view.keyboard,
  });
}

bot.command("start", async (ctx) => {
  const from = ctx.from;

  if (!from) {
    await ctx.reply("Не бачу дані Telegram-користувача.");
    return;
  }

  const player = await getOrCreatePlayer(from);
  const locationId = await ensurePlayerLocation(player);
  const view = await renderLocationBrief(locationId);

  await ctx.reply(
    `🌲 Порубіжжя Чорнолісу ожили.

Вітаю, ${player.firstName ?? "мандрівнику"}. Твій слід збережено в Чорнолісі.

${view.text}`,
    {
      reply_markup: view.keyboard,
    }
  );
});

bot.command("me", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const player = await prisma.player.findUnique({
    where: {
      telegramId: String(from.id),
    },
    include: {
      currentLocation: true,
    },
  });

  if (!player) {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  await ctx.reply(
    `🧍 Ти:

ID: ${player.telegramId}
Ім’я: ${player.firstName ?? "невідомо"}
HP: ${player.hp}
Витривалість: ${player.stamina}
Голод: ${player.hunger}
Локація: ${player.currentLocation?.name ?? "невідомо"}`
  );
});

bot.command("world", async (ctx) => {
  const [
    playersCount,
    regionsCount,
    locationsCount,
    exitsCount,
    resourceTypesCount,
    resourceNodesCount,
    creaturesCount,
    aliveCreaturesCount,
  ] = await Promise.all([
    prisma.player.count(),
    prisma.region.count(),
    prisma.cellLocation.count(),
    prisma.locationExit.count(),
    prisma.resourceType.count(),
    prisma.resourceNode.count(),
    prisma.creature.count(),
    prisma.creature.count({ where: { isAlive: true } }),
  ]);

  await ctx.reply(
    `🌲 Стан Порубіжжя Чорнолісу

Гравців у базі: ${playersCount}
Регіонів: ${regionsCount}
Локацій-клітинок: ${locationsCount}
Переходів між клітинками: ${exitsCount}

Типів ресурсів: ${resourceTypesCount}
Ресурсних вузлів: ${resourceNodesCount}

Істот загалом: ${creaturesCount}
Живих істот: ${aliveCreaturesCount}

Поточна подія: світ вчиться дихати`
  );
});

bot.command("look", showCurrentLocationDetails);

bot.callbackQuery("look", async (ctx) => {
  await safeAnswerCallbackQuery(ctx);
  await showCurrentLocationDetails(ctx);
});

bot.callbackQuery(/^gather:(berries|mushrooms|herbs)$/, async (ctx) => {
  const resourceKey = ctx.match[1];
  const player = await prisma.player.findUnique({
    where: { telegramId: String(ctx.from.id) },
  });

  if (!player) {
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  const locationId = await ensurePlayerLocation(player);

  const resource = await prisma.resourceNode.findFirst({
    where: {
      locationId,
      resourceType: {
        key: resourceKey,
      },
      amount: {
        gt: 0,
      },
    },
    include: {
      resourceType: true,
    },
  });

  if (!resource) {
    await safeAnswerCallbackQuery(ctx, "Тут уже нічого не видно.");
    return;
  }

  const found = Math.min(resource.amount, Math.floor(Math.random() * 4) + 1);

  await prisma.$transaction([
    prisma.resourceNode.update({
      where: { id: resource.id },
      data: {
        amount: resource.amount - found,
      },
    }),
    prisma.player.update({
      where: { id: player.id },
      data: {
        stamina: Math.max(0, player.stamina - 1),
      },
    }),
  ]);

  await safeAnswerCallbackQuery(ctx);

  await ctx.reply(
    `🌿 Ти витрачаєш трохи часу й збираєш: ${resource.resourceType.name} ×${found}.

Поки що це не потрапляє в інвентар — інвентар додамо наступним кроком.`
  );
});

bot.callbackQuery(/^move:(NORTH|EAST|SOUTH|WEST|UP|DOWN|INSIDE|OUTSIDE)$/, async (ctx) => {
  const direction = ctx.match[1] as Direction;

  const player = await prisma.player.findUnique({
    where: { telegramId: String(ctx.from.id) },
  });

  if (!player) {
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  const currentLocationId = await ensurePlayerLocation(player);

  const exit = await prisma.locationExit.findUnique({
    where: {
      fromLocationId_direction: {
        fromLocationId: currentLocationId,
        direction,
      },
    },
  });

  if (!exit || exit.isHidden) {
    await safeAnswerCallbackQuery(ctx, "Туди немає видимого шляху.");
    return;
  }

  await prisma.player.update({
    where: { id: player.id },
    data: {
      currentLocationId: exit.toLocationId,
      stamina: Math.max(0, player.stamina - exit.travelCost),
    },
  });

  const view = await renderLocationBrief(exit.toLocationId);

  await safeAnswerCallbackQuery(ctx, `Ти рушив: ${directionLabels[direction]}`);

  await ctx.reply(view.text, {
    reply_markup: view.keyboard,
  });
});

bot.on("message", async (ctx) => {
  await ctx.reply("Я ще вчуся, але світ уже дихає.");
});

bot.catch((err) => {
  console.error("Bot handler error:", err.error);
});

async function main() {
  console.log("Bot starting...");
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
