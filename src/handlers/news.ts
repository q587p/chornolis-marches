import { Bot, InlineKeyboard } from "grammy";
import fs from "fs/promises";
import path from "path";

const NEWS_ENTRY_PAGE_SIZE = 8;
const NEWS_TEXT_MAX_CHARS = 3300;
const NEWS_PREVIOUS_TITLE_COUNT = 12;

type NewsEntry = {
  index: number;
  title: string;
  version: string;
  text: string;
};

function sectionTitle(section: string) {
  return section.split("\n")[0]?.replace(/^##\s+/, "").trim() || "Без заголовка";
}

function versionFromTitle(title: string) {
  return title.match(/\b\d+\.\d+\.\d+\b/)?.[0] ?? title.slice(0, 24);
}

async function readNewsEntries(): Promise<NewsEntry[]> {
  const filePath = path.join(process.cwd(), "news.md");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return raw
      .split(/\n(?=##\s+)/)
      .map((section) => section.trim())
      .filter((section) => section.startsWith("## "))
      .map((section, index) => {
        const title = sectionTitle(section);
        return { index, title, version: versionFromTitle(title), text: section };
      });
  } catch {
    return [];
  }
}

function splitTextIntoPages(text: string, maxChars: number) {
  const lines = text.split("\n");
  const pages: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    const lineLength = line.length + 1;
    if (current.length > 0 && currentLength + lineLength > maxChars) {
      pages.push(current.join("\n"));
      current = [];
      currentLength = 0;
    }

    current.push(line);
    currentLength += lineLength;
  }

  if (current.length > 0) pages.push(current.join("\n"));
  return pages.length ? pages : ["Новин поки немає."];
}

function buildNewsIndexKeyboard(entries: NewsEntry[], listPage: number, totalListPages: number) {
  const keyboard = new InlineKeyboard();
  const start = listPage * NEWS_ENTRY_PAGE_SIZE;
  const pageEntries = entries.slice(start, start + NEWS_ENTRY_PAGE_SIZE);

  for (const entry of pageEntries) {
    keyboard.text(entry.version, `news:entry:${entry.index}:0:${listPage}`).row();
  }

  if (totalListPages > 1) {
    if (listPage > 0) keyboard.text("◀️ Назад", `news:list:${listPage - 1}`);
    if (listPage < totalListPages - 1) keyboard.text("Далі ▶️", `news:list:${listPage + 1}`);
  }

  return keyboard.inline_keyboard.length ? keyboard : undefined;
}

async function buildNewsIndexPage(requestedListPage: number) {
  const entries = await readNewsEntries();
  if (!entries.length) return { text: "Новини поки недоступні: файл news.md не знайдено або він порожній.", keyboard: undefined };

  const totalListPages = Math.max(1, Math.ceil(entries.length / NEWS_ENTRY_PAGE_SIZE));
  const listPage = Math.max(0, Math.min(requestedListPage, totalListPages - 1));
  const latest = entries[0];
  const rangeStart = listPage * NEWS_ENTRY_PAGE_SIZE + 1;
  const rangeEnd = Math.min(entries.length, rangeStart + NEWS_ENTRY_PAGE_SIZE - 1);
  const previousTitles = entries
    .slice(1, NEWS_PREVIOUS_TITLE_COUNT + 1)
    .map((entry) => `- ${entry.title}`)
    .join("\n");
  const text = [
    latest.text,
    ...(previousTitles ? ["", "---", "", "Попередні новини:", previousTitles] : []),
    "",
    "---",
    "",
    `Архів новин: ${rangeStart}-${rangeEnd} з ${entries.length}`,
    "Оберіть версію, щоб відкрити повний запис.",
  ].join("\n");

  return {
    text,
    keyboard: buildNewsIndexKeyboard(entries, listPage, totalListPages),
  };
}

function buildNewsEntryKeyboard(entryIndex: number, entryPage: number, entryPages: number, listPage: number, totalEntries: number) {
  const keyboard = new InlineKeyboard();

  if (entryPages > 1) {
    if (entryPage > 0) keyboard.text("◀️ Назад", `news:entry:${entryIndex}:${entryPage - 1}:${listPage}`);
    if (entryPage < entryPages - 1) keyboard.text("Далі ▶️", `news:entry:${entryIndex}:${entryPage + 1}:${listPage}`);
    keyboard.row();
  }

  if (entryIndex > 0) keyboard.text("◀️ Новіша", `news:entry:${entryIndex - 1}:0:${Math.floor((entryIndex - 1) / NEWS_ENTRY_PAGE_SIZE)}`);
  if (entryIndex < totalEntries - 1) keyboard.text("Старіша ▶️", `news:entry:${entryIndex + 1}:0:${Math.floor((entryIndex + 1) / NEWS_ENTRY_PAGE_SIZE)}`);
  if (entryIndex > 0 || entryIndex < totalEntries - 1) keyboard.row();

  keyboard.text("↩️ До архіву", `news:list:${listPage}`);
  return keyboard;
}

async function buildNewsEntryPage(entryIndex: number, requestedEntryPage: number, requestedListPage: number) {
  const entries = await readNewsEntries();
  const entry = entries[entryIndex] ?? entries[0];
  if (!entry) return { text: "Новини поки недоступні: файл news.md не знайдено або він порожній.", keyboard: undefined };

  const entryPages = splitTextIntoPages(entry.text, NEWS_TEXT_MAX_CHARS);
  const entryPage = Math.max(0, Math.min(requestedEntryPage, entryPages.length - 1));
  const totalListPages = Math.max(1, Math.ceil(entries.length / NEWS_ENTRY_PAGE_SIZE));
  const listPage = Math.max(0, Math.min(requestedListPage, totalListPages - 1));
  const prefix = entryPages.length > 1 ? `📰 ${entry.title}\nСторінка ${entryPage + 1}/${entryPages.length}\n\n` : "";

  return {
    text: `${prefix}${entryPages[entryPage]}`,
    keyboard: buildNewsEntryKeyboard(entry.index, entryPage, entryPages.length, listPage, entries.length),
  };
}

async function editOrReply(ctx: any, text: string, keyboard?: InlineKeyboard) {
  const options = keyboard ? { reply_markup: keyboard } : undefined;

  if (ctx.callbackQuery?.message) {
    await ctx.editMessageText(text, options);
    return;
  }

  await ctx.reply(text, options);
}

export function registerNewsHandlers(bot: Bot) {
  async function sendNews(ctx: any) {
    const page = await buildNewsIndexPage(0);
    await ctx.reply(page.text, page.keyboard ? { reply_markup: page.keyboard } : undefined);
  }

  bot.command("news", sendNews);
  bot.hears("📰 Новини", sendNews);

  bot.callbackQuery(/^news:list:(\d+)$/, async (ctx) => {
    const requestedListPage = Number(ctx.match[1]);
    const page = await buildNewsIndexPage(Number.isFinite(requestedListPage) ? requestedListPage : 0);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, page.text, page.keyboard);
  });

  bot.callbackQuery(/^news:entry:(\d+):(\d+):(\d+)$/, async (ctx) => {
    const entryIndex = Number(ctx.match[1]);
    const entryPage = Number(ctx.match[2]);
    const listPage = Number(ctx.match[3]);
    const page = await buildNewsEntryPage(
      Number.isFinite(entryIndex) ? entryIndex : 0,
      Number.isFinite(entryPage) ? entryPage : 0,
      Number.isFinite(listPage) ? listPage : 0
    );
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, page.text, page.keyboard);
  });
}
