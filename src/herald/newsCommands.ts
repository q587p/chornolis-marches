import type { Bot } from "grammy";
import { config } from "../config";
import { formatHeraldNewsMessage, formatHeraldNewsPreview, formatHeraldPublicationMessage } from "./format";
import { requireHeraldAdmin } from "./admin";
import { readLatestNewsEntry } from "./newsMarkdown";
import {
  findExistingPublicationByHash,
  markPublicationFailed,
  markPublicationPublished,
  publicationErrorMessage,
  queueHeraldPublication,
} from "./publications";
import { parseTelegramChannelId } from "./safety";

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
    sourceDate: result.entry.sourceDate,
    sourceVersion: result.entry.sourceVersion,
    title: result.entry.title,
    body: result.entry.body,
    renderedText: formatHeraldNewsMessage(result.entry),
    contentHash: result.entry.contentHash,
  });

  return { ok: true as const, entry: result.entry, publication };
}

export function registerHeraldNewsCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.command("preview_latest_news", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    try {
      const result = await readLatestNewsEntry();
      if (!result.ok) {
        await ctx.reply(result.error);
        return;
      }

      await ctx.reply(formatHeraldNewsPreview(result.entry));
    } catch (error) {
      console.error("Herald latest news preview failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла підготувати перегляд останньої новини.");
    }
  });

  bot.command("queue_latest_news", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    try {
      const result = await queueLatestNewsPublication();
      if (!result.ok) {
        await ctx.reply(result.error);
        return;
      }

      await ctx.reply(publicationStatusText(result.publication));
    } catch (error) {
      console.error("Herald latest news queue failed:", publicationErrorMessage(error));
      await ctx.reply("Канцелярія не змогла поставити останню новину в чергу.");
    }
  });

  bot.command("post_latest_news", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    let publicationId: number | null = null;

    try {
      if (!config.heraldChannelId) {
        await ctx.reply("Канцелярія не знає, до якого каналу нести запис.");
        return;
      }

      const result = await queueLatestNewsPublication();
      if (!result.ok) {
        await ctx.reply(result.error);
        return;
      }
      publicationId = result.publication.id;

      const publication = await findExistingPublicationByHash(result.entry.contentHash);
      if (publication?.publishedAt) {
        await ctx.reply(publicationStatusText(publication));
        return;
      }

      const message = formatHeraldPublicationMessage(result.publication);
      const sent = await ctx.api.sendMessage(parseTelegramChannelId(config.heraldChannelId), message);
      const published = await markPublicationPublished(result.publication.id, sent.message_id);
      await ctx.reply(`Канцелярія передала останній запис до каналу. Номер у книзі: ${published.id}.`);
    } catch (error) {
      console.warn("Herald news post failed:", publicationErrorMessage(error));
      if (publicationId !== null) {
        try {
          await markPublicationFailed(publicationId, error);
        } catch (recordError) {
          console.warn("Herald news post failure recording failed:", publicationErrorMessage(recordError));
        }
      }
      await ctx.reply("Канцелярія не змогла передати запис до каналу.");
    }
  });
}
