import { Bot } from "grammy";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../db";
import { config } from "../config";
import { buildMainReplyKeyboard } from "../ui/replyKeyboard";
import { logEvent } from "./worldEvents";

async function readLatestNewsSummary() {
  const filePath = path.join(process.cwd(), "news.md");

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const latest = raw
      .split(/\n(?=##\s+)/)
      .map((section) => section.trim())
      .find((section) => section.startsWith("## "));

    if (!latest) return null;

    const lines = latest
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const title = lines[0].replace(/^##\s+/, "");
    const bullets = lines
      .filter((line) => line.startsWith("- "))
      .slice(0, 4)
      .map((line) => `• ${line.replace(/^-\s+/, "")}`);

    return [`📰 Остання новина: ${title}`, ...bullets].join("\n");
  } catch {
    return null;
  }
}

export async function announceWorldUpdatedOnce(bot: Bot) {
  const eventTitle = `DEPLOY:${config.appVersion}`;
  const alreadySent = await prisma.worldEvent.findFirst({ where: { type: "SYSTEM", title: eventTitle } });
  if (alreadySent) return;

  const latestNews = await readLatestNewsSummary();
  const players = await prisma.player.findMany({ select: { telegramId: true } });

  let success = 0;
  let failed = 0;

  const text = [
    "⚙️ Світ Чорнолісу оновився.",
    "",
    `Версія: ${config.appVersion}`,
    latestNews ? `\n${latestNews}` : "",
    "",
    "Можна продовжувати гру. Натисніть /start для оновлення меню та кнопок.",
  ].join("\n");

  for (const player of players) {
    try {
      await bot.api.sendMessage(player.telegramId, text, { reply_markup: buildMainReplyKeyboard(false) });
      success++;
    } catch (error) {
      failed++;
      console.warn("Failed to notify player about deploy:", error);
    }
  }

  await logEvent("SYSTEM", eventTitle, `World update notification sent. Success: ${success}. Failed: ${failed}.`);
}
