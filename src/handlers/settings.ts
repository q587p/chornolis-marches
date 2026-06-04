import { Bot } from "grammy";
import { buildMenuReplyKeyboard } from "../ui/replyKeyboard";
import { getPlayerByTelegramId } from "../services/players";
import {
  DAYPART_NOTICES_DISABLED_TEXT,
  DAYPART_NOTICES_ENABLED_TEXT,
  AUTO_ACTION_MESSAGES_DISABLED_TEXT,
  AUTO_ACTION_MESSAGES_ENABLED_TEXT,
  buildSettingsKeyboard,
  notificationSettingsForTelegramId,
  renderNotificationSettings,
  setAutoActionMessagesEnabled,
  setDaypartNoticesEnabled,
} from "../services/playerNotificationSettings";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { isScribeAdmin } from "../services/adminAccess";

async function playerForContext(ctx: any) {
  if (!ctx.from?.id) return null;
  return getPlayerByTelegramId(ctx.from.id);
}

export async function showSettings(ctx: any, options: { edit?: boolean } = {}) {
  const settings = ctx.from?.id ? await notificationSettingsForTelegramId(ctx.from.id) : null;
  if (!settings) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const text = renderNotificationSettings(settings);
  const reply_markup = buildSettingsKeyboard(settings);
  if (options.edit) {
    try {
      await ctx.editMessageText(text, { reply_markup });
      return;
    } catch {
      // Telegram may reject editing old messages; fall back to a fresh settings page.
    }
  }
  await ctx.reply(text, { reply_markup });
}

export async function setDaypartNoticeSetting(ctx: any, enabled: boolean) {
  const player = await playerForContext(ctx);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const settings = await setDaypartNoticesEnabled(player.id, enabled);
  await ctx.reply(enabled ? DAYPART_NOTICES_ENABLED_TEXT : DAYPART_NOTICES_DISABLED_TEXT, {
    reply_markup: buildSettingsKeyboard(settings),
  });
}

export async function setAutoActionMessageSetting(ctx: any, enabled: boolean) {
  const player = await playerForContext(ctx);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const settings = await setAutoActionMessagesEnabled(player.id, enabled);
  await ctx.reply(enabled ? AUTO_ACTION_MESSAGES_ENABLED_TEXT : AUTO_ACTION_MESSAGES_DISABLED_TEXT, {
    reply_markup: buildSettingsKeyboard(settings),
  });
}

async function showMenuFromSettings(ctx: any) {
  const canSeeScribeTools = await isScribeAdmin(ctx.from?.id);
  await ctx.reply("☰ Меню", { reply_markup: buildMenuReplyKeyboard({ canSeeStats: canSeeScribeTools, canSeeChat: canSeeScribeTools }) });
}

function daynoticesArg(ctx: any) {
  return ctx.message?.text?.split(/\s+/).slice(1).join(" ").trim().toLowerCase();
}

export function registerSettingsHandlers(bot: Bot) {
  bot.command(["settings", "notifications"], (ctx) => showSettings(ctx));
  bot.command("daynotices", async (ctx) => {
    const arg = daynoticesArg(ctx);
    if (["on", "увімкнути", "ввімкнути", "так"].includes(arg)) return setDaypartNoticeSetting(ctx, true);
    if (["off", "вимкнути", "ні"].includes(arg)) return setDaypartNoticeSetting(ctx, false);
    return showSettings(ctx);
  });
  bot.command("automessages", async (ctx) => {
    const arg = daynoticesArg(ctx);
    if (["on", "увімкнути", "ввімкнути", "так"].includes(arg)) return setAutoActionMessageSetting(ctx, true);
    if (["off", "вимкнути", "ні"].includes(arg)) return setAutoActionMessageSetting(ctx, false);
    return showSettings(ctx);
  });

  bot.hears(["⚙️ Налаштування"], (ctx) => showSettings(ctx));

  bot.callbackQuery("settings:show", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await showSettings(ctx, { edit: true });
  });
  bot.callbackQuery("settings:daypart:on", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await setDaypartNoticeSetting(ctx, true);
  });
  bot.callbackQuery("settings:daypart:off", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await setDaypartNoticeSetting(ctx, false);
  });
  bot.callbackQuery("settings:autoMessages:on", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await setAutoActionMessageSetting(ctx, true);
  });
  bot.callbackQuery("settings:autoMessages:off", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await setAutoActionMessageSetting(ctx, false);
  });
  bot.callbackQuery("settings:back", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await showMenuFromSettings(ctx);
  });
  bot.callbackQuery("settings:hint-dismiss", async (ctx) => {
    await safeAnswerCallbackQuery(ctx, "Гаразд.");
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch {
      // Best effort: older Telegram messages may no longer be editable.
    }
  });
}
