import { Bot, InlineKeyboard } from "grammy";
import { CreatureActivity, CreatureAge } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA, REST_ADMIN_STAMINA_CAP_MULTIPLIER } from "../gameConfig";
import {
  chatEventGroupLabel,
  chatLogModeLabel,
  chatLogModeToken,
  chatLogWindowLabel,
  chatLogWindowToken,
  getChatLog,
  normalizeChatLogMode,
  normalizeChatLogWindow,
  parseChatLogRequest,
  publicChatEventDescription,
  publicChatEventType,
  type ChatLogMode,
  type ChatLogWindow,
} from "../services/chatLog";
import { getEcologyStats } from "../services/ecologyStats";
import { getStatusData } from "../services/status";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { isScribeAdmin, requireScribeAdmin } from "../services/adminAccess";
import { logEvent } from "../services/worldEvents";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { disablePlayerAuto, enablePlayerAuto, stopPlayerAuto } from "./auto";
import { creatureForms, playerForms } from "../services/grammar";
import { clearOnboardingStateForTelegramId } from "./start";
import { hunterFieldInventorySummary } from "../services/targets";

const LOCATION_PAGE_MAX_CHARS = 3300;
const TELEGRAM_TEXT_MAX_CHARS = 3900;
const CHAT_LOG_TEXT_MAX_CHARS = 3400;
const CHAT_LOG_ENTRY_MAX_CHARS = 1100;
const CHAT_LOG_PAGE_SIZE = 12;
const ALL_CREATURE_PAGE_SIZE = 20;
const WHO_PAGE_SIZE = 20;
const WHO_ACTIVE_WINDOW_MS = 60 * 60 * 1000;
const STATUS_PERF_DEBUG = process.env.STATUS_PERF_DEBUG === "true";
type AllReturnContext = { showDead: boolean; page: number };
const pendingNameRejections = new Map<number, { playerId: number; returnContext: AllReturnContext }>();
const pendingAdminTeleports = new Map<number, { playerId: number; returnContext: AllReturnContext }>();
const REMOVE_REPLY_KEYBOARD = { remove_keyboard: true } as const;

type UniqueNpcSpec = {
  speciesKey: string;
  name: string;
  defaultLocationKey: string;
  alive: boolean;
  activity: CreatureActivity;
  currentAction: string;
};

const UNIQUE_NPCS: UniqueNpcSpec[] = [
  { speciesKey: "herbalist", name: "Травник", defaultLocationKey: "south_moss_clearing", alive: true, activity: "GATHERING", currentAction: "збирає лікарські трави" },
  { speciesKey: "lisovyk", name: "Дід Чорноліс", defaultLocationKey: "north_west_wood", alive: false, activity: "RESTING", currentAction: "спить у глибині Чорнолісу" },
];

function formatEvent(event: any) {
  const description = event.description ? ` — ${event.description}` : "";
  return `#${event.id} ${event.title}${description}`;
}

function formatStatNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString("uk-UA", { maximumFractionDigits });
}

function formatRate(value: number) {
  return formatStatNumber(value, value >= 10 ? 0 : 1);
}

function statusPerfNow() {
  return Date.now();
}

function logStatusPerf(scope: string, startedAt: number, extra = "") {
  if (!STATUS_PERF_DEBUG) return;
  const durationMs = Date.now() - startedAt;
  console.log(`[STATUS PERF] ${scope}: ${durationMs}ms${extra ? `; ${extra}` : ""}`);
}

function isTelegramMessageNotModified(error: unknown) {
  const description = (error as any)?.description ?? (error as any)?.error?.description ?? String(error);
  return typeof description === "string" && description.includes("message is not modified");
}

async function editMessageTextIfChanged(ctx: any, text: string, options?: any) {
  try {
    await ctx.editMessageText(text, options);
  } catch (error) {
    if (isTelegramMessageNotModified(error)) return;
    throw error;
  }
}

function genderedPast(player: { grammaticalGender?: string | null; pronoun?: string | null }, masculine: string, feminine: string, plural: string) {
  const gender = player.grammaticalGender ?? (player.pronoun === "SHE" ? "FEMININE" : player.pronoun === "THEY" ? "PLURAL" : "MASCULINE");
  if (gender === "FEMININE") return feminine;
  if (gender === "PLURAL") return plural;
  return masculine;
}

export async function buildStatBrief() {
  const stats = await getEcologyStats();
  const statUrl = `${config.publicBaseUrl}/stat`;
  const speciesLines = stats.speciesRows
    .filter((row) => row.total > 0)
    .map((row) => `${row.name} [${row.key}]: живі ${formatStatNumber(row.alive)}; вік ${row.ages.CHILD}/${row.ages.YOUNG}/${row.ages.ADULT}/${row.ages.OLD}; трупи ${formatStatNumber(row.corpses)}`);
  const counters = stats.recent.counters;
  const rates = stats.recent.ratesPerHour;
  const observed = stats.recent.eventCount
    ? `${formatStatNumber(stats.recent.observedTicks)} ticks / ${formatStatNumber(stats.recent.observedMinutes, 1)} хв`
    : "ще немає world tick подій";
  const hunterLines = stats.topHunters
    .slice(0, 5)
    .map((hunter) => `#${hunter.id} ${hunter.name} [${hunter.speciesKey}]: убивств ${formatStatNumber(hunter.kills)}, атак ${formatStatNumber(hunter.attackAttempts)}, влучних ${formatStatNumber(hunter.successfulAttacks)}`);
  const characterLines = stats.topCharacters
    .slice(0, 8)
    .map((character) => {
      const location = character.locationName ? `; зараз: ${character.locationName}` : "";
      const hunted = genderedPast(character, "вполював", "вполювала", "вполювали");
      const gathered = genderedPast(character, "зібрав", "зібрала", "зібрали");
      return `${character.name}: ${hunted} ${formatStatNumber(character.animalsKilled)}, ${gathered} ${formatStatNumber(character.successfulGathers)}, привітань ${formatStatNumber(character.greetings)}, реплік ${formatStatNumber(character.says)}, кроків ${formatStatNumber(character.steps)}${location}`;
    });

  return {
    text: [
      "Статистика",
      "",
      `Тварини: живі ${formatStatNumber(stats.totals.aliveAnimals)}, трупи ${formatStatNumber(stats.totals.corpseAnimals)}, зниклі ${formatStatNumber(stats.totals.goneAnimals)}, записів усього ${formatStatNumber(stats.totals.totalAnimals)}.`,
      `Заселені клітинки: ${formatStatNumber(stats.totals.occupiedAnimalLocations)} / ${formatStatNumber(stats.totals.locationCount)}.`,
      "",
      "Види:",
      speciesLines.length ? speciesLines.join("\n") : "поки немає тварин",
      "",
      `Останнє вікно: ${observed}.`,
      `Народження: зайці ${formatStatNumber(counters.rabbitBirths)} (${formatRate(rates.rabbitBirths)}/год), миші ${formatStatNumber(counters.mouseBirths)} (${formatRate(rates.mouseBirths)}/год).`,
      `Хижаки: лисенята ${formatStatNumber(counters.foxBirths)} (${formatRate(rates.foxBirths)}/год), вовченята ${formatStatNumber(counters.wolfBirths)} (${formatRate(rates.wolfBirths)}/год).`,
      `Prey units: для лисиць ${formatStatNumber(counters.foxPreyUnits)}, для вовків ${formatStatNumber(counters.wolfPreyUnits)}.`,
      `Розселення: зайці ${formatStatNumber(counters.rabbitsSpread)} (${formatRate(rates.rabbitsSpread)}/год), миші ${formatStatNumber(counters.miceSpread)} (${formatRate(rates.miceSpread)}/год).`,
      `Переїдено ресурсів: ${formatStatNumber(counters.overgrazedResources)} (${formatRate(rates.overgrazedResources)}/год).`,
      `Смерті від старості: ${formatStatNumber(counters.oldAgeDeaths)} (${formatRate(rates.oldAgeDeaths)}/год).`,
      `Смерті від голоду: ${formatStatNumber(counters.starvationDeaths)} (${formatRate(rates.starvationDeaths)}/год), усього ${formatStatNumber(stats.totals.starvationDeaths)}.`,
      `Смерті від хижаків: ${formatStatNumber(counters.predatorKills)} (${formatRate(rates.predatorKills)}/год), усього ${formatStatNumber(stats.totals.predatorKills)}.`,
      "",
      "Найвдаліші хижаки:",
      hunterLines.length ? hunterLines.join("\n") : "поки немає успішних мисливців",
      "",
      "Персонажі Порубіжжя:",
      characterLines.length ? characterLines.join("\n") : "поки немає помітних дій персонажів",
      "",
      `Повна статистика: ${statUrl}`,
    ].join("\n"),
    keyboard: new InlineKeyboard().url("Відкрити повну /stat", statUrl),
  };
}

