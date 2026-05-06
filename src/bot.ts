import { Bot } from "grammy";
import { config } from "./config";
import { setLastRuntimeError } from "./runtimeState";
import { startHttpServer } from "./server/statusServer";
import { announceWorldUpdatedOnce } from "./services/deployAnnouncements";
import { startWorldTickLoop } from "./services/worldTick";
import { registerGatherHandlers } from "./handlers/gather";
import { registerLookHandlers } from "./handlers/look";
import { registerMovementHandlers } from "./handlers/movement";
import { registerPlayerHandlers } from "./handlers/player";
import { registerSayHandlers } from "./handlers/say";
import { registerSocialHandlers } from "./handlers/social";
import { registerStartHandlers } from "./handlers/start";
import { registerStatusHandlers } from "./handlers/status";

const bot = new Bot(config.botToken);

registerStartHandlers(bot);
registerPlayerHandlers(bot);
registerStatusHandlers(bot);
registerLookHandlers(bot);
registerSayHandlers(bot);
registerMovementHandlers(bot);
registerGatherHandlers(bot);
registerSocialHandlers(bot);

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

bot.start();
