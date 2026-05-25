import { Bot } from "grammy";
import { resetWorldState } from "../services/worldReset";
import { stopAllPlayerAuto } from "./auto";

export const ADMIN_HELP_TEXT = [
  "🛠 Admin / debug commands",
  "",
  "/adminHelp — список команд",
  "/world — стан світу й останні події",
  "/all — усі живі персонажі та істоти",
  "/all dead — усі записи істот, включно з inactive/dead/corpse/gone",
  "/location або кнопка 👀 Озирнутися — показати поточну місцину",
  "/locationAll — список усіх локацій і ключів",
  "/addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD] — додати тварин",
  "/addCreatureHelp — список speciesKey для тварин",
  "/forceOld [speciesKey] [count] — зробити кілька тварин у поточній локації похилими для тесту старіння",
  "/cleanupCreature [speciesKey] — видалити одну тварину в поточній локації",
  "/cleanupCreatures — очистити всіх тварин і нормалізувати унікальних NPC",
  "/reset — скинути стан світу до стартового seed-стану",
  "/tick — вручну запустити world tick і показати підсумок",
  "/tickGet — показати tick-налаштування",
  "/tickSet <ms> — змінити інтервал tick",
  "/auto — увімкнути авто-режим гравця",
  "/autoStop — зупинити авто-режим",
  "/news — останні новини гри",
  "/restart — видалити свого персонажа, інвентар і статистику; наступний /start почне онбордінґ з нуля",
  "",
  "Поки що доступ тимчасово відкритий усім під час розробки.",
  "TODO: додати права, список адміністраторів і обмеження виконання /reset та інших debug-команд.",
].join("\n");

export function registerAdminHandlers(bot: Bot) {
  bot.command(["adminHelp", "adminhelp"], async (ctx) => {
    await ctx.reply(ADMIN_HELP_TEXT);
  });

  bot.command("reset", async (ctx) => {
    const autoStopped = await stopAllPlayerAuto();
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
      `Авто-режимів вимкнено: ${autoStopped}`,
      "",
      "Унікальні NPC:",
      ...summary.uniqueCreatureSummaries.map((item) => `- ${item}`),
    ].join("\n"));
  });
}