async function normalizeUniqueNpc(npc: UniqueNpcSpec) {
  const species = await prisma.creatureSpecies.findUnique({ where: { key: npc.speciesKey } });
  const fallbackLocation = await prisma.cellLocation.findUnique({ where: { key: npc.defaultLocationKey } });

  if (!species || !fallbackLocation) return { speciesKey: npc.speciesKey, keptId: null as number | null, removed: 0, created: false, skipped: true };

  const creatures = await prisma.creature.findMany({ where: { speciesId: species.id, name: npc.name }, orderBy: [{ isAlive: "desc" }, { updatedAt: "desc" }, { id: "asc" }] });
  let kept = creatures[0];
  let created = false;

  if (!kept) {
    kept = await prisma.creature.create({
      data: {
        speciesId: species.id,
        locationId: fallbackLocation.id,
        name: npc.name,
        hp: species.baseHp,
        isAlive: npc.alive,
        isGone: false,
        activity: npc.activity,
        currentAction: npc.currentAction,
      },
    });
    created = true;
  }

  if (npc.speciesKey === "herbalist" && (!kept.isAlive || kept.isGone)) {
    const data = { isAlive: true, isGone: false, locationId: fallbackLocation.id, hp: species.baseHp, activity: npc.activity, currentAction: npc.currentAction };
    const updated = await prisma.creature.updateMany({ where: { id: kept.id }, data });
    if (updated.count > 0) kept = { ...kept, ...data };
  }

  if (npc.speciesKey === "lisovyk" && kept.hp <= 0) {
    const data = { hp: species.baseHp, isGone: false };
    const updated = await prisma.creature.updateMany({ where: { id: kept.id }, data });
    if (updated.count > 0) kept = { ...kept, ...data };
  }

  const duplicateIds = creatures.filter((c) => c.id !== kept.id).map((c) => c.id);
  const removed = duplicateIds.length ? (await prisma.creature.deleteMany({ where: { id: { in: duplicateIds } } })).count : 0;
  return { speciesKey: npc.speciesKey, keptId: kept.id, removed, created, skipped: false };
}

async function findLocationByKeyOrCoords(locationArg: string) {
  const byKey = await prisma.cellLocation.findUnique({ where: { key: locationArg } });
  if (byKey) return byKey;

  const match = locationArg.match(/^(-?\d+),(-?\d+),(-?\d+)$/);
  if (!match) return null;

  const [, rawX, rawY, rawZ] = match;
  return prisma.cellLocation.findFirst({
    where: {
      x: Number(rawX),
      y: Number(rawY),
      z: Number(rawZ),
    },
  });
}

function normalizeAge(rawAge?: string): CreatureAge {
  const value = rawAge?.trim().toUpperCase();
  if (value === "YOUNG" || value === "ADULT" || value === "OLD") return value;
  return "ADULT";
}

function ageTicksFor(species: any, age: CreatureAge) {
  if (age === "YOUNG") return Math.max(0, species.childTicks ?? 0);
  if (age === "OLD") return (species.childTicks ?? 0) + (species.youngTicks ?? 0) + (species.adultTicks ?? 0) + 5;
  return (species.childTicks ?? 0) + (species.youngTicks ?? 0);
}

function hpForAge(species: any, age: CreatureAge) {
  const multiplier = age === "YOUNG" ? 0.75 : age === "OLD" ? 0.65 : 1;
  return Math.max(1, Math.round(species.baseHp * multiplier));
}

function buildAllPaginationKeyboard(showDead: boolean, page: number, totalPages: number, playerIds: number[] = [], npcIds: number[] = []) {
  if (totalPages <= 1 && playerIds.length === 0 && npcIds.length === 0) return undefined;
  const keyboard = new InlineKeyboard();
  const mode = showDead ? "dead" : "live";
  for (const playerId of playerIds) keyboard.text(`👤 #${playerId}`, `adminPlayer:${playerId}:${mode}:${page}`).row();
  for (const npcId of npcIds) keyboard.text(`🧩 NPC #${npcId}`, `adminCreature:${npcId}`).row();
  if (page > 0) keyboard.text("◀️ Назад", `all:${mode}:${page - 1}`);
  if (page < totalPages - 1) keyboard.text("Далі ▶️", `all:${mode}:${page + 1}`);
  return keyboard;
}

function splitLinesIntoPages(lines: string[], maxChars: number) {
  const pages: string[][] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    const lineLength = line.length + 1;
    if (current.length > 0 && currentLength + lineLength > maxChars) {
      pages.push(current);
      current = [];
      currentLength = 0;
    }

    current.push(line);
    currentLength += lineLength;
  }

  if (current.length > 0) pages.push(current);
  return pages.length ? pages : [["немає записів"]];
}

function truncateTelegramText(text: string, maxChars = TELEGRAM_TEXT_MAX_CHARS) {
  if (text.length <= maxChars) return text;
  const suffix = "\n\n…текст скорочено для Telegram.";
  return `${text.slice(0, Math.max(0, maxChars - suffix.length)).trimEnd()}${suffix}`;
}

function joinLinesWithinLimit(lines: string[], maxChars: number, separator = "\n\n") {
  const visible: string[] = [];
  let length = 0;

  for (const line of lines) {
    const nextLength = length + (visible.length ? separator.length : 0) + line.length;
    if (visible.length > 0 && nextLength > maxChars) break;
    visible.push(line.length > maxChars ? truncateTelegramText(line, maxChars) : line);
    length += (visible.length > 1 ? separator.length : 0) + visible[visible.length - 1].length;
  }

  const hidden = Math.max(0, lines.length - visible.length);
  if (hidden > 0) visible.push(`…ще ${hidden} записів на цій сторінці приховано через ліміт Telegram. Відкрийте веб-/chat або JSON.`);
  return visible;
}

function sortUk(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "uk-UA", { sensitivity: "base" }));
}

function uniqueSortedUk(values: string[]) {
  return sortUk([...new Set(values.filter(Boolean))]);
}

function formatAdminDate(value?: Date | null) {
  if (!value) return "немає";
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function normalizePlayerLookup(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, " ");
}

function yesNo(value: boolean | null | undefined) {
  return value ? "так" : "ні";
}

function nameCasesLine(player: any) {
  return [
    player.nameNominative,
    player.nameGenitive,
    player.nameDative,
    player.nameAccusative,
    player.nameInstrumental,
    player.nameLocative,
    player.nameVocative,
  ].filter(Boolean).join(" / ") || "не заповнено";
}

async function playerActionOriginStats(playerId: number) {
  const [autoActions, allActions] = await Promise.all([
    prisma.worldAction.count({ where: { actorType: "PLAYER", playerId, note: { startsWith: "auto:" } } }),
    prisma.worldAction.count({ where: { actorType: "PLAYER", playerId } }),
  ]);

  return { autoActions, manualActions: Math.max(0, allActions - autoActions), allActions };
}

function allReturnCallback(returnContext: AllReturnContext) {
  return `all:${returnContext.showDead ? "dead" : "live"}:${returnContext.page}`;
}

function allReturnContextFromMatch(mode?: string, page?: string): AllReturnContext {
  const parsedPage = Number(page);
  return {
    showDead: mode === "dead",
    page: Number.isFinite(parsedPage) && parsedPage >= 0 ? parsedPage : 0,
  };
}

function buildAdminPlayerKeyboard(player: { id: number; isNameApproved: boolean; isAutoEnabled: boolean }, returnContext: AllReturnContext = { showDead: false, page: 0 }) {
  const mode = returnContext.showDead ? "dead" : "live";
  const keyboard = new InlineKeyboard();
  keyboard
    .text(player.isNameApproved ? "✅ Ім’я схвалене" : "✅ Схвалити ім’я", `adminPlayerName:approve:${player.id}:${mode}:${returnContext.page}`)
    .text(player.isNameApproved ? "↩️ Зняти схвалення" : "❌ Не схвалене", `adminPlayerName:reject:${player.id}:${mode}:${returnContext.page}`)
    .row()
    .text(player.isAutoEnabled ? "🤖 Вимкнути авто" : "🤖 Увімкнути авто", `adminPlayerAuto:${player.isAutoEnabled ? "off" : "on"}:${player.id}:${mode}:${returnContext.page}`)
    .row()
    .text("🧭 Телепорт", `adminPlayerTeleport:menu:${player.id}:${mode}:${returnContext.page}`)
    .row()
    .text("🔄 Оновити", `adminPlayer:${player.id}:${mode}:${returnContext.page}`)
    .row()
    .text("↩️ Назад до /all", allReturnCallback(returnContext));
  return keyboard;
}

function buildAdminTeleportKeyboard(playerId: number, returnContext: AllReturnContext) {
  const mode = returnContext.showDead ? "dead" : "live";
  return new InlineKeyboard()
    .text("🧭 У мою місцину", `adminPlayerTeleport:here:${playerId}:${mode}:${returnContext.page}`)
    .row()
    .text("🏕 У стартову", `adminPlayerTeleport:start:${playerId}:${mode}:${returnContext.page}`)
    .row()
    .text("✍️ Вказати місцину", `adminPlayerTeleport:ask:${playerId}:${mode}:${returnContext.page}`)
    .row()
    .text("↩️ Назад до картки", `adminPlayer:${playerId}:${mode}:${returnContext.page}`)
    .text("↩️ До /all", allReturnCallback(returnContext));
}

function scribeDisplayName(player: any | null, telegramId: number | string | undefined) {
  if (player) return playerForms(player).nominative;
  return telegramId ? `писар #${telegramId}` : "писар Порубіжжя";
}

function scribePastVerb(player: any | null, masculine: string, feminine: string, plural: string) {
  return player ? genderedPast(player, masculine, feminine, plural) : masculine;
}

function isPendingCancelAlias(text: string) {
  const value = text.trim().toLowerCase().replace(/^\/+/, "");
  return [
    "cancel",
    "skasuvaty",
    "vidminyty",
    "stop",
    "скасувати",
    "відмінити",
    "відміна",
    "стоп",
    "не треба",
  ].includes(value);
}

async function cancelPendingAdminInput(ctx: any) {
  if (!ctx.from) return false;
  const hadName = pendingNameRejections.delete(ctx.from.id);
  const hadTeleport = pendingAdminTeleports.delete(ctx.from.id);
  if (!hadName && !hadTeleport) return false;
  await ctx.reply(hadTeleport ? "↩️ Запит телепорту скасовано." : "↩️ Відхилення імені скасовано.");
  return true;
}

