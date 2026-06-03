import { Bot } from "grammy";
import { actionDurationMs, performOrQueuePlayerAction } from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { stripUnsafeText } from "../utils/text";
import { sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { parseSpeechTarget } from "../services/speechTargets";
import { tryTriggerManualCellarWaterWordPassage } from "../services/cellarWaterPassage";

export function registerSayHandlers(bot: Bot) {
  bot.command("say", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const text = stripUnsafeText(String(ctx.match || "").slice(0, 300));
    if (!text) return void (await ctx.reply("Напиши так: <i>/say</i> текст", { parse_mode: "HTML" }));

    const player = await getPlayerByTelegramId(from.id);
    if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const durationMs = actionDurationMs("SAY", player.stamina);
    try {
      const payload = await parseSpeechTarget(text, player.currentLocationId, player.id);
      const hasTarget = Boolean(payload.targetType || payload.targetId || payload.targetName || payload.targetDative);
      if (await tryTriggerManualCellarWaterWordPassage(bot, {
        playerId: player.id,
        text: payload.text,
        chatId: ctx.chat?.id,
        hasTarget,
      })) {
        return;
      }
      const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "SAY", payload, durationMs, chatId: ctx.chat?.id });
      await sendActionSubmitFeedback(ctx, player.id, result);
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося виконати дію.");
    }
  });
}
