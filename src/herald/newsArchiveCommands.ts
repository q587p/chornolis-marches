import type { Bot, Context } from "grammy";
import { config } from "../config";
import { requireHeraldAdmin } from "./admin";
import { formatHeraldPublicationMessage, formatHeraldPublicationPlainMessage } from "./format";
import { HERALD_CHANNEL_MESSAGE_OPTIONS } from "./gameLinks";
import { archiveOrderedNewsEntries, formatArchiveBody, NEWS_ARCHIVE_SOURCE_TYPE, readAllNewsEntries } from "./newsBackfill";
import type { HeraldNewsEntry } from "./newsMarkdown";
import { truncateTelegramMessage } from "./safety";
import {
  countPendingPublications,
  findExistingPublicationsByHashes,
  findExistingPublicationByHash,
  prepareManualHeraldPublication,
  publicationErrorMessage,
} from "./publications";
import { publishHeraldPublication } from "./publisher";

const ARCHIVE_LIST_LIMIT = 30;

type ArchiveEntryStatus = "missing" | "pending" | "canceled" | "published";

function parseArchiveIndex(input: string | undefined, total: number) {
  const match = input?.trim().match(/^#?(\d+)$/);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isSafeInteger(index) && index >= 1 && index <= total ? index : null;
}

function archivePublicationMessage(entry: HeraldNewsEntry) {
  return formatHeraldPublicationMessage({
    sourceType: NEWS_ARCHIVE_SOURCE_TYPE,
    title: entry.title,
    body: formatArchiveBody(entry),
  });
}

function archiveStatus(publication: {
  publishedAt: Date | null;
  visibility: string;
} | undefined | null): ArchiveEntryStatus {
  if (!publication) return "missing";
  if (publication.publishedAt) return "published";
  if (publication.visibility !== "PUBLIC") return "canceled";
  return "pending";
}

function archiveStatusLabel(status: ArchiveEntryStatus) {
  if (status === "published") return "опубліковано";
  if (status === "pending") return "у черзі";
  if (status === "canceled") return "скасовано";
  return "ще не внесено";
}

async function loadArchiveEntriesWithStatus() {
  const read = await readAllNewsEntries();
  if (!read.ok) return read;

  const entries = archiveOrderedNewsEntries(read.entries);
  const existing = await findExistingPublicationsByHashes(entries.map((entry) => entry.contentHash));
  const existingByHash = new Map(existing.flatMap((publication) => (
    publication.contentHash ? [[publication.contentHash, publication] as const] : []
  )));

  const rows = entries.map((entry, index) => {
    const publication = existingByHash.get(entry.contentHash);
    return {
      index: index + 1,
      entry,
      publication,
      status: archiveStatus(publication),
    };
  });

  const counts = rows.reduce((acc, row) => {
    acc[row.status] += 1;
    return acc;
  }, { missing: 0, pending: 0, canceled: 0, published: 0 } as Record<ArchiveEntryStatus, number>);
  const pendingTotal = await countPendingPublications();

  return { ok: true as const, rows, counts, pendingTotal };
}

function formatArchiveList(input: Awaited<ReturnType<typeof loadArchiveEntriesWithStatus>> & { ok: true }) {
  if (!input.rows.length) return "Канцелярія перечитала deployed news.md, але не знайшла архівних записів.";

  const sample = input.rows.slice(0, ARCHIVE_LIST_LIMIT).map((row) => (
    `${row.index}. ${row.entry.title} — ${archiveStatusLabel(row.status)}`
  ));
  const tail = input.rows.length > sample.length ? [`...і ще ${input.rows.length - sample.length}.`] : [];

  return truncateTelegramMessage([
    "Архів news.md перечитано з deployed файлу.",
    "",
    `Усього записів: ${input.rows.length}.`,
    `Опубліковано: ${input.counts.published}. У черзі: ${input.counts.pending}. Скасовано: ${input.counts.canceled}. Ще не внесено: ${input.counts.missing}.`,
    `У всій скрині вістей очікує: ${input.pendingTotal}.`,
    "",
    "Стабільні індекси для поточного deployed news.md, від найстарішого:",
    ...sample,
    ...tail,
    "",
    "Перегляд: /news_archive_preview <index>",
    "Опублікувати один запис: /news_archive_post <index>",
    "На Render зміна news.md потребує commit/push/redeploy.",
  ].join("\n"));
}

function formatArchivePreview(input: Awaited<ReturnType<typeof loadArchiveEntriesWithStatus>> & { ok: true }, index: number) {
  const row = input.rows[index - 1];
  return truncateTelegramMessage([
    `Попередній перегляд архівного запису #${row.index}/${input.rows.length}.`,
    `Стан: ${archiveStatusLabel(row.status)}.`,
    `Опубліковано: ${input.counts.published}. У черзі: ${input.counts.pending}. Скасовано: ${input.counts.canceled}. Ще не внесено: ${input.counts.missing}.`,
    "",
    archivePublicationMessage(row.entry),
  ].join("\n"));
}

async function replyWithArchiveList(ctx: Context) {
  const archive = await loadArchiveEntriesWithStatus();
  if (!archive.ok) {
    await ctx.reply(archive.error);
    return;
  }
  await ctx.reply(formatArchiveList(archive), HERALD_CHANNEL_MESSAGE_OPTIONS);
}

async function replyWithArchivePreview(ctx: Context) {
  const archive = await loadArchiveEntriesWithStatus();
  if (!archive.ok) {
    await ctx.reply(archive.error);
    return;
  }

  const index = parseArchiveIndex(String(ctx.match ?? ""), archive.rows.length);
  if (!index) {
    await ctx.reply(`Канцелярія не впізнала номер архівного запису. Спробуйте: /news_archive_preview 1\nУ deployed news.md зараз записів: ${archive.rows.length}.`);
    return;
  }

  await ctx.reply(formatArchivePreview(archive, index), HERALD_CHANNEL_MESSAGE_OPTIONS);
}

async function replyAfterArchivePost(ctx: Context, bot: Bot) {
  if (!config.heraldChannelId) {
    await ctx.reply("Канцелярія не знає, до якого каналу нести архівний запис: HERALD_CHANNEL_ID не задано.");
    return;
  }

  const archive = await loadArchiveEntriesWithStatus();
  if (!archive.ok) {
    await ctx.reply(archive.error);
    return;
  }

  const index = parseArchiveIndex(String(ctx.match ?? ""), archive.rows.length);
  if (!index) {
    await ctx.reply(`Канцелярія не впізнала номер архівного запису. Спробуйте: /news_archive_post 1\nУ deployed news.md зараз записів: ${archive.rows.length}.`);
    return;
  }

  const row = archive.rows[index - 1];
  const existing = await findExistingPublicationByHash(row.entry.contentHash);
  if (existing?.publishedAt) {
    await ctx.reply([
      `Архівний запис #${row.index} уже опубліковано.`,
      `Запис у книзі: #${existing.id}${existing.telegramMessageId ? `; Telegram message ID: ${existing.telegramMessageId}` : ""}.`,
      `Усього в deployed news.md: ${archive.rows.length}. У всій скрині вістей очікує: ${archive.pendingTotal}.`,
      "Повторна публікація без явного force-режиму зараз вимкнена.",
    ].join("\n"));
    return;
  }

  const publication = await prepareManualHeraldPublication({
    sourceType: NEWS_ARCHIVE_SOURCE_TYPE,
    sourceId: row.entry.title,
    sourceDate: row.entry.sourceDate,
    sourceVersion: row.entry.sourceVersion,
    title: row.entry.title,
    body: formatArchiveBody(row.entry),
    renderedText: formatHeraldPublicationPlainMessage({
      sourceType: NEWS_ARCHIVE_SOURCE_TYPE,
      title: row.entry.title,
      body: formatArchiveBody(row.entry),
    }),
    archiveOrder: row.index - 1,
    availableAt: new Date(),
    visibility: "PUBLIC",
    contentHash: row.entry.contentHash,
  });

  const result = await publishHeraldPublication(bot, publication);
  if (!result.ok) {
    await ctx.reply(`Канцелярія не змогла опублікувати архівний запис #${row.index}: ${result.reason}`);
    return;
  }

  if (result.alreadyPublished) {
    await ctx.reply(`Архівний запис #${row.index} уже був опублікований. Повтор не створено.`);
    return;
  }

  const updated = await loadArchiveEntriesWithStatus();
  await ctx.reply([
    `Канцелярія передала до каналу архівний запис #${row.index}/${archive.rows.length}.`,
    `Запис у книзі: #${result.publication.id}${result.publication.telegramMessageId ? `; Telegram message ID: ${result.publication.telegramMessageId}` : ""}.`,
    updated.ok
      ? `Тепер опубліковано: ${updated.counts.published}. У черзі: ${updated.counts.pending}. Скасовано: ${updated.counts.canceled}. Ще не внесено: ${updated.counts.missing}.`
      : `Стан після публікації не вдалося перечитати: ${updated.error}`,
  ].join("\n"));
}

export function registerHeraldNewsArchiveCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.command("news_archive_list", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyWithArchiveList(ctx);
    } catch (error) {
      console.error("Herald news archive list failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла перечитати архів news.md.");
    }
  });

  bot.command("news_archive_reload", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyWithArchiveList(ctx);
    } catch (error) {
      console.error("Herald news archive reload failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла заново перечитати deployed news.md.");
    }
  });

  bot.command("news_archive_preview", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyWithArchivePreview(ctx);
    } catch (error) {
      console.error("Herald news archive preview failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла підготувати попередній перегляд архівного запису.");
    }
  });

  bot.command("news_archive_post", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyAfterArchivePost(ctx, bot);
    } catch (error) {
      console.error("Herald news archive post failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла передати архівний запис до каналу.");
    }
  });
}
