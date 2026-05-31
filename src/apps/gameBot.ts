import { Bot } from "grammy";
import { config, requireConfigValue } from "../config";
import { markTelegramBotError, markTelegramBotReady, markTelegramBotStarting, setLastRuntimeError } from "../runtimeState";
import { startHttpServer } from "../server/statusServer";
import { announceWorldUpdatedOnce } from "../services/deployAnnouncements";
import { startActionQueueLoop } from "../services/actionQueue";
import { startWorldTickLoop } from "../services/worldTick";
import { registerActionQueueHandlers } from "../handlers/actionQueue";
import { registerAliasHandlers } from "../handlers/aliases";
import { registerAutoHandlers } from "../handlers/auto";
import { registerGatherHandlers } from "../handlers/gather";
import { registerLookHandlers } from "../handlers/look";
import { registerMovementHandlers } from "../handlers/movement";
import { registerNewsHandlers } from "../handlers/news";
import { registerChronicleHandlers } from "../handlers/chronicles";
import { registerHelpHandlers } from "../handlers/help";
import { registerMenuHandlers } from "../handlers/menu";
import { registerAdminHandlers } from "../handlers/admin";
import { registerPlayerHandlers } from "../handlers/player";
import { registerSayHandlers } from "../handlers/say";
import { registerPostureHandlers } from "../handlers/posture";
import { registerRestHandlers } from "../handlers/rest";
import { registerSocialHandlers } from "../handlers/social";
import { registerStartHandlers } from "../handlers/start";
import { registerStatusHandlers } from "../handlers/status";
import { registerManualTickReportHandlers } from "../handlers/tickReport";
import { registerTimeHandlers } from "../handlers/time";
import { registerTutorialHandlers } from "../handlers/tutorial";
import { registerFallbackHandlers } from "../handlers/fallback";
import { registerSessionPresenceHandlers } from "../handlers/sessionPresence";
import { registerSessionPresenceMiddleware, startAutoAfkLoop } from "../services/sessionPresence";

const TELEGRAM_POLLING_CONFLICT_RETRY_MS = Number(process.env.TELEGRAM_POLLING_CONFLICT_RETRY_MS || 15_000);

const bot = new Bot(requireConfigValue(config.botToken, "BOT_TOKEN"));
markTelegramBotStarting();
registerSessionPresenceMiddleware(bot);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTelegramPollingConflict(error: unknown) {
  const errorLike = error as { error_code?: number; description?: string; message?: string };
  const text = `${errorLike.description ?? ""} ${errorLike.message ?? ""}`;
  return errorLike.error_code === 409 || /409: Conflict|getUpdates request/i.test(text);
}

async function refreshTelegramBotIdentity() {
  try {
    const me = await bot.api.getMe();
    markTelegramBotReady(me.username);
  } catch (error) {
    markTelegramBotError(error);
    setLastRuntimeError(error);
    console.error("Telegram bot status check failed:", error);
  }
}

async function startTelegramPolling() {
  for (;;) {
    try {
      await refreshTelegramBotIdentity();
      await bot.start();
      return;
    } catch (error) {
      if (!isTelegramPollingConflict(error)) {
        markTelegramBotError(error);
        setLastRuntimeError(error);
        console.error("Bot polling failed:", error);
        return;
      }

      markTelegramBotStarting();
      console.warn(`Bot polling conflict: another getUpdates request is active. Retrying in ${Math.round(TELEGRAM_POLLING_CONFLICT_RETRY_MS / 1000)}s.`);
      await sleep(TELEGRAM_POLLING_CONFLICT_RETRY_MS);
    }
  }
}

registerStartHandlers(bot);
registerAutoHandlers(bot);
registerPlayerHandlers(bot);
registerHelpHandlers(bot);
registerNewsHandlers(bot);
registerChronicleHandlers(bot);
registerMenuHandlers(bot);
registerAdminHandlers(bot);
registerStatusHandlers(bot);
registerManualTickReportHandlers(bot);
registerTimeHandlers(bot);
registerTutorialHandlers(bot);
registerSessionPresenceHandlers(bot);
registerLookHandlers(bot);
registerSayHandlers(bot);
registerMovementHandlers(bot);
registerGatherHandlers(bot);
registerSocialHandlers(bot);
registerPostureHandlers(bot);
registerRestHandlers(bot);
registerActionQueueHandlers(bot);
registerAliasHandlers(bot);

bot.catch((error) => {
  markTelegramBotError(error.error);
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
startAutoAfkLoop();
registerFallbackHandlers(bot);

startTelegramPolling();
