import { Bot } from "grammy";
import { config } from "./config";
import { setLastRuntimeError } from "./runtimeState";
import { startHttpServer } from "./server/statusServer";
import { announceWorldUpdatedOnce } from "./services/deployAnnouncements";
import { startActionQueueLoop } from "./services/actionQueue";
import { startWorldTickLoop } from "./services/worldTick";
import { registerActionQueueHandlers } from "./handlers/actionQueue";
import { registerAutoHandlers } from "./handlers/auto";
import { registerGatherHandlers } from "./handlers/gather";
import { registerLookHandlers } from "./handlers/look";
import { registerMovementHandlers } from "./handlers/movement";
import { registerNewsHandlers } from "./handlers/news";
import { registerHelpHandlers } from "./handlers/help";
import { registerMenuHandlers } from "./handlers/menu";
import { registerAdminHandlers } from "./handlers/admin";
import { registerPlayerHandlers } from "./handlers/player";
import { registerSayHandlers } from "./handlers/say";
import { registerRestHandlers } from "./handlers/rest";
import { registerSocialHandlers } from "./handlers/social";
import { registerStartHandlers } from "./handlers/start";
import { registerStatusHandlers } from "./handlers/status";

const bot = new Bot(config.botToken);

registerStartHandlers(bot);
registerAutoHandlers(bot);
registerPlayerHandlers(bot);
registerHelpHandlers(bot);
registerNewsHandlers(bot);
registerMenuHandlers(bot);
registerAdminHandlers(bot);
registerStatusHandlers(bot);
registerLookHandlers(bot);
registerSayHandlers(bot);
registerMovementHandlers(bot);
registerGatherHandlers(bot);
registerSocialHandlers(bot);
registerRestHandlers(bot);
registerActionQueueHandlers(bot);

bot.catch((error) => {
  setLastRuntimeError(error.error);
  console.error("Bot error:", error);
});

startHttpServer();
announceWorldUpdatedOnce(bot).catch((error) => {
  setLastRuntimeError(error);
  console.warn("World update announcement failed:", error);
});
startWorldTickLoop(bot);
startActionQueueLoop(bot);

bot.start();
