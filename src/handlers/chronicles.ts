import { Bot } from "grammy";
import { latestGlobalChronicles } from "../services/chronicles";
import { slashlessCommandPattern } from "../utils/slashlessCommands";

const CHRONICLES_TEXT_COMMAND = slashlessCommandPattern([
  "chronicles",
  "chronicle",
  "хроніки",
  "хроніка",
  "останні події",
  "події",
]);

export async function sendChronicles(ctx: any) {
  await ctx.reply(await latestGlobalChronicles());
}

export function registerChronicleHandlers(bot: Bot) {
  bot.command(["chronicles", "chronicle"], sendChronicles);
  bot.hears(CHRONICLES_TEXT_COMMAND, sendChronicles);
}
