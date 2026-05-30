import { Bot, InlineKeyboard } from "grammy";
import { config } from "../config";
import { prisma } from "../db";
import { resetWorldState } from "../services/worldReset";
import {
  adminResetModeDescription,
  adminResetModeTitle,
  parseAdminResetMode,
  resetGameplayStatistics,
  type AdminResetMode,
  type ResetStatsSummary,
} from "../services/adminReset";
import { logEvent } from "../services/worldEvents";
import { logScribeAction } from "../services/scribeAudit";
import { createDebugCampfire, ensureTorchResourceTypes } from "../services/fire";
import { requireScribeAdmin } from "../services/adminAccess";
import { adminSecretMatches } from "../services/adminSecret";
import { syncChatBotCommandsForTelegramId } from "../services/telegramCommands";
import { buildAdminFireReplyKeyboard, buildAdminMenuReplyKeyboard, buildAdminResourcesReplyKeyboard, buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { nextResourceAmount, parseAddResourceArgs, parseAdminInventoryResourceArgs } from "../services/adminResources";
import { stopAllPlayerAuto } from "./auto";
import { resetTutorialProgressForPlayer } from "../services/tutorial";
import { getGateHuntingSaturationState, setCarcassQuestOverride, type CarcassQuestOverride } from "../services/carcassDropoff";

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

async function addLocationResource(locationId: number, resourceTypeId: number, amount = 1) {
  const existing = await prisma.resourceNode.findUnique({
    where: { locationId_resourceTypeId: { locationId, resourceTypeId } },
  });
  if (!existing) {
    return {
      before: 0,
      after: amount,
      node: await prisma.resourceNode.create({
        data: { locationId, resourceTypeId, amount, maxAmount: Math.max(1, amount) },
      }),
    };
  }

  const after = nextResourceAmount(existing.amount, existing.maxAmount, amount);
  return {
    before: existing.amount,
    after,
    node: await prisma.resourceNode.update({ where: { id: existing.id }, data: { amount: after } }),
  };
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
  "/adminMenu — кнопкове меню писарських команд",
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
  "/addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD] — додати тварин; понад 50 створюється батчами, разова межа 500",
  "/addCreatureHelp — список speciesKey для тварин",
  "/addResource <resourceKey> [locationKey|x,y,z] [amount] — відновити ресурс у місцині; без місцини бере поточну, без кількості додає 1",
  "/addResourceHelp — список ключів ресурсів; /addResourse теж працює як запасний варіант",
  "/addCampfire [locationKey|x,y,z|персонаж] — додати звичайне вогнище",
  "/addTorch [персонаж] [кількість] — додати факел у речі собі або вказаному персонажу; без кількості додає 1",
  "/addTwigs [персонаж] [кількість] — додати хмиз у речі собі або вказаному персонажу; без кількості додає 1",
  "/carcassQuest start — примусово відновити заклик біля падального рову й мисливський тиск",
  "/carcassQuest stop — примусово перевести падальний рів у стан «поки досить»",
  "",
  "Прибирання й тестові стани",
  "/forceOld [speciesKey] [count] — зробити кілька тварин похилими для тесту старіння",
  "/cleanupCreature [speciesKey] — видалити одну тварину в поточній місцині",
  "/cleanupCreatures — очистити всіх тварин і нормалізувати унікальних NPC",
  "",
  "Небезпечні світові важелі",
  "/reset — обрати режим скидання",
  "/reset world — скинути стан світу до стартового seed-стану без статистики персонажів",
  "/reset stats — скинути лічильники персонажів/NPC, внески до падального рову й службові події /stat",
  "/reset full — скинути світ і статистику разом",
  "/tick — вручну запустити world tick і показати підсумок",
  "/tickGet — показати tick-налаштування",
  "/tickSet <ms> — змінити інтервал tick",
  "",
  "Повний службовий список доступний тільки писарям Порубіжжя. Права писаря можна отримати через прихований локально налаштований секрет.",
].join("\n");

export function registerAdminHandlers(bot: Bot) {
  async function replyAdminMenu(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply("🛠 Адмін меню Писарів. Небезпечні дії лишаються за підтвердженням або з явним форматом команди.", {
      reply_markup: buildAdminMenuReplyKeyboard(),
    });
  }

  async function replyAdminResourcesMenu(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply([
      "🌿 Ресурси",
      "",
      "Швидкі кнопки додають 1 одиницю в поточній місцині Писаря.",
      "Для точного додавання: /addResource <resourceKey> [locationKey|x,y,z] [amount].",
    ].join("\n"), {
      reply_markup: buildAdminResourcesReplyKeyboard(),
    });
  }

  async function replyAdminFireMenu(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply([
      "🔥 Вогонь",
      "",
      "Без параметрів /addCampfire додає вогнище в поточній місцині Писаря.",
      "/addTorch і /addTwigs без параметрів додають 1 факел або 1 хмиз Писарю. Останнє число задає кількість: /addTorch #3 5, /addTwigs Вербові 10.",
    ].join("\n"), {
      reply_markup: buildAdminFireReplyKeyboard(),
    });
  }

  async function replyTeleportMenu(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply([
      "🧭 Телепорт",
      "",
      "Формат: /teleport [#id|ім’я|username] <locationKey|x,y,z>.",
      "Без персонажа переносить вас. Для назв із пробілами: /teleport персонаж -> назва місцини.",
      "",
      "Список місцин: /locationAll.",
    ].join("\n"), {
      reply_markup: buildAdminMenuReplyKeyboard(),
    });
  }

  async function replyAddResourceFormat(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply([
      "➕ Додати ресурс",
      "",
      "Формат: /addResource <resourceKey> [locationKey|x,y,z] [amount].",
      "Без місцини команда бере поточну місцину Писаря; без кількості додає 1.",
      "Ключі ресурсів: /addResourceHelp.",
    ].join("\n"), {
      reply_markup: buildAdminResourcesReplyKeyboard(),
    });
  }

  bot.command(["adminMenu", "adminmenu"], replyAdminMenu);
  bot.hears(["🛠 Адмін меню", "Адмін меню", "🛠 Адмін меню (/adminMenu)", "Адмін меню (/adminMenu)"], replyAdminMenu);
  bot.hears(["🌿 Ресурси"], replyAdminResourcesMenu);
  bot.hears(["🔥 Вогонь"], replyAdminFireMenu);
  bot.hears(["🧭 Телепорт (/teleport)", "Телепорт (/teleport)"], replyTeleportMenu);
  bot.hears(["➕ Додати ресурс (/addResource)", "Додати ресурс (/addResource)"], replyAddResourceFormat);
  bot.hears(["🦴 Падальний рів (/carcassQuest)", "Падальний рів (/carcassQuest)"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    const state = await getGateHuntingSaturationState();
    await ctx.reply([
      "🦴 Падальний рів",
      "",
      "/carcassQuest start — примусово відновити заклик до полювання.",
      "/carcassQuest stop — примусово поставити стан «поки досить».",
      "",
      carcassQuestStateLine(state),
    ].join("\n"), {
      reply_markup: buildAdminMenuReplyKeyboard(),
    });
  });

  function carcassQuestStateLine(state: Awaited<ReturnType<typeof getGateHuntingSaturationState>>) {
    return `Стан: ${state.active ? "припинено / поки досить" : "активно / заклик діє"}; override=${state.manualOverride ?? "auto"}; внесків=${state.contributionTotal}; здобичі поруч=${state.preyPressure}; вибитих рослинних місць=${state.depletedSignals}.`;
  }

  bot.command(["carcassQuest", "carcassquest"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const mode = String(ctx.match ?? "").trim().toLocaleLowerCase("uk-UA");
    if (mode !== "start" && mode !== "stop") {
      const state = await getGateHuntingSaturationState();
      await ctx.reply([
        "Формат: /carcassQuest start або /carcassQuest stop.",
        "",
        "/carcassQuest start — примусово відновлює заклик до полювання.",
        "/carcassQuest stop — примусово ставить стан «поки досить».",
        "",
        carcassQuestStateLine(state),
      ].join("\n"));
      return;
    }

    const override = mode as CarcassQuestOverride;
    const result = await setCarcassQuestOverride(override);
    const scribe = ctx.from?.id
      ? await prisma.player.findUnique({ where: { telegramId: String(ctx.from.id) } })
      : null;
    await logEvent("SYSTEM", "Admin changed carcass quest override", `mode=${override}; state=${result.state.active ? "stopped" : "active"}`, result.feature.locationId);
    await logScribeAction({
      actionKey: "carcassQuest",
      scribePlayerId: scribe?.id,
      scribeTelegramId: ctx.from?.id,
      scribeName: scribe ? playerDisplayName(scribe) : null,
      mode: override,
      outcome: "confirmed",
      details: `override=${override}; ${carcassQuestStateLine(result.state)}`,
      locationId: result.feature.locationId,
    });

    await ctx.reply([
      override === "start"
        ? "🦴 Падальний рів знову кличе до здобичі. Заклик до полювання примусово активний."
        : "🦴 Падальний рів переведено в стан «поки досить». Новий мисливський тиск примусово зупинено.",
      "",
      carcassQuestStateLine(result.state),
    ].join("\n"));
  });

  bot.command(["adminHelp", "adminhelp"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply(ADMIN_HELP_TEXT);
  });
  bot.hears(["🛠 Повна довідка (/adminHelp)", "Повна довідка (/adminHelp)"], async (ctx) => {
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
    await ctx.reply("Писарський доступ Порубіжжя надано. Тепер доступні /adminMenu і /adminHelp.");
  });

  async function runAddCampfireCommand(ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;

    const location = await resolveLocationForAdmin(ctx, rawTarget);
    if (!location) return;

    const feature = await createDebugCampfire(location.id);

    await logEvent("SYSTEM", "Debug campfire added", `${feature.key} at ${location.key}`, location.id);
    await ctx.reply(`🔥 Додано звичайне вогнище у місцині: ${location.name}.\nКлюч: ${feature.key}`);
  }

  bot.command("addCampfire", (ctx) => runAddCampfireCommand(ctx));
  bot.hears(["🔥 Додати вогнище (/addCampfire)", "Додати вогнище (/addCampfire)"], (ctx) => runAddCampfireCommand(ctx, ""));

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

  async function runAddTorchCommand(ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;

    const parsed = parseAdminInventoryResourceArgs(rawTarget);
    const player = await resolvePlayerForAdmin(ctx, parsed.playerArg);
    if (!player) return;
    const { torch } = await ensureTorchResourceTypes();
    await addInventoryResource(player.id, torch.id, parsed.amount);
    await logEvent("SYSTEM", "Debug torch added to inventory", `player=${player.id}; amount=${parsed.amount}`);
    await ctx.reply(`🕯 Додано факел у речі: ${playerDisplayName(player)} ×${parsed.amount}.`);
  }

  bot.command("addTorch", (ctx) => runAddTorchCommand(ctx));
  bot.hears(["🕯 Додати факел (/addTorch)", "Додати факел (/addTorch)"], (ctx) => runAddTorchCommand(ctx, ""));

  async function runAddTwigsCommand(ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;

    const parsed = parseAdminInventoryResourceArgs(rawTarget);
    const player = await resolvePlayerForAdmin(ctx, parsed.playerArg);
    if (!player) return;
    const twigs = await ensureResourceType("twigs", "хмиз", "Сухі дрібні гілки для підкидання у вогнище.");
    await addInventoryResource(player.id, twigs.id, parsed.amount);
    await logEvent("SYSTEM", "Debug twigs added to inventory", `player=${player.id}; amount=${parsed.amount}`);
    await ctx.reply(`🪵 Додано хмиз у речі: ${playerDisplayName(player)} ×${parsed.amount}.`);
  }

  bot.command("addTwigs", (ctx) => runAddTwigsCommand(ctx));
  bot.hears(["🪵 Додати хмиз (/addTwigs)", "Додати хмиз (/addTwigs)"], (ctx) => runAddTwigsCommand(ctx, ""));

  async function replyAddResourceHelp(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;

    const resources = await prisma.resourceType.findMany({ orderBy: { key: "asc" } });
    const lines = [
      "🌿 Ключі ресурсів для /addResource",
      "",
      "Формат: /addResource <resourceKey> [locationKey|x,y,z] [amount]",
      "Без місцини команда бере вашу поточну місцину. Без кількості додає 1.",
      "",
      ...resources.map((resource) => `- ${resource.key} — ${resource.name}`),
    ];
    await ctx.reply(lines.join("\n"));
  }

  async function runAddResourceCommand(ctx: any, defaultResourceKey = "", rawArgs = String(ctx.match ?? "")) {
    if (!(await requireScribeAdmin(ctx))) return;

    const parsed = parseAddResourceArgs(rawArgs, defaultResourceKey);
    if (!parsed.resourceKey) {
      await ctx.reply("Вкажи ключ ресурсу. Список: /addResourceHelp.");
      return;
    }

    const resourceType = await prisma.resourceType.findUnique({ where: { key: parsed.resourceKey } });
    if (!resourceType) {
      await ctx.reply(`Невідомий ресурс: ${parsed.resourceKey}. Список ключів: /addResourceHelp.`);
      return;
    }

    const location = await resolveLocationForAdmin(ctx, parsed.locationArg);
    if (!location) return;

    const result = await addLocationResource(location.id, resourceType.id, parsed.amount);
    const scribe = ctx.from?.id
      ? await prisma.player.findUnique({ where: { telegramId: String(ctx.from.id) } })
      : null;
    await logEvent("SYSTEM", "Admin resource added", `resource=${resourceType.key}; amount=${parsed.amount}; location=${location.key}; before=${result.before}; after=${result.after}`, location.id);
    await logScribeAction({
      actionKey: "addResource",
      scribePlayerId: scribe?.id,
      scribeTelegramId: ctx.from?.id,
      scribeName: scribe ? playerDisplayName(scribe) : null,
      target: location.key,
      outcome: "confirmed",
      details: `resource=${resourceType.key}; requested=${parsed.amount}; before=${result.before}; after=${result.after}`,
      locationId: location.id,
    });

    const capped = result.after < result.before + parsed.amount ? " Ліміт вузла вже близько, тож зайве не перелито." : "";
    await ctx.reply(`🌿 Додано ресурс «${resourceType.name}» у місцині ${location.name}: ${result.before} → ${result.after}.${capped}`);
  }

  bot.command(["addResourceHelp", "addresourcehelp", "addResourseHelp", "addresoursehelp"], replyAddResourceHelp);
  bot.hears(["🌿 Ключі ресурсів (/addResourceHelp)", "Ключі ресурсів (/addResourceHelp)"], replyAddResourceHelp);
  bot.command(["addResource", "addresource", "addResourse", "addresourse"], (ctx) => runAddResourceCommand(ctx));
  bot.command(["restoreBerries", "restoreberries"], (ctx) => runAddResourceCommand(ctx, "berries"));
  bot.command(["restoreHerbs", "restoreherbs"], (ctx) => runAddResourceCommand(ctx, "herbs"));
  bot.command(["restoreMushrooms", "restoremushrooms"], (ctx) => runAddResourceCommand(ctx, "mushrooms"));
  bot.hears(["🍓 Додати ягоди (/restoreBerries)", "Додати ягоди (/restoreBerries)"], (ctx) => runAddResourceCommand(ctx, "berries", ""));
  bot.hears(["🌱 Додати трави (/restoreHerbs)", "Додати трави (/restoreHerbs)"], (ctx) => runAddResourceCommand(ctx, "herbs", ""));
  bot.hears(["🍄 Додати гриби (/restoreMushrooms)", "Додати гриби (/restoreMushrooms)"], (ctx) => runAddResourceCommand(ctx, "mushrooms", ""));

  function resetModePromptText() {
    return [
      "⚠️ /reset тепер просить обрати, що саме скинути.",
      "",
      "/reset world — світ до стартового seed-стану, без очищення статистики персонажів.",
      "/reset stats — тільки лічильники персонажів/NPC, внески до падального рову й службові події /stat.",
      "/reset full — світ і статистику разом.",
    ].join("\n");
  }

  function resetModeKeyboard(userId: number) {
    return new InlineKeyboard()
      .text("Світ", `reset:choose:world:${userId}`)
      .text("Статистика", `reset:choose:stats:${userId}`)
      .text("Повний reset", `reset:choose:full:${userId}`);
  }

  function resetConfirmationText(mode: AdminResetMode) {
    return [
      `⚠️ /reset ${mode} скине ${adminResetModeTitle(mode)}.`,
      "",
      adminResetModeDescription(mode),
      "",
      "Підтвердити?",
    ].join("\n");
  }

  function resetConfirmationKeyboard(mode: AdminResetMode, userId: number) {
    return new InlineKeyboard()
      .text("✅ Так, скинути", `reset:confirm:${mode}:${userId}`)
      .text("↩️ Скасувати", `reset:cancel:${mode}:${userId}`);
  }

  function statsSummaryLines(summary: ResetStatsSummary) {
    return [
      `Статистику персонажів очищено: ${summary.resetPlayers}`,
      `Статистику NPC/істот очищено: ${summary.resetCreatures}`,
      `Записів падального рову прибрано: ${summary.removedDropoffContributions}`,
      `Службових подій /stat прибрано: ${summary.removedWorldStatEvents}`,
    ];
  }

  async function runReset(ctx: any, mode: AdminResetMode) {
    const lines: string[] = [];
    const scribeTelegramId = ctx.from?.id;
    const scribe = scribeTelegramId
      ? await prisma.player.findUnique({ where: { telegramId: String(scribeTelegramId) } })
      : null;
    const scribeName = scribe
      ? playerDisplayName(scribe)
      : scribeTelegramId ? `писар #${scribeTelegramId}` : "писар Порубіжжя";
    let resetWorldSummary: Awaited<ReturnType<typeof resetWorldState>> | null = null;
    let resetStatsSummary: Awaited<ReturnType<typeof resetGameplayStatistics>> | null = null;
    let autoStopped = 0;

    if (mode === "world" || mode === "full") {
      autoStopped = await stopAllPlayerAuto();
      const summary = await resetWorldState();
      resetWorldSummary = summary;
      lines.push(
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
        ...summary.uniqueCreatureSummaries.map((item) => `- ${item}`)
      );
    }

    if (mode === "stats" || mode === "full") {
      const stats = await resetGameplayStatistics();
      resetStatsSummary = stats;
      if (lines.length > 0) lines.push("");
      lines.push(mode === "stats" ? "✅ Статистику скинуто." : "✅ Статистику теж скинуто.", "", ...statsSummaryLines(stats));
    }

    await logScribeAction({
      actionKey: "reset",
      scribePlayerId: scribe?.id,
      scribeTelegramId,
      scribeName,
      mode,
      outcome: "confirmed",
      details: [
        resetWorldSummary ? `seed=${resetWorldSummary.version}` : null,
        resetWorldSummary ? `resources=${resetWorldSummary.resetResources}` : null,
        resetWorldSummary ? `uniqueCreatures=${resetWorldSummary.resetUniqueCreatures}` : null,
        resetWorldSummary ? `predators=${resetWorldSummary.predatorsCreated}` : null,
        resetWorldSummary ? `autoStopped=${autoStopped}` : null,
        resetStatsSummary ? `players=${resetStatsSummary.resetPlayers}` : null,
        resetStatsSummary ? `creatures=${resetStatsSummary.resetCreatures}` : null,
        resetStatsSummary ? `dropoffContributions=${resetStatsSummary.removedDropoffContributions}` : null,
        resetStatsSummary ? `statEvents=${resetStatsSummary.removedWorldStatEvents}` : null,
      ].filter(Boolean).join("; "),
      locationId: scribe?.currentLocationId,
    });

    await ctx.reply(lines.join("\n"));
  }

  bot.command("reset", async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const userId = ctx.from?.id;
    if (!userId) return;
    const mode = parseAdminResetMode(String(ctx.match ?? ""));

    if (!mode) {
      await ctx.reply(resetModePromptText(), { reply_markup: resetModeKeyboard(userId) });
      return;
    }

    await ctx.reply(resetConfirmationText(mode), { reply_markup: resetConfirmationKeyboard(mode, userId) });
  });

  bot.callbackQuery(/^reset:(choose|confirm|cancel):(world|stats|full):(\d+)$/, async (ctx) => {
    const action = ctx.match[1];
    const mode = ctx.match[2] as AdminResetMode;
    const requestedBy = Number(ctx.match[3]);

    if (ctx.from.id !== requestedBy) {
      await ctx.answerCallbackQuery({ text: "Це підтвердження не для тебе.", show_alert: true });
      return;
    }

    if (!(await requireScribeAdmin(ctx))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();

    if (action === "choose") {
      await ctx.editMessageText(resetConfirmationText(mode), { reply_markup: resetConfirmationKeyboard(mode, requestedBy) });
      return;
    }

    if (action === "cancel") {
      await ctx.editMessageText("↩️ Reset скасовано.");
      return;
    }

    await ctx.editMessageText(`⏳ Reset підтверджено. Скидаю ${adminResetModeTitle(mode)}...`);
    await runReset(ctx, mode);
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

    await ctx.editMessageText("⏳ Старе підтвердження /reset прийнято. Скидаю світ...");
    await runReset(ctx, "world");
  });
}
