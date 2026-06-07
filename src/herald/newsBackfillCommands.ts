import type { Bot, Context } from "grammy";
import { requireHeraldAdmin } from "./admin";
import { formatHeraldPublicationMessage } from "./format";
import { HERALD_CHANNEL_MESSAGE_OPTIONS } from "./gameLinks";
import {
  archiveRepublishStatus,
  cancelArchiveRepublishPendingPublications,
  DEFAULT_ARCHIVE_REPUBLISH_INTERVAL_MS,
  formatBackfillInterval,
  formatArchiveBody,
  parseBackfillIntervalMs,
  newsBackfillStatus,
  previewArchiveRepublish,
  previewNewsBackfill,
  queueArchiveRepublish,
  queueNewsBackfill,
  readAllNewsEntries,
  rescheduleNewsBackfillPending,
} from "./newsBackfill";
import { publicationErrorMessage } from "./publications";

function previewLine(entry: { title: string }, index: number) {
  return `${index + 1}. ${entry.title}`;
}

function formatKyivDateTime(value: Date) {
  return value.toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });
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

function formatArchiveRepublishPreviewReply(result: Awaited<ReturnType<typeof previewArchiveRepublish>>) {
  if (!result.total) {
    return "Канцелярія перечитала deployed news.md, але не знайшла архівних записів для повторної черги.";
  }

  return [
    "Канцелярія звірила архів для повторної публікації.",
    "",
    `Run: ${result.runId}.`,
    `Усього записів: ${result.total}.`,
    `Перший: ${result.first?.title ?? "немає"}.`,
    `Останній: ${result.last?.title ?? "немає"}.`,
    `Інтервал: ${formatBackfillInterval(result.intervalMs)}.`,
    result.estimatedFinishAt ? `Орієнтовне завершення: ${formatKyivDateTime(result.estimatedFinishAt)}.` : "Орієнтовне завершення: немає записів.",
    `Уже є queued republish run: ${result.alreadyQueued ? "так" : "ні"}.`,
    `Очікує: ${result.pending}. Опубліковано в цьому run: ${result.published}. Скасовано: ${result.canceled}. Ще не внесено: ${result.missing}.`,
    "",
    "Пости в канал підуть як звичайні архівні записи: «📜 З архіву Канцелярії», без позначки повторної публікації.",
  ].join("\n");
}