async function notifyPlayerByTelegram(bot: Bot, player: { telegramId: string; isAutoEnabled?: boolean | null }, text: string) {
  const telegramId = Number(player.telegramId);
  if (!Number.isSafeInteger(telegramId)) return false;
  await bot.api.sendMessage(telegramId, text, {
    reply_markup: await buildMainReplyKeyboardForTelegramId(telegramId, Boolean(player.isAutoEnabled)),
  }).catch(() => undefined);
  return true;
}

async function logNameApprovalEvent(params: {
  type: "approved" | "rejected";
  player: any;
  scribeName: string;
  comment?: string;
}) {
  const playerName = playerForms(params.player).nominative;
  const title = params.type === "approved" ? "Character name approved" : "Character name rejected";
  const descriptionParts = [
    `player=${params.player.id}`,
    `name=${playerName}`,
    `scribe=${params.scribeName}`,
  ];
  if (params.comment) descriptionParts.push(`comment=${params.comment}`);
  await logEvent("SYSTEM", title, descriptionParts.join("; "), params.player.currentLocationId ?? undefined);
}

async function logAdminAutoToggle(params: { enabled: boolean; player: any; scribe: any | null; scribeName: string; scribeTelegramId: number | string }) {
  const playerName = playerForms(params.player).nominative;
  const title = params.enabled
    ? `Admin enabled auto: ${params.scribeName} -> ${playerName}`
    : `Admin disabled auto: ${params.scribeName} -> ${playerName}`;
  await logEvent(
    "SYSTEM",
    title,
    [
      `player=${params.player.id}`,
      `playerName=${playerName}`,
      params.scribe?.id ? `scribePlayer=${params.scribe.id}` : null,
      `scribeTelegram=${params.scribeTelegramId}`,
      `scribeName=${params.scribeName}`,
    ].filter(Boolean).join("; "),
    params.player.currentLocationId ?? undefined,
  );
}

async function resolveAdminTeleportLocation(rawTarget: string) {
  const target = rawTarget.trim();
  if (!target) return null;

  const coords = target.match(/^(-?\d+)\s*,\s*(-?\d+)(?:\s*,\s*(-?\d+))?$/);
  if (coords) {
    return prisma.cellLocation.findFirst({
      where: { x: Number(coords[1]), y: Number(coords[2]), z: coords[3] ? Number(coords[3]) : 0 },
    });
  }

  return prisma.cellLocation.findFirst({
    where: {
      OR: [{ key: target }, { name: target }],
    },
  });
}

async function teleportPlayerByScribe(bot: Bot, playerId: number, locationId: number, scribeTelegramId: number) {
  const [player, location, scribe] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId } }),
    prisma.cellLocation.findUnique({ where: { id: locationId } }),
    getPlayerByTelegramId(scribeTelegramId),
  ]);
  if (!player || !location) return { ok: false as const, message: "Персонажа або місцину не знайдено." };

  const scribeName = scribeDisplayName(scribe, scribeTelegramId);
  await prisma.player.updateMany({
    where: { id: player.id },
    data: { currentLocationId: location.id, isResting: false },
  });
  await logEvent("SYSTEM", "Admin teleported player", `player=${player.id}; name=${playerForms(player).nominative}; location=${location.key}; scribe=${scribeName}`, location.id);
  await notifyPlayerByTelegram(
    bot,
    player,
    `${scribeName} переніс вас до місцини: ${location.name}.`,
  );

  return { ok: true as const, player, location, scribeName };
}

function buildAdminCreatureKeyboard(creatureId: number) {
  return new InlineKeyboard()
    .text("⚙️ Налаштування NPC пізніше", `adminCreatureConfig:${creatureId}`)
    .row()
    .text("🔄 Оновити", `adminCreature:${creatureId}`);
}

async function resolveAdminPlayer(rawTarget: string) {
  const target = normalizePlayerLookup(rawTarget);
  if (!target) return { player: null, error: "Формат: /playerAdmin <#id|ім’я|username>" };

  const numericId = Number(target);
  if (Number.isInteger(numericId) && numericId > 0) {
    const player = await prisma.player.findUnique({ where: { id: numericId } });
    if (player) return { player, error: null };
  }

  const players = await prisma.player.findMany({ orderBy: { id: "asc" } });
  const matches = players.filter((player) => {
    const keys = [
      player.telegramId,
      player.username,
      player.firstName,
      player.lastName,
      player.nameNominative,
      player.nameGenitive,
      player.nameDative,
      player.nameAccusative,
      player.nameVocative,
    ].map(normalizePlayerLookup).filter(Boolean);
    return keys.some((key) => key === target) || keys.some((key) => key.length > 2 && key.includes(target));
  });

  if (matches.length === 1) return { player: matches[0], error: null };
  if (matches.length > 1) {
    const names = matches.map((player) => `#${player.id} ${playerForms(player).nominative}`).join(", ");
    return { player: null, error: `Знайшлося кілька персонажів: ${names}` };
  }
  return { player: null, error: "Не знайшов такого персонажа." };
}

async function resolveLocalAdminPlayerByNumber(ctx: any, rawTarget: string) {
  const raw = String(rawTarget ?? "").trim();
  if (!/^\d+$/.test(raw) || raw.startsWith("#")) return null;

  const viewer = ctx.from?.id ? await getPlayerByTelegramId(ctx.from.id) : null;
  if (!viewer?.currentLocationId) return null;

  const players = await prisma.player.findMany({
    where: { currentLocationId: viewer.currentLocationId },
    orderBy: { id: "asc" },
  });
  const index = Number(raw) - 1;
  return index >= 0 && index < players.length ? players[index] : null;
}

async function resolveAdminPlayerForContext(ctx: any, rawTarget: string) {
  const target = normalizePlayerLookup(rawTarget);
  if (target) {
    const localPlayer = await resolveLocalAdminPlayerByNumber(ctx, rawTarget);
    if (localPlayer) return { player: localPlayer, error: null };
    return resolveAdminPlayer(rawTarget);
  }

  const telegramId = ctx.from?.id;
  if (!telegramId) return { player: null, error: "Не бачу Telegram ID для поточного писаря." };

  const player = await getPlayerByTelegramId(telegramId);
  if (player) return { player, error: null };
  return { player: null, error: "Спершу увійдіть у світ через /start, щоб мати поточного персонажа." };
}

async function buildAdminPlayerDetailsView(playerId: number, returnContext: AllReturnContext = { showDead: false, page: 0 }) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      currentLocation: { include: { region: true } },
      resources: { include: { resourceType: true }, orderBy: { resourceType: { key: "asc" } } },
      actions: { orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 8 },
    },
  });
  if (!player) return { text: "Персонажа не знайдено.", keyboard: undefined };

  const forms = playerForms(player);
  const actionOriginStats = await playerActionOriginStats(player.id);
  const location = player.currentLocation
    ? `${player.currentLocation.name} (${player.currentLocation.x},${player.currentLocation.y},${player.currentLocation.z}); регіон: ${player.currentLocation.region.name}`
    : "невідомо";
  const locationKey = player.currentLocation ? ` (${player.currentLocation.key})` : "";
  const resources = player.resources.filter((resource) => resource.amount > 0);
  const resourcesText = resources.length
    ? resources.map((resource) => `- ${resource.resourceType.name} (${resource.resourceType.key}): ${resource.amount}`).join("\n")
    : "- немає";
  const actionsText = player.actions.length
    ? player.actions.map((action) => `- #${action.id} ${action.type} ${action.status}; ${formatAdminDate(action.updatedAt)}; ${action.note ?? "без нотатки"}`).join("\n")
    : "- немає";

  const text = [
    `👤 Персонаж #${player.id}`,
    "",
    `Ім’я: ${forms.nominative}`,
    `Відмінки: ${nameCasesLine(player)}`,
    `Ім’я схвалене: ${yesNo(player.isNameApproved)}`,
    `Telegram: ${player.telegramId}${player.username ? ` (@${player.username})` : ""}`,
    `Telegram name: ${[player.firstName, player.lastName].filter(Boolean).join(" ") || "немає"}`,
    `Роль: ${player.role}`,
    `Займенники: ${player.pronoun ?? "немає"}; граматика: ${player.grammaticalGender ?? "немає"}; істотність: ${player.animacy}`,
    `Місцина: ${location}${locationKey}`,
    "",
    "Стан:",
    `- життя: ${player.hp}/${player.hpMax ?? BASE_HP}`,
    `- снага: ${player.stamina}/${player.staminaMax ?? BASE_STAMINA}`,
    `- голод: ${player.hunger}`,
    `- відпочиває: ${yesNo(player.isResting)}`,
    `- авто: ${yesNo(player.isAutoEnabled)}`,
    `- технічні деталі: ${yesNo(player.showTechnicalDetails)}`,
    "",
    "Статистика:",
    `- кроків: ${player.steps}`,
    `- оглядів: ${player.looks}`,
    `- реплік: ${player.says}`,
    `- привітань: ${player.greetings}`,
    `- спроб збору: ${player.gatherAttempts}`,
    `- вдалого збору: ${player.successfulGathers}`,
    `- зібрано ягід: ${player.berriesGathered}`,
    `- зібрано грибів: ${player.mushroomsGathered}`,
    `- зібрано лікарських трав: ${player.herbsGathered}`,
    `- вбито тварин: ${player.animalsKilled}`,
    `- відпочинків: ${player.restStarts}`,
    `- повних відновлень снаги: ${player.restFullRecoveries}`,
    `- дій усього: ${actionOriginStats.allActions}`,
    `- авто-дій: ${actionOriginStats.autoActions}`,
    `- ручних дій: ${actionOriginStats.manualActions}`,
    "",
    "Речі/ресурси:",
    resourcesText,
    "",
    "Останні дії:",
    actionsText,
    "",
    `Створено: ${formatAdminDate(player.createdAt)}`,
    `Оновлено: ${formatAdminDate(player.updatedAt)}`,
    `Остання дія: ${formatAdminDate(player.lastActionAt)}`,
  ].join("\n");

  return { text: truncateTelegramText(text), keyboard: buildAdminPlayerKeyboard(player, returnContext) };
}

