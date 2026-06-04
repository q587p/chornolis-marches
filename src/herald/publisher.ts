import type { Bot, Context } from "grammy";
import { config } from "../config";
import { formatHeraldPublicationMessage, formatHeraldPublicationRepostMessage } from "./format";
import { HERALD_CHANNEL_MESSAGE_OPTIONS } from "./gameLinks";
import { requireHeraldAdmin } from "./admin";
import {
  getPendingPublications,
  cancelPendingPublications,
  countPendingPublications,
  forgetPublishedPublications,
  HERALD_NEWS_SOURCE_TYPES,
  getHeraldPublicationById,
  isPublicationQueuePaused,
  listRecentHeraldPublications,
  markPublicationFailed,
  markPublicationManuallyDeleted,
  markPublicationPublished,
  markPublicationReposted,
  publicationErrorMessage,
  rebalanceOverdueArchivePublications,
  setPublicationQueuePaused,
} from "./publications";
import { parseTelegramChannelId, truncateTelegramMessage } from "./safety";

const PENDING_LIST_LIMIT = 10;
const RECENT_PUBLICATIONS_LIMIT = 10;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function pendingPublicationLine(publication: {
  id: number;
  title: string;
  priority: number;
  availableAt: Date;
  attempts: number;
  error: string | null;
}) {
  const errorText = publication.error ? "; є записана помилка" : "";
  return `#${publication.id} · p${publication.priority} · ${formatDate(publication.availableAt)} · спроб: ${publication.attempts}${errorText}\n${publication.title}`;
}

function markerText(publication: {
  manuallyDeletedAt?: Date | null;
  repostedAt?: Date | null;
  repostCount?: number;
  repostTelegramMessageId?: number | null;
}) {
  const markers = [];
  if (publication.manuallyDeletedAt) markers.push(`позначено видаленим ${formatDate(publication.manuallyDeletedAt)}`);
  if (publication.repostedAt) {
    const countText = publication.repostCount ? ` ×${publication.repostCount}` : "";
    const messageText = publication.repostTelegramMessageId ? `; нове message ID ${publication.repostTelegramMessageId}` : "";
    markers.push(`repost${countText} ${formatDate(publication.repostedAt)}${messageText}`);
  }
  return markers.length ? ` · ${markers.join(" · ")}` : "";
}

function publicationTitleLine(publication: {
  title: string;
  sourceId: string | null;
  sourceDate: string | null;
  sourceVersion: string | null;
}) {
  const source = publication.sourceId || publication.title;
  const metadata = [publication.sourceVersion, publication.sourceDate].filter(Boolean).join(" · ");
  return metadata ? `${source} (${metadata})` : source;
}

function publicationListLine(publication: {
  id: number;
  title: string;
  sourceId: string | null;
  sourceDate: string | null;
  sourceVersion: string | null;
  publishedAt: Date | null;
  telegramMessageId: number | null;
  manuallyDeletedAt: Date | null;
  repostedAt: Date | null;
  repostCount: number;
  repostTelegramMessageId: number | null;
}) {
  const published = publication.publishedAt ? formatDate(publication.publishedAt) : "не опубліковано";
  const message = publication.telegramMessageId ? ` · message ID ${publication.telegramMessageId}` : "";
  return `#${publication.id} · ${published}${message}${markerText(publication)}\n${publicationTitleLine(publication)}`;
}