function formatArchiveRepublishQueueReply(result: Awaited<ReturnType<typeof queueArchiveRepublish>>) {
  if (!result.total) {
    return "Канцелярія перечитала deployed news.md, але не знайшла архівних записів для повторної черги.";
  }

  if (result.alreadyQueued) {
    return [
      "Канцелярія вже має активну чергу повторної архівної публікації для цього run.",
      "",
      `Run: ${result.runId}.`,
      `Очікує: ${result.pending}.`,
      "Нові дублікати не створено. Для іншого run потрібна окрема зміна версії/namespace.",
    ].join("\n");
  }

  if (!result.queued.length) {
    return [
      "Канцелярія не додала нових записів у повторну архівну чергу.",
      "",
      `Run: ${result.runId}.`,
      `Усього записів у news.md: ${result.total}.`,
      `Пропущено як уже опубліковані в цьому run: ${result.skipped}.`,
    ].join("\n");
  }

  const first = result.queued[0];
  const last = result.queued[result.queued.length - 1];
  return [
    "Канцелярія поставила архів у повторну чергу.",
    "",
    `Run: ${result.runId}.`,
    `Додано: ${result.queued.length}.`,
    `Пропущено як уже опубліковані в цьому run: ${result.skipped}.`,
    `Інтервал: ${formatBackfillInterval(result.intervalMs)}.`,
    `Перший запис стане доступний: ${formatKyivDateTime(first.availableAt)}.`,
    `Останній із доданих: ${formatKyivDateTime(last.availableAt)}.`,
    "Формат каналу: звичайний архівний допис, без позначки повторної публікації.",
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
          sourceDate: sample.sourceDate,
          sourceVersion: sample.sourceVersion,
          body: formatArchiveBody(sample),
        })].join("\n")
        : "";

      await ctx.reply(`${formatPreviewReply(result)}${archiveSample}`, HERALD_CHANNEL_MESSAGE_OPTIONS);
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
        await ctx.reply("Канцелярія не впізнала інтервал. Спробуйте, наприклад: /backfill_news_queue 13m");
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
      const status = await newsBackfillStatus();
      const next = status.next;
      await ctx.reply([
        "Канцелярія звірила архівну чергу news.md.",
        "",
        `Очікує: ${status.pending}.`,
        `Опубліковано: ${status.published}.`,
        `Інтервал: ${formatBackfillInterval(status.intervalMs)}.`,
        `Перепланування прострочених: ${status.rebalanceOverdue ? "увімкнено" : "вимкнено"}.`,
        next
          ? `Наступний запис: #${next.id} · ${next.title}\nДоступний: ${next.availableAt.toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })}.`
          : "Наступного очікуваного запису немає.",
      ].join("\n"));
    } catch (error) {
      console.error("Herald news backfill status failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла звірити стан архіву новин.");
    }
  });

  bot.command("backfill_news_reschedule_pending", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    try {
      const intervalMs = parseBackfillIntervalMs(String(ctx.match ?? ""));
      if (intervalMs === null) {
        await ctx.reply("Канцелярія не впізнала інтервал. Спробуйте, наприклад: /backfill_news_reschedule_pending 13m");
        return;
      }

      const entries = await readEntriesOrReply(ctx);
      if (!entries) return;

      const result = await rescheduleNewsBackfillPending(entries, intervalMs);
      await ctx.reply([
        "Канцелярія перепланувала очікувані архівні записи.",
        "",
        `Переписано в черзі: ${result.count}.`,
        `Інтервал: ${formatBackfillInterval(result.intervalMs)}.`,
        result.nextAvailableAt
          ? `Наступний запис: ${result.nextTitle ?? "без назви"}\nДоступний: ${result.nextAvailableAt.toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })}.`
          : "Очікуваних архівних записів не лишилося.",
      ].join("\n"));
    } catch (error) {
      console.error("Herald news backfill reschedule failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла перепланувати архівну чергу.");
    }
  });

  bot.command("archive_republish_preview", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    try {
      const intervalMs = parseBackfillIntervalMs(String(ctx.match ?? ""), DEFAULT_ARCHIVE_REPUBLISH_INTERVAL_MS);
      if (intervalMs === null) {
        await ctx.reply("Канцелярія не впізнала інтервал. Спробуйте: /archive_republish_preview 30m");
        return;
      }

      const entries = await readEntriesOrReply(ctx);
      if (!entries) return;

      const result = await previewArchiveRepublish(entries, intervalMs);
      await ctx.reply(formatArchiveRepublishPreviewReply(result));
    } catch (error) {
      console.error("Herald archive republish preview failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла підготувати перегляд повторної архівної черги.");
    }
  });

  bot.command("archive_republish_queue", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    try {
      const intervalMs = parseBackfillIntervalMs(String(ctx.match ?? ""), DEFAULT_ARCHIVE_REPUBLISH_INTERVAL_MS);
      if (intervalMs === null) {
        await ctx.reply("Канцелярія не впізнала інтервал. Спробуйте: /archive_republish_queue 30m");
        return;
      }

      const entries = await readEntriesOrReply(ctx);
      if (!entries) return;

      const result = await queueArchiveRepublish(entries, intervalMs);
      await ctx.reply(formatArchiveRepublishQueueReply(result));
    } catch (error) {
      console.error("Herald archive republish queue failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла поставити архів у повторну чергу.");
    }
  });

  bot.command("archive_republish_status", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    try {
      const status = await archiveRepublishStatus();
      await ctx.reply([
        "Канцелярія звірила повторну архівну чергу.",
        "",
        `Run: ${status.runId}.`,
        `Очікує: ${status.pending}.`,
        `Опубліковано: ${status.published}.`,
        status.next
          ? `Наступний запис: #${status.next.id} · ${status.next.title}\nДоступний: ${formatKyivDateTime(status.next.availableAt)}.`
          : "Наступного очікуваного запису немає.",
      ].join("\n"));
    } catch (error) {
      console.error("Herald archive republish status failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла звірити повторну архівну чергу.");
    }
  });

  bot.command("archive_republish_cancel", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    try {
      const canceled = await cancelArchiveRepublishPendingPublications();
      const status = await archiveRepublishStatus();
      await ctx.reply([
        "Канцелярія скасувала неопубліковані записи повторної архівної черги.",
        "",
        `Скасовано: ${canceled.count}.`,
        `Ще очікує в цьому run: ${status.pending}.`,
        `Уже опубліковано в цьому run: ${status.published}.`,
        "Звичайні pending news/archive записи й уже опублікована історія не змінювались.",
      ].join("\n"));
    } catch (error) {
      console.error("Herald archive republish cancel failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла скасувати повторну архівну чергу.");
    }
  });
}
