import { Bot, InlineKeyboard } from "grammy";
import { config } from "../config";
import { prisma } from "../db";
import { resetWorldState } from "../services/worldReset";
import { logEvent } from "../services/worldEvents";
import { createDebugCampfire, ensureTorchResourceTypes } from "../services/fire";
import { requireScribeAdmin } from "../services/adminAccess";
import { adminSecretMatches } from "../services/adminSecret";
import { syncChatBotCommandsForTelegramId } from "../services/telegramCommands";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { stopAllPlayerAuto } from "./auto";
import { resetTutorialProgressForPlayer } from "../services/tutorial";

function normalizeLookup(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function playerDisplayName(player: { nameNominative?: string | null; firstName?: string | null; username?: string | null; id: number }) {
  return player.nameNominative ?? player.firstName ?? player.username ?? `#${player.id}`;
}

async function resolvePlayerForAdmin(ctx: any, rawTarget: string) {
  const target = normalizeLookup(rawTarget);
  if (!target) {
    const telegramId = ctx.from?.id;
    return telegramId ? prisma.player.findUnique({ where: { telegramId: String(telegramId) } }) : null;
  }

  const players = await prisma.player.findMany({ orderBy: { id: "asc" } });
  const matches = players.filter((player) => {
    const keys = [
      String(player.id),
      `#${player.id}`,
      player.telegramId,
      player.username,
      player.firstName,
      player.lastName,
      player.nameNominative,
      player.nameGenitive,
      player.nameDative,
      player.nameAccusative,
      player.nameVocative,
    ].map(normalizeLookup).filter(Boolean);
    return keys.some((key) => key === target) || keys.some((key) => key.length > 2 && key.includes(target));
  });

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    await ctx.reply(`Знайшлося кілька персонажів. Уточни: ${matches.map(playerDisplayName).join(", ")}`);
    return null;
  }

  await ctx.reply("Не знайшов такого персонажа.");
  return null;
}

async function ensureResourceType(key: string, name: string, description: string) {
  return prisma.resourceType.upsert({
    where: { key },
    update: { name, description },
    create: { key, name, description },
  });
}

async function addInventoryResource(playerId: number, resourceTypeId: number, amount = 1) {
  return prisma.playerResource.upsert({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId } },
    update: { amount: { increment: amount } },
    create: { playerId, resourceTypeId, amount },
  });
}

async function resolveLocationForAdmin(ctx: any, rawTarget: string) {
  const target = normalizeLookup(rawTarget);
  if (!target) {
    const player = await resolvePlayerForAdmin(ctx, "");
    if (!player?.currentLocationId) {
      await ctx.reply("Спершу увійди у світ через /start, щоб мати поточну місцину.");
      return null;
    }
    return prisma.cellLocation.findUnique({ where: { id: player.currentLocationId } });
  }

  const coords = target.match(/^(-?\d+)\s*,\s*(-?\d+)(?:\s*,\s*(-?\d+))?$/);
  if (coords) {
    const location = await prisma.cellLocation.findFirst({
      where: { x: Number(coords[1]), y: Number(coords[2]), z: coords[3] ? Number(coords[3]) : 0 },
    });
    if (location) return location;
  }

  const location = await prisma.cellLocation.findFirst({
    where: {
      OR: [{ key: rawTarget.trim() }, { name: rawTarget.trim() }],
    },
  });
  if (location) return location;

  const player = await resolvePlayerForAdmin(ctx, rawTarget);
  if (player?.currentLocationId) return prisma.cellLocation.findUnique({ where: { id: player.currentLocationId } });
  if (player) await ctx.reply("У цього персонажа немає поточної місцини.");
  return null;
}

async function resolveLiteralLocation(rawTarget: string) {
  const target = normalizeLookup(rawTarget);
  if (!target) return null;

  const coords = target.match(/^(-?\d+)\s*,\s*(-?\d+)(?:\s*,\s*(-?\d+))?$/);
  if (coords) {
    return prisma.cellLocation.findFirst({
      where: { x: Number(coords[1]), y: Number(coords[2]), z: coords[3] ? Number(coords[3]) : 0 },
    });
  }

  return prisma.cellLocation.findFirst({
    where: {
      OR: [{ key: rawTarget.trim() }, { name: rawTarget.trim() }],
    },
  });
}