async function buildAdminCreatureDetailsView(creatureId: number) {
  const creature = await prisma.creature.findUnique({
    where: { id: creatureId },
    include: {
      species: true,
      location: { include: { region: true } },
      actions: { orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 8 },
    },
  });
  if (!creature) return { text: "NPC / істоту не знайдено.", keyboard: undefined };

  const forms = creatureForms(creature);
  const location = creature.location
    ? `${creature.location.name} (${creature.location.x},${creature.location.y},${creature.location.z}); регіон: ${creature.location.region.name} (${creature.location.key})`
    : "невідомо";
  const state = creature.isGone ? "зникла/прибрана" : creature.isAlive ? "жива/активна" : "неактивна/труп";
  const actionsText = creature.actions.length
    ? creature.actions.map((action) => `- #${action.id} ${action.type} ${action.status}; ${formatAdminDate(action.updatedAt)}; ${action.note ?? "без нотатки"}`).join("\n")
    : "- немає";
  const hunterInventoryText = await hunterFieldInventorySummary(creature);

  const text = [
    `🧩 NPC / істота #${creature.id}`,
    "",
    `Ім’я: ${forms.nominative}`,
    `Відмінки: ${[
      forms.nominative,
      forms.genitive,
      forms.dative,
      forms.accusative,
      forms.instrumental,
      forms.locative,
      forms.vocative,
    ].filter(Boolean).join(" / ")}`,
    `Вид: ${creature.species.name} (${creature.species.key}); тип: ${creature.species.kind}; живлення: ${creature.species.diet}`,
    `Професія: ${creature.professionName ?? "немає"}${creature.professionKey ? ` (${creature.professionKey})` : ""}`,
    `Стать: ${creature.sex ?? "немає"}; вік: ${creature.age}/${creature.ageTicks}`,
    `Місцина: ${location}`,
    "",
    "Стан:",
    `- ${state}`,
    `- життя: ${creature.hp}/${creature.maxHp ?? creature.species.baseHp}`,
    `- снага: ${creature.stamina}/${creature.staminaMax ?? BASE_STAMINA}`,
    `- голод: ${creature.hunger}`,
    `- втома: ${creature.fatigueState}`,
    `- приховано: ${yesNo(creature.isHidden)}`,
    `- дія: ${creature.currentAction ?? "немає"}`,
    `- активність: ${creature.activity ?? "немає"}`,
    `- decay: ${creature.corpseDecayTicksLeft ?? "немає"}`,
    ...(hunterInventoryText ? ["", "Польова поклажа / мисливський стан:", hunterInventoryText] : []),
    "",
    "Характеристики виду:",
    `- сила: ${creature.species.strength}`,
    `- спритність: ${creature.species.agility}`,
    `- сприйняття: ${creature.species.perception}`,
    `- живучість: ${creature.species.endurance}`,
    `- інстинкт: ${creature.species.instinct}`,
    "",
    "Статистика:",
    `- кроків: ${creature.steps}`,
    `- оглядів: ${creature.looks}`,
    `- реплік: ${creature.says}`,
    `- спроб збору: ${creature.gatherAttempts}`,
    `- вдалого збору: ${creature.successfulGathers}`,
    `- атак: ${creature.attackAttempts}`,
    `- влучних атак: ${creature.successfulAttacks}`,
    `- убивств: ${creature.kills}`,
    "",
    "Останні дії:",
    actionsText,
    "",
    "Налаштування:",
    "- окрема адмінська поведінка NPC ще не реалізована; ця картка буде місцем для майбутніх режимів, не лише авто.",
    "",
    `Створено: ${formatAdminDate(creature.createdAt)}`,
    `Оновлено: ${formatAdminDate(creature.updatedAt)}`,
  ].join("\n");

  return { text: truncateTelegramText(text), keyboard: buildAdminCreatureKeyboard(creature.id) };
}

