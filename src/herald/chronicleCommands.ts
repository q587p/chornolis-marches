import type { Bot } from "grammy";
import { requireHeraldAdmin } from "./admin";
import { backfillNewPlayerChroniclesFromPlayers } from "../services/chronicles";
import { pendingChronicleRelayEvents, publishPendingChronicleRelays } from "./chronicleRelay";

export function registerHeraldChronicleCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.command("chronicles_backfill_players", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      const result = await backfillNewPlayerChroniclesFromPlayers();
      await ctx.reply([
        "📜 Канцелярія перечитала старі записи прибулих.",
        "",
        `Додано зарубок: ${result.created}.`,
        `Уже були в корі: ${result.skipped}.`,
        `Перевірено персонажів: ${result.checked}.`,
      ].join("\n"));
    } catch (error) {
      console.warn("Herald chronicle backfill failed:", error);
      await ctx.reply("Канцелярія не змогла спокійно перечитати старі прибуття. Подробиці лишилися в logs.");
    }
  });

  bot.command("chronicles_pending", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      const pending = await pendingChronicleRelayEvents(10);
      if (!pending.length) {
        await ctx.reply("У скрині хронік немає нових зарубок для чату.");
        return;
      }
      await ctx.reply([
        `У скрині хронік: ${pending.length}.`,
        "",
        ...pending.map((event) => `#${event.id} — ${event.description ?? event.title}`),
      ].join("\n"));
    } catch (error) {
      console.warn("Herald pending chronicles failed:", error);
      await ctx.reply("Канцелярія спіткнулася на підрахунку хронік. Подробиці лишилися в logs.");
    }
  });

  bot.command("publish_chronicles", async (ctx) => {
    if (!(await requireHeraldAdmin(ctx, heraldAdminIds))) return;
    try {
      const result = await publishPendingChronicleRelays(bot);
      if (result.skipped) {
        await ctx.reply(`Передачу хронік вимкнено: ${result.reason}.`);
        return;
      }
      await ctx.reply(`Передано хронік: ${result.published}. Помилок: ${result.failed}.`);
    } catch (error) {
      console.warn("Herald publish chronicles failed:", error);
      await ctx.reply("Канцелярія не змогла передати хроніки до чату. Подробиці лишилися в logs.");
    }
  });
}
