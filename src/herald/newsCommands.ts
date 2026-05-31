import type { Bot } from "grammy";
import { config } from "../config";
import { formatHeraldNewsMessage, formatHeraldNewsPreview } from "./format";
import { requireHeraldAdmin } from "./admin";
import { readLatestNewsEntry } from "./newsMarkdown";
import {
  findExistingPublicationByHash,
  markPublicationFailed,
  markPublicationPublished,
  publicationErrorMessage,
  queueHeraldPublication,
} from "./publications";

function channelIdFromConfig(value: string) {
  return /^-?\d+$/.test(value) ? Number(value) : value;
}

function publicationStatusText(publication: { id: number; publishedAt: Date | null; attempts: number; error: string | null }) {
  if (publication.publishedAt) return `Запис уже опубліковано. Номер у книзі Канцелярії: ${publication.id}.`;
  if (publication.error) return `Запис уже в черзі, але попередня спроба схибила. Номер у книзі Канцелярії: ${publication.id}. Спроб: ${publication.attempts}.`;
  return `Запис уже чекає в черзі Канцелярії. Номер: ${publication.id}.`;
}

async function queueLatestNewsPublication() {
  const result = await readLatestNewsEntry();
  if (!result.ok) return result;

  const publication = await queueHeraldPublication({
    sourceType: "NEWS_MD",
    sourceId: result.entry.title,
    title: result.entry.title,
    body: result.entry.body,
    contentHash: result.entry.contentHash,
  });

  return { ok: true as const, entry: result.entry, publication };
}

export function registerHeraldNewsCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.command("preview_latest_news", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    const result = await readLatestNewsEntry();
    if (!result.ok) {
      await ctx.reply(result.error);
      return;
    }

    await ctx.reply(formatHeraldNewsPreview(result.entry));
  });

  bot.command("queue_latest_news", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    const result = await queueLatestNewsPublication();
    if (!result.ok) {
      await ctx.reply(result.error);
      return;
    }

    await ctx.reply(publicationStatusText(result.publication));
  });

  bot.command("post_latest_news", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    if (!config.heraldChannelId) {
      await ctx.reply("Канцелярія не знає, до якого каналу нести запис.");
      return;
    }

    const result = await queueLatestNewsPublication();
    if (!result.ok) {
      await ctx.reply(result.error);
      return;
    }

    const publication = await findExistingPublicationByHash(result.entry.contentHash);
    if (publication?.publishedAt) {
      await ctx.reply(publicationStatusText(publication));
      return;
    }

    const message = formatHeraldNewsMessage(result.entry);
    try {
      const sent = await ctx.api.sendMessage(channelIdFromConfig(config.heraldChannelId), message);
      const published = await markPublicationPublished(result.publication.id, sent.message_id);
      await ctx.reply(`Канцелярія передала останній запис до каналу. Номер у книзі: ${published.id}.`);
    } catch (error) {
      console.warn("Herald news post failed:", publicationErrorMessage(error));
      await markPublicationFailed(result.publication.id, error);
      await ctx.reply("Канцелярія не змогла передати запис до каналу.");
    }
  });
}
