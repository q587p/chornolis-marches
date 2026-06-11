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
import { createAdminHandmadeCampfire, createDebugCampfire, deleteAdminCampfiresAtLocation, ensureTorchResourceTypes } from "../services/fire";
import { requireScribeAdmin } from "../services/adminAccess";
import { adminSecretMatches } from "../services/adminSecret";
import { syncChatBotCommandsForTelegramId } from "../services/telegramCommands";
import { buildAdminCreaturesReplyKeyboard, buildAdminFireReplyKeyboard, buildAdminItemsReplyKeyboard, buildAdminMenuReplyKeyboard, buildAdminResourcesReplyKeyboard, buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import {
  DEFAULT_ADMIN_GRASS_MAX_AMOUNT,
  grassRecoveryThreshold,
  nextGrassRestoreAmount,
  nextResourceAmount,
  parseAddResourceArgs,
  parseAdminInventoryItemArgs,
  parseAdminInventoryResourceArgs,
  parseRestoreGrassArgs,
} from "../services/adminResources";
import { stopAllPlayerAuto } from "./auto";
import { resetTutorialProgressForPlayer } from "../services/tutorial";
import { getGateHuntingSaturationState, setCarcassQuestOverride, type CarcassQuestOverride } from "../services/carcassDropoff";
import { recordCarcassQuestChronicle } from "../services/chronicles";
import { slashlessCommandPattern } from "../utils/slashlessCommands";
import { worldTimeSnapshotFromAbsoluteMinute } from "../data/worldClock";
import { lightSnapshotForLocation } from "../services/lightSnapshot";
import { getCurrentWorldState, setWorldClockAbsoluteMinute, setWorldWeatherState } from "../services/worldTime";
import { parseWeatherSetTarget, parseWorldTimeSetTarget, renderWorldTimeDebug } from "../services/worldTimeDebug";
import { COOKED_MEAT_KEY, ensureMeatResourceTypes, RAW_MEAT_KEY } from "../services/meat";
import { WEAPON_DEFINITIONS, isWeaponResourceKey } from "../services/weapons";
import { BEESWAX_RESOURCE_KEY, HONEY_RESOURCE_KEY } from "../services/apiaryHazards";
import { parseTeleportCoordinateCommand } from "../services/adminTeleportLinks";
import { approveScribeReturnRequest, buildScribeReturnAuditText } from "../services/scribeReturnHelp";
import { nudgeActionQueueLoop } from "../services/actionQueue";
import { buildActionQueueDebugReport } from "../services/actionQueueDiagnostics";
import { escapeHtml } from "../utils/text";
import { formatLearningLevelChart, formatLearningTechnicalRows, learningRowsForActor, observedCreatureDefaultLearningRows } from "../services/learning";
import {
  formatLearningCreatureDisambiguation,
  learningCreatureDisplayName,
  parseLearningCreatureTarget,
  resolveLearningCreatureCandidates,
} from "../services/adminLearningLookup";
import { withSlowLog } from "../utils/slowLog";

function normalizeLookup(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function playerDisplayName(player: { nameNominative?: string | null; firstName?: string | null; username?: string | null; id: number }) {
  return player.nameNominative ?? player.firstName ?? player.username ?? `#${player.id}`;
}

export function tutorialResetScribeReplyText(playerName: string, movedCurrent: boolean) {
  const resetNote = movedCurrent
    ? "Персонажа повернуто на початок сну."
    : "Наступний <i>навчальний сон</i> (/sleep_tutorial) почнеться з початку.";
  return `🌙 Навчальний сон скинуто для ${escapeHtml(playerName)}. ${resetNote}`;
}

export function tutorialResetPlayerNoticeText(movedCurrent: boolean) {
  return movedCurrent
    ? "🌙 Писар Порубіжжя повернув ваш навчальний сон до початку."
    : "🌙 Писар Порубіжжя повернув ваш навчальний сон до початку. Ви можете знову ввійти через <i>навчальний сон</i> (/sleep_tutorial).";
}

async function resolvePlayerForAdmin(ctx: any, rawTarget: string, options: { notFoundReply?: boolean } = {}) {
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

  if (options.notFoundReply !== false) await ctx.reply("Не знайшов такого персонажа.");
  return null;
}

async function resolveCreatureForLearning(ctx: any, rawTarget: string) {
  const parsed = parseLearningCreatureTarget(rawTarget);
  if (!parsed.query) return null;

  const numeric = parsed.query.match(/^#?(\d+)$/u);
  if (numeric) {
    const creatureId = Number(numeric[1]);
    const creature = Number.isSafeInteger(creatureId)
      ? await prisma.creature.findUnique({ where: { id: creatureId }, include: { species: true, location: true } })
      : null;
    if (!creature) await ctx.reply("Не знайшов такої істоти.");
    return creature;
  }

  const creatures = await prisma.creature.findMany({
    include: { species: true, location: true },
    orderBy: { id: "asc" },
    take: 500,
  });
  const result = resolveLearningCreatureCandidates(creatures, parsed.query);
  if (result.kind === "single") return result.creature as typeof creatures[number];
  if (result.kind === "ambiguous") {
    await ctx.reply(formatLearningCreatureDisambiguation(result.creatures));
    return null;
  }
  await ctx.reply(parsed.forcedCreature ? "Не знайшов такої істоти." : "Не знайшов такого персонажа або істоти.");
  return null;
}

async function ensureResourceType(key: string, name: string, description: string) {
  return prisma.resourceType.upsert({
    where: { key },
    update: { name, description },
    create: { key, name, description },
  });
}

async function ensureAdminInventoryResourceType(key: string) {
  if (key === RAW_MEAT_KEY || key === COOKED_MEAT_KEY) {
    const meat = await ensureMeatResourceTypes();
    return key === RAW_MEAT_KEY ? meat.rawMeat : meat.cookedMeat;
  }

  if (key === HONEY_RESOURCE_KEY) {
    return ensureResourceType(
      HONEY_RESOURCE_KEY,
      "мед",
      "Густий дикий мед із борті: їжа, ліки, приманка і майбутній торговий товар.",
    );
  }

  if (key === BEESWAX_RESOURCE_KEY) {
    return ensureResourceType(
      BEESWAX_RESOURCE_KEY,
      "віск",
      "Жовтий віск із борті: матеріал для свічок, герметизації, обрядів і кращого світла.",
    );
  }

  if (isWeaponResourceKey(key)) {
    const weapon = WEAPON_DEFINITIONS[key];
    return ensureResourceType(key, weapon.name, weapon.description);
  }

  const torches = await ensureTorchResourceTypes();
  if (key === "torch") return torches.torch;
  if (key === "lit_torch") return torches.litTorch;
  if (key === "doused_torch") return torches.dousedTorch;
  if (key === "twigs") return torches.twigs;

  return prisma.resourceType.findUnique({ where: { key } });
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

async function restoreLocationGrass(locationId: number, amount: number | "full") {
  const resourceType = await ensureResourceType(
    "grass",
    "трава",
    "Трава, кущики й низька зелень місцини: пожива для дрібних тварин і знак, що земля ще тримається.",
  );
  const existing = await prisma.resourceNode.findUnique({
    where: { locationId_resourceTypeId: { locationId, resourceTypeId: resourceType.id } },
  });
  const maxAmount = existing?.maxAmount ?? (amount === "full" ? DEFAULT_ADMIN_GRASS_MAX_AMOUNT : Math.max(DEFAULT_ADMIN_GRASS_MAX_AMOUNT, amount));
  const before = existing?.amount ?? 0;
  const after = nextGrassRestoreAmount(before, maxAmount, amount);
  const node = existing
    ? await prisma.resourceNode.update({ where: { id: existing.id }, data: { amount: after, maxAmount } })
    : await prisma.resourceNode.create({
      data: { locationId, resourceTypeId: resourceType.id, amount: after, maxAmount },
    });
  const threshold = grassRecoveryThreshold(maxAmount);
  const cleared = after >= threshold
    ? await prisma.locationFeature.updateMany({
      where: {
        locationId,
        isActive: true,
        key: { startsWith: DEPLETED_VEGETATION_FEATURE_PREFIX },
      },
      data: { isActive: false },
    })
    : { count: 0 };

  return {
    before,
    after,
    maxAmount,
    threshold,
    clearedFeatures: cleared.count,
    node,
    resourceType,
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

const ADMIN_MENU_TEXT_COMMAND = slashlessCommandPattern(["adminMenu", "adminmenu"]);
const ADMIN_HELP_TEXT_COMMAND = slashlessCommandPattern(["adminHelp", "adminhelp"]);
const ADMIN_SET_TEXT_COMMAND = slashlessCommandPattern(["adminSet", "adminset"]);
const ADD_CAMPFIRE_TEXT_COMMAND = slashlessCommandPattern(["addCampfire", "addcampfire"]);
const DELETE_CAMPFIRE_TEXT_COMMAND = slashlessCommandPattern(["deleteCampfire", "deletecampfire", "removeCampfire", "removecampfire"]);
const TELEPORT_TEXT_COMMAND = slashlessCommandPattern(["teleport", "tp"]);
const TELEPORT_COORDINATE_TEXT_COMMAND = /^\/?tp_(_?\d+)_(_?\d+)_(_?\d+)(?:@\w+)?$/i;
const TUTORIAL_RESET_TEXT_COMMAND = slashlessCommandPattern(["tutorialReset", "tutorialreset"]);
const RESET_TEXT_COMMAND = slashlessCommandPattern(["reset"]);
const ADD_TORCH_TEXT_COMMAND = slashlessCommandPattern(["addTorch", "addtorch"]);
const ADD_LIT_TORCH_TEXT_COMMAND = slashlessCommandPattern(["addLitTorch", "addlittorch"]);
const ADD_TWIGS_TEXT_COMMAND = slashlessCommandPattern(["addTwigs", "addtwigs"]);
const ADD_ITEM_TEXT_COMMAND = slashlessCommandPattern(["addItem", "additem"]);
const ADD_RESOURCE_HELP_TEXT_COMMAND = slashlessCommandPattern(["addResourceHelp", "addresourcehelp", "addResourseHelp", "addresoursehelp"]);
const ADD_RESOURCE_TEXT_COMMAND = slashlessCommandPattern(["addResource", "addresource", "addResourse", "addresourse"]);
const RESTORE_BERRIES_TEXT_COMMAND = slashlessCommandPattern(["restoreBerries", "restoreberries"]);
const RESTORE_HERBS_TEXT_COMMAND = slashlessCommandPattern(["restoreHerbs", "restoreherbs"]);
const RESTORE_MUSHROOMS_TEXT_COMMAND = slashlessCommandPattern(["restoreMushrooms", "restoremushrooms"]);
const RESTORE_GRASS_TEXT_COMMAND = slashlessCommandPattern(["restoreGrass", "restoregrass"]);
const CARCASS_QUEST_TEXT_COMMAND = slashlessCommandPattern(["carcassQuest", "carcassquest"]);
const TIME_DEBUG_TEXT_COMMAND = slashlessCommandPattern(["timeDebug", "timedebug"]);
const TIME_SET_TEXT_COMMAND = slashlessCommandPattern(["timeSet", "timeset"]);
const WEATHER_SET_TEXT_COMMAND = slashlessCommandPattern(["weatherSet", "weatherset"]);
const LEARNING_TEXT_COMMAND = slashlessCommandPattern(["learning", "learn", "навчання", "прогрес"]);
const LEARNING_CHART_TEXT_COMMAND = slashlessCommandPattern(["learning_chart", "learningChart", "learningchart", "learning chart", "learning levels", "шкала навчання", "рівні навчання"]);
const QUEUE_DEBUG_TEXT_COMMAND = slashlessCommandPattern(["queueDebug", "queuedebug"]);
const QUEUE_NUDGE_TEXT_COMMAND = slashlessCommandPattern(["queueNudge", "queuenudge"]);
const CALL_SCRIBES_AUDIT_TEXT_COMMAND = slashlessCommandPattern(["call_scribes_audit", "callScribesAudit", "callscribesaudit"]);
const CALL_SCRIBES_APPROVE_TEXT_COMMAND = slashlessCommandPattern(["call_scribes_approve", "callScribesApprove", "callscribesapprove"]);
const CALL_SCRIBES_APPROVE_SHORT_COMMAND = /^\/?call_scribes_approve_(\d+)(?:@\w+)?$/i;
const DEPLETED_VEGETATION_FEATURE_PREFIX = "depleted_vegetation_";

export const ADMIN_HELP_TEXT = [
  "🛠 Команди писарів Порубіжжя",
  "",
  "Звичайні ігрові команди дивіться в /help. Тут лишено службові й небезпечні інструменти.",
  "Писарські slash-команди можна писати й без початкового `/`: наприклад `teleport forest_07_00` працює як `/teleport forest_07_00`, а `tp 0,9,-13` як `/tp 0,9,-13`.",
  "",
  "Огляди й службові сторінки",
  "/adminMenu — кнопкове меню писарських команд",
  "/adminHelp — ця підказка",
  "/world — стан світу й останні події",
  "/chronicles_real — хроніки з реальними Europe/Kyiv датами й годинами для службової перевірки",
  "/chronicles_backfill_players — додати пропущені хроніки появи персонажів із Player.createdAt без дублів",
  "/stat — службова статистика й посилання на захищену веб-/stat",
  "/stat_species — короткий видовий зріз тварин: живі, вік CHILD/YOUNG/ADULT/OLD і трупи",
  "/queueDebug — службовий зріз черги дій: runtime pass, backpressure істот, фази, completion і Telegram send samples, queued/running/overdue за акторами",
  "/queueNudge — безпечно попросити службову чергу зробити один прохід без нового interval і без overlap",
  "/all — усі живі персонажі та істоти",
  "/all dead — усі записи істот, включно з inactive/dead/corpse/gone",
  "/all player або /all players — тільки гравці",
  "/all npc або /all NPC — тільки NPC / не-тварини",
  "/all animal або /all animals [speciesKey] — тільки тварини, за потреби одного виду: /all animal mouse або /all mouse",
  "/locationAll — список усіх місцин і ключів",
  "/playerAdmin <#id|ім’я|username> — детальна службова картка гравця",
  "/learning [#id|ім’я|username|creature #id|creature ім’я] — технічний зріз stored learning progress персонажа або істоти",
  "/learning_chart — службова шкала рівнів learning progress: thresholds, technical labels і якісні українські назви",
  "/call_scribes_audit — останні звернення до Писарів про ручне повернення",
  "/call_scribes_approve <eventId> або /call_scribes_approve_123 — застосувати знак Писаря до конкретного звернення",
  "/timeDebug — точний службовий стан часу, місяця, погоди й світла в поточній місцині",
  "/timeSet <dawn|day|dusk|night|fullmoon night|darkmoon night|HH:MM> — виставити внутрішній час Чорнолісу для тестів",
  "/weatherSet <clear|cloudy|mist|rain|storm> [intensity] [minutes] — виставити погоду для тестів видимості",
  "",
  "Журнали й репліки",
  "/chat time [hours|all] — репліки гравців і NPC за часом",
  "/chat location [hours|all] — репліки, впорядковані за місциною",
  "/chat character [hours|all] — репліки, впорядковані за мовцем/персонажем",
  "",
  "Персонажі й доступ",
  "/tutorialReset [#id|ім’я|username] — скинути прогрес навчального сну",
  "/teleport [#id|ім’я|username] <locationKey|x,y,z> — перенести персонажа; без персонажа переносить вас",
  "/tp <locationKey|x,y,z> або /tp_0_9__13 — короткий телепорт поточного Писаря; подвійне підкреслення у списку місцин означає від’ємну координату",
  "/debugGet — показати, чи ввімкнені технічні деталі для вашого персонажа",
  "/debugSet <0|1> — вимкнути або ввімкнути технічні деталі; true/false теж працюють",
  "/restAdmin [#id|ім’я|username] — одразу відновити снагу собі або вказаному персонажу до адмінського максимуму",
  "",
  "Додавання у світ",
  "/addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD] — додати тварин; понад 50 створюється батчами, разова межа 500",
  "/addCreatureCorpse <speciesKey> [locationKey|x,y,z] [count] [YOUNG|ADULT|OLD] [fresh|decaying|old] — додати трупи тварин; без місцини бере поточну, понад 50 створюється батчами, разова межа 500",
  "/addCreatureHelp — список speciesKey для тварин",
  "/addResource <resourceKey> [locationKey|x,y,z] [amount] — відновити ресурс у місцині; без місцини бере поточну, без кількості додає 1",
  "/addResourceHelp — список ключів ресурсів; /addResourse теж працює як запасний варіант",
  "/restoreGrass [locationKey|x,y,z] [amount|full] — відновити траву в поточній або вказаній місцині; full знімає активну «Винищену траву», якщо трава дійшла до порога",
  "/addCampfire [locationKey|x,y,z|персонаж] [debug] — додати й одразу підпалити рукотворне вогнище; debug створює старий службовий варіант",
  "/deleteCampfire [locationKey|x,y,z|персонаж] — прибрати немагічні вогнища в поточній або вказаній місцині; незгасне/магічне не чіпає",
  "/addTorch [персонаж] [кількість] — додати факел у речі собі або вказаному персонажу; без кількості додає 1",
  "/addLitTorch [персонаж] [кількість] — додати запалений факел у речі собі або вказаному персонажу; без кількості додає 1",
  "/addTwigs [персонаж] [кількість] — додати хмиз у речі собі або вказаному персонажу; без кількості додає 1",
  "/addItem <resourceKey> [персонаж] [кількість] — додати будь-який відомий resourceKey у речі собі або вказаному персонажу; без кількості додає 1; для пляшечок використовуйте empty_bottle, для настоянки — herbal_tincture",
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

const ADMIN_HELP_SECTION_DEFINITIONS = [
  { key: "overview", label: "🧭 Огляди", title: "Огляди й службові сторінки" },
  { key: "chat", label: "🗒 Журнали", title: "Журнали й репліки" },
  { key: "players", label: "👥 Персонажі", title: "Персонажі й доступ" },
  { key: "world_add", label: "➕ Додати у світ", title: "Додавання у світ" },
  { key: "cleanup", label: "🧹 Прибирання", title: "Прибирання й тестові стани" },
  { key: "danger", label: "⚠️ Важелі", title: "Небезпечні світові важелі" },
] as const;

export const ADMIN_HELP_SECTIONS = (() => {
  const lines = ADMIN_HELP_TEXT.split("\n");
  return ADMIN_HELP_SECTION_DEFINITIONS.map((definition, index) => {
    const start = lines.indexOf(definition.title);
    const nextTitle = ADMIN_HELP_SECTION_DEFINITIONS[index + 1]?.title;
    const end = nextTitle ? lines.indexOf(nextTitle) : lines.length;
    const sectionLines = start >= 0 ? lines.slice(start, end >= 0 ? end : lines.length) : [definition.title];
    return {
      ...definition,
      text: sectionLines.join("\n").trim(),
    };
  });
})();

export const ADMIN_HELP_INDEX_TEXT = [
  "🛠 Довідка Писарів Порубіжжя",
  "",
  "Звичайні ігрові команди дивіться в /help. Тут лишено службові й небезпечні інструменти.",
  "Писарські slash-команди можна писати й без початкового `/`: наприклад `teleport forest_07_00` працює як `/teleport forest_07_00`.",
  "",
  "Оберіть розділ нижче. Так довідка не губиться в одному надто довгому сувої.",
].join("\n");

function adminHelpIndexKeyboard() {
  const keyboard = new InlineKeyboard();
  for (const section of ADMIN_HELP_SECTIONS) {
    keyboard.text(section.label, `adminHelp:${section.key}`).row();
  }
  return keyboard;
}

function adminHelpSectionKeyboard() {
  return new InlineKeyboard().text("🛠 До розділів", "adminHelp:index");
}

async function replyAdminHelpIndex(ctx: any) {
  await ctx.reply(ADMIN_HELP_INDEX_TEXT, {
    reply_markup: adminHelpIndexKeyboard(),
  });
}

async function replyAdminHelpSection(ctx: any, sectionKey: string) {
  const section = ADMIN_HELP_SECTIONS.find((candidate) => candidate.key === sectionKey);
  if (!section) {
    await replyAdminHelpIndex(ctx);
    return;
  }
  await ctx.reply(section.text, {
    reply_markup: adminHelpSectionKeyboard(),
  });
}

export function registerAdminHandlers(bot: Bot) {
  async function replyAdminMenu(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply("🛠 Адмін меню Писарів. Небезпечні дії лишаються за підтвердженням або з явним форматом команди.", {
      reply_markup: buildAdminMenuReplyKeyboard(),
    });
  }

  async function replyTimeDebug(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;

    const state = await getCurrentWorldState(prisma);
    const snapshot = worldTimeSnapshotFromAbsoluteMinute(state.absoluteMinute, state.weatherKey, state.weatherIntensity);
    const scribe = await resolvePlayerForAdmin(ctx, "");
    const light = scribe?.currentLocationId ? await lightSnapshotForLocation(scribe.currentLocationId, snapshot) : undefined;
    await ctx.reply(renderWorldTimeDebug(snapshot, state, light), {
      reply_markup: buildAdminMenuReplyKeyboard(),
    });
  }

  async function runTimeSetCommand(ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;

    const state = await getCurrentWorldState(prisma);
    const target = parseWorldTimeSetTarget(rawTarget, state.absoluteMinute);
    if (!target) {
      await ctx.reply("Формат: /timeSet dawn|day|dusk|night|fullmoon night|darkmoon night|HH:MM або /timeSet abs <absoluteMinute>.");
      return;
    }

    const updated = await setWorldClockAbsoluteMinute(target.absoluteMinute, prisma);
    const scribe = await resolvePlayerForAdmin(ctx, "");
    await logScribeAction({
      actionKey: "timeSet",
      scribePlayerId: scribe?.id,
      scribeTelegramId: ctx.from?.id,
      scribeName: scribe ? playerDisplayName(scribe) : null,
      target: target.label,
      outcome: "confirmed",
      details: `before=${state.absoluteMinute}; after=${updated.absoluteMinute}`,
      locationId: scribe?.currentLocationId,
    });

    const snapshot = worldTimeSnapshotFromAbsoluteMinute(updated.absoluteMinute, updated.weatherKey, updated.weatherIntensity);
    await ctx.reply(`🌒 Час світу виставлено: ${target.label} → ${snapshot.clockLabel}, ${snapshot.daypartLabel}, день ${snapshot.dayOfCircle}.`);
  }

  async function runWeatherSetCommand(ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;

    const target = parseWeatherSetTarget(rawTarget);
    if (!target) {
      await ctx.reply("Формат: /weatherSet clear|cloudy|mist|rain|storm [intensity] [minutes].");
      return;
    }

    const before = await getCurrentWorldState(prisma);
    const updated = await setWorldWeatherState(target.key, {
      intensity: target.intensity,
      durationMinutes: target.durationMinutes,
    }, prisma);
    const scribe = await resolvePlayerForAdmin(ctx, "");
    await logScribeAction({
      actionKey: "weatherSet",
      scribePlayerId: scribe?.id,
      scribeTelegramId: ctx.from?.id,
      scribeName: scribe ? playerDisplayName(scribe) : null,
      target: target.key,
      outcome: "confirmed",
      details: `before=${before.weatherKey}/${before.weatherIntensity}; after=${updated.weatherKey}/${updated.weatherIntensity}; endsAt=${updated.weatherEndsAtMinute ?? "unset"}`,
      locationId: scribe?.currentLocationId,
    });

    const snapshot = worldTimeSnapshotFromAbsoluteMinute(updated.absoluteMinute, updated.weatherKey, updated.weatherIntensity);
    await ctx.reply(`🌦 Погоду виставлено: ${snapshot.weatherKey}; ${snapshot.weatherIntensity}.`);
  }

  async function runLearningCommand(ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
    return withSlowLog("admin.learning", async () => {
      if (!(await requireScribeAdmin(ctx))) return;

      const creatureTarget = parseLearningCreatureTarget(rawTarget);
      if (!creatureTarget.forcedCreature) {
        const player = await resolvePlayerForAdmin(ctx, rawTarget, { notFoundReply: !rawTarget.trim() });
        if (player) {
          const rows = await learningRowsForActor({ actorType: "PLAYER", playerId: player.id });
          const lines = [`📚 Learning progress: ${playerDisplayName(player)} (#${player.id})`, ""];
          lines.push(...formatLearningTechnicalRows({ actorType: "PLAYER", playerId: player.id }, rows));
          if (rows.length >= 50) lines.push("", "Showing first 50 rows.");
          await ctx.reply(lines.join("\n"), { reply_markup: buildAdminMenuReplyKeyboard() });
          return;
        }
      }

      const creature = rawTarget.trim() ? await resolveCreatureForLearning(ctx, rawTarget) : null;
      if (!creature) {
        return;
      }

      const rows = await learningRowsForActor({ actorType: "CREATURE", creatureId: creature.id });
      const defaultRows = observedCreatureDefaultLearningRows(creature);
      const name = learningCreatureDisplayName(creature);
      const lines = [
        `📚 Learning progress: ${name} (creature #${creature.id})`,
        "",
        "Stored rows:",
        ...formatLearningTechnicalRows({ actorType: "CREATURE", creatureId: creature.id }, rows),
      ];
      if (defaultRows.length) {
        lines.push(
          "",
          "Profile defaults:",
          "These are profession/species estimates, not stored learning rows.",
          ...formatLearningTechnicalRows({ actorType: "CREATURE", creatureId: creature.id }, defaultRows),
        );
      }
      if (rows.length >= 50) lines.push("", "Showing first 50 stored rows.");
      await ctx.reply(lines.join("\n"), { reply_markup: buildAdminMenuReplyKeyboard() });
    });
  }

  async function runLearningChartCommand(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply(formatLearningLevelChart(), { reply_markup: buildAdminMenuReplyKeyboard() });
  }

  async function runQueueDebugCommand(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply(await buildActionQueueDebugReport(), { reply_markup: buildAdminMenuReplyKeyboard() });
  }

  async function runQueueNudgeCommand(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    const requested = nudgeActionQueueLoop();
    await ctx.reply(
      requested
        ? "🧵 Службову чергу штовхнуто до одного безпечного проходу. Якщо прохід уже триває, overlap guard не пустить другий."
        : "🧵 Службова черга ще не має активного bot instance; nudge не запущено.",
      { reply_markup: buildAdminMenuReplyKeyboard() },
    );
  }

  async function replyAdminResourcesMenu(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply([
      "🌿 Ресурси",
      "",
      "Швидкі кнопки додають 1 одиницю в поточній місцині Писаря.",
      "Відновлення трави за замовчуванням піднімає її до повного вузла й прибирає активну «Винищену траву», якщо поріг уже пройдено.",
      "Для точного додавання: /addResource <resourceKey> [locationKey|x,y,z] [amount].",
      "Для трави: /restoreGrass [locationKey|x,y,z] [amount|full].",
    ].join("\n"), {
      reply_markup: buildAdminResourcesReplyKeyboard(),
    });
  }

  async function replyAdminItemsMenu(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply([
      "🎒 Речі",
      "",
      "Швидкі кнопки додають 1 одиницю в речі Писаря.",
      "Формат: /addItem <resourceKey> [персонаж] [кількість].",
      "Без персонажа команда додає річ Писарю; без кількості додає 1.",
      "Приклади: /addItem berries #3 5, /addItem raw_meat Вербові 2, /addItem herbal_tincture #3 1.",
    ].join("\n"), {
      reply_markup: buildAdminItemsReplyKeyboard(),
    });
  }

  async function replyAdminFireMenu(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply([
      "🔥 Вогонь",
      "",
      "Без параметрів /addCampfire додає й підпалює рукотворне вогнище в поточній місцині Писаря.",
      "/addCampfire debug лишає старий службовий варіант для вузьких перевірок.",
      "/addTorch, /addLitTorch і /addTwigs без параметрів додають 1 факел, запалений факел або 1 хмиз Писарю. Останнє число задає кількість: /addTorch #3 5, /addLitTorch 2, /addTwigs Вербові 10.",
    ].join("\n"), {
      reply_markup: buildAdminFireReplyKeyboard(),
    });
  }

  async function replyAdminCreaturesMenu(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply([
      "🐾 Істоти",
      "",
      "Ключі видів: /addCreatureHelp.",
      "Додати живих тварин: /addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD].",
      "Додати трупи: /addCreatureCorpse <speciesKey> [locationKey|x,y,z] [count] [YOUNG|ADULT|OLD] [fresh|decaying|old].",
      "Без місцини /addCreatureCorpse бере поточну місцину Писаря.",
      "Тестові стани: /forceOld [speciesKey] [count], /cleanupCreature [speciesKey], /cleanupCreatures.",
    ].join("\n"), {
      reply_markup: buildAdminCreaturesReplyKeyboard(),
    });
  }

  async function replyTeleportMenu(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply([
      "🧭 Телепорт",
      "",
      "Формат: /teleport [#id|ім’я|username] <locationKey|x,y,z> або коротко /tp <locationKey|x,y,z>.",
      "Без персонажа переносить вас. Для назв із пробілами: /teleport персонаж -> назва місцини.",
      "У /locationAll координати показуються як клікабельні /tp-команди, наприклад /tp_0_9__13 означає /teleport 0,9,-13.",
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

  async function replyAddCreatureFormat(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply([
      "➕ Додати тварин",
      "",
      "Формат: /addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD].",
      "Ключі видів: /addCreatureHelp.",
    ].join("\n"), {
      reply_markup: buildAdminCreaturesReplyKeyboard(),
    });
  }

  async function replyAddCreatureCorpseFormat(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply([
      "🦴 Додати трупи",
      "",
      "Формат: /addCreatureCorpse <speciesKey> [locationKey|x,y,z] [count] [YOUNG|ADULT|OLD] [fresh|decaying|old].",
      "Без місцини команда бере поточну місцину Писаря; без кількості додає 1.",
      "Приклади: /addCreatureCorpse mouse; /addCreatureCorpse rabbit forest_04_00 3 OLD; /addCreatureCorpse wolf 0,0,0 old.",
      "Ключі видів: /addCreatureHelp.",
    ].join("\n"), {
      reply_markup: buildAdminCreaturesReplyKeyboard(),
    });
  }

  bot.command(["adminMenu", "adminmenu"], replyAdminMenu);
  bot.hears(ADMIN_MENU_TEXT_COMMAND, replyAdminMenu);
  bot.hears(["🛠 Адмін меню", "Адмін меню", "🛠 Адмін меню (/adminMenu)", "Адмін меню (/adminMenu)"], replyAdminMenu);
  bot.command(["timeDebug", "timedebug"], replyTimeDebug);
  bot.hears(TIME_DEBUG_TEXT_COMMAND, replyTimeDebug);
  bot.hears(["🌒 Час світу", "Час світу"], replyTimeDebug);
  bot.command(["timeSet", "timeset"], (ctx) => runTimeSetCommand(ctx));
  bot.hears(TIME_SET_TEXT_COMMAND, (ctx) => runTimeSetCommand(ctx, String(ctx.match?.[1] ?? "").trim()));
  bot.command(["weatherSet", "weatherset"], (ctx) => runWeatherSetCommand(ctx));
  bot.hears(WEATHER_SET_TEXT_COMMAND, (ctx) => runWeatherSetCommand(ctx, String(ctx.match?.[1] ?? "").trim()));
  bot.command(["learning_chart", "learningchart"], runLearningChartCommand);
  bot.hears(LEARNING_CHART_TEXT_COMMAND, runLearningChartCommand);
  bot.command(["learning", "learn"], (ctx) => runLearningCommand(ctx));
  bot.hears(LEARNING_TEXT_COMMAND, (ctx) => runLearningCommand(ctx, String(ctx.match?.[1] ?? "").trim()));
  bot.command(["queueDebug", "queuedebug"], runQueueDebugCommand);
  bot.hears(QUEUE_DEBUG_TEXT_COMMAND, runQueueDebugCommand);
  bot.command(["queueNudge", "queuenudge"], runQueueNudgeCommand);
  bot.hears(QUEUE_NUDGE_TEXT_COMMAND, runQueueNudgeCommand);
  bot.hears(["🧵 Службова черга", "Службова черга"], runQueueDebugCommand);
  bot.hears(["🌿 Ресурси"], replyAdminResourcesMenu);
  bot.hears(["🎒 Додати речі", "Додати речі", "🎒 Речі для Писаря", "Речі для Писаря"], replyAdminItemsMenu);
  bot.hears(["🔥 Вогонь"], replyAdminFireMenu);
  bot.hears(["🐾 Істоти", "Істоти"], replyAdminCreaturesMenu);
  bot.hears(["🧭 Телепорт", "Телепорт", "🧭 Телепорт (/teleport)", "Телепорт (/teleport)"], replyTeleportMenu);
  bot.hears(["➕ Додати ресурс", "Додати ресурс", "➕ Додати ресурс (/addResource)", "Додати ресурс (/addResource)"], replyAddResourceFormat);
  bot.hears(["🔧 Технічні деталі", "Технічні деталі"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    const player = await resolvePlayerForAdmin(ctx, "");
    if (!player) return;

    const enabled = !player.showTechnicalDetails;
    await prisma.player.update({ where: { id: player.id }, data: { showTechnicalDetails: enabled } });
    await ctx.reply(enabled ? "Технічні деталі увімкнено для вашого персонажа." : "Технічні деталі приховано для вашого персонажа.", {
      reply_markup: buildAdminMenuReplyKeyboard(),
    });
  });
  bot.hears(["🐾 Ключі істот", "Ключі істот"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply("Ключі видів тварин доступні через /addCreatureHelp.", { reply_markup: buildAdminCreaturesReplyKeyboard() });
  });
  bot.hears(["➕ Додати тварин", "Додати тварин"], replyAddCreatureFormat);
  bot.hears(["🦴 Додати трупи", "Додати трупи"], replyAddCreatureCorpseFormat);
  bot.hears(["🧪 Зістарити", "Зістарити"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply("Формат: /forceOld [speciesKey] [count]. Без виду бере тварин у поточній місцині.", { reply_markup: buildAdminCreaturesReplyKeyboard() });
  });
  bot.hears(["🧹 Прибрати тварину", "Прибрати тварину"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply("Формат: /cleanupCreature [speciesKey]. Без виду прибирає одну живу тварину у поточній місцині.", { reply_markup: buildAdminCreaturesReplyKeyboard() });
  });
  bot.hears(["🦴 Падальний рів", "Падальний рів", "🦴 Падальний рів (/carcassQuest)", "Падальний рів (/carcassQuest)"], async (ctx) => {
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

  async function runCarcassQuestCommand(ctx: any, rawMode = String(ctx.match ?? "")) {
    if (!(await requireScribeAdmin(ctx))) return;

    const mode = rawMode.trim().toLocaleLowerCase("uk-UA");
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
    await recordCarcassQuestChronicle(override, result.feature.locationId).catch((error) => console.warn("Failed to record carcass quest chronicle:", error));
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
  }
  bot.command(["carcassQuest", "carcassquest"], (ctx) => runCarcassQuestCommand(ctx));
  bot.hears(CARCASS_QUEST_TEXT_COMMAND, (ctx) => runCarcassQuestCommand(ctx, String(ctx.match?.[1] ?? "").trim()));

  async function runCallScribesAuditCommand(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply(await buildScribeReturnAuditText());
  }

  async function runCallScribesApproveCommand(ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;
    const eventId = Number(rawTarget.trim());
    const result = await approveScribeReturnRequest(bot, eventId, ctx.from.id);
    if (!result.ok) {
      await ctx.reply(result.message);
      return;
    }
    await ctx.reply(`✒️ Знак Писаря застосовано. ${playerDisplayName(result.player)} повертається до межового табору: ${result.startLocation.name}.`);
  }

  bot.command(["call_scribes_audit", "callscribesaudit"], runCallScribesAuditCommand);
  bot.hears(CALL_SCRIBES_AUDIT_TEXT_COMMAND, runCallScribesAuditCommand);
  bot.command(["call_scribes_approve", "callscribesapprove"], (ctx) => runCallScribesApproveCommand(ctx, String(ctx.match ?? "").trim()));
  bot.hears(CALL_SCRIBES_APPROVE_TEXT_COMMAND, (ctx) => runCallScribesApproveCommand(ctx, String(ctx.match?.[1] ?? "").trim()));
  bot.hears(CALL_SCRIBES_APPROVE_SHORT_COMMAND, (ctx) => runCallScribesApproveCommand(ctx, String(ctx.match?.[1] ?? "").trim()));

  bot.command(["adminHelp", "adminhelp"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    await replyAdminHelpIndex(ctx);
  });
  bot.hears(ADMIN_HELP_TEXT_COMMAND, async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    await replyAdminHelpIndex(ctx);
  });
  bot.hears(["🛠 Довідка Писаря", "Довідка Писаря", "🛠 Повна довідка", "Повна довідка", "🛠 Повна довідка (/adminHelp)", "Повна довідка (/adminHelp)"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    await replyAdminHelpIndex(ctx);
  });
  bot.callbackQuery(/^adminHelp:(index|[a-z_]+)$/, async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.answerCallbackQuery().catch(() => undefined);
    const key = String(ctx.match?.[1] ?? "index");
    if (key === "index") {
      await replyAdminHelpIndex(ctx);
      return;
    }
    await replyAdminHelpSection(ctx, key);
  });

  async function runAdminSetCommand(ctx: any, rawPassword = String(ctx.match ?? "").trim()) {
    if (!ctx.from) return;

    const password = rawPassword;
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
  }

  bot.command(["adminSet", "adminset"], (ctx) => runAdminSetCommand(ctx));
  bot.hears(ADMIN_SET_TEXT_COMMAND, (ctx) => runAdminSetCommand(ctx, String(ctx.match?.[1] ?? "").trim()));

  async function runAddCampfireCommand(ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;

    const parts = rawTarget.split(/\s+/).filter(Boolean);
    const debug = parts.some((part) => part.toLowerCase() === "debug");
    const target = parts.filter((part) => part.toLowerCase() !== "debug").join(" ");
    const location = await resolveLocationForAdmin(ctx, target);
    if (!location) return;

    const result = debug
      ? await createDebugCampfire(location.id)
      : await createAdminHandmadeCampfire(location.id);
    const { feature, atmosphereText } = result;

    await logEvent("SYSTEM", debug ? "Debug campfire added" : "Handmade admin campfire added", `${feature.key} at ${location.key}`, location.id);
    const text = debug
      ? `🔥 Додано debug-вогнище у місцині: ${location.name}.\nКлюч: ${feature.key}`
      : `🪵 Додано складене рукотворне вогнище у місцині: ${location.name}.\nКлюч: ${feature.key}\nЙого можна тестово підпалити, погасити й розібрати як вогнище, складене персонажем.`;
    return ctx.reply(debug ? [text, atmosphereText].filter(Boolean).join("\n\n") : text);
  }

  bot.command("addCampfire", (ctx) => runAddCampfireCommand(ctx));
  bot.hears(ADD_CAMPFIRE_TEXT_COMMAND, (ctx) => runAddCampfireCommand(ctx, String(ctx.match?.[1] ?? "").trim()));
  bot.hears(["🔥 Додати вогнище", "Додати вогнище", "🔥 Додати вогнище (/addCampfire)", "Додати вогнище (/addCampfire)"], (ctx) => runAddCampfireCommand(ctx, ""));
  bot.hears(["🔥 Debug-вогнище", "Debug-вогнище", "🔥 Debug-вогнище (/addCampfire debug)", "Debug-вогнище (/addCampfire debug)"], (ctx) => runAddCampfireCommand(ctx, "debug"));

  async function runDeleteCampfireCommand(ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;

    const location = await resolveLocationForAdmin(ctx, rawTarget);
    if (!location) return;

    const result = await deleteAdminCampfiresAtLocation(location.id);
    await logEvent("SYSTEM", "Admin campfires deleted", `location=${location.key}; deleted=${result.deletedCount}; protected_magic=${result.protectedMagicCount}; keys=${result.deletedKeys.join(",")}`, location.id);
    if (result.deletedCount <= 0) {
      const protectedText = result.protectedMagicCount > 0 ? " Поруч є магічне вогнище, але команда його не чіпає." : "";
      return ctx.reply(`🧹 У місцині ${location.name} немає немагічних вогнищ для прибирання.${protectedText}`);
    }
    const protectedText = result.protectedMagicCount > 0 ? ` Магічних вогнищ не чіпав: ${result.protectedMagicCount}.` : "";
    return ctx.reply(`🧹 Прибрано немагічних вогнищ: ${result.deletedCount} у місцині ${location.name}.${protectedText}`);
  }

  bot.command(["deleteCampfire", "deletecampfire", "removeCampfire", "removecampfire"], (ctx) => runDeleteCampfireCommand(ctx));
  bot.hears(DELETE_CAMPFIRE_TEXT_COMMAND, (ctx) => runDeleteCampfireCommand(ctx, String(ctx.match?.[1] ?? "").trim()));
  bot.hears(["🧹 Прибрати вогнище", "Прибрати вогнище", "🧹 Прибрати вогнище (/deleteCampfire)", "Прибрати вогнище (/deleteCampfire)"], (ctx) => runDeleteCampfireCommand(ctx, ""));

  async function runTeleportCommand(ctx: any, raw = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;

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
        sleepState: "AWAKE",
        ordinarySleepStartedAtMinute: null,
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
  }

  bot.command(["teleport", "tp"], (ctx) => runTeleportCommand(ctx));
  bot.hears(TELEPORT_TEXT_COMMAND, (ctx) => runTeleportCommand(ctx, String(ctx.match?.[1] ?? "").trim()));
  bot.hears(TELEPORT_COORDINATE_TEXT_COMMAND, (ctx) => {
    const coords = parseTeleportCoordinateCommand(String(ctx.match?.[0] ?? ""));
    return runTeleportCommand(ctx, coords ?? "");
  });

  async function runTutorialResetCommand(ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;

    const player = await resolvePlayerForAdmin(ctx, rawTarget);
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

    await ctx.reply(tutorialResetScribeReplyText(playerDisplayName(player), reset.movedCurrent), {
      parse_mode: "HTML",
      ...(selfResetOptions ?? {}),
    });

    if (Number.isSafeInteger(telegramId) && telegramId !== ctx.from?.id) {
      await bot.api.sendMessage(telegramId, tutorialResetPlayerNoticeText(reset.movedCurrent),
        {
          parse_mode: "HTML",
          ...(targetKeyboard ? { reply_markup: targetKeyboard } : {}),
        }
      ).catch(() => undefined);
    }
  }

  bot.command(["tutorialReset", "tutorialreset"], (ctx) => runTutorialResetCommand(ctx));
  bot.hears(TUTORIAL_RESET_TEXT_COMMAND, (ctx) => runTutorialResetCommand(ctx, String(ctx.match?.[1] ?? "").trim()));

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
  bot.hears(ADD_TORCH_TEXT_COMMAND, (ctx) => runAddTorchCommand(ctx, String(ctx.match?.[1] ?? "").trim()));
  bot.hears(["🕯 Додати факел", "Додати факел", "🕯 Додати факел (/addTorch)", "Додати факел (/addTorch)"], (ctx) => runAddTorchCommand(ctx, ""));

  async function runAddLitTorchCommand(ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;

    const parsed = parseAdminInventoryResourceArgs(rawTarget);
    const player = await resolvePlayerForAdmin(ctx, parsed.playerArg);
    if (!player) return;
    const { litTorch } = await ensureTorchResourceTypes();
    await addInventoryResource(player.id, litTorch.id, parsed.amount);
    await logEvent("SYSTEM", "Debug lit torch added to inventory", `player=${player.id}; amount=${parsed.amount}`);
    await ctx.reply(`🔥🕯 Додано запалений факел у речі: ${playerDisplayName(player)} ×${parsed.amount}.`);
  }

  bot.command(["addLitTorch", "addlittorch"], (ctx) => runAddLitTorchCommand(ctx));
  bot.hears(ADD_LIT_TORCH_TEXT_COMMAND, (ctx) => runAddLitTorchCommand(ctx, String(ctx.match?.[1] ?? "").trim()));
  bot.hears(["🔥🕯 Додати запалений факел", "Додати запалений факел", "🔥🕯 Додати запалений факел (/addLitTorch)", "Додати запалений факел (/addLitTorch)"], (ctx) => runAddLitTorchCommand(ctx, ""));

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
  bot.hears(ADD_TWIGS_TEXT_COMMAND, (ctx) => runAddTwigsCommand(ctx, String(ctx.match?.[1] ?? "").trim()));
  bot.hears(["🪵 Додати хмиз", "Додати хмиз", "🪵 Додати хмиз (/addTwigs)", "Додати хмиз (/addTwigs)"], (ctx) => runAddTwigsCommand(ctx, ""));

  async function runAddItemCommand(ctx: any, defaultResourceKey = "", rawArgs = String(ctx.match ?? "")) {
    if (!(await requireScribeAdmin(ctx))) return;

    const parsed = parseAdminInventoryItemArgs(rawArgs, defaultResourceKey);
    if (!parsed.resourceKey) {
      await ctx.reply("Вкажи ключ речі. Формат: /addItem <resourceKey> [персонаж] [кількість].");
      return;
    }

    const resourceType = await ensureAdminInventoryResourceType(parsed.resourceKey);
    if (!resourceType) {
      await ctx.reply(`Невідомий resourceKey для речей: ${parsed.resourceKey}. Перевір /addResourceHelp або resourceTypes.`);
      return;
    }

    const player = await resolvePlayerForAdmin(ctx, parsed.playerArg);
    if (!player) return;
    await addInventoryResource(player.id, resourceType.id, parsed.amount);
    await logEvent("SYSTEM", "Admin item added to inventory", `player=${player.id}; resource=${resourceType.key}; amount=${parsed.amount}`);
    await ctx.reply(`🎒 Додано «${resourceType.name}» у речі: ${playerDisplayName(player)} ×${parsed.amount}.`);
  }

  bot.command(["addItem", "additem"], (ctx) => runAddItemCommand(ctx));
  bot.hears(ADD_ITEM_TEXT_COMMAND, (ctx) => runAddItemCommand(ctx, "", String(ctx.match?.[1] ?? "").trim()));
  bot.hears(["🍓 Додати ягоди в речі", "Додати ягоди в речі"], (ctx) => runAddItemCommand(ctx, "berries", ""));
  bot.hears(["🌿 Додати трави в речі", "Додати трави в речі"], (ctx) => runAddItemCommand(ctx, "herbs", ""));
  bot.hears(["🍄 Додати гриби в речі", "Додати гриби в речі"], (ctx) => runAddItemCommand(ctx, "mushrooms", ""));
  bot.hears(["🌾 Додати траву в речі", "Додати траву в речі"], (ctx) => runAddItemCommand(ctx, "grass", ""));
  bot.hears(["🕯 Додати притушений факел", "Додати притушений факел"], (ctx) => runAddItemCommand(ctx, "doused_torch", ""));
  bot.hears(["🥩 Додати сире м'ясо", "Додати сире м'ясо"], (ctx) => runAddItemCommand(ctx, RAW_MEAT_KEY, ""));
  bot.hears(["🍖 Додати смажене м'ясо", "Додати смажене м'ясо"], (ctx) => runAddItemCommand(ctx, COOKED_MEAT_KEY, ""));
  bot.hears(["🍯 Додати мед", "Додати мед"], (ctx) => runAddItemCommand(ctx, HONEY_RESOURCE_KEY, ""));
  bot.hears(["🕯 Додати віск", "Додати віск"], (ctx) => runAddItemCommand(ctx, BEESWAX_RESOURCE_KEY, ""));
  bot.hears(["🔪 Додати ніж", "Додати ніж"], (ctx) => runAddItemCommand(ctx, "knife", ""));
  bot.hears(["🪵 Додати спис", "Додати спис"], (ctx) => runAddItemCommand(ctx, "hunting_spear", ""));
  bot.hears(["🌾 Додати серп", "Додати серп"], (ctx) => runAddItemCommand(ctx, "sickle", ""));
  bot.hears(["🪓 Додати сокиру", "Додати сокиру"], (ctx) => runAddItemCommand(ctx, "hand_axe", ""));
  bot.hears(["🗡 Додати меч", "Додати меч"], (ctx) => runAddItemCommand(ctx, "short_sword", ""));
  bot.hears(["➕ Додати річ", "Додати річ"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply("Формат: /addItem <resourceKey> [персонаж] [кількість]. Наприклад: /addItem berries #3 5.", {
      reply_markup: buildAdminItemsReplyKeyboard(),
    });
  });

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

  async function runRestoreGrassCommand(ctx: any, rawArgs = String(ctx.match ?? "")) {
    if (!(await requireScribeAdmin(ctx))) return;

    const parsed = parseRestoreGrassArgs(rawArgs);
    const location = await resolveLocationForAdmin(ctx, parsed.locationArg);
    if (!location) return;

    const result = await restoreLocationGrass(location.id, parsed.amount);
    const scribe = ctx.from?.id
      ? await prisma.player.findUnique({ where: { telegramId: String(ctx.from.id) } })
      : null;
    await logEvent("SYSTEM", "Admin grass restored", `location=${location.key}; requested=${parsed.amount}; before=${result.before}; after=${result.after}; max=${result.maxAmount}; clearedFeatures=${result.clearedFeatures}`, location.id);
    await logScribeAction({
      actionKey: "restoreGrass",
      scribePlayerId: scribe?.id,
      scribeTelegramId: ctx.from?.id,
      scribeName: scribe ? playerDisplayName(scribe) : null,
      target: location.key,
      outcome: "confirmed",
      details: `requested=${parsed.amount}; before=${result.before}; after=${result.after}; max=${result.maxAmount}; clearedFeatures=${result.clearedFeatures}`,
      locationId: location.id,
    });

    const cleared = result.clearedFeatures > 0
      ? ` Активну «Винищену траву» знято: ${result.clearedFeatures}.`
      : result.after >= result.threshold
        ? " Активної «Винищеної трави» тут не було."
        : ` «Винищена трава» лишиться, доки вузол не дійде до ${result.threshold}.`;
    await ctx.reply(`🌾 Траву відновлено в місцині ${location.name}: ${result.before} → ${result.after}/${result.maxAmount}.${cleared}`);
  }

  bot.command(["addResourceHelp", "addresourcehelp", "addResourseHelp", "addresoursehelp"], replyAddResourceHelp);
  bot.hears(ADD_RESOURCE_HELP_TEXT_COMMAND, replyAddResourceHelp);
  bot.hears(["🌿 Ключі ресурсів", "Ключі ресурсів", "🌿 Ключі ресурсів (/addResourceHelp)", "Ключі ресурсів (/addResourceHelp)"], replyAddResourceHelp);
  bot.command(["addResource", "addresource", "addResourse", "addresourse"], (ctx) => runAddResourceCommand(ctx));
  bot.command(["restoreBerries", "restoreberries"], (ctx) => runAddResourceCommand(ctx, "berries"));
  bot.command(["restoreHerbs", "restoreherbs"], (ctx) => runAddResourceCommand(ctx, "herbs"));
  bot.command(["restoreMushrooms", "restoremushrooms"], (ctx) => runAddResourceCommand(ctx, "mushrooms"));
  bot.command(["restoreGrass", "restoregrass"], (ctx) => runRestoreGrassCommand(ctx));
  bot.hears(ADD_RESOURCE_TEXT_COMMAND, (ctx) => runAddResourceCommand(ctx, "", String(ctx.match?.[1] ?? "")));
  bot.hears(RESTORE_BERRIES_TEXT_COMMAND, (ctx) => runAddResourceCommand(ctx, "berries", String(ctx.match?.[1] ?? "")));
  bot.hears(RESTORE_HERBS_TEXT_COMMAND, (ctx) => runAddResourceCommand(ctx, "herbs", String(ctx.match?.[1] ?? "")));
  bot.hears(RESTORE_MUSHROOMS_TEXT_COMMAND, (ctx) => runAddResourceCommand(ctx, "mushrooms", String(ctx.match?.[1] ?? "")));
  bot.hears(RESTORE_GRASS_TEXT_COMMAND, (ctx) => runRestoreGrassCommand(ctx, String(ctx.match?.[1] ?? "")));
  bot.hears(["🍓 Додати ягоди", "Додати ягоди", "🍓 Додати ягоди (/restoreBerries)", "Додати ягоди (/restoreBerries)"], (ctx) => runAddResourceCommand(ctx, "berries", ""));
  bot.hears(["🌱 Додати трави", "Додати трави", "🌱 Додати трави (/restoreHerbs)", "Додати трави (/restoreHerbs)"], (ctx) => runAddResourceCommand(ctx, "herbs", ""));
  bot.hears(["🍄 Додати гриби", "Додати гриби", "🍄 Додати гриби (/restoreMushrooms)", "Додати гриби (/restoreMushrooms)"], (ctx) => runAddResourceCommand(ctx, "mushrooms", ""));
  bot.hears(["🌾 Відновити траву", "Відновити траву", "🌾 Відновити траву (/restoreGrass)", "Відновити траву (/restoreGrass)"], (ctx) => runRestoreGrassCommand(ctx, ""));

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
        `Жаб створено: ${summary.frogsCreated}`,
        `Хижаків створено: ${summary.predatorsCreated}`,
        `Авто-режимів вимкнено: ${autoStopped}`,
        `Час світу скинуто: хвилина ${summary.worldClockResetTo}`,
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
        resetWorldSummary ? `worldClockResetTo=${resetWorldSummary.worldClockResetTo}` : null,
        resetStatsSummary ? `players=${resetStatsSummary.resetPlayers}` : null,
        resetStatsSummary ? `creatures=${resetStatsSummary.resetCreatures}` : null,
        resetStatsSummary ? `dropoffContributions=${resetStatsSummary.removedDropoffContributions}` : null,
        resetStatsSummary ? `statEvents=${resetStatsSummary.removedWorldStatEvents}` : null,
      ].filter(Boolean).join("; "),
      locationId: scribe?.currentLocationId,
    });

    await ctx.reply(lines.join("\n"));
  }

  async function requestAdminResetCommand(ctx: any, rawMode = String(ctx.match ?? "")) {
    if (!(await requireScribeAdmin(ctx))) return;

    const userId = ctx.from?.id;
    if (!userId) return;
    const mode = parseAdminResetMode(rawMode);

    if (!mode) {
      await ctx.reply(resetModePromptText(), { reply_markup: resetModeKeyboard(userId) });
      return;
    }

    await ctx.reply(resetConfirmationText(mode), { reply_markup: resetConfirmationKeyboard(mode, userId) });
  }

  bot.command("reset", (ctx) => requestAdminResetCommand(ctx));
  bot.hears(RESET_TEXT_COMMAND, (ctx) => requestAdminResetCommand(ctx, String(ctx.match?.[1] ?? "")));

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
