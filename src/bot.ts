import { Bot, InlineKeyboard } from "grammy";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";
import http from "http";

const port = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200);
    res.end("Chornolis Marches bot is alive 🌲");
  })
  .listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

dotenv.config();

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

const prisma = new PrismaClient({
  adapter,
});

const bot = new Bot(process.env.BOT_TOKEN);

bot.command("start", async (ctx) => {
  const from = ctx.from;

  if (!from) {
    await ctx.reply("Не бачу дані Telegram-користувача.");
    return;
  }

  const startLocationId = await getStartLocationId();

  const player = await prisma.player.upsert({
    where: {
      telegramId: String(from.id),
    },
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

  const view = await renderLocation(startLocationId);

  await ctx.reply(
    `🌲 Порубіжжя Чорнолісу ожили.

Вітаю, ${player.firstName ?? "мандрівнику"}. Твій слід збережено в Чорнолісі.

${view.text}`,
    {
      reply_markup: view.keyboard,
    }
  );
});

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

async function getStartLocationId() {
  const location = await prisma.cellLocation.findUnique({
    where: { key: "center_chornolis_edge" },
  });

  if (!location) {
    throw new Error("Start location not found. Run npm run seed first.");
  }

  return location.id;
}

async function renderLocation(locationId: number) {
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

  const keyboard = new InlineKeyboard();

  const north = location.exitsFrom.find((e) => e.direction === "NORTH");
  const east = location.exitsFrom.find((e) => e.direction === "EAST");
  const south = location.exitsFrom.find((e) => e.direction === "SOUTH");
  const west = location.exitsFrom.find((e) => e.direction === "WEST");

  if (north) keyboard.text("⬆️ Північ", "move:NORTH").row();

  const middleButtons = [];
  if (west) middleButtons.push({ text: "⬅️ Захід", data: "move:WEST" });
  if (east) middleButtons.push({ text: "Схід ➡️", data: "move:EAST" });

  for (const button of middleButtons) {
    keyboard.text(button.text, button.data);
  }
  if (middleButtons.length > 0) keyboard.row();

  if (south) keyboard.text("⬇️ Південь", "move:SOUTH").row();

  keyboard.text("🔎 Оглянутися", "look");

  return {
    text: `🌲 ${location.name}

${location.description ?? ""}

Координати: ${location.x}, ${location.y}, ${location.z}
Небезпека: ${location.dangerLevel}

Виходи:
${exitsText}`,
    keyboard,
  };
}

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
  const [playersCount, regionsCount, locationsCount, exitsCount] =
    await Promise.all([
      prisma.player.count(),
      prisma.region.count(),
      prisma.cellLocation.count(),
      prisma.locationExit.count(),
    ]);

  await ctx.reply(
    `🌲 Стан Порубіжжя Чорнолісу

Гравців у базі: ${playersCount}
Регіонів: ${regionsCount}
Локацій-клітинок: ${locationsCount}
Переходів між клітинками: ${exitsCount}

Істот: ще не створено
Поточна подія: світ прокладає перші стежки`
  );
});

bot.command("look", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const player = await prisma.player.findUnique({
    where: { telegramId: String(from.id) },
  });

  if (!player) {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  if (!player.currentLocationId) {
    const startLocationId = await getStartLocationId();

    await prisma.player.update({
      where: { id: player.id },
      data: { currentLocationId: startLocationId },
    });

    const view = await renderLocation(startLocationId);

    await ctx.reply(view.text, {
      reply_markup: view.keyboard,
    });

    return;
  }

  const view = await renderLocation(player.currentLocationId);

  await ctx.reply(view.text, {
    reply_markup: view.keyboard,
  });
});

bot.callbackQuery("look", async (ctx) => {
  const from = ctx.from;

  const player = await prisma.player.findUnique({
    where: { telegramId: String(from.id) },
  });

  if (!player || !player.currentLocationId) {
    await ctx.answerCallbackQuery();
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  const view = await renderLocation(player.currentLocationId);

  await ctx.answerCallbackQuery();
  try {
    await ctx.editMessageText(view.text, {
      reply_markup: view.keyboard,
    });
  } catch (error) {
    console.error("Failed to edit message:", error);

    await ctx.reply(view.text, {
      reply_markup: view.keyboard,
    });
  }
});

bot.callbackQuery(/^move:(NORTH|EAST|SOUTH|WEST|UP|DOWN|INSIDE|OUTSIDE)$/, async (ctx) => {
  const direction = ctx.match[1] as
    | "NORTH"
    | "EAST"
    | "SOUTH"
    | "WEST"
    | "UP"
    | "DOWN"
    | "INSIDE"
    | "OUTSIDE";

  const from = ctx.from;

  const player = await prisma.player.findUnique({
    where: { telegramId: String(from.id) },
  });

  if (!player) {
    await ctx.answerCallbackQuery();
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  let currentLocationId = player.currentLocationId;

  if (!currentLocationId) {
    currentLocationId = await getStartLocationId();
  }

  const exit = await prisma.locationExit.findUnique({
    where: {
      fromLocationId_direction: {
        fromLocationId: currentLocationId,
        direction,
      },
    },
  });

  if (!exit || exit.isHidden) {
    await ctx.answerCallbackQuery("Туди немає видимого шляху.");
    return;
  }

  await prisma.player.update({
    where: { id: player.id },
    data: {
      currentLocationId: exit.toLocationId,
      stamina: Math.max(0, player.stamina - exit.travelCost),
    },
  });

  const view = await renderLocation(exit.toLocationId);

  await ctx.answerCallbackQuery(`Ти рушив: ${directionLabels[direction]}`);

  await ctx.editMessageText(view.text, {
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

  // невелика затримка, щоб Telegram устаканився
  setTimeout(() => {
    broadcastWorldUpdate();
  }, 3000);
}

main().catch(async (error) => {
  console.error("Bot crashed:", error);
  await prisma.$disconnect();
  process.exit(1);
});

// 🧹 Graceful shutdown (важливо для Render)
process.on("SIGTERM", async () => {
  console.log("World is updating...");
  await prisma.$disconnect();
  process.exit(0);
});

async function broadcastWorldUpdate() {
  const players = await prisma.player.findMany({
    select: {
      telegramId: true,
    },
  });

  let success = 0;
  let failed = 0;

  for (const p of players) {
    try {
      await bot.api.sendMessage(
        p.telegramId,
        `⚙️ Світ Чорнолісу оновився.

Зміни:
- нові механіки
- виправлення
- світ трохи зрушився

🌲 Можеш продовжувати гру.`
      );
      success++;
    } catch (e) {
      failed++;
    }
  }

  console.log(`Broadcast done. Success: ${success}, Failed: ${failed}`);
}

