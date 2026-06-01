import type { Bot } from "grammy";
import { requireHeraldAdmin } from "./admin";
import {
  findPlayerByTelegramIdForHeraldInfo,
  findPlayerForHeraldInfo,
  renderHeraldAnonymousInfoTarget,
  renderHeraldInfoError,
  renderHeraldInfoMissing,
  renderHeraldPublicInfoMissing,
  renderHeraldPublicPlayerInfo,
  renderHeraldPlayerInfo,
} from "./info";
import { publicationErrorMessage } from "./publications";

type TelegramUserLike = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type ReplyMessageLike = {
  from?: TelegramUserLike;
};

export function resolveHeraldInfoTargetUser(input: {
  from?: TelegramUserLike;
  replyToMessage?: ReplyMessageLike;
}) {
  if (input.replyToMessage) {
    return input.replyToMessage.from ?? null;
  }

  return input.from ?? null;
}

export function registerHeraldInfoCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.command("info", async (ctx) => {
    try {
      const targetUser = resolveHeraldInfoTargetUser({
        from: ctx.from,
        replyToMessage: ctx.message?.reply_to_message,
      });
      if (!targetUser) {
        await ctx.reply(renderHeraldAnonymousInfoTarget());
        return;
      }

      const player = await findPlayerByTelegramIdForHeraldInfo(targetUser.id);
      if (!player) {
        await ctx.reply(renderHeraldPublicInfoMissing());
        return;
      }

      await ctx.reply(renderHeraldPublicPlayerInfo(player));
    } catch (error) {
      console.error("Herald /info failed:", publicationErrorMessage(error));
      await ctx.reply(renderHeraldInfoError());
    }
  });

  bot.command(["info_full", "admin_info"], async (ctx) => {
    try {
      if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;

      const query = String(ctx.match ?? "").trim();
      const player = await findPlayerForHeraldInfo(query || "me", ctx.from?.id);
      if (!player) {
        await ctx.reply(renderHeraldInfoMissing(query || "me"));
        return;
      }

      await ctx.reply(renderHeraldPlayerInfo(player));
    } catch (error) {
      console.error("Herald /info_full failed:", publicationErrorMessage(error));
      await ctx.reply(renderHeraldInfoError());
    }
  });
}
