import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { resetWorldState } from "../services/worldReset";
import { logEvent } from "../services/worldEvents";
import { stopAllPlayerAuto } from "./auto";

export const ADMIN_HELP_TEXT = [
  "🛠 Admin / debug commands",
  "",
  "/adminHelp — список команд",
  "/world — стан світу й останні події",
  "/stat — коротка екологічна статистика й посилання на веб-/stat",
  "/chat [hours|all] — репліки гравців і NPC з пагінацією; веб-/chat",
  "/all — усі живі персонажі та істоти",
  "/all dead — усі записи істот, включно з inactive/dead/corpse/gone",
  "/look або кнопка 👀 Озирнутися — показати поточну місцину",
  "/location або /loc — старі сумісні назви для /look",
  "/examine або кнопка 👁 Роздивитися — уважніше роздивитися поточну місцину",
  "/locationAll — список усіх місцин і ключів",
  "/addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD] — додати тварин",
  "/addCreatureHelp — список speciesKey для тварин",
  "/addCampfire — додати звичайне вогнище у поточній місцині",
  "/forceOld [speciesKey] [count] — зробити кілька тварин у поточній місцині похилими для тесту старіння",
  "/cleanupCreature [speciesKey] — видалити одну тварину в поточній місцині",
  "/cleanupCreatures — очистити всіх тварин і нормалізувати унікальних NPC",
  "/reset — скинути стан світу до стартового seed-стану",
  "/restAdmin — одразу відновити снагу до адмінського максимуму",
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

  bot.command("addCampfire", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const player = await prisma.player.findUnique({
      where: { telegramId: String(telegramId) },
      select: { currentLocationId: true },
    });

    if (!player?.currentLocationId) {
      await ctx.reply("Спершу увійди у світ через /start, щоб мати поточну місцину.");
      return;
    }

    const location = await prisma.cellLocation.findUnique({ where: { id: player.currentLocationId } });
    if (!location) {
      await ctx.reply("Поточну місцину не знайдено.");
      return;
    }

    const key = `debug_campfire_${player.currentLocationId}`;
    const feature = await prisma.locationFeature.upsert({
      where: { key },
      update: {
        isActive: true,
        type: "CAMPFIRE",
        name: "Вогнище",
        description: "Звичайне вогнище потріскує й дає тепле світло. Воно не має магічної сили незгасного полум’я.",
        providesLight: true,
        restStaminaCapMultiplier: null,
        data: {
          debug: true,
          is_campfire: true,
          created_by: "addCampfire",
          magical: false,
        },
      },
      create: {
        key,
        locationId: player.currentLocationId,
        type: "CAMPFIRE",
        name: "Вогнище",
        description: "Звичайне вогнище потріскує й дає тепле світло. Воно не має магічної сили незгасного полум’я.",
        isActive: true,
        providesLight: true,
        restStaminaCapMultiplier: null,
        data: {
          debug: true,
          is_campfire: true,
          created_by: "addCampfire",
          magical: false,
        },
      },
    });

    await logEvent("SYSTEM", "Debug campfire added", `${feature.key} at ${location.key}`, player.currentLocationId);
    await ctx.reply(`🔥 Додано звичайне вогнище у місцині: ${location.name}.\nКлюч: ${feature.key}`);
  });

  async function runReset(ctx: any) {
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
      `Мишей створено: ${summary.miceCreated}`,
      `Хижаків створено: ${summary.predatorsCreated}`,
      `Авто-режимів вимкнено: ${autoStopped}`,
      "",
      "Унікальні NPC:",
      ...summary.uniqueCreatureSummaries.map((item) => `- ${item}`),
    ].join("\n"));
  }

  bot.command("reset", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.reply(
      [
        "⚠️ /reset скине світ до стартового seed-стану.",
        "",
        "Буде очищено черги дій, сліди, події, тварин і runtime-стани авто-режиму. Персонажі гравців лишаться, але світ навколо повернеться до старту.",
        "",
        "Підтвердити?",
      ].join("\n"),
      {
        reply_markup: new InlineKeyboard()
          .text("✅ Так, скинути світ", `reset:confirm:${userId}`)
          .text("↩️ Скасувати", `reset:cancel:${userId}`),
      }
    );
  });

  bot.callbackQuery(/^reset:(confirm|cancel):(\d+)$/, async (ctx) => {
    const action = ctx.match[1];
    const requestedBy = Number(ctx.match[2]);

    if (ctx.from.id !== requestedBy) {
      await ctx.answerCallbackQuery({ text: "Це підтвердження не для тебе.", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();

    if (action === "cancel") {
      await ctx.editMessageText("↩️ Reset скасовано.");
      return;
    }

    await ctx.editMessageText("⏳ Reset підтверджено. Скидаю світ...");
    await runReset(ctx);
  });
}
