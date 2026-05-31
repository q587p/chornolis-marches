import type { Bot, Context } from "grammy";
import { requireHeraldAdmin } from "./admin";
import { formatHeraldPublicationMessage } from "./format";
import {
  formatBackfillInterval,
  formatArchiveBody,
  parseBackfillIntervalMs,
  previewNewsBackfill,
  queueNewsBackfill,
  readAllNewsEntries,
} from "./newsBackfill";
import { publicationErrorMessage } from "./publications";

function previewLine(entry: { title: string }, index: number) {
  return `${index + 1}. ${entry.title}`;
}

function formatPreviewReply(result: Awaited<ReturnType<typeof previewNewsBackfill>>) {
  if (!result.total) {
    return "Канцелярія переглянула news.md, але не знайшла архівних записів.";
  }

  const sample = result.missing.slice(0, 5);
  const sampleText = sample.length
    ? ["", "Перші записи для черги:", sample.map(previewLine).join("\n")].join("\n")
    : "";

  return [
    "Канцелярія переглянула архів новин.",
    "",
    `Усього записів у news.md: ${result.total}.`,
    `Ще не в черзі й не в каналі: ${result.missing.length}.`,
    `Уже є в черзі: ${result.queued}.`,
    `Уже опубліковано: ${result.published}.`,
    `Буде пропущено як наявні: ${result.skipped}.`,
    sampleText,
  ].filter(Boolean).join("\n");
}

function formatQueueReply(result: Awaited<ReturnType<typeof queueNewsBackfill>>) {
  if (!result.total) {
    return "Канцелярія переглянула news.md, але не знайшла архівних записів.";
  }

  if (!result.queued.length) {
    return [
      "Архів Канцелярії вже звірено.",
      "",
      `Нових записів для черги немає. Наявних записів пропущено: ${result.skipped}.`,
    ].join("\n");
  }

  const first = result.queued[0];
  const last = result.queued[result.queued.length - 1];
  return [
    "Канцелярія поставила архівні записи в чергу.",
    "",
    `Додано: ${result.queued.length}.`,
    `Пропущено як наявні: ${result.skipped}.`,
    `Інтервал: ${formatBackfillInterval(result.intervalMs)}.`,
    `Перший запис стане доступний: ${first.availableAt.toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })}.`,
    `Останній із доданих: ${last.availableAt.toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })}.`,
  ].join("\n");
}

async function readEntriesOrReply(ctx: Context) {
  const read = await readAllNewsEntries();
  if (!read.ok) {
    await ctx.reply(read.error);
    return null;
  }
  return read.entries;
}

export function registerHeraldNewsBackfillCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.command("backfill_news_preview", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    try {
      const entries = await readEntriesOrReply(ctx);
      if (!entries) return;

      const result = await previewNewsBackfill(entries);
      const sample = result.missing[0];
      const archiveSample = sample
        ? ["", "Так виглядатиме перший архівний допис:", "", formatHeraldPublicationMessage({
          sourceType: "NEWS_MD_ARCHIVE",
          title: sample.title,
          body: formatArchiveBody(sample),
        })].join("\n")
        : "";

      await ctx.reply(`${formatPreviewReply(result)}${archiveSample}`);
    } catch (error) {
      console.error("Herald news backfill preview failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла підготувати перегляд архіву новин.");
    }
  });

  bot.command("backfill_news_queue", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    try {
      const intervalMs = parseBackfillIntervalMs(String(ctx.match ?? ""));
      if (intervalMs === null) {
        await ctx.reply("Канцелярія не впізнала інтервал. Спробуйте, наприклад: /backfill_news_queue 30m");
        return;
      }

      const entries = await readEntriesOrReply(ctx);
      if (!entries) return;

      const result = await queueNewsBackfill(entries, intervalMs);
      await ctx.reply(formatQueueReply(result));
    } catch (error) {
      console.error("Herald news backfill queue failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла поставити архівні записи в чергу.");
    }
  });

  bot.command("backfill_news_status", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    try {
      const entries = await readEntriesOrReply(ctx);
      if (!entries) return;

      const result = await previewNewsBackfill(entries);
      await ctx.reply(formatPreviewReply(result));
    } catch (error) {
      console.error("Herald news backfill status failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла звірити стан архіву новин.");
    }
  });
}
