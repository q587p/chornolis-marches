import { Bot } from "grammy";
import { config, requireConfigValue } from "../config";
import { parseHeraldAdminIds, isHeraldAdminId } from "../herald/admin";
import { registerHeraldChronicleCommands } from "../herald/chronicleCommands";
import { startHeraldChronicleRelayLoop } from "../herald/chronicleRelay";
import { registerHeraldDigestCommands } from "../herald/digestCommands";
import { registerHeraldHelpCommands, registerHeraldUnknownCommandFallback } from "../herald/help";
import { registerHeraldInfoCommands } from "../herald/infoCommands";
import { registerHeraldNewsArchiveCommands } from "../herald/newsArchiveCommands";
import { registerHeraldNewsBackfillCommands } from "../herald/newsBackfillCommands";
import { registerHeraldNewsCommands } from "../herald/newsCommands";
import { registerHeraldPublisherCommands, startHeraldPublisherLoop } from "../herald/publisher";
import { publicationErrorMessage } from "../herald/publications";
import { parseTelegramChannelId } from "../herald/safety";
import { startHeraldHealthServer } from "../server/heraldHealthServer";
import { HERALD_SERVICE_KEY, HERALD_STANDALONE_MODE, startServiceHeartbeatLoop } from "../services/serviceHeartbeat";

const bot = new Bot(requireConfigValue(config.heraldBotToken, "HERALD_BOT_TOKEN"));
const heraldAdminIds = parseHeraldAdminIds(config.heraldAdminIds);
const heraldStartedAt = new Date();
let heraldHeartbeatStarted = false;

bot.command("ping", async (ctx) => {
  if (isHeraldAdminId(ctx.from?.id, heraldAdminIds)) {
    console.log("Herald ping from configured admin.");
  }

  await ctx.reply("Канцелярія Межового Знаку на місці.");
});

registerHeraldHelpCommands(bot, heraldAdminIds);
registerHeraldInfoCommands(bot, heraldAdminIds);
registerHeraldNewsCommands(bot, heraldAdminIds);
registerHeraldNewsArchiveCommands(bot, heraldAdminIds);
registerHeraldNewsBackfillCommands(bot, heraldAdminIds);
registerHeraldDigestCommands(bot, heraldAdminIds);
registerHeraldPublisherCommands(bot, heraldAdminIds);
registerHeraldChronicleCommands(bot, heraldAdminIds);
registerHeraldUnknownCommandFallback(bot, heraldAdminIds);

bot.catch((error) => {
  console.error("Herald bot error:", publicationErrorMessage(error.error));
  void error.ctx.reply("Канцелярія перечепилася об службову помилку, але не відкрила жодної таємної книги.")
    .catch((replyError) => {
      console.warn("Herald error reply failed:", publicationErrorMessage(replyError));
    });
});

function formatStartupNoticeTime(now = new Date()) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
}

function heraldStartupNoticeText() {
  return [
    "Канцелярія Межового Знаку знову на зв’язку.",
    "",
    "Печатки розкладено. Скриню вістей відчинено.",
    `Режим: Herald. Час: ${formatStartupNoticeTime()}.`,
  ].join("\n");
}

async function sendHeraldStartupNotice() {
  if (!config.heraldStartupNoticeEnabled || !config.heraldStartupNoticeChatId) return;

  try {
    await bot.api.sendMessage(
      parseTelegramChannelId(config.heraldStartupNoticeChatId),
      heraldStartupNoticeText(),
    );
    console.log("Herald startup notice sent.");
  } catch (error) {
    console.warn("Herald startup notice failed:", publicationErrorMessage(error));
  }
}

function startHeraldHeartbeatOnce() {
  if (heraldHeartbeatStarted) return;
  heraldHeartbeatStarted = true;
  startServiceHeartbeatLoop({
    serviceKey: HERALD_SERVICE_KEY,
    mode: HERALD_STANDALONE_MODE,
    startedAt: heraldStartedAt,
    logLabel: "Herald",
  });
}

startHeraldHealthServer();
startHeraldPublisherLoop(bot);
startHeraldChronicleRelayLoop(bot);
bot.start({
  onStart: () => {
    startHeraldHeartbeatOnce();
    void sendHeraldStartupNotice();
  },
}).catch((error) => {
  console.error("Herald bot polling failed:", error);
});
