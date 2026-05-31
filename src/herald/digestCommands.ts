import type { Bot } from "grammy";
import { config } from "../config";
import { requireHeraldAdmin } from "./admin";
import { buildWorldDigest } from "./digest";
import { formatHeraldPublicationMessage } from "./format";
import { publishHeraldPublication } from "./publisher";
import { queueHeraldPublication } from "./publications";

function digestPreviewText(digest: Awaited<ReturnType<typeof buildWorldDigest>>) {
  return [
    "Попередній перегляд світового запису Канцелярії:",
    "",
    formatHeraldPublicationMessage(digest),
  ].join("\n");
}

function publicationStatusText(publication: { id: number; publishedAt: Date | null; attempts: number; error: string | null }) {
  if (publication.publishedAt) return `Світовий запис уже опубліковано. Номер у книзі Канцелярії: ${publication.id}.`;
  if (publication.error) return `Світовий запис у черзі, але попередня спроба схибила. Номер: ${publication.id}. Спроб: ${publication.attempts}.`;
  return `Світовий запис чекає в черзі Канцелярії. Номер: ${publication.id}.`;
}

async function queueWorldDigestPublication() {
  const digest = await buildWorldDigest();
  const publication = await queueHeraldPublication({
    sourceType: "WORLD_DIGEST",
    sourceId: digest.sourceId,
    title: digest.title,
    body: digest.body,
    contentHash: digest.contentHash,
  });

  return { digest, publication };
}

export function registerHeraldDigestCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.command("preview_world_digest", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    const digest = await buildWorldDigest();
    await ctx.reply(digestPreviewText(digest));
  });

  bot.command("queue_world_digest", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    const { publication } = await queueWorldDigestPublication();
    await ctx.reply(publicationStatusText(publication));
  });

  bot.command("post_world_digest", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    if (!config.heraldChannelId) {
      await ctx.reply("Канцелярія не знає, до якого каналу нести світовий запис.");
      return;
    }

    const { publication } = await queueWorldDigestPublication();
    if (publication.publishedAt) {
      await ctx.reply(publicationStatusText(publication));
      return;
    }

    const result = await publishHeraldPublication(bot, publication);
    if (result.ok) {
      if (result.alreadyPublished) {
        await ctx.reply(publicationStatusText(publication));
        return;
      }
      await ctx.reply(`Канцелярія передала світовий запис до каналу. Номер у книзі: ${result.publication.id}.`);
      return;
    }

    await ctx.reply("Канцелярія не змогла передати світовий запис до каналу.");
  });
}
