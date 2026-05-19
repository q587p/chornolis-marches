import { Bot } from "grammy";
import fs from "fs/promises";
import path from "path";
import { buildMainReplyKeyboard } from "../ui/replyKeyboard";
import { isPlayerAutoEnabled } from "./auto";

function sectionTitle(section: string) {
  return section.split("\n")[0]?.replace(/^##\s+/, "").trim() || "Без заголовка";
}

async function readNews() {
  const filePath = path.join(process.cwd(), "news.md");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const sections = raw
      .split(/\n(?=##\s+)/)
      .map((section) => section.trim())
      .filter((section) => section.startsWith("## "))
    const [latest, ...previous] = sections;
    if (!latest) return "Новин поки немає.";

    const previousTitles = previous
      .slice(0, 12)
      .map((section) => `- ${sectionTitle(section)}`)
      .join("\n");

    return previousTitles ? `${latest}\n\n---\n\nПопередні новини:\n${previousTitles}` : latest;
  } catch {
    return "Новини поки недоступні: файл news.md не знайдено.";
  }
}

export function registerNewsHandlers(bot: Bot) {
  async function sendNews(ctx: any) {
    const text = await readNews();
    const auto = ctx.from ? isPlayerAutoEnabled(ctx.from.id) : false;
    for (let i = 0; i < text.length; i += 3500) {
      await ctx.reply(text.slice(i, i + 3500), { reply_markup: buildMainReplyKeyboard(auto) });
    }
  }

  bot.command("news", sendNews);
  bot.hears("📰 Новини", sendNews);
}
