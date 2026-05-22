import { Bot } from "grammy";
import { resetWorldState } from "../services/worldReset";

export const ADMIN_HELP_TEXT = [
  "🛠 <b>Адмінські команди</b>",
  "",
  "• /adminHelp — показати цей список.",
  "• /reset — скинути NPC, тварин, ресурси, черги, сліди й події світу до стартового стану.",
  "",
  "<b>Поки що доступ</b>",
  "• Команди тимчасово доступні всім під час розробки.",
  "• TODO: додати права, список адміністраторів і обмеження виконання /reset.",
].join("\n");

export function registerAdminHandlers(bot: Bot) {
  bot.command(["adminHelp", "adminhelp"], async (ctx) => {
    await ctx.reply(ADMIN_HELP_TEXT, { parse_mode: "HTML" });
  });

  bot.command("reset", async (ctx) => {
    const summary = await resetWorldState();
    await ctx.reply([
      "✅ Світ скинуто до стартового стану.",
      "",
      `Seed: ${summary.version}`,
      `Ресурсних вузлів скинуто: ${summary.resetResources}`,
      `Застарілих ресурсних вузлів прибрано: ${summary.removedResourceNodes}`,
      `Унікальних NPC скинуто: ${summary.resetUniqueCreatures}`,
      `Дублів унікальних NPC прибрано: ${summary.removedDuplicateUniqueCreatures}`,
      `Зайців створено: ${summary.rabbitsCreated}`,
      "",
      "Дід лісовик спить прихованим у forest_00_00. Здравомир-знахар стоїть у межовому таборі.",
    ].join("\n"));
  });
}
