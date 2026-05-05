import { Bot } from "grammy";
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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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

  const player = await prisma.player.upsert({
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
    },
  });

  await ctx.reply(
    `🌲 Порубіжжя Чорнолісу ожили.\n\nВітаю, ${player.firstName ?? "мандрівнику"}. Твій слід збережено в Чорнолісі.`
  );
});

bot.command("me", async (ctx) => {
  const from = ctx.from;

  if (!from) return;

  const player = await prisma.player.findUnique({
    where: {
      telegramId: String(from.id),
    },
  });

  if (!player) {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return;
  }

  await ctx.reply(
    `🧍 Ти:\n\nID: ${player.telegramId}\nІм’я: ${
      player.firstName ?? "невідомо"
    }`
  );
});

bot.command("world", async (ctx) => {
  const [playersCount, locationsCount, creaturesCount, aliveCreaturesCount] =
    await Promise.all([
      prisma.player.count(),
      prisma.cellLocation.count(),
      prisma.creature.count(),
      prisma.creature.count({
        where: {
          isAlive: true,
        },
      }),
    ]);

  const speciesStats = await prisma.creature.groupBy({
    by: ["speciesId"],
    where: {
      isAlive: true,
    },
    _count: {
      id: true,
    },
  });

  await ctx.reply(
    `🌲 Стан Порубіжжя Чорнолісу

Гравців у базі: ${playersCount}
Локацій-клітинок: ${locationsCount}
Істот загалом: ${creaturesCount}
Живих істот: ${aliveCreaturesCount}

Видів у світі: ${speciesStats.length}
Поточна подія: світ дихає спокійно`
  );
});

bot.on("message", async (ctx) => {
  await ctx.reply("Я ще вчуся, але світ уже дихає.");
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