function parsePublicationId(input: string | undefined) {
  const match = input?.trim().match(/^#?(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function publicationState(publication: { publishedAt: Date | null; error: string | null }) {
  if (publication.publishedAt) return `опубліковано ${formatDate(publication.publishedAt)}`;
  if (publication.error) return "очікує, є записана помилка";
  return "очікує";
}

function formatPublicationSnapshot(publication: {
  id: number;
  sourceType: string;
  sourceId: string | null;
  sourceDate: string | null;
  sourceVersion: string | null;
  title: string;
  body: string;
  renderedText: string | null;
  publishedAt: Date | null;
  telegramMessageId: number | null;
  manuallyDeletedAt: Date | null;
  repostedAt: Date | null;
  repostTelegramMessageId: number | null;
  repostCount: number;
  contentHash: string | null;
  error: string | null;
  attempts: number;
}) {
  const metadata = [
    `#${publication.id} · ${publicationState(publication)} · спроб: ${publication.attempts}`,
    `Джерело: ${publication.sourceType}${publication.sourceVersion ? ` · ${publication.sourceVersion}` : ""}${publication.sourceDate ? ` · ${publication.sourceDate}` : ""}`,
    publication.sourceId ? `Назва джерела: ${publication.sourceId}` : null,
    publication.telegramMessageId ? `Telegram message ID: ${publication.telegramMessageId}` : null,
    publication.manuallyDeletedAt ? `Позначено видаленим із Telegram: ${formatDate(publication.manuallyDeletedAt)}` : null,
    publication.repostedAt ? `Останній repost: ${formatDate(publication.repostedAt)}${publication.repostTelegramMessageId ? `; message ID ${publication.repostTelegramMessageId}` : ""}; усього repost: ${publication.repostCount}` : null,
    publication.contentHash ? `Content hash: ${publication.contentHash.slice(0, 12)}…` : null,
    publication.error ? `Помилка: ${publication.error}` : null,
  ].filter(Boolean);

  return truncateTelegramMessage([
    "Канцелярія знайшла запис у книзі публікацій.",
    "",
    ...metadata,
    "",
    "Збережений текст:",
    "",
    formatHeraldPublicationMessage(publication),
  ].join("\n"));
}

export async function publishPendingHeraldPublications(bot: Bot, options: { limit?: number } = {}) {
  const channelId = config.heraldChannelId;
  if (!channelId) {
    return { published: 0, failed: 0, skipped: true, reason: "HERALD_CHANNEL_ID is not set" };
  }

  if (await isPublicationQueuePaused()) {
    return { published: 0, failed: 0, skipped: true, reason: "publication queue is paused", paused: true };
  }

  if (config.heraldRebalanceOverduePublications) {
    const rebalance = await rebalanceOverdueArchivePublications(config.heraldArchiveIntervalMs);
    if (rebalance.moved > 0) {
      console.log(`Herald archive backlog rebalanced: kept=${rebalance.keptDue?.id ?? "none"}, moved=${rebalance.moved}.`);
    }
  }

  const pending = await getPendingPublications(options.limit ?? config.heraldMaxPublicationsPerTick);
  let published = 0;
  let failed = 0;

  for (const publication of pending) {
    let telegramMessageId: number;
    try {
      const sent = await bot.api.sendMessage(
        parseTelegramChannelId(channelId),
        formatHeraldPublicationMessage(publication),
        HERALD_CHANNEL_MESSAGE_OPTIONS,
      );
      telegramMessageId = sent.message_id;
    } catch (error) {
      failed += 1;
      const safeError = publicationErrorMessage(error);
      console.warn(`Herald publication ${publication.id} failed:`, safeError);
      try {
        await markPublicationFailed(publication.id, error);
      } catch (recordError) {
        console.warn(`Herald publication ${publication.id} failure recording failed:`, publicationErrorMessage(recordError));
      }
      continue;
    }

    try {
      await markPublicationPublished(publication.id, telegramMessageId);
      published += 1;
    } catch (error) {
      failed += 1;
      console.warn(`Herald publication ${publication.id} publish marker failed:`, publicationErrorMessage(error));
    }
  }

  if (pending.length > 0 && (published > 0 || failed > 0)) {
    console.log(`Herald publisher tick: checked=${pending.length}, published=${published}, failed=${failed}.`);
  }

  return { published, failed, skipped: false, checked: pending.length };
}

export async function publishHeraldPublication(
  bot: Bot,
  publication: { id: number; title: string; body: string; sourceType?: string; renderedText?: string | null; publishedAt: Date | null },
) {
  const channelId = config.heraldChannelId;
  if (!channelId) return { ok: false as const, skipped: true as const, reason: "HERALD_CHANNEL_ID is not set" };
  if (publication.publishedAt) return { ok: true as const, alreadyPublished: true as const };

  try {
    const sent = await bot.api.sendMessage(
      parseTelegramChannelId(channelId),
      formatHeraldPublicationMessage(publication),
      HERALD_CHANNEL_MESSAGE_OPTIONS,
    );
    const published = await markPublicationPublished(publication.id, sent.message_id);
    return { ok: true as const, alreadyPublished: false as const, publication: published };
  } catch (error) {
    console.warn(`Herald publication ${publication.id} failed:`, publicationErrorMessage(error));
    try {
      await markPublicationFailed(publication.id, error);
    } catch (recordError) {
      console.warn(`Herald publication ${publication.id} failure recording failed:`, publicationErrorMessage(recordError));
    }
    return { ok: false as const, skipped: false as const, reason: publicationErrorMessage(error) };
  }
}

async function replyWithPendingPublications(ctx: Context) {
  const pending = await getPendingPublications(PENDING_LIST_LIMIT);
  if (!pending.length) {
    await ctx.reply("У книзі Канцелярії немає записів, готових до публікації.");
    return;
  }

  await ctx.reply([
    `Готові до публікації записи (${pending.length}):`,
    "",
    pending.map(pendingPublicationLine).join("\n\n"),
  ].join("\n"));
}

async function replyAfterPublish(ctx: Context, bot: Bot) {
  if (!config.heraldChannelId) {
    await ctx.reply("Канцелярія не знає, до якого каналу нести записи.");
    return;
  }

  const result = await publishPendingHeraldPublications(bot);
  if (result.skipped) {
    await ctx.reply(result.paused
      ? "Публікацію призупинено. Канцелярія тримає записи у скрині, але не несе їх до каналу."
      : "Публікацію вимкнено: Канцелярія не має каналу.");
    return;
  }

  if (result.published === 0 && result.failed === 0) {
    await ctx.reply("Готових записів для публікації немає.");
    return;
  }

  await ctx.reply(`Публікація завершена. Опубліковано: ${result.published}. Помилок: ${result.failed}.`);
}

async function publicationQueueStateCounts(sourceTypes = HERALD_NEWS_SOURCE_TYPES) {
  const [paused, waiting, allWaiting] = await Promise.all([
    isPublicationQueuePaused(),
    countPendingPublications(sourceTypes),
    countPendingPublications(),
  ]);
  return { paused, waiting, allWaiting };
}

function queueStateReply(input: { paused: boolean; canceled?: number; waiting: number; allWaiting: number; action: string }) {
  return [
    input.action,
    "",
    `Стан публікації: ${input.paused ? "призупинено" : "увімкнено"}.`,
    `Скасовано очікуваних записів: ${input.canceled ?? 0}.`,
    `Ще чекає новин/архіву: ${input.waiting}.`,
    input.allWaiting !== input.waiting ? `Інших майбутніх записів не торкалися; усього у скрині: ${input.allWaiting}.` : `Усього у скрині: ${input.allWaiting}.`,
  ].join("\n");
}

async function replyAfterPausePublications(ctx: Context) {
  await setPublicationQueuePaused(true);
  const counts = await publicationQueueStateCounts();
  await ctx.reply(queueStateReply({
    paused: counts.paused,
    waiting: counts.waiting,
    allWaiting: counts.allWaiting,
    action: "Канцелярія закрила скриню вістей на паузу.",
  }));
}

async function replyAfterResumePublications(ctx: Context) {
  await setPublicationQueuePaused(false);
  const counts = await publicationQueueStateCounts();
  await ctx.reply(queueStateReply({
    paused: counts.paused,
    waiting: counts.waiting,
    allWaiting: counts.allWaiting,
    action: "Канцелярія знову відчинила скриню вістей.",
  }));
}

async function replyAfterCancelPendingPublications(ctx: Context, sourceTypes = HERALD_NEWS_SOURCE_TYPES) {
  const canceled = await cancelPendingPublications(sourceTypes);
  const counts = await publicationQueueStateCounts(sourceTypes);
  await ctx.reply(queueStateReply({
    paused: counts.paused,
    canceled: canceled.count,
    waiting: counts.waiting,
    allWaiting: counts.allWaiting,
    action: "Канцелярія скасувала неопубліковані записи новин та архіву.",
  }));
}

async function replyAfterForgetPublishedPublications(ctx: Context, sourceTypes = HERALD_NEWS_SOURCE_TYPES) {
  const confirmation = String(ctx.match ?? "").trim().toLowerCase();
  if (confirmation !== "confirm") {
    const counts = await publicationQueueStateCounts(sourceTypes);
    await ctx.reply([
      "Канцелярія може забути вже опубліковані записи новин та архіву у своїй книзі публікацій.",
      "",
      "Telegram-повідомлення в каналі не видалятимуться, старий час публікації не відновлюватиметься, а повторне внесення створить нові записи.",
      `Ще чекає новин/архіву: ${counts.waiting}.`,
      "",
      "Щоб підтвердити, напишіть: /forget_published_news confirm",
    ].join("\n"));
    return;
  }

  const forgotten = await forgetPublishedPublications(sourceTypes);
  const counts = await publicationQueueStateCounts(sourceTypes);
  await ctx.reply([
    "Канцелярія забула опубліковані записи новин та архіву у своїй книзі публікацій.",
    "",
    `Забуто записів: ${forgotten.count}. Telegram-повідомлення не видалялися.`,
    `Стан публікації: ${counts.paused ? "призупинено" : "увімкнено"}.`,
    `Ще чекає новин/архіву: ${counts.waiting}.`,
    counts.allWaiting !== counts.waiting
      ? `Інших майбутніх записів не торкалися; усього у скрині: ${counts.allWaiting}.`
      : `Усього у скрині: ${counts.allWaiting}.`,
  ].join("\n"));
}

async function replyWithRecentPublications(ctx: Context) {
  const publications = await listRecentHeraldPublications(RECENT_PUBLICATIONS_LIMIT);
  if (!publications.length) {
    await ctx.reply("У книзі Канцелярії ще немає записів публікацій.");
    return;
  }

  await ctx.reply([
    `Останні записи Канцелярії (${publications.length}):`,
    "",
    publications.map(publicationListLine).join("\n\n"),
  ].join("\n"));
}

async function replyWithPublicationSnapshot(ctx: Context) {
  const id = parsePublicationId(String(ctx.match ?? ""));
  if (!id) {
    await ctx.reply("Канцелярія не впізнала номер запису. Спробуйте: /show_publication 12");
    return;
  }

  const publication = await getHeraldPublicationById(id);
  if (!publication) {
    await ctx.reply(`Канцелярія не знайшла запис #${id}.`);
    return;
  }

  await ctx.reply(formatPublicationSnapshot(publication));
}

async function replyAfterPublicationRepost(ctx: Context) {
  const id = parsePublicationId(String(ctx.match ?? ""));
  if (!id) {
    await ctx.reply("Канцелярія не впізнала номер запису. Спробуйте: /repost_publication 12");
    return;
  }

  if (!config.heraldChannelId) {
    await ctx.reply("Канцелярія не знає, до якого каналу нести запис.");
    return;
  }

  const publication = await getHeraldPublicationById(id);
  if (!publication) {
    await ctx.reply(`Канцелярія не знайшла запис #${id}.`);
    return;
  }

  const sent = await ctx.api.sendMessage(
    parseTelegramChannelId(config.heraldChannelId),
    formatHeraldPublicationRepostMessage(publication),
    HERALD_CHANNEL_MESSAGE_OPTIONS,
  );
  await markPublicationReposted(publication.id, sent.message_id);
  await ctx.reply([
    `Канцелярія повторно передала запис #${publication.id} до каналу.`,
    `Це нове Telegram-повідомлення: ${sent.message_id}. Старий час публікації не відновлювався.`,
  ].join("\n"));
}

async function replyAfterPublicationMarkedDeleted(ctx: Context) {
  const id = parsePublicationId(String(ctx.match ?? ""));
  if (!id) {
    await ctx.reply("Канцелярія не впізнала номер запису. Спробуйте: /mark_publication_deleted 12");
    return;
  }

  const publication = await getHeraldPublicationById(id);
  if (!publication) {
    await ctx.reply(`Канцелярія не знайшла запис #${id}.`);
    return;
  }

  const marked = await markPublicationManuallyDeleted(id);
  await ctx.reply([
    `Канцелярія позначила запис #${marked.id} як вручну видалений із Telegram.`,
    "Жодне Telegram-повідомлення не видалялось. Для повторної публікації скористайтеся /repost_publication.",
  ].join("\n"));
}

export function registerHeraldPublisherCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.command("list_publications", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyWithRecentPublications(ctx);
    } catch (error) {
      console.error("Herald list publications command failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла прочитати книгу публікацій.");
    }
  });

  bot.command("pending_publications", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyWithPendingPublications(ctx);
    } catch (error) {
      console.error("Herald pending publications command failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла прочитати чергу публікацій.");
    }
  });

  bot.command("publish_pending", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyAfterPublish(ctx, bot);
    } catch (error) {
      console.error("Herald publish pending command failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла опублікувати очікувані записи.");
    }
  });

  bot.command("pause_publications", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyAfterPausePublications(ctx);
    } catch (error) {
      console.error("Herald pause publications command failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла поставити публікації на паузу.");
    }
  });

  bot.command("resume_publications", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyAfterResumePublications(ctx);
    } catch (error) {
      console.error("Herald resume publications command failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла відновити публікації.");
    }
  });

  bot.command(["cancel_pending_publications", "backfill_news_cancel"], async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyAfterCancelPendingPublications(ctx);
    } catch (error) {
      console.error("Herald cancel pending publications command failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла скасувати очікувані записи.");
    }
  });

  bot.command(["forget_published_news", "forget_published_publications"], async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyAfterForgetPublishedPublications(ctx);
    } catch (error) {
      console.error("Herald forget published publications command failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла забути опубліковані записи новин та архіву.");
    }
  });

  bot.command("show_publication", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyWithPublicationSnapshot(ctx);
    } catch (error) {
      console.error("Herald show publication command failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла показати збережений запис.");
    }
  });

  bot.command("repost_publication", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyAfterPublicationRepost(ctx);
    } catch (error) {
      console.error("Herald repost publication command failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла повторно передати запис до каналу.");
    }
  });

  bot.command("mark_publication_deleted", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      await replyAfterPublicationMarkedDeleted(ctx);
    } catch (error) {
      console.error("Herald mark publication deleted command failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла позначити запис як видалений.");
    }
  });
}

export function startHeraldPublisherLoop(bot: Bot) {
  if (!config.heraldEnabled) {
    console.log("Herald publisher loop disabled.");
    return null;
  }

  if (!config.heraldChannelId) {
    console.log("Herald publisher loop not started: channel is not configured.");
    return null;
  }

  let running = false;
  const startupPausePromise = config.heraldPublicationsPaused
    ? setPublicationQueuePaused(true)
      .then(() => console.log("Herald publisher starts paused by HERALD_PUBLICATIONS_PAUSED."))
      .catch((error) => console.warn("Herald startup pause failed:", publicationErrorMessage(error)))
    : Promise.resolve();

  const runTick = async () => {
    if (running) return;
    running = true;
    try {
      await startupPausePromise;
      await publishPendingHeraldPublications(bot);
    } catch (error) {
      console.warn("Herald publisher loop tick failed:", publicationErrorMessage(error));
    } finally {
      running = false;
    }
  };

  const interval = setInterval(runTick, config.heraldPublishIntervalMs);
  void runTick();
  return interval;
}
