import { Bot } from "grammy";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";

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

bot.on("message", async (ctx) => {
  await ctx.reply("Я ще вчуся, але світ уже дихає.");
});

console.log("Bot starting...");
bot.start();

// 🧹 Graceful shutdown (важливо для Render)
process.on("SIGTERM", async () => {
  console.log("World is updating...");
  await prisma.$disconnect();
  process.exit(0);
});