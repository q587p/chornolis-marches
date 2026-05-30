import { Bot } from "grammy";
import { afkReplyOptions, endPlayerSession, SESSION_AFK_CONFIRMATION, SESSION_ENDED_CONFIRMATION, setPlayerAfk } from "../services/sessionPresence";

async function setAfk(ctx: any) {
  if (!ctx.from?.id) return;
  try {
    await setPlayerAfk(ctx.from.id);
    await ctx.reply(SESSION_AFK_CONFIRMATION, await afkReplyOptions(ctx.from.id));
  } catch {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
  }
}

async function endSession(ctx: any) {
  if (!ctx.from?.id) return;
  try {
    await endPlayerSession(ctx.from.id);
    await ctx.reply(SESSION_ENDED_CONFIRMATION, { reply_markup: { remove_keyboard: true } });
  } catch {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
  }
}

export function registerSessionPresenceHandlers(bot: Bot) {
  bot.command("afk", setAfk);
  bot.command(["end_session", "endSession", "endsession", "quit", "leave"], endSession);
  bot.hears(["🌙 AFK / відійти", "AFK / відійти", "afk", "відійти"], setAfk);
  bot.hears(["🚪 Завершити сесію", "Завершити сесію", "завершити сесію", "вийти"], endSession);
}
