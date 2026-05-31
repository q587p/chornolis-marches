import type { Bot } from "grammy";
import { isHeraldAdminId } from "./admin";
import {
  findPlayerForHeraldInfo,
  renderHeraldInfoMissing,
  renderHeraldInfoPrivateNotice,
  renderHeraldPlayerInfo,
} from "./info";

export function registerHeraldInfoCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.command("info", async (ctx) => {
    const isAdmin = isHeraldAdminId(ctx.from?.id, heraldAdminIds);
    if (!isAdmin) {
      await ctx.reply(renderHeraldInfoPrivateNotice());
      return;
    }

    const query = String(ctx.match ?? "").trim();
    const player = await findPlayerForHeraldInfo(query || "me", ctx.from?.id);
    if (!player) {
      await ctx.reply(renderHeraldInfoMissing(query || "me"));
      return;
    }

    await ctx.reply(renderHeraldPlayerInfo(player));
  });
}