function splitTeleportArgs(raw: string) {
  const input = raw.trim();
  if (!input) return { playerArg: "", locationArg: "" };

  const separated = input.match(/^(.*?)\s*(?:->|=>| to | до )\s*(.+)$/i);
  if (separated) return { playerArg: separated[1].trim(), locationArg: separated[2].trim() };

  const coords = input.match(/^(?:(.+?)\s+)?(-?\d+\s*,\s*-?\d+(?:\s*,\s*-?\d+)?)$/);
  if (coords) return { playerArg: (coords[1] ?? "").trim(), locationArg: coords[2].trim() };

  const parts = input.split(/\s+/);
  if (parts.length >= 2) return { playerArg: parts.slice(0, -1).join(" "), locationArg: parts[parts.length - 1] };
  return { playerArg: "", locationArg: input };
}

export const ADMIN_HELP_TEXT = [
  "🛠 Команди писарів Порубіжжя",
  "",
  "Звичайні ігрові команди дивіться в /help. Тут лишено службові й небезпечні інструменти.",
  "",
  "Огляди й службові сторінки",
  "/adminHelp — ця підказка",
  "/world — стан світу й останні події",
  "/stat — службова статистика й посилання на захищену веб-/stat",
  "/all — усі живі персонажі та істоти",
  "/all dead — усі записи істот, включно з inactive/dead/corpse/gone",
  "/locationAll — список усіх місцин і ключів",
  "/playerAdmin <#id|ім’я|username> — детальна службова картка гравця",
  "",
  "Журнали й репліки",
  "/chat time [hours|all] — репліки гравців і NPC за часом",
  "/chat location [hours|all] — репліки, впорядковані за місциною",
  "/chat character [hours|all] — репліки, впорядковані за мовцем/персонажем",
  "",
  "Персонажі й доступ",
  "/tutorialReset [#id|ім’я|username] — скинути прогрес навчального сну",
  "/teleport [#id|ім’я|username] <locationKey|x,y,z> — перенести персонажа; без персонажа переносить вас",
  "/debugGet — показати, чи ввімкнені технічні деталі для вашого персонажа",
  "/debugSet <0|1> — вимкнути або ввімкнути технічні деталі; true/false теж працюють",
  "/restAdmin [#id|ім’я|username] — одразу відновити снагу собі або вказаному персонажу до адмінського максимуму",
  "",
  "Додавання у світ",
  "/addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD] — додати тварин",
  "/addCreatureHelp — список speciesKey для тварин",
  "/addCampfire [locationKey|x,y,z|персонаж] — додати звичайне вогнище",
  "/addTorch [персонаж] — додати факел у речі собі або вказаному персонажу",
  "/addTwigs [персонаж] — додати хмиз у речі собі або вказаному персонажу",
  "",
  "Прибирання й тестові стани",
  "/forceOld [speciesKey] [count] — зробити кілька тварин похилими для тесту старіння",
  "/cleanupCreature [speciesKey] — видалити одну тварину в поточній місцині",
  "/cleanupCreatures — очистити всіх тварин і нормалізувати унікальних NPC",
  "",
  "Небезпечні світові важелі",
  "/reset — скинути стан світу до стартового seed-стану",
  "/tick — вручну запустити world tick і показати підсумок",
  "/tickGet — показати tick-налаштування",
  "/tickSet <ms> — змінити інтервал tick",
  "",
  "Повний службовий список доступний тільки писарям Порубіжжя. Права писаря можна отримати через прихований локально налаштований секрет.",
].join("\n");

