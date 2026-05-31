import type { Bot, Context } from "grammy";
import { config } from "../config";
import { formatHeraldNewsMessage, formatHeraldNewsPreview } from "./format";
import { isHeraldAdminId } from "./admin";
import { readLatestNewsEntry } from "./newsMarkdown";

const postedNewsHashes = new Set<string>();

function channelIdFromConfig(value: string) {
  return /^-?\d+$/.test(value) ? Number(value) : value;
}

async function requireHeraldAdmin(ctx: Context, heraldAdminIds: ReadonlySet<string>) {
  if (isHeraldAdminId(ctx.from?.id, heraldAdminIds)) return true;
  await ctx.reply("Канцелярія мовчить перед незнайомими печатками.");
  return false;
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

  bot.command("post_latest_news", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

    if (!config.heraldChannelId) {
      await ctx.reply("Канцелярія не знає, до якого каналу нести запис.");
      return;
    }

    const result = await readLatestNewsEntry();
    if (!result.ok) {
      await ctx.reply(result.error);
      return;
    }

    if (postedNewsHashes.has(result.entry.contentHash)) {
      await ctx.reply("Цей останній запис уже публікувався під час поточного запуску Канцелярії.");
      return;
    }

    const message = formatHeraldNewsMessage(result.entry);
    try {
      await ctx.api.sendMessage(channelIdFromConfig(config.heraldChannelId), message);
      postedNewsHashes.add(result.entry.contentHash);
      await ctx.reply("Канцелярія передала останній запис до каналу.");
    } catch (error) {
      console.warn("Herald news post failed:", error);
      await ctx.reply("Канцелярія не змогла передати запис до каналу.");
    }
  });
}
