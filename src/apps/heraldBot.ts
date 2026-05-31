import { Bot } from "grammy";
import { config, requireConfigValue } from "../config";
import { parseHeraldAdminIds, isHeraldAdminId } from "../herald/admin";
import { registerHeraldDigestCommands } from "../herald/digestCommands";
import { registerHeraldHelpCommands, registerHeraldUnknownCommandFallback } from "../herald/help";
import { registerHeraldInfoCommands } from "../herald/infoCommands";
import { registerHeraldNewsCommands } from "../herald/newsCommands";
import { registerHeraldPublisherCommands, startHeraldPublisherLoop } from "../herald/publisher";
import { startHeraldHealthServer } from "../server/heraldHealthServer";

const bot = new Bot(requireConfigValue(config.heraldBotToken, "HERALD_BOT_TOKEN"));
const heraldAdminIds = parseHeraldAdminIds(config.heraldAdminIds);

bot.command("ping", async (ctx) => {
  if (isHeraldAdminId(ctx.from?.id, heraldAdminIds)) {
    console.log("Herald ping from configured admin.");
  }

  await ctx.reply("Канцелярія Межового Знаку на місці.");
});

registerHeraldHelpCommands(bot, heraldAdminIds);
registerHeraldInfoCommands(bot, heraldAdminIds);
registerHeraldNewsCommands(bot, heraldAdminIds);
registerHeraldDigestCommands(bot, heraldAdminIds);
registerHeraldPublisherCommands(bot, heraldAdminIds);
registerHeraldUnknownCommandFallback(bot, heraldAdminIds);

bot.catch((error) => {
  console.error("Herald bot error:", error);
});

startHeraldHealthServer();
startHeraldPublisherLoop(bot);
bot.start().catch((error) => {
  console.error("Herald bot polling failed:", error);
});