export function registerAdminHandlers(bot: Bot) {
  bot.command(["adminHelp", "adminhelp"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply(ADMIN_HELP_TEXT);
  });

  bot.command(["adminSet", "adminset"], async (ctx) => {
    if (!ctx.from) return;

    const password = String(ctx.match ?? "").trim();
    if (!config.adminSetSecret) {
      await ctx.reply("Писарський секрет Порубіжжя не налаштовано для цього середовища.");
      return;
    }
    if (!password || !adminSecretMatches(password)) {
      await ctx.reply("Не вдалося підтвердити писарський доступ Порубіжжя.");
      return;
    }

    const player = await prisma.player.update({
      where: { telegramId: String(ctx.from.id) },
      data: { role: "SCRIBE" },
    }).catch(() => null);

    if (!player) {
      await ctx.reply("Спершу увійди у світ через /start, щоб мати персонажа.");
      return;
    }

    await logEvent("SYSTEM", "Scribe access granted", `player=${player.id}; telegramId=${ctx.from.id}`);
    if (ctx.chat?.id) await syncChatBotCommandsForTelegramId(bot.api, ctx.chat.id, ctx.from.id);
    await ctx.reply("Писарський доступ Порубіжжя надано. Тепер доступна /adminHelp.");
  });

  bot.command("addCampfire", async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const location = await resolveLocationForAdmin(ctx, String(ctx.match ?? "").trim());
    if (!location) return;

    const feature = await createDebugCampfire(location.id);

    await logEvent("SYSTEM", "Debug campfire added", `${feature.key} at ${location.key}`, location.id);
    await ctx.reply(`🔥 Додано звичайне вогнище у місцині: ${location.name}.\nКлюч: ${feature.key}`);
  });

  bot.command("teleport", async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const raw = String(ctx.match ?? "").trim();
    const directLocation = raw ? await resolveLiteralLocation(raw) : null;
    const { playerArg, locationArg } = directLocation ? { playerArg: "", locationArg: raw } : splitTeleportArgs(raw);
    const player = await resolvePlayerForAdmin(ctx, playerArg);
    if (!player) return;
    const location = directLocation ?? await resolveLiteralLocation(locationArg);
    if (!location) {
      await ctx.reply("Не знайшов такої місцини. Формат: /teleport [#id|ім’я|username] <locationKey|x,y,z>. Для назв із пробілами можна: /teleport персонаж -> назва місцини.");
      return;
    }

    await prisma.player.updateMany({
      where: { id: player.id },
      data: {
        currentLocationId: location.id,
        isResting: false,
      },
    });
    await logEvent("SYSTEM", "Admin teleported player", `player=${player.id}; location=${location.key}`, location.id);
    await ctx.reply(`🧭 Перенесено ${playerDisplayName(player)} до місцини: ${location.name} (${location.key}).`);

    const telegramId = Number(player.telegramId);
    if (Number.isSafeInteger(telegramId)) {
      await bot.api.sendMessage(telegramId, `🧭 Вас перенесено до місцини: ${location.name}.`, {
        reply_markup: await buildMainReplyKeyboardForTelegramId(telegramId, Boolean(player.isAutoEnabled)),
      }).catch(() => undefined);
    }
  });

  bot.command(["tutorialReset", "tutorialreset"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const player = await resolvePlayerForAdmin(ctx, String(ctx.match ?? "").trim());
    if (!player) return;
    const scribe = await resolvePlayerForAdmin(ctx, "");
    const reset = await resetTutorialProgressForPlayer(player.id, scribe?.id);
    await logEvent("SYSTEM", "Admin reset tutorial progress", `player=${player.id}; scribe=${scribe?.id ?? "unknown"}`, player.currentLocationId ?? undefined);

    const telegramId = Number(player.telegramId);
    const targetKeyboard = Number.isSafeInteger(telegramId)
      ? await buildMainReplyKeyboardForTelegramId(telegramId, Boolean(player.isAutoEnabled))
      : undefined;
    const selfResetOptions = Number.isSafeInteger(telegramId) && telegramId === ctx.from?.id && targetKeyboard
      ? { reply_markup: targetKeyboard }
      : undefined;

    await ctx.reply(`🌙 Навчальний сон скинуто для ${playerDisplayName(player)}. ${reset.movedCurrent ? "Персонажа повернуто на початок сну." : "Наступний /sleep tutorial почнеться з початку."}`, selfResetOptions);

    if (Number.isSafeInteger(telegramId) && telegramId !== ctx.from?.id) {
      await bot.api.sendMessage(telegramId, reset.movedCurrent
        ? "🌙 Писар Порубіжжя повернув ваш навчальний сон до початку."
        : "🌙 Писар Порубіжжя повернув ваш навчальний сон до початку. Ви можете знову ввійти через /sleep tutorial.",
        targetKeyboard ? { reply_markup: targetKeyboard } : undefined
      ).catch(() => undefined);
    }
  });

  bot.command("addTorch", async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const player = await resolvePlayerForAdmin(ctx, String(ctx.match ?? "").trim());
    if (!player) return;
    const { torch } = await ensureTorchResourceTypes();
    await addInventoryResource(player.id, torch.id);
    await logEvent("SYSTEM", "Debug torch added to inventory", `player=${player.id}`);
    await ctx.reply(`🕯 Додано факел у речі: ${playerDisplayName(player)}.`);
  });

  bot.command("addTwigs", async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const player = await resolvePlayerForAdmin(ctx, String(ctx.match ?? "").trim());
    if (!player) return;
    const twigs = await ensureResourceType("twigs", "хмиз", "Сухі дрібні гілки для підкидання у вогнище.");
    await addInventoryResource(player.id, twigs.id);
    await logEvent("SYSTEM", "Debug twigs added to inventory", `player=${player.id}`);
    await ctx.reply(`🪵 Додано хмиз у речі: ${playerDisplayName(player)}.`);
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
    if (!(await requireScribeAdmin(ctx))) return;

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

    if (!(await requireScribeAdmin(ctx))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
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
