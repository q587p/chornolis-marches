import { Bot } from "grammy";
import { actionDurationMs, enqueuePlayerAction, renderPlayerActionQueue } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { buildActionQueueKeyboard } from "../ui/keyboards";
import { stripUnsafeText } from "../utils/text";

export function registerSayHandlers(bot: Bot) {
  bot.command("say", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const text = stripUnsafeText(String(ctx.match || "").slice(0, 300));
    if (!text) return void (await ctx.reply("Напиши так: /say текст"));

    const player = await getPlayerByTelegramId(from.id);
    if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const durationMs = actionDurationMs("SAY");
    try {
      await enqueuePlayerAction({ playerId: player.id, type: "SAY", payload: { text }, durationMs, chatId: ctx.chat?.id });
    } catch (error) {
      return void (await ctx.reply(error instanceof Error ? error.message : "Не вдалося додати дію."));
    }

    await ctx.reply(await renderPlayerActionQueue(player.id), { reply_markup: buildActionQueueKeyboard() });
  });
}
