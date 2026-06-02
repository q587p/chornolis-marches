import { Bot } from "grammy";
import { PlayerSleepState } from "@prisma/client";
import { prisma } from "../db";
import { parseAlias, normalizeInput, type ParsedAliasCommand } from "../input/aliases";
import { buildWakeUpKeyboard } from "../ui/keyboards";
import { safeAnswerCallbackQuery } from "../utils/telegram";

const ALLOWED_SLEEP_ALIAS_KINDS = new Set<ParsedAliasCommand["kind"]>([
  "wake",
  "time",
  "calendar",
  "weather",
  "help",
  "news",
  "chat",
  "settings",
  "daypart-notices",
  "auto-messages",
  "session-presence",
]);

const ALLOWED_SLEEP_TEXT_COMMANDS = new Set([
  "wake",
  "wakeup",
  "time",
  "calendar",
  "weather",
  "help",
  "h",
  "commands",
  "chronicles",
  "chronicle",
  "news",
  "settings",
  "daynotices",
  "automessages",
  "afk",
  "end",
  "end session",
  "end-session",
  "endsession",
  "end_session",
  "quit",
  "leave",
  "прокинутися",
  "прокинутись",
  "час",
  "календар",
  "дата",
  "погода",
  "допомога",
  "команди",
  "хроніки",
  "хроніка",
  "останні події",
  "новини",
  "налаштування",
  "сповіщення",
  "відійти",
  "завершити сесію",
  "вийти",
]);

const ALLOWED_SLEEP_CALLBACK_PREFIXES = [
  "news:",
  "chat:",
  "commands:",
  "settings:",
];

const ALLOWED_SLEEP_CALLBACKS = new Set([
  "sleep:wake",
  "time:show",
  "calendar:show",
  "weather:show",
  "settings:show",
  "settings:back",
  "settings:hint-dismiss",
]);

export const ORDINARY_SLEEP_COMMAND_BLOCK_TEXT = [
  "Сон тримає тіло важким і далеким. Це не зробити уві сні.",
  "",
  "Хочете прокинутися?",
].join("\n");

function normalizedCommandText(raw: string) {
  return normalizeInput(raw).replace(/^\//, "");
}

export function shouldAllowOrdinarySleepText(raw: string) {
  const parsed = parseAlias(raw);
  if (parsed && ALLOWED_SLEEP_ALIAS_KINDS.has(parsed.kind)) return true;

  const normalized = normalizedCommandText(raw);
  const firstToken = normalized.split(/\s+/)[0] ?? "";
  return ALLOWED_SLEEP_TEXT_COMMANDS.has(normalized) || ALLOWED_SLEEP_TEXT_COMMANDS.has(firstToken);
}

export function shouldAllowOrdinarySleepCallback(data: string) {
  if (ALLOWED_SLEEP_CALLBACKS.has(data)) return true;
  return ALLOWED_SLEEP_CALLBACK_PREFIXES.some((prefix) => data.startsWith(prefix));
}

async function isOrdinarySleepingTelegramUser(telegramId: number) {
  const player = await prisma.player.findUnique({
    where: { telegramId: String(telegramId) },
    select: { sleepState: true },
  });
  return player?.sleepState === PlayerSleepState.ORDINARY_SLEEP;
}

export function registerOrdinarySleepCommandGateMiddleware(bot: Bot) {
  bot.use(async (ctx, next) => {
    const telegramId = ctx.from?.id;
    const text = ctx.message?.text;
    const callbackData = ctx.callbackQuery?.data;
    if (!telegramId || (!text && !callbackData)) return next();
    if (!(await isOrdinarySleepingTelegramUser(telegramId))) return next();

    if (text && shouldAllowOrdinarySleepText(text)) return next();
    if (callbackData && shouldAllowOrdinarySleepCallback(callbackData)) return next();

    if (ctx.callbackQuery) {
      await safeAnswerCallbackQuery(ctx, "Спершу треба прокинутися.");
    }
    await ctx.reply(ORDINARY_SLEEP_COMMAND_BLOCK_TEXT, { reply_markup: buildWakeUpKeyboard() });
  });
}
