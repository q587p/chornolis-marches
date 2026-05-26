import { Bot, InlineKeyboard } from "grammy";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../db";
import { config } from "../config";
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

function parseVersion(version: string) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return match.slice(1).map((part) => Number(part));
}

function compareVersions(left: string, right: string) {
  const parsedLeft = parseVersion(left);
  const parsedRight = parseVersion(right);
  if (!parsedLeft || !parsedRight) return left === right ? 0 : -1;

  for (let i = 0; i < parsedLeft.length; i++) {
    const diff = parsedLeft[i] - parsedRight[i];
    if (diff !== 0) return diff;
  }
  return 0;
}

async function hasAnnouncedSameOrNewerDeploy() {
  const deployEvents = await prisma.worldEvent.findMany({
    where: { type: "SYSTEM", title: { startsWith: "DEPLOY:" } },
    select: { title: true },
    orderBy: { id: "desc" },
    take: 20,
  });

  return deployEvents.some((event) => {
    const announcedVersion = event.title.replace(/^DEPLOY:/, "");
    return compareVersions(announcedVersion, config.appVersion) >= 0;
  });
}

export async function announceWorldUpdatedOnce(bot: Bot) {
  const eventTitle = `DEPLOY:${config.appVersion}`;
  if (await hasAnnouncedSameOrNewerDeploy()) return;

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
  const keyboard = new InlineKeyboard().text("Архів новин", "news:list:0");

  for (const player of players) {
    try {
      await bot.api.sendMessage(player.telegramId, text, { reply_markup: keyboard });
      success++;
    } catch (error) {
      failed++;
      console.warn("Failed to notify player about deploy:", error);
    }
  }

  await logEvent("SYSTEM", eventTitle, `World update notification sent. Success: ${success}. Failed: ${failed}.`);
}