export async function buildWhoData(now = new Date()) {
  const since = new Date(now.getTime() - WHO_ACTIVE_WINDOW_MS);
  const [players, creatures] = await Promise.all([
    prisma.player.findMany({
      where: {
        OR: [
          { lastActionAt: { gte: since } },
          { updatedAt: { gte: since } },
        ],
      },
      orderBy: { id: "asc" },
    }),
    prisma.creature.findMany({
      where: {
        updatedAt: { gte: since },
        isAlive: true,
        isGone: false,
        isHidden: false,
        species: { kind: { not: "ANIMAL" } },
      },
      include: { species: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const scribeTelegramIds = new Set(config.adminTelegramIds.map(String));
  const scribePlayers = players.filter((player) => player.role === "SCRIBE" || scribeTelegramIds.has(player.telegramId));
  const scribes = uniqueSortedUk(scribePlayers.map((player) => playerForms(player).nominative));
  const nonScribePlayers = players
    .filter((player) => player.role !== "SCRIBE" && !scribeTelegramIds.has(player.telegramId))
    .map((player) => playerForms(player).nominative);
  const npcNames = creatures.map((creature) => creatureForms(creature).nominative);
  const mixedCharacters = uniqueSortedUk([...nonScribePlayers, ...npcNames]);

  return {
    since,
    scribeCount: scribePlayers.length,
    playerCount: players.length,
    nonScribePlayerCount: nonScribePlayers.length,
    npcCount: npcNames.length,
    mixedCount: mixedCharacters.length,
    totalCount: players.length + npcNames.length,
    scribes,
    mixedCharacters,
  };
}

export async function buildWhoText(now = new Date(), requestedPage = 0) {
  const data = await buildWhoData(now);
  const totalPages = Math.max(1, Math.ceil(data.mixedCharacters.length / WHO_PAGE_SIZE));
  const page = Math.max(0, Math.min(Math.floor(requestedPage), totalPages - 1));
  const start = page * WHO_PAGE_SIZE;
  const visibleCharacters = data.mixedCharacters.slice(start, start + WHO_PAGE_SIZE);
  const pageLine = totalPages > 1 ? `Сторінка ${page + 1}/${totalPages}.` : "";

  return [
    "👥 Хто активний",
    "За останню реальну годину.",
    `Разом персонажів: ${data.totalCount}.`,
    pageLine,
    "",
    "Писарі Порубіжжя:",
    ...(data.scribes.length ? data.scribes.map((name) => `- ${name}`) : ["- нікого не видно"]),
    "",
    "Персонажі:",
    ...(visibleCharacters.length ? visibleCharacters.map((name) => `- ${name}`) : ["- нікого не видно"]),
  ].join("\n");
}

function buildWhoPaginationKeyboard(page: number, totalPages: number) {
  if (totalPages <= 1) return undefined;
  const keyboard = new InlineKeyboard();
  if (page > 0) keyboard.text("◀️ Назад", `who:${page - 1}`);
  keyboard.text(`${page + 1}/${totalPages}`, "who:noop");
  if (page < totalPages - 1) keyboard.text("Далі ▶️", `who:${page + 1}`);
  return keyboard;
}

export async function buildWhoPage(requestedPage = 0, now = new Date()) {
  const data = await buildWhoData(now);
  const totalPages = Math.max(1, Math.ceil(data.mixedCharacters.length / WHO_PAGE_SIZE));
  const page = Math.max(0, Math.min(Math.floor(requestedPage), totalPages - 1));
  const start = page * WHO_PAGE_SIZE;
  return {
    data,
    page,
    visibleCharacters: data.mixedCharacters.slice(start, start + WHO_PAGE_SIZE),
    totalPages,
    text: await buildWhoText(now, page),
    keyboard: buildWhoPaginationKeyboard(page, totalPages),
  };
}

function buildLocationAllPaginationKeyboard(page: number, totalPages: number) {
  if (totalPages <= 1) return undefined;
  const keyboard = new InlineKeyboard();
  if (page > 0) keyboard.text("◀️ Назад", `locationAll:${page - 1}`);
  if (page < totalPages - 1) keyboard.text("Далі ▶️", `locationAll:${page + 1}`);
  return keyboard;
}

function formatChatEventTime(value: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function buildChatLogKeyboard(mode: ChatLogMode, window: ChatLogWindow, page: number, totalPages: number) {
  const modeToken = chatLogModeToken(mode);
  const windowToken = chatLogWindowToken(window);
  const keyboard = new InlineKeyboard().url("Відкрити веб-/chat", `${config.publicBaseUrl}/chat?mode=${modeToken}&hours=${windowToken}`);
  keyboard.row()
    .text(mode === "time" ? "✓ Час" : "Час", `chat:time:${windowToken}:0`)
    .text(mode === "location" ? "✓ Місцини" : "Місцини", `chat:location:${windowToken}:0`)
    .text(mode === "character" ? "✓ Персонажі" : "Персонажі", `chat:character:${windowToken}:0`);
  if (totalPages > 1) {
    keyboard.row();
    if (page > 0) keyboard.text("◀️ Назад", `chat:${modeToken}:${windowToken}:${page - 1}`);
    keyboard.text(`${page + 1}/${totalPages}`, "chat:noop");
    if (page < totalPages - 1) keyboard.text("Далі ▶️", `chat:${modeToken}:${windowToken}:${page + 1}`);
  }
  return keyboard;
}

export async function buildChatLogPage(mode: ChatLogMode, window: ChatLogWindow, requestedPage: number) {
  const log = await getChatLog({ mode, window, page: requestedPage, perPage: CHAT_LOG_PAGE_SIZE });
  const page = Math.max(0, Math.min(log.page, log.totalPages - 1));
  let lastGroup = "";
  const lines = log.events.map((event) => {
    const location = event.location ? ` @ ${event.location.name}` : "";
    const description = publicChatEventDescription(event);
    const text = description ? `\n«${description}»` : "";
    const group = chatEventGroupLabel(event, mode);
    const groupLine = group && group !== lastGroup ? `\n${group}\n` : "";
    lastGroup = group;
    return truncateTelegramText(`${groupLine}#${event.id} ${formatChatEventTime(event.createdAt)} ${publicChatEventType(event)}${location}\n${event.title}${text}`.trim(), CHAT_LOG_ENTRY_MAX_CHARS);
  });
  const header = [
    "Репліки Порубіжжя",
    `Рубрика: ${chatLogModeLabel(log.mode)}. Вікно: ${chatLogWindowLabel(log.window)}. Сторінка ${page + 1}/${log.totalPages}; записів ${log.total}.`,
    "",
  ].join("\n");
  const footer = [
    "",
    "",
    "Формат: /chat time [години|all], /chat location [години|all], /chat character [години|all]. Старе /chat 1 теж працює.",
  ].join("\n");
  const maxBodyChars = Math.max(500, CHAT_LOG_TEXT_MAX_CHARS - header.length - footer.length);
  const body = lines.length ? joinLinesWithinLimit(lines, maxBodyChars).join("\n\n") : "За цей час реплік не знайдено.";

  return {
    text: truncateTelegramText(`${header}${body}${footer}`, TELEGRAM_TEXT_MAX_CHARS),
    keyboard: buildChatLogKeyboard(log.mode, log.window, page, log.totalPages),
  };
}

async function buildLocationAllPage(requestedPage: number) {
  const startedAt = statusPerfNow();
  try {
    const locations = await prisma.cellLocation.findMany({
      select: {
        key: true,
        name: true,
        x: true,
        y: true,
        z: true,
        dangerLevel: true,
        region: { select: { name: true } },
      },
      orderBy: [{ z: "asc" }, { y: "desc" }, { x: "asc" }],
    });
    const lines = locations.map((l) => `${l.key} — ${l.name} (${l.x},${l.y},${l.z}); danger=${l.dangerLevel}; region=${l.region.name}`);
    const pages = splitLinesIntoPages(lines.length ? lines : ["немає"], LOCATION_PAGE_MAX_CHARS);
    const page = Math.max(0, Math.min(requestedPage, pages.length - 1));
    logStatusPerf("buildLocationAllPage", startedAt, `ok=1; locations=${locations.length}; pages=${pages.length}`);

    return {
      text: `📍 Усі місцини\nСторінка ${page + 1}/${pages.length}; місцин ${locations.length}\n\n${pages[page].join("\n")}`,
      keyboard: buildLocationAllPaginationKeyboard(page, pages.length),
    };
  } catch (error) {
    logStatusPerf("buildLocationAllPage", startedAt, "ok=0");
    throw error;
  }
}

export async function buildAllPage(showDead: boolean, requestedPage: number) {
  const startedAt = statusPerfNow();
  try {
    const creatureWhere = showDead ? undefined : { isAlive: true, isGone: false };
    const [players, creatureCount] = await Promise.all([
      prisma.player.findMany({
        select: {
          id: true,
          hp: true,
          stamina: true,
          hunger: true,
          isAutoEnabled: true,
          currentLocation: { select: { name: true, x: true, y: true, z: true } },
          firstName: true,
          lastName: true,
          username: true,
          nameNominative: true,
          nameGenitive: true,
          nameDative: true,
          nameAccusative: true,
          nameInstrumental: true,
          nameLocative: true,
          nameVocative: true,
          grammaticalGender: true,
          animacy: true,
        },
        orderBy: { id: "asc" },
      }),
      prisma.creature.count({ where: creatureWhere }),
    ]);
    const totalPages = Math.max(1, Math.ceil(creatureCount / ALL_CREATURE_PAGE_SIZE));
    const page = Math.max(0, Math.min(requestedPage, totalPages - 1));
    const creatures = await prisma.creature.findMany({
      where: creatureWhere,
      select: {
        id: true,
        name: true,
        hp: true,
        age: true,
        ageTicks: true,
        activity: true,
        currentAction: true,
        isGone: true,
        isAlive: true,
        corpseDecayTicksLeft: true,
        location: { select: { name: true, x: true, y: true, z: true } },
        species: { select: { kind: true, key: true, name: true } },
      },
      orderBy: { id: "asc" },
      skip: page * ALL_CREATURE_PAGE_SIZE,
      take: ALL_CREATURE_PAGE_SIZE,
    });

    const playerLines = players.map((p) => {
      const loc = p.currentLocation ? `${p.currentLocation.name} (${p.currentLocation.x},${p.currentLocation.y},${p.currentLocation.z})` : "невідомо";
      const name = playerForms(p).nominative;
      return `#${p.id} ${name} — ${loc}; життя ${p.hp}; снага ${p.stamina}; голод ${p.hunger}; авто ${yesNo(p.isAutoEnabled)}`;
    });

    const creatureLines = creatures.map((c) => {
      const loc = c.location ? `${c.location.name} (${c.location.x},${c.location.y},${c.location.z})` : "невідомо";
      const state = c.isGone ? "gone" : c.isAlive ? "alive" : "corpse/inactive";
      const decay = !c.isAlive && !c.isGone ? `; decay ${c.corpseDecayTicksLeft ?? "?"}` : "";
      const marker = c.species.kind === "ANIMAL" ? "істота" : "NPC";
      return `#${c.id} ${c.name ?? c.species.name} [${marker}] [${c.species.key}] — ${loc}; ${state}; життя ${c.hp}; age ${c.age}/${c.ageTicks}; ${c.activity ?? "IDLE"}; ${c.currentAction ?? "без дії"}${decay}`;
    });

    const bodyLines = [
      "Гравці:",
      ...(playerLines.length ? playerLines : ["немає"]),
      "",
      "NPC / істоти:",
      ...(creatureLines.length ? creatureLines : ["немає"]),
    ];
    const visiblePlayerIds = players.map((player) => player.id);
    const visibleNpcIds = creatures.filter((creature) => creature.species.kind !== "ANIMAL").map((creature) => creature.id);
    const mode = showDead ? "усі записи" : "тільки живі; /all dead покаже всі записи";
    const text = `🧾 Усі персонажі (${mode})\nСторінка ${page + 1}/${totalPages}; гравців ${players.length}, істот ${creatureCount}\n\n${bodyLines.join("\n")}`;
    logStatusPerf("buildAllPage", startedAt, `ok=1; players=${players.length}; creatures=${creatureCount}; pageRows=${creatures.length}; pages=${totalPages}; showDead=${showDead}`);

    return {
      text,
      keyboard: buildAllPaginationKeyboard(showDead, page, totalPages, visiblePlayerIds, visibleNpcIds),
    };
  } catch (error) {
    logStatusPerf("buildAllPage", startedAt, `ok=0; showDead=${showDead}`);
    throw error;
  }
}

export function registerStatusHandlers(bot: Bot) {
  bot.command(["debugGet", "debugget"], async (ctx) => {
    if (!ctx.from) return;
    if (!(await requireScribeAdmin(ctx))) return;
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    await ctx.reply(player.showTechnicalDetails ? "Технічні деталі: 1 (увімкнено для вашого персонажа)." : "Технічні деталі: 0 (приховано для вашого персонажа).");
  });

  bot.command(["debugSet", "debugset"], async (ctx) => {
    if (!ctx.from) return;
    if (!(await requireScribeAdmin(ctx))) return;
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const value = String(ctx.match || "").trim().toLowerCase();
    const enabled = ["1", "true", "on", "yes", "так", "увімкнути", "увімкнено"].includes(value);
    const disabled = ["0", "false", "off", "no", "ні", "вимкнути", "вимкнено"].includes(value);
    if (!enabled && !disabled) {
      await ctx.reply("Формат: /debugSet 1 або /debugSet 0. Також працюють true/false.");
      return;
    }

    await prisma.player.updateMany({ where: { id: player.id }, data: { showTechnicalDetails: enabled } });
    await ctx.reply(enabled ? "Технічні деталі: 1 (увімкнено для вашого персонажа)." : "Технічні деталі: 0 (приховано для вашого персонажа).");
  });

  bot.command("restart", async (ctx) => {
    if (!ctx.from) return;

    const telegramId = String(ctx.from.id);
    stopPlayerAuto(ctx.from.id);
    const hadOnboardingState = clearOnboardingStateForTelegramId(telegramId);

    const player = await prisma.player.findUnique({
      where: { telegramId },
      include: { currentLocation: true },
    });

    if (!player) {
      await ctx.reply(hadOnboardingState
        ? "Початок скинуто. Напиши /start, щоб знову обрати ім’я й увійти в перший сон."
        : "Персонажа ще немає. Напиши /start, щоб почати шлях.", {
        reply_markup: REMOVE_REPLY_KEYBOARD,
      });
      return;
    }

    const removedResources = await prisma.playerResource.deleteMany({
      where: { playerId: player.id },
    });

    const deletedPlayer = await prisma.player.deleteMany({ where: { id: player.id } });
    if (deletedPlayer.count === 0) {
      await ctx.reply("Персонажа вже немає. Напиши /start, щоб почати шлях спочатку.", {
        reply_markup: REMOVE_REPLY_KEYBOARD,
      });
      return;
    }

    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Player restarted onboarding",
        description: `telegramId=${telegramId}; oldPlayerId=${player.id}; removedResources=${removedResources.count}`,
        locationId: player.currentLocationId,
      },
    });

    await ctx.reply("♻️ Старий слід стерто: персонажа, речі й записи прибрано. Напиши /start, щоб почати шлях спочатку.", {
      reply_markup: REMOVE_REPLY_KEYBOARD,
    });
  });  

  bot.command(["locationAll", "locationall"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const page = await buildLocationAllPage(0);
    await ctx.reply(page.text, { reply_markup: page.keyboard });
  });

  bot.callbackQuery(/^locationAll:(\d+)$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const requestedPage = Number(ctx.match[1]);
    const page = await buildLocationAllPage(Number.isFinite(requestedPage) ? requestedPage : 0);
    await ctx.answerCallbackQuery();

    if (ctx.callbackQuery.message) {
      await editMessageTextIfChanged(ctx, page.text, { reply_markup: page.keyboard });
      return;
    }

    await ctx.reply(page.text, { reply_markup: page.keyboard });
  });

  bot.command(["addCreatureHelp", "addcreaturehelp"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const species = await prisma.creatureSpecies.findMany({ where: { kind: "ANIMAL" }, orderBy: { key: "asc" } });
    const lines = species.map(
      (s) => `${s.key} — ${s.name}; життя=${s.baseHp}; diet=${s.diet}; lifecycle=${s.childTicks}/${s.youngTicks}/${s.adultTicks}/${s.oldTicks}; corpse=${s.corpseDecayTicks}`
    );
    await ctx.reply(
      `🐾 Можливі тварини для /addCreature\n\n${lines.join("\n") || "немає"}\n\nФормат:\n/addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD]\n\nПриклади:\n/addCreature rabbit forest_04_00 3\n/addCreature mouse 0,0,0 5 YOUNG\n/addCreature wolf forest_00_08 1 OLD`
    );
  });

  bot.command("world", async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const s = await getStatusData();
    const latestEventLines = s.latestEvents.map((event) => truncateTelegramText(formatEvent(event), 450));
    const latestEvents = latestEventLines.length ? joinLinesWithinLimit(latestEventLines, 1400, "\n").join("\n") : "немає";
    const q = s.actionQueue;
    const queueText = [
      `Гравці: queued=${q.playerQueued}, running=${q.playerRunning}`,
      `Істоти: queued=${q.creatureQueued}, running=${q.creatureRunning}`,
      `Разом: queued=${q.totalQueued}, running=${q.totalRunning}, overdue=${q.overdueRunning}`,
      `Найстаріша queued: ${Math.round(q.oldestQueuedAgeMs / 1000)} с; max overdue: ${Math.round(q.maxOverdueMs / 1000)} с`,
    ].join("\n");
    const runtimeError = s.lastRuntimeError ? truncateTelegramText(s.lastRuntimeError, 700) : "немає";
    await ctx.reply(truncateTelegramText(`🌲 Стан Порубіжжя Чорнолісу\n\nВерсія: ${s.version}\nПерсонажів гравців у базі: ${s.playersCount}\nРегіонів: ${s.regionsCount}\nМісцин-клітинок: ${s.locationsCount}\nПереходів між клітинками: ${s.exitsCount}\nЖивих тварин: ${s.aliveAnimalsCount}\nТрупів тварин: ${s.animalCorpsesCount}\nЗниклих тварин: ${s.goneAnimalsCount}\nNPC / не-тварин: ${s.npcCount}\nЖивих істот загалом: ${s.aliveCreaturesCount}\nВузлів ресурсів: ${s.resourcesCount}\nПодій у журналі: ${s.eventsCount}\n\nЧерга дій:\n${queueText}\n\nОстанні події:\n${latestEvents}\n\nОстання помилка: ${runtimeError}`));
  });

  bot.command(["stat", "stats"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    const stat = await buildStatBrief();
    await ctx.reply(stat.text, { reply_markup: stat.keyboard });
  });

  bot.command("who", async (ctx) => {
    const page = await buildWhoPage(0);
    await ctx.reply(page.text, page.keyboard ? { reply_markup: page.keyboard } : undefined);
  });

  bot.hears(["👥 Хто активний", "Хто активний"], async (ctx) => {
    const page = await buildWhoPage(0);
    await ctx.reply(page.text, page.keyboard ? { reply_markup: page.keyboard } : undefined);
  });

  bot.callbackQuery(/^who:(\d+|noop)$/, async (ctx) => {
    if (ctx.match[1] === "noop") {
      await ctx.answerCallbackQuery();
      return;
    }
    const page = await buildWhoPage(Number(ctx.match[1]));
    await ctx.answerCallbackQuery();
    if (ctx.callbackQuery.message) {
      await editMessageTextIfChanged(ctx, page.text, page.keyboard ? { reply_markup: page.keyboard } : undefined);
      return;
    }
    await ctx.reply(page.text, page.keyboard ? { reply_markup: page.keyboard } : undefined);
  });

  bot.command("chat", async (ctx) => {
    const { mode, window } = parseChatLogRequest(ctx.match?.trim());
    const page = await buildChatLogPage(mode, window, 0);
    await ctx.reply(page.text, { reply_markup: page.keyboard });
  });

  bot.hears(["💬 Репліки", "Репліки"], async (ctx) => {
    const page = await buildChatLogPage("time", normalizeChatLogWindow(undefined), 0);
    await ctx.reply(page.text, { reply_markup: page.keyboard });
  });

  bot.callbackQuery(/^chat:(time|location|character):(all|\d+(?:\.\d+)?):(\d+)$/, async (ctx) => {
    const mode = normalizeChatLogMode(ctx.match[1]);
    const window = normalizeChatLogWindow(ctx.match[2]);
    const requestedPage = Number(ctx.match[3]);
    const page = await buildChatLogPage(mode, window, Number.isFinite(requestedPage) ? requestedPage : 0);
    await ctx.answerCallbackQuery();

    if (ctx.callbackQuery.message) {
      await editMessageTextIfChanged(ctx, page.text, { reply_markup: page.keyboard });
      return;
    }

    await ctx.reply(page.text, { reply_markup: page.keyboard });
  });

  bot.callbackQuery(/^chat:(all|\d+(?:\.\d+)?):(\d+)$/, async (ctx) => {
    const window = normalizeChatLogWindow(ctx.match[1]);
    const requestedPage = Number(ctx.match[2]);
    const page = await buildChatLogPage("time", window, Number.isFinite(requestedPage) ? requestedPage : 0);
    await ctx.answerCallbackQuery();

    if (ctx.callbackQuery.message) {
      await editMessageTextIfChanged(ctx, page.text, { reply_markup: page.keyboard });
      return;
    }

    await ctx.reply(page.text, { reply_markup: page.keyboard });
  });

  bot.callbackQuery("chat:noop", async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  bot.command(["restAdmin", "restadmin"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    if (!ctx.from) return;
    const rawTarget = String(ctx.match ?? "").trim();
    const resolved = await resolveAdminPlayerForContext(ctx, rawTarget);
    if (!resolved.player) {
      await ctx.reply(resolved.error ?? "Формат: /restAdmin [#id|ім’я|username]");
      return;
    }

    const player = resolved.player;
    const scribe = await getPlayerByTelegramId(ctx.from.id);
    const scribeName = scribeDisplayName(scribe, ctx.from.id);
    const playerName = playerForms(player).nominative;
    const baseMax = player.staminaMax ?? BASE_STAMINA;
    const adminMax = baseMax * REST_ADMIN_STAMINA_CAP_MULTIPLIER;
    const updated = await prisma.player.update({
      where: { id: player.id },
      data: {
        stamina: adminMax,
        isResting: false,
        fatigueState: "RESTED",
        lastStaminaRegenAt: new Date(),
      },
      select: { stamina: true, telegramId: true, isAutoEnabled: true },
    });

    await logEvent(
      "SYSTEM",
      "Admin restored stamina",
      `player=${player.id}; playerName=${playerName}; stamina=${updated.stamina}/${baseMax}; scribe=${scribeName}`,
      player.currentLocationId ?? undefined,
    );

    const isSelf = updated.telegramId === String(ctx.from.id);
    if (!isSelf) {
      const verb = scribePastVerb(scribe, "відновив", "відновила", "відновили");
      await notifyPlayerByTelegram(
        bot,
        updated,
        `${scribeName} ${verb} вашу снагу до ${updated.stamina}/${baseMax}.`,
      );
    }

    const targetText = isSelf ? "" : ` для ${playerName}`;
    await ctx.reply(`✨ Снагу${targetText} відновлено до ${updated.stamina}/${baseMax}. Адмінський множник: ×${REST_ADMIN_STAMINA_CAP_MULTIPLIER}.`, {
      reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, Boolean(scribe?.isAutoEnabled)),
    });
  });

  bot.hears(["📊 Статистика", "Статистика"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;
    const stat = await buildStatBrief();
    await ctx.reply(stat.text, { reply_markup: stat.keyboard });
  });

  bot.command("all", async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const showDead = ctx.match?.trim().toLowerCase() === "dead";
    const page = await buildAllPage(showDead, 0);
    await ctx.reply(page.text, { reply_markup: page.keyboard });
  });

  bot.command(["playerAdmin", "playeradmin", "player"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const resolved = await resolveAdminPlayerForContext(ctx, String(ctx.match ?? ""));
    if (!resolved.player) {
      await ctx.reply(resolved.error ?? "Не знайшов такого персонажа.");
      return;
    }

    const view = await buildAdminPlayerDetailsView(resolved.player.id);
    await ctx.reply(view.text, { reply_markup: view.keyboard });
  });

  bot.callbackQuery(/^adminPlayer:(\d+)(?::(live|dead):(\d+))?$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const playerId = Number(ctx.match[1]);
    const returnContext = allReturnContextFromMatch(ctx.match[2], ctx.match[3]);
    await ctx.answerCallbackQuery();
    const view = await buildAdminPlayerDetailsView(playerId, returnContext);
    await ctx.reply(view.text, { reply_markup: view.keyboard });
  });

  bot.callbackQuery(/^adminPlayerName:(approve|reject):(\d+)(?::(live|dead):(\d+))?$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const action = ctx.match[1];
    const playerId = Number(ctx.match[2]);
    const returnContext = allReturnContextFromMatch(ctx.match[3], ctx.match[4]);
    const target = await prisma.player.findUnique({ where: { id: playerId } });
    if (!target) {
      await ctx.answerCallbackQuery({ text: "Персонажа не знайдено.", show_alert: true });
      return;
    }

    if (action === "reject") {
      pendingNameRejections.set(ctx.from.id, { playerId, returnContext });
      await ctx.answerCallbackQuery({ text: "Напишіть коментар для гравця." });
      await ctx.reply(`Напишіть причину, чому ім’я ${playerForms(target).nominative} не схвалене. Я передам цей текст гравцю й запишу його в журнал подій.\n\nЩоб скасувати: /cancel або скасувати`);
      return;
    }

    const updated = await prisma.player.update({ where: { id: playerId }, data: { isNameApproved: true } }).catch(() => null);
    if (!updated) {
      await ctx.answerCallbackQuery({ text: "Персонажа не знайдено.", show_alert: true });
      return;
    }

    pendingNameRejections.delete(ctx.from.id);
    const scribe = await getPlayerByTelegramId(ctx.from.id);
    const scribeName = scribeDisplayName(scribe, ctx.from.id);
    const approvedVerb = scribePastVerb(scribe, "схвалив", "схвалила", "схвалили");
    await logNameApprovalEvent({ type: "approved", player: updated, scribeName });
    await notifyPlayerByTelegram(
      bot,
      updated,
      `${scribeName} ${approvedVerb} ваше ім’я.\n\nТепер ви повноцінний учасник літопису Порубіжжя Чорнолісу.`,
    );
    await ctx.answerCallbackQuery({ text: "Ім’я схвалено." });
    const view = await buildAdminPlayerDetailsView(playerId, returnContext);
    if (ctx.callbackQuery.message) {
      await editMessageTextIfChanged(ctx, view.text, { reply_markup: view.keyboard });
      return;
    }
    await ctx.reply(view.text, { reply_markup: view.keyboard });
  });

  bot.command(["cancel", "skasuvaty", "vidminyty"], async (ctx) => {
    await cancelPendingAdminInput(ctx);
  });

  bot.hears(/[\s\S]+/u, async (ctx, next) => {
    const text = String(ctx.message?.text ?? "");
    if (!isPendingCancelAlias(text)) return next();
    if (await cancelPendingAdminInput(ctx)) return;
    return next();
  });

  bot.hears(/[\s\S]+/u, async (ctx, next) => {
    const scribeTelegramId = ctx.from?.id;
    if (!scribeTelegramId || !pendingNameRejections.has(scribeTelegramId)) return next();
    if (!(await isScribeAdmin(scribeTelegramId))) {
      pendingNameRejections.delete(scribeTelegramId);
      return next();
    }

    const text = String(ctx.message?.text ?? "").trim();
    if (!text || text.startsWith("/")) return next();

    const pending = pendingNameRejections.get(scribeTelegramId);
    if (!pending) return next();

    const target = await prisma.player.findUnique({ where: { id: pending.playerId } });
    if (!target) {
      pendingNameRejections.delete(scribeTelegramId);
      await ctx.reply("Персонажа вже не знайдено. Відхилення імені скасовано.");
      return;
    }

    const comment = text.slice(0, 800);
    const updated = await prisma.player.update({ where: { id: target.id }, data: { isNameApproved: false } });
    pendingNameRejections.delete(scribeTelegramId);

    const scribe = await getPlayerByTelegramId(scribeTelegramId);
    const scribeName = scribeDisplayName(scribe, scribeTelegramId);
    const rejectedVerb = scribePastVerb(scribe, "не схвалив", "не схвалила", "не схвалили");
    await logNameApprovalEvent({ type: "rejected", player: updated, scribeName, comment });
    await notifyPlayerByTelegram(
      bot,
      updated,
      `${scribeName} ${rejectedVerb} ваше ім’я.\n\nКоментар писаря:\n${comment}\n\nЗверніться до писарів Порубіжжя, щоб узгодити нове ім’я або відмінки.`,
    );

    const view = await buildAdminPlayerDetailsView(updated.id, pending.returnContext);
    await ctx.reply(`Ім’я ${playerForms(updated).nominative} позначено як не схвалене. Коментар записано й надіслано гравцю.\n\n${view.text}`, { reply_markup: view.keyboard });
  });

  bot.hears(/[\s\S]+/u, async (ctx, next) => {
    const scribeTelegramId = ctx.from?.id;
    if (!scribeTelegramId || !pendingAdminTeleports.has(scribeTelegramId)) return next();
    if (!(await isScribeAdmin(scribeTelegramId))) {
      pendingAdminTeleports.delete(scribeTelegramId);
      return next();
    }

    const text = String(ctx.message?.text ?? "").trim();
    if (!text || text.startsWith("/")) return next();

    const pending = pendingAdminTeleports.get(scribeTelegramId);
    if (!pending) return next();

    const location = await resolveAdminTeleportLocation(text);
    if (!location) {
      await ctx.reply("Не знайшов такої місцини. Напишіть locationKey, точну назву або координати типу 0,0,0. Щоб скасувати: /cancel або скасувати");
      return;
    }

    pendingAdminTeleports.delete(scribeTelegramId);
    const result = await teleportPlayerByScribe(bot, pending.playerId, location.id, scribeTelegramId);
    if (!result.ok) {
      await ctx.reply(result.message);
      return;
    }

    const view = await buildAdminPlayerDetailsView(pending.playerId, pending.returnContext);
    await ctx.reply(`🧭 Перенесено ${playerForms(result.player).nominative} до місцини: ${result.location.name} (${result.location.key}).\n\n${view.text}`, { reply_markup: view.keyboard });
  });

  bot.callbackQuery(/^adminPlayerAuto:(on|off):(\d+)(?::(live|dead):(\d+))?$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const action = ctx.match[1];
    const playerId = Number(ctx.match[2]);
    const returnContext = allReturnContextFromMatch(ctx.match[3], ctx.match[4]);
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      await ctx.answerCallbackQuery({ text: "Персонажа не знайдено.", show_alert: true });
      return;
    }

    const telegramId = Number(player.telegramId);
    if (!Number.isSafeInteger(telegramId)) {
      await ctx.answerCallbackQuery({ text: "У персонажа некоректний Telegram ID.", show_alert: true });
      return;
    }

    const scribe = await getPlayerByTelegramId(ctx.from.id);
    const scribeName = scribeDisplayName(scribe, ctx.from.id);
    if (action === "on") {
      await enablePlayerAuto(bot, telegramId);
      await logAdminAutoToggle({ enabled: true, player, scribe, scribeName, scribeTelegramId: ctx.from.id });
      const enabledVerb = scribePastVerb(scribe, "увімкнув", "увімкнула", "увімкнули");
      await ctx.answerCallbackQuery({ text: "Авто увімкнено." });
      await notifyPlayerByTelegram(
        bot,
        { ...player, isAutoEnabled: true },
        `${scribeName} ${enabledVerb} для вас самостійні дії.\n\nВаш персонаж знову може діяти за попереднім наміром без кожної окремої команди.`,
      );
    } else {
      await disablePlayerAuto(telegramId);
      await logAdminAutoToggle({ enabled: false, player, scribe, scribeName, scribeTelegramId: ctx.from.id });
      const disabledVerb = scribePastVerb(scribe, "вимкнув", "вимкнула", "вимкнули");
      await ctx.answerCallbackQuery({ text: "Авто вимкнено." });
      await notifyPlayerByTelegram(
        bot,
        { ...player, isAutoEnabled: false },
        `${scribeName} ${disabledVerb} для вас самостійні дії.\n\nВаш персонаж більше не діятиме сам; керування знову повністю за вами.`,
      );
    }

    const view = await buildAdminPlayerDetailsView(playerId, returnContext);
    if (ctx.callbackQuery.message) {
      await editMessageTextIfChanged(ctx, view.text, { reply_markup: view.keyboard });
      return;
    }
    await ctx.reply(view.text, { reply_markup: view.keyboard });
  });

  bot.callbackQuery(/^adminPlayerTeleport:(menu|here|start|ask):(\d+)(?::(live|dead):(\d+))?$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const action = ctx.match[1];
    const playerId = Number(ctx.match[2]);
    const returnContext = allReturnContextFromMatch(ctx.match[3], ctx.match[4]);
    const mode = returnContext.showDead ? "dead" : "live";

    if (action === "menu") {
      const target = await prisma.player.findUnique({ where: { id: playerId } });
      await ctx.answerCallbackQuery();
      await ctx.reply(
        `🧭 Телепорт персонажа${target ? `: ${playerForms(target).nominative}` : ""}.`,
        { reply_markup: buildAdminTeleportKeyboard(playerId, returnContext) },
      );
      return;
    }

    if (action === "ask") {
      pendingAdminTeleports.set(ctx.from.id, { playerId, returnContext });
      await ctx.answerCallbackQuery({ text: "Напишіть місцину." });
      await ctx.reply("Напишіть locationKey, точну назву місцини або координати типу 0,0,0.\n\nЩоб скасувати: /cancel або скасувати");
      return;
    }

    let locationId: number | undefined;
    if (action === "start") {
      locationId = await getStartLocationId();
    } else {
      const scribe = await getPlayerByTelegramId(ctx.from.id);
      locationId = scribe?.currentLocationId ?? undefined;
      if (!locationId) {
        await ctx.answerCallbackQuery({ text: "У вас немає поточної місцини.", show_alert: true });
        return;
      }
    }

    const result = await teleportPlayerByScribe(bot, playerId, locationId, ctx.from.id);
    if (!result.ok) {
      await ctx.answerCallbackQuery({ text: result.message, show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Перенесено." });
    const view = await buildAdminPlayerDetailsView(playerId, returnContext);
    const text = `🧭 Перенесено ${playerForms(result.player).nominative} до місцини: ${result.location.name} (${result.location.key}).\n\n${view.text}`;
    if (ctx.callbackQuery.message) {
      await editMessageTextIfChanged(ctx, text, { reply_markup: view.keyboard });
      return;
    }
    await ctx.reply(text, { reply_markup: view.keyboard });
  });

  bot.callbackQuery(/^adminCreature:(\d+)$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const creatureId = Number(ctx.match[1]);
    await ctx.answerCallbackQuery();
    const view = await buildAdminCreatureDetailsView(creatureId);
    await ctx.reply(view.text, { reply_markup: view.keyboard });
  });

  bot.callbackQuery(/^adminCreatureConfig:(\d+)$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Налаштування NPC ще в планах.", show_alert: true });
  });

  bot.callbackQuery(/^all:(live|dead):(\d+)$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const showDead = ctx.match[1] === "dead";
    const requestedPage = Number(ctx.match[2]);
    const page = await buildAllPage(showDead, Number.isFinite(requestedPage) ? requestedPage : 0);
    await ctx.answerCallbackQuery();

    if (ctx.callbackQuery.message) {
      await editMessageTextIfChanged(ctx, page.text, { reply_markup: page.keyboard });
      return;
    }

    await ctx.reply(page.text, { reply_markup: page.keyboard });
  });

  bot.command(["cleanupCreatures", "cleanupcreatures"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const uniqueResults = [];
    const keepIds: number[] = [];

    for (const npc of UNIQUE_NPCS) {
      const result = await normalizeUniqueNpc(npc);
      uniqueResults.push(result);
      if (result.keptId) keepIds.push(result.keptId);
    }

    const animalsRemoved = await prisma.creature.deleteMany({ where: { species: { kind: "ANIMAL" } } });
    const goneCleanup = await prisma.creature.deleteMany({ where: { isAlive: false, isGone: true, id: keepIds.length ? { notIn: keepIds } : undefined } });
    const duplicateCount = uniqueResults.reduce((sum, r) => sum + r.removed, 0);

    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Creature cleanup", description: `Removed animals=${animalsRemoved.count}; removed gone=${goneCleanup.count}; unique NPC duplicates=${duplicateCount}.` } });

    const fresh = await getStatusData();
    const lines = uniqueResults.map((r) => r.skipped ? `${r.speciesKey}: skipped, species/location missing` : `${r.speciesKey}: kept #${r.keptId}, removed duplicates=${r.removed}${r.created ? ", created" : ""}`);
    await ctx.reply(`🧹 Creature cleanup done.\n\n${lines.join("\n")}\nAnimals removed: ${animalsRemoved.count}\nGone/decomposed removed: ${goneCleanup.count}\n\nAlive animals: ${fresh.aliveAnimalsCount}\nAnimal corpses: ${fresh.animalCorpsesCount}\nGone animals: ${fresh.goneAnimalsCount}\nNPC / non-animals: ${fresh.npcCount}\nAlive creatures total: ${fresh.aliveCreaturesCount}`);
  });

  bot.command(["cleanupCreature", "cleanupcreature"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    if (!ctx.from) return;
    const speciesKey = ctx.match?.trim() || undefined;
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const creature = await prisma.creature.findFirst({
      where: { isAlive: true, isGone: false, locationId: player.currentLocationId, species: { kind: "ANIMAL", ...(speciesKey ? { key: speciesKey } : {}) } },
      include: { species: true, location: true },
      orderBy: { id: "asc" },
    });

    if (!creature) return void (await ctx.reply(speciesKey ? `У поточній місцині немає живої тварини виду ${speciesKey}.` : "У поточній місцині немає живих тварин."));
    const deleted = await prisma.creature.deleteMany({ where: { id: creature.id } });
    if (deleted.count === 0) return void (await ctx.reply("Цю тварину вже прибрали іншим процесом."));
    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Creature removed", description: `Removed ${creature.species.key} #${creature.id} from current location.`, locationId: creature.locationId } });
    await ctx.reply(`🧹 Видалено: #${creature.id} ${creature.species.name} [${creature.species.key}] — ${creature.location.name}`);
  });

  bot.command(["addCreature", "addcreature"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    const args = ctx.match?.trim().split(/\s+/).filter(Boolean) ?? [];
    const [speciesKey, locationArg, rawCount, rawAge] = args;
    const parsedCount = Number(rawCount || 1);
    const count = Number.isFinite(parsedCount) ? Math.max(1, Math.min(Math.floor(parsedCount), 50)) : NaN;

    if (!speciesKey || !locationArg || !Number.isFinite(count)) {
      return void (await ctx.reply("⚠️ Формат: /addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD]\nНаприклад: /addCreature rabbit forest_04_00 3"));
    }

    const species = await prisma.creatureSpecies.findUnique({ where: { key: speciesKey } });
    const location = await findLocationByKeyOrCoords(locationArg);

    if (!species) return void (await ctx.reply(`⚠️ Невідомий вид: ${speciesKey}. Спробуй /addCreatureHelp.`));
    if (!location) return void (await ctx.reply(`⚠️ Невідома місцина: ${locationArg}. Спробуй /locationAll, реальний ключ на кшталт forest_04_00 або координати типу 0,0,0.`));
    if (species.kind !== "ANIMAL") return void (await ctx.reply("⚠️ /addCreature зараз призначена для тварин. Унікальні NPC керуються seed/cleanup."));

    const age = normalizeAge(rawAge);
    const ageTicks = ageTicksFor(species, age);
    const hp = hpForAge(species, age);

    for (let i = 0; i < count; i++) {
      const sex = Math.random() < 0.5 ? "MALE" : "FEMALE";
      await prisma.creature.create({
        data: {
          speciesId: species.id,
          locationId: location.id,
          hp,
          sex,
          age,
          ageTicks,
          isAlive: true,
          isGone: false,
          activity: "IDLE",
          currentAction: age === "OLD" ? "повільно рухається" : "прислухається",
        },
      });
    }

    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Creature added", description: `Added ${speciesKey} ×${count} (${age}) to ${location.key}.`, locationId: location.id } });
    await ctx.reply(`✅ Додано: ${species.name} ×${count} (${age}) → ${location.name} (${location.x},${location.y},${location.z})`);
  });

  bot.command(["forceOld", "forceold"], async (ctx) => {
    if (!(await requireScribeAdmin(ctx))) return;

    if (!ctx.from) return;
    const args = ctx.match?.trim().split(/\s+/).filter(Boolean) ?? [];
    const speciesKey = args[0];
    const parsedCount = Number(args[1] || 5);
    const count = Number.isFinite(parsedCount) ? Math.max(1, Math.min(Math.floor(parsedCount), 50)) : 5;
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const creatures = await prisma.creature.findMany({
      where: { isAlive: true, isGone: false, locationId: player.currentLocationId, species: { kind: "ANIMAL", ...(speciesKey ? { key: speciesKey } : {}) } },
      include: { species: true, location: true },
      take: count,
      orderBy: { id: "asc" },
    });

    if (!creatures.length) return void (await ctx.reply(speciesKey ? `У поточній місцині немає живих тварин виду ${speciesKey}.` : "У поточній місцині немає живих тварин."));

    for (const creature of creatures) {
      const ageTicks = ageTicksFor(creature.species, "OLD") + (creature.species.oldTicks ?? 0);
      await prisma.creature.updateMany({
        where: { id: creature.id, isAlive: true, isGone: false },
        data: { age: "OLD", ageTicks, hp: hpForAge(creature.species, "OLD"), currentAction: "ледь тримається на лапах" },
      });
    }

    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Creatures forced old", description: `Forced old: ${creatures.map((c) => `#${c.id}`).join(", ")}.`, locationId: player.currentLocationId } });
    await ctx.reply(`🧪 Зістарено для тесту: ${creatures.map((c) => `#${c.id} ${c.species.name}`).join(", ")}. Запусти /tick кілька разів, щоб перевірити старість/смерть.`);
  });
}
