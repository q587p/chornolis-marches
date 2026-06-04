import { Bot } from "grammy";
import {
  backfillNewPlayerChroniclesFromPlayers,
  latestGlobalChronicles,
  latestGlobalChroniclesRealTime,
} from "../services/chronicles";
import { requireScribeAdmin } from "../services/adminAccess";
import { slashlessCommandPattern } from "../utils/slashlessCommands";

const CHRONICLES_TEXT_COMMAND = slashlessCommandPattern([
  "chronicles",
  "chronicle",
  "хроніки",
  "хроніка",
  "останні події",
  "події",
]);
const CHRONICLES_REAL_TEXT_COMMAND = slashlessCommandPattern(["chronicles_real", "chroniclesReal", "chronicles real"]);
const CHRONICLES_BACKFILL_TEXT_COMMAND = slashlessCommandPattern([
  "chronicles_backfill_players",
  "chroniclesBackfillPlayers",
  "chronicles backfill players",
]);

export async function sendChronicles(ctx: any) {
  await ctx.reply(await latestGlobalChronicles());
}

async function sendChroniclesRealTime(ctx: any) {
  if (!(await requireScribeAdmin(ctx))) return;
  await ctx.reply(await latestGlobalChroniclesRealTime());
}

async function backfillChronicles(ctx: any) {
  if (!(await requireScribeAdmin(ctx))) return;
  const result = await backfillNewPlayerChroniclesFromPlayers();
  await ctx.reply([
    "📜 Хроніки перечитали старі записи прибулих.",
    "",
    `Додано зарубок: ${result.created}.`,
    `Уже були в корі: ${result.skipped}.`,
    `Перевірено персонажів: ${result.checked}.`,
  ].join("\n"));
}

export function registerChronicleHandlers(bot: Bot) {
  bot.command(["chronicles", "chronicle"], sendChronicles);
  bot.command(["chronicles_real", "chroniclesReal"], sendChroniclesRealTime);
  bot.command(["chronicles_backfill_players", "chroniclesBackfillPlayers"], backfillChronicles);
  bot.hears(CHRONICLES_TEXT_COMMAND, sendChronicles);
  bot.hears(CHRONICLES_REAL_TEXT_COMMAND, sendChroniclesRealTime);
  bot.hears(CHRONICLES_BACKFILL_TEXT_COMMAND, backfillChronicles);
}
