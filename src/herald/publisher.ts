import type { Bot, Context } from "grammy";
import { config } from "../config";
import { formatHeraldPublicationMessage, formatHeraldPublicationRepostMessage } from "./format";
import { requireHeraldAdmin } from "./admin";
import {
  getPendingPublications,
  getHeraldPublicationById,
  markPublicationFailed,
  markPublicationPublished,
  publicationErrorMessage,
} from "./publications";
import { parseTelegramChannelId, truncateTelegramMessage } from "./safety";

const PUBLISH_BATCH_LIMIT = 3;
const PENDING_LIST_LIMIT = 10;

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
  contentHash: string | null;
  error: string | null;
  attempts: number;
}) {
  const metadata = [
    `#${publication.id} · ${publicationState(publication)} · спроб: ${publication.attempts}`,
    `Джерело: ${publication.sourceType}${publication.sourceVersion ? ` · ${publication.sourceVersion}` : ""}${publication.sourceDate ? ` · ${publication.sourceDate}` : ""}`,
    publication.sourceId ? `Назва джерела: ${publication.sourceId}` : null,
    publication.telegramMessageId ? `Telegram message ID: ${publication.telegramMessageId}` : null,
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

  const pending = await getPendingPublications(options.limit ?? PUBLISH_BATCH_LIMIT);
  let published = 0;
  let failed = 0;

  for (const publication of pending) {
    let telegramMessageId: number;
    try {
      const sent = await bot.api.sendMessage(
        parseTelegramChannelId(channelId),
        formatHeraldPublicationMessage(publication),
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
    await ctx.reply("Публікацію вимкнено: Канцелярія не має каналу.");
    return;
  }

  if (result.published === 0 && result.failed === 0) {
    await ctx.reply("Готових записів для публікації немає.");
    return;
  }

  await ctx.reply(`Публікація завершена. Опубліковано: ${result.published}. Помилок: ${result.failed}.`);
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
  );
  await ctx.reply([
    `Канцелярія повторно передала запис #${publication.id} до каналу.`,
    `Це нове Telegram-повідомлення: ${sent.message_id}. Старий час публікації не відновлювався.`,
  ].join("\n"));
}

export function registerHeraldPublisherCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
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

  const runTick = async () => {
    if (running) return;
    running = true;
    try {
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
