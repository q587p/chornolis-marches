import { Bot, InlineKeyboard } from "grammy";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { isPlayerAutoEnabled } from "./auto";
import { getPlayerByTelegramId } from "../services/players";
import { hasCompletedTutorial, isTutorialLocation } from "../services/tutorial";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { slashlessCommandPattern } from "../utils/slashlessCommands";
import { prisma } from "../db";
import {
  COMMANDS_TEXT_PAGES,
  helpTextForTutorialStatus,
  tutorialHelpFollowupText,
} from "../content/help/helpText";

export {
  COMMANDS_TEXT_PAGES,
  HELP_TEXT,
  TUTORIAL_HELP_IN_DREAM_TEXT,
  TUTORIAL_HELP_RETURN_TEXT,
  helpTextForTutorialStatus,
  tutorialHelpFollowupText,
} from "../content/help/helpText";

const COMMANDS_TEXT_COMMAND = slashlessCommandPattern(["commands"]);

function commandsPageKeyboard(pageIndex: number) {
  const keyboard = new InlineKeyboard();
  const total = COMMANDS_TEXT_PAGES.length;
  if (pageIndex > 0) keyboard.text("↩️ Назад", `commands:page:${pageIndex - 1}`);
  keyboard.text(`${pageIndex + 1}/${total}`, "commands:noop");
  if (pageIndex < total - 1) keyboard.text("Далі ↪️", `commands:page:${pageIndex + 1}`);
  return keyboard;
}

async function playerIsInTutorialDream(playerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      currentLocation: {
        select: {
          key: true,
          z: true,
          region: { select: { key: true } },
        },
      },
    },
  });
  return Boolean(player?.currentLocation && isTutorialLocation(player.currentLocation));
}

async function replyWithCommandsPage(ctx: any, pageIndex = 0) {
  const safePage = Math.max(0, Math.min(COMMANDS_TEXT_PAGES.length - 1, pageIndex));
  await ctx.reply(COMMANDS_TEXT_PAGES[safePage], {
    reply_markup: commandsPageKeyboard(safePage),
  });
}

async function editCommandsPage(ctx: any, pageIndex: number) {
  const safePage = Math.max(0, Math.min(COMMANDS_TEXT_PAGES.length - 1, pageIndex));
  await ctx.editMessageText(COMMANDS_TEXT_PAGES[safePage], {
    reply_markup: commandsPageKeyboard(safePage),
  });
}

export async function sendHelp(ctx: any) {
  const auto = ctx.from ? isPlayerAutoEnabled(ctx.from.id) : false;
  const player = ctx.from ? await getPlayerByTelegramId(ctx.from.id) : null;
  const tutorialCompleted = player ? await hasCompletedTutorial(player.id) : false;

  await ctx.reply(helpTextForTutorialStatus(tutorialCompleted), {
    parse_mode: "HTML",
    reply_markup: ctx.from ? await buildMainReplyKeyboardForTelegramId(ctx.from.id, auto) : undefined,
  });

  if (!ctx.from) return;
  if (!player || tutorialCompleted) return;

  const isInTutorialDream = await playerIsInTutorialDream(player.id);
  await ctx.reply(tutorialHelpFollowupText(isInTutorialDream), {
    reply_markup: isInTutorialDream
      ? new InlineKeyboard().text("✅ Закінчити навчання", "tutorial:end").row().text("🌤 Прокинутися", "tutorial:wake")
      : new InlineKeyboard().text("🌙 Навчальний сон", "tutorial:sleep"),
  });
}

export async function sendCommands(ctx: any) {
  await replyWithCommandsPage(ctx, 0);
}

export function registerHelpHandlers(bot: Bot) {
  bot.command("help", sendHelp);
  bot.command("commands", sendCommands);
  bot.hears(COMMANDS_TEXT_COMMAND, sendCommands);
  bot.callbackQuery(/^commands:page:(\d+)$/, async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await editCommandsPage(ctx, Number(ctx.match[1]));
  });
  bot.callbackQuery("commands:noop", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
  });
  bot.hears(["❔ Допомога", "🧭 Допомога", "Допомога"], sendHelp);
}
