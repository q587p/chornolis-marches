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
import { ADD_CREATURE_BATCH_SIZE, ADD_CREATURE_MAX_COUNT, corpseDecayTicksForFreshness, parseAddCreatureArgs, parseAddCreatureCorpseArgs, planAddCreatureBatches } from "../services/adminCreatures";
import { getStatusData } from "../services/status";
import { getPlayerByTelegramId, getStartLocationId } from "../services/players";
import { isScribeAdmin, requireScribeAdmin } from "../services/adminAccess";
import { logEvent } from "../services/worldEvents";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { disablePlayerAuto, enablePlayerAuto, stopPlayerAuto } from "./auto";
import { creatureForms, playerForms } from "../services/grammar";
import { clearOnboardingStateForTelegramId } from "./start";
import { hunterFieldInventorySummary } from "../services/targets";
import { playerPresenceDisplaySuffix, sessionPresenceLabel } from "../services/sessionPresence";
import { slashlessCommandPattern } from "../utils/slashlessCommands";
import { formatTeleportCoordinateCommand } from "../services/adminTeleportLinks";
import { learningLevelLabel } from "../services/learning";

const LOCATION_PAGE_MAX_CHARS = 3300;
const TELEGRAM_TEXT_MAX_CHARS = 3900;
const CHAT_LOG_TEXT_MAX_CHARS = 3400;
const CHAT_LOG_ENTRY_MAX_CHARS = 1100;
const CHAT_LOG_PAGE_SIZE = 12;
const LOCATION_ALL_FIRST_REGION_KEYS = ["dream_tutorial"];
const ALL_PLAYER_PAGE_SIZE = 12;
const ALL_CREATURE_PAGE_SIZE = 20;
const WHO_PAGE_SIZE = 20;
const ADD_CREATURE_HELP_TEXT_COMMAND = slashlessCommandPattern(["addCreatureHelp", "addcreaturehelp"]);
const ADD_CREATURE_TEXT_COMMAND = slashlessCommandPattern(["addCreature", "addcreature"]);
const ADD_CREATURE_CORPSE_TEXT_COMMAND = slashlessCommandPattern(["addCreatureCorpse", "addcreaturecorpse"]);
const DEBUG_GET_TEXT_COMMAND = slashlessCommandPattern(["debugGet", "debugget"]);
const DEBUG_SET_TEXT_COMMAND = slashlessCommandPattern(["debugSet", "debugset"]);
const RESTART_TEXT_COMMAND = slashlessCommandPattern(["restart"]);
const LOCATION_ALL_TEXT_COMMAND = slashlessCommandPattern(["locationAll", "locationall"]);
const WORLD_TEXT_COMMAND = slashlessCommandPattern(["world"]);
const ALL_TEXT_COMMAND = slashlessCommandPattern(["all"]);
const REST_ADMIN_TEXT_COMMAND = slashlessCommandPattern(["restAdmin", "restadmin"]);
const PLAYER_ADMIN_TEXT_COMMAND = slashlessCommandPattern(["playerAdmin", "playeradmin", "player"]);
const CLEANUP_CREATURES_TEXT_COMMAND = slashlessCommandPattern(["cleanupCreatures", "cleanupcreatures"]);
const CLEANUP_CREATURE_TEXT_COMMAND = slashlessCommandPattern(["cleanupCreature", "cleanupcreature"]);
const FORCE_OLD_TEXT_COMMAND = slashlessCommandPattern(["forceOld", "forceold"]);
const WHO_ACTIVE_WINDOW_MS = 60 * 60 * 1000;
const STATUS_PERF_DEBUG = process.env.STATUS_PERF_DEBUG === "true";
const ADMIN_PLAYER_LEARNING_SUMMARY_LIMIT = 8;
export type AllFilter =
  | { kind: "all" }
  | { kind: "player" }
  | { kind: "npc" }
  | { kind: "animal"; speciesKey?: string };
export type AllReturnContext = { showDead: boolean; page: number; filter: AllFilter };
const pendingNameRejections = new Map<number, { playerId: number; returnContext: AllReturnContext }>();

export function isPublicWhoCreature(creature: { species?: { kind?: string | null; diet?: string | null } | null }) {
  const kind = creature.species?.kind;
  if (kind === "SPIRIT" || creature.species?.diet === "SPIRITUAL") return false;
  return kind === "HUMAN" || kind === "MONSTER";
}

export function isPublicWhoPlayer(player: {
  sessionPresence?: string | null;
  lastPlayerActionAt?: Date | null;
  lastActionAt?: Date | null;
}, since: Date) {
  if (player.sessionPresence === "ENDED") return false;
  if (player.lastPlayerActionAt) return player.lastPlayerActionAt.getTime() >= since.getTime();
  return Boolean(player.lastActionAt && player.lastActionAt.getTime() >= since.getTime());
}
const pendingAdminTeleports = new Map<number, { playerId: number; returnContext: AllReturnContext }>();
const REMOVE_REPLY_KEYBOARD = { remove_keyboard: true } as const;
type LocationAllEntry = {
  id: number;
  key: string;
  name: string;
  x: number;
  y: number;
  z: number;
  dangerLevel: number;
  region: { key: string; name: string };
};

function buildRestartConfirmKeyboard(playerId: number) {
  return new InlineKeyboard()
    .text("Так, стерти слід", `restart:confirm:${playerId}`)
    .row()
    .text("Ні, лишити", `restart:cancel:${playerId}`);
}

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

function isTelegramMessageTooLong(error: unknown) {
  const description = (error as any)?.description ?? (error as any)?.error?.description ?? String(error);
  return typeof description === "string" && (description.includes("MESSAGE_TOO_LONG") || description.toLowerCase().includes("message is too long"));
}

async function editMessageTextIfChanged(ctx: any, text: string, options?: any) {
  try {
    await ctx.editMessageText(text, options);
  } catch (error) {
    if (isTelegramMessageNotModified(error)) return;
    if (isTelegramMessageTooLong(error)) {
      await ctx.editMessageText(truncateTelegramText(text), options);
      return;
    }
    throw error;
  }
}

function genderedPast(player: { grammaticalGender?: string | null; pronoun?: string | null }, masculine: string, feminine: string, plural: string) {
  const gender = player.grammaticalGender ?? (player.pronoun === "SHE" ? "FEMININE" : player.pronoun === "THEY" ? "PLURAL" : "MASCULINE");
  if (gender === "FEMININE") return feminine;
  if (gender === "PLURAL") return plural;
  return masculine;
}

function playerPresenceName(player: Parameters<typeof playerForms>[0] & { sessionPresence?: string | null }) {
  return `${playerForms(player).nominative}${playerPresenceDisplaySuffix(player)}`;
}

export async function buildStatBrief() {
  const stats = await getEcologyStats();
  const statUrl = `${config.publicBaseUrl}/stat`;
  const speciesLines = stats.speciesRows
    .filter((row) => row.total > 0)
    .map((row) => `${row.name} [${row.key}]: живі ${formatStatNumber(row.alive)}; вік ${row.ages.CHILD}/${row.ages.YOUNG}/${row.ages.ADULT}/${row.ages.OLD}; трупи ${formatStatNumber(row.corpses)}`);
  const specialCreatureLines = stats.specialCreatureRows
    .filter((row) => row.total > 0)
    .map((row) => `${row.name} [${row.key}; ${row.kind}/${row.diet}]: видимі ${formatStatNumber(row.alive)}, приховані ${formatStatNumber(row.hidden)}, неактивні ${formatStatNumber(row.inactive)}, зниклі ${formatStatNumber(row.gone)}`);
  const counters = stats.recent.counters;
  const rates = stats.recent.ratesPerHour;
  const observed = stats.recent.eventCount
    ? `${formatStatNumber(stats.recent.observedTicks)} ticks / ${formatStatNumber(stats.recent.observedMinutes, 1)} хв`
    : "ще немає world tick подій";
  const hunterLines = stats.topHunters
    .slice(0, 5)
    .map((hunter) => `#${hunter.id} ${hunter.name} [${hunter.speciesKey}]: убивств ${formatStatNumber(hunter.kills)}, атак ${formatStatNumber(hunter.attackAttempts)}, влучних ${formatStatNumber(hunter.successfulAttacks)}`);
  const predatorSpeciesLines = stats.predatorKillRows
    .slice(0, 6)
    .map((row) => `${row.speciesName} [${row.speciesKey}]: убивств ${formatStatNumber(row.kills)}, атак ${formatStatNumber(row.attackAttempts)}, влучних ${formatStatNumber(row.successfulAttacks)}`);
  const characterLines = stats.topCharacters
    .slice(0, 8)
    .map((character) => {
      const location = character.locationName ? `; зараз: ${character.locationName}` : "";
      const hunted = genderedPast(character, "вполював", "вполювала", "вполювали");
      const gathered = genderedPast(character, "зібрав", "зібрала", "зібрали");
      return `${character.name}: ${hunted} ${formatStatNumber(character.animalsKilled)}, ${gathered} ${formatStatNumber(character.successfulGathers)}, привітань ${formatStatNumber(character.greetings)}, реплік ${formatStatNumber(character.says)}, кроків ${formatStatNumber(character.steps)}${location}`;
    });
  const populationRestorationLines = stats.populationRestorationRows
    .slice(0, 6)
    .map((row) => {
      const latest = row.latestAt ? `; останнє ${row.latestAt.toLocaleString("uk-UA")}` : "";
      return `${row.speciesName} [${row.speciesKey}]: відновлено ${formatStatNumber(row.restored)}, подій ${formatStatNumber(row.events)}${latest}`;
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
      "Особливі присутності:",
      specialCreatureLines.length ? specialCreatureLines.join("\n") : "поки немає окремих персонажів чи духів",
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
      `Смерті від персонажів: ${formatStatNumber(counters.playerKills)} (${formatRate(rates.playerKills)}/год), усього ${formatStatNumber(stats.totals.playerKills)}.`,
      `Відновлення стартових тварин: ${formatStatNumber(counters.populationFloorRestored)} (${formatRate(rates.populationFloorRestored)}/год), усього ${formatStatNumber(stats.totals.populationFloorRestored)}.`,
      populationRestorationLines.length ? `По видах:\n${populationRestorationLines.join("\n")}` : "Відновлень стартових тварин ще не було.",
        `Creature tick: оброблено ${formatStatNumber(counters.creatureProcessed)}, відкладено ${formatStatNumber(counters.creatureDeferred)}, захищено ${formatStatNumber(counters.creatureProtected)}.`,
        "",
        "Хижаки за видами:",
        predatorSpeciesLines.length ? predatorSpeciesLines.join("\n") : "поки немає помітної хижацької статистики",
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

async function replyWorldStatus(ctx: any) {
  if (!(await requireScribeAdmin(ctx))) return;

  const s = await getStatusData();
  const latestEventLines = s.latestEvents.map((event) => truncateTelegramText(formatEvent(event), 450));
  const latestEvents = latestEventLines.length ? joinLinesWithinLimit(latestEventLines, 1400, "\n").join("\n") : "немає";
  const q = s.actionQueue;
  const serviceText = s.services.map((service) => `${service.label}: ${service.state} — ${service.detail}`).join("\n");
  const queueText = q
    ? [
        `Гравці: queued=${q.playerQueued}, running=${q.playerRunning}`,
        `Істоти: queued=${q.creatureQueued}, running=${q.creatureRunning}`,
        `Разом: queued=${q.totalQueued}, running=${q.totalRunning}, overdue=${q.overdueRunning}`,
        `Найстаріша queued: ${Math.round(q.oldestQueuedAgeMs / 1000)} с; max overdue: ${Math.round(q.maxOverdueMs / 1000)} с`,
      ].join("\n")
    : "Чергу дій не вдалося прочитати.";
  const runtimeError = s.lastRuntimeError ? truncateTelegramText(s.lastRuntimeError, 700) : "немає";
  await ctx.reply(truncateTelegramText(`🌲 Стан Порубіжжя Чорнолісу\n\nВерсія: ${s.version}\n\nВузли:\n${serviceText}\n\nПерсонажів гравців у базі: ${s.playersCount}\nРегіонів: ${s.regionsCount}\nМісцин-клітинок: ${s.locationsCount}\nПереходів між клітинками: ${s.exitsCount}\nЖивих тварин: ${s.aliveAnimalsCount}\nТрупів тварин: ${s.animalCorpsesCount}\nЗниклих тварин: ${s.goneAnimalsCount}\nNPC / не-тварин: ${s.npcCount}\nЖивих істот загалом: ${s.aliveCreaturesCount}\nВузлів ресурсів: ${s.resourcesCount}\nПодій у журналі: ${s.eventsCount}\n\nЧерга дій:\n${queueText}\n\nОстанні події:\n${latestEvents}\n\nОстання помилка: ${runtimeError}`));
}

async function replyStatBrief(ctx: any) {
  if (!(await requireScribeAdmin(ctx))) return;

  const stat = await buildStatBrief();
  await ctx.reply(stat.text, { reply_markup: stat.keyboard });
}

async function replyAllPage(ctx: any, request: AllReturnContext = parseAllRequest()) {
  if (!(await requireScribeAdmin(ctx))) return;

  const page = await buildAllPage(request);
  await ctx.reply(page.text, { reply_markup: page.keyboard });
}

async function replyLocationAllPage(ctx: any) {
  if (!(await requireScribeAdmin(ctx))) return;

  const page = await buildLocationAllPage(0);
  await ctx.reply(page.text, { reply_markup: page.keyboard });
}

async function runRestAdminCommand(bot: Bot, ctx: any, rawTarget = String(ctx.match ?? "").trim()) {
  if (!(await requireScribeAdmin(ctx))) return;

  if (!ctx.from) return;
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
      sleepState: "AWAKE",
      ordinarySleepStartedAtMinute: null,
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

export function allFilterToken(filter: AllFilter) {
  if (filter.kind === "animal" && filter.speciesKey) return `animal-${filter.speciesKey}`;
  return filter.kind;
}

function allFilterFromToken(token?: string): AllFilter {
  const normalized = String(token ?? "all").trim().toLowerCase();
  if (normalized === "player" || normalized === "players") return { kind: "player" };
  if (normalized === "npc" || normalized === "npcs") return { kind: "npc" };
  if (normalized === "animal" || normalized === "animals") return { kind: "animal" };
  const species = normalized.match(/^animal-([a-z0-9_-]+)$/);
  if (species) return { kind: "animal", speciesKey: species[1] };
  return { kind: "all" };
}

export function parseAllRequest(raw = ""): AllReturnContext {
  const tokens = raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/^\/+/, ""))
    .filter(Boolean);
  let showDead = false;
  let filter: AllFilter = { kind: "all" };

  for (const token of tokens) {
    if (token === "dead") {
      showDead = true;
      continue;
    }
    if (token === "all") continue;
    if (["live", "alive"].includes(token)) continue;
    if (["player", "players", "гравці", "гравець"].includes(token)) {
      filter = { kind: "player" };
      continue;
    }
    if (["npc", "npcs", "нпс"].includes(token)) {
      filter = { kind: "npc" };
      continue;
    }
    if (["animal", "animals", "тварини", "тварина"].includes(token)) {
      filter = { kind: "animal" };
      continue;
    }
    if (/^[a-z0-9_-]+$/.test(token)) {
      filter = { kind: "animal", speciesKey: token };
    }
  }

  return { showDead, page: 0, filter };
}

function allFilterLabel(filter: AllFilter) {
  if (filter.kind === "player") return "гравці";
  if (filter.kind === "npc") return "NPC";
  if (filter.kind === "animal" && filter.speciesKey) return `тварини виду ${filter.speciesKey}`;
  if (filter.kind === "animal") return "тварини";
  return "усі";
}

function creatureWhereForAll(showDead: boolean, filter: AllFilter) {
  if (filter.kind === "player") return null;
  return {
    ...(showDead ? {} : { isAlive: true, isGone: false }),
    ...(filter.kind === "npc" ? { species: { kind: { not: "ANIMAL" as const } } } : {}),
    ...(filter.kind === "animal" ? { species: { kind: "ANIMAL" as const, ...(filter.speciesKey ? { key: filter.speciesKey } : {}) } } : {}),
  };
}

function allIncludesPlayers(filter: AllFilter) {
  return filter.kind === "all" || filter.kind === "player";
}

function allIncludesCreatures(filter: AllFilter) {
  return filter.kind === "all" || filter.kind === "npc" || filter.kind === "animal";
}

function allCallback(returnContext: AllReturnContext, page = returnContext.page) {
  return `all:${returnContext.showDead ? "dead" : "live"}:${allFilterToken(returnContext.filter)}:${page}`;
}

function adminPlayerCallback(playerId: number, returnContext: AllReturnContext) {
  return `adminPlayer:${playerId}:${returnContext.showDead ? "dead" : "live"}:${allFilterToken(returnContext.filter)}:${returnContext.page}`;
}

function adminCreatureCallback(creatureId: number, returnContext: AllReturnContext) {
  return `adminCreature:${creatureId}:${returnContext.showDead ? "dead" : "live"}:${allFilterToken(returnContext.filter)}:${returnContext.page}`;
}

function buildAllPaginationKeyboard(returnContext: AllReturnContext, totalPages: number, playerIds: number[] = [], creatureIds: number[] = []) {
  if (totalPages <= 1 && playerIds.length === 0 && creatureIds.length === 0) return undefined;
  const keyboard = new InlineKeyboard();
  for (const playerId of playerIds) keyboard.text(`👤 #${playerId}`, adminPlayerCallback(playerId, returnContext)).row();
  for (const creatureId of creatureIds) keyboard.text(`🧩 #${creatureId}`, adminCreatureCallback(creatureId, returnContext)).row();
  if (returnContext.page > 0) keyboard.text("◀️ Назад", allCallback(returnContext, returnContext.page - 1));
  if (returnContext.page < totalPages - 1) keyboard.text("Далі ▶️", allCallback(returnContext, returnContext.page + 1));
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

type AdminLearningSummaryRow = {
  skillKey: string;
  sourceKey: string;
  contextKey: string;
  level: number;
  progress: number;
  totalProgress: number;
  milestoneCount: number;
};

export function formatAdminLearningSummary(rows: AdminLearningSummaryRow[], options: { playerId: number; totalRows?: number; limit?: number }) {
  const limit = Math.max(1, Math.floor(options.limit ?? ADMIN_PLAYER_LEARNING_SUMMARY_LIMIT));
  if (!rows.length) return "- немає збереженого прогресу";

  const visible = rows.slice(0, limit).map((row) => [
    `- ${row.skillKey}/${row.sourceKey}/${row.contextKey}`,
    `level=${row.level} (${learningLevelLabel(row.level)})`,
    `progress=${row.progress}`,
    `total=${row.totalProgress}`,
    `milestones=${row.milestoneCount}`,
  ].join("; "));
  const hasMoreRows = rows.length > limit;
  const totalRows = options.totalRows === undefined ? null : Math.max(options.totalRows, rows.length);
  const hidden = totalRows === null ? 0 : Math.max(0, totalRows - visible.length);
  if (hidden > 0) visible.push(`- …ще ${hidden}; повністю: /learning #${options.playerId}`);
  else if (hasMoreRows) visible.push(`- …є ще; повністю: /learning #${options.playerId}`);
  return visible.join("\n");
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
  return allCallback(returnContext);
}

function allReturnContextFromMatch(mode?: string, filterOrPage?: string, page?: string): AllReturnContext {
  const isOldCallback = page === undefined && filterOrPage !== undefined && /^\d+$/.test(filterOrPage);
  const filter = isOldCallback ? { kind: "all" as const } : allFilterFromToken(filterOrPage);
  const rawPage = isOldCallback ? filterOrPage : page;
  const parsedPage = Number(rawPage);
  return {
    showDead: mode === "dead",
    page: Number.isFinite(parsedPage) && parsedPage >= 0 ? parsedPage : 0,
    filter,
  };
}

function buildAdminPlayerKeyboard(player: { id: number; isNameApproved: boolean; isAutoEnabled: boolean }, returnContext: AllReturnContext = parseAllRequest()) {
  const mode = returnContext.showDead ? "dead" : "live";
  const filter = allFilterToken(returnContext.filter);
  const keyboard = new InlineKeyboard();
  keyboard
    .text(player.isNameApproved ? "✅ Ім’я схвалене" : "✅ Схвалити ім’я", `adminPlayerName:approve:${player.id}:${mode}:${filter}:${returnContext.page}`)
    .text(player.isNameApproved ? "↩️ Зняти схвалення" : "❌ Не схвалене", `adminPlayerName:reject:${player.id}:${mode}:${filter}:${returnContext.page}`)
    .row()
    .text(player.isAutoEnabled ? "🤖 Вимкнути авто" : "🤖 Увімкнути авто", `adminPlayerAuto:${player.isAutoEnabled ? "off" : "on"}:${player.id}:${mode}:${filter}:${returnContext.page}`)
    .row()
    .text("🧭 Телепорт", `adminPlayerTeleport:menu:${player.id}:${mode}:${filter}:${returnContext.page}`)
    .row()
    .text("⬅️ Попередній", `adminBrowse:player:prev:${player.id}:${mode}:${filter}:${returnContext.page}`)
    .text("Наступний ➡️", `adminBrowse:player:next:${player.id}:${mode}:${filter}:${returnContext.page}`)
    .row()
    .text("🔄 Оновити", adminPlayerCallback(player.id, returnContext))
    .row()
    .text("↩️ Назад до /all", allReturnCallback(returnContext));
  return keyboard;
}

function buildAdminTeleportKeyboard(playerId: number, returnContext: AllReturnContext) {
  const mode = returnContext.showDead ? "dead" : "live";
  const filter = allFilterToken(returnContext.filter);
  return new InlineKeyboard()
    .text("🧭 У мою місцину", `adminPlayerTeleport:here:${playerId}:${mode}:${filter}:${returnContext.page}`)
    .row()
    .text("🏕 У стартову", `adminPlayerTeleport:start:${playerId}:${mode}:${filter}:${returnContext.page}`)
    .row()
    .text("✍️ Вказати місцину", `adminPlayerTeleport:ask:${playerId}:${mode}:${filter}:${returnContext.page}`)
    .row()
    .text("↩️ Назад до картки", adminPlayerCallback(playerId, returnContext))
    .text("↩️ До /all", allReturnCallback(returnContext));
}

async function findAdjacentAdminPlayerId(currentId: number, direction: "prev" | "next", returnContext: AllReturnContext) {
  if (!allIncludesPlayers(returnContext.filter)) return null;
  const player = await prisma.player.findFirst({
    where: { id: direction === "prev" ? { lt: currentId } : { gt: currentId } },
    select: { id: true },
    orderBy: { id: direction === "prev" ? "desc" : "asc" },
  });
  return player?.id ?? null;
}

async function findAdjacentAdminCreatureId(currentId: number, direction: "prev" | "next", returnContext: AllReturnContext) {
  const where = creatureWhereForAll(returnContext.showDead, returnContext.filter);
  if (!where) return null;
  const creature = await prisma.creature.findFirst({
    where: { ...where, id: direction === "prev" ? { lt: currentId } : { gt: currentId } },
    select: { id: true },
    orderBy: { id: direction === "prev" ? "desc" : "asc" },
  });
  return creature?.id ?? null;
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
    data: { currentLocationId: location.id, sleepState: "AWAKE", ordinarySleepStartedAtMinute: null, isResting: false },
  });
  await logEvent("SYSTEM", "Admin teleported player", `player=${player.id}; name=${playerForms(player).nominative}; location=${location.key}; scribe=${scribeName}`, location.id);
  await notifyPlayerByTelegram(
    bot,
    player,
    `${scribeName} переніс вас до місцини: ${location.name}.`,
  );

  return { ok: true as const, player, location, scribeName };
}

function buildAdminCreatureKeyboard(creatureId: number, returnContext: AllReturnContext = parseAllRequest()) {
  return new InlineKeyboard()
    .text("⚙️ Налаштування NPC пізніше", `adminCreatureConfig:${creatureId}`)
    .row()
    .text("⬅️ Попередній", `adminBrowse:creature:prev:${creatureId}:${returnContext.showDead ? "dead" : "live"}:${allFilterToken(returnContext.filter)}:${returnContext.page}`)
    .text("Наступний ➡️", `adminBrowse:creature:next:${creatureId}:${returnContext.showDead ? "dead" : "live"}:${allFilterToken(returnContext.filter)}:${returnContext.page}`)
    .row()
    .text("🔄 Оновити", adminCreatureCallback(creatureId, returnContext))
    .row()
    .text("↩️ Назад до /all", allReturnCallback(returnContext));
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

async function buildAdminPlayerDetailsView(playerId: number, returnContext: AllReturnContext = parseAllRequest()) {
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
  const [actionOriginStats, learningRows] = await Promise.all([
    playerActionOriginStats(player.id),
    prisma.characterLearningProgress.findMany({
      where: { playerId: player.id },
      orderBy: [
        { skillKey: "asc" },
        { sourceKey: "asc" },
        { contextKey: "asc" },
      ],
      take: ADMIN_PLAYER_LEARNING_SUMMARY_LIMIT + 1,
    }),
  ]);
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
    `- сесія: ${sessionPresenceLabel(player, formatAdminDate)}`,
    `- технічні деталі: ${yesNo(player.showTechnicalDetails)}`,
    "",
    "Навчання:",
    formatAdminLearningSummary(learningRows, { playerId: player.id }),
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

async function buildAdminCreatureDetailsView(creatureId: number, returnContext: AllReturnContext = parseAllRequest()) {
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
  const hunterInventoryText = await hunterFieldInventorySummary(creature, { exact: true });

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

  return { text: truncateTelegramText(text), keyboard: buildAdminCreatureKeyboard(creature.id, returnContext) };
}

export async function buildWhoData(now = new Date()) {
  const since = new Date(now.getTime() - WHO_ACTIVE_WINDOW_MS);
  const [players, creatures] = await Promise.all([
    prisma.player.findMany({
      where: {
        sessionPresence: { not: "ENDED" },
        OR: [
          { lastPlayerActionAt: { gte: since } },
          { lastPlayerActionAt: null, lastActionAt: { gte: since } },
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
        species: { kind: { in: ["HUMAN", "MONSTER"] }, diet: { not: "SPIRITUAL" } },
      },
      include: { species: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const scribeTelegramIds = new Set(config.adminTelegramIds.map(String));
  const scribePlayers = players.filter((player) => player.role === "SCRIBE" || scribeTelegramIds.has(player.telegramId));
  const scribes = uniqueSortedUk(scribePlayers.map(playerPresenceName));
  const nonScribePlayers = players
    .filter((player) => player.role !== "SCRIBE" && !scribeTelegramIds.has(player.telegramId))
    .map(playerPresenceName);
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

function splitLocationsIntoPages(locations: LocationAllEntry[], maxChars: number) {
  const pages: LocationAllEntry[][] = [];
  let current: LocationAllEntry[] = [];
  let currentLength = 0;

  for (const location of locations) {
    const line = formatLocationAllLine(location);
    const nextLength = currentLength + line.length + 1;
    if (current.length > 0 && nextLength > maxChars) {
      pages.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(location);
    currentLength += line.length + 1;
  }

  if (current.length > 0) pages.push(current);
  return pages.length ? pages : [[]];
}

function formatLocationAllLine(location: LocationAllEntry) {
  return `${location.key} (${formatTeleportCoordinateCommand(location)}) — ${location.name} (${location.x},${location.y},${location.z}); danger=${location.dangerLevel}; region=${location.region.name}`;
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

async function requireScribeChatAccess(ctx: any) {
  return requireScribeAdmin(ctx);
}

async function buildLocationAllPage(requestedPage: number) {
  const startedAt = statusPerfNow();
  try {
    const locations = await prisma.cellLocation.findMany({
      select: {
        id: true,
        key: true,
        name: true,
        x: true,
        y: true,
        z: true,
        dangerLevel: true,
        region: { select: { key: true, name: true } },
      },
      orderBy: [{ z: "asc" }, { y: "desc" }, { x: "asc" }],
    });
    const orderedLocations = [...locations].sort((a, b) => {
      const regionRankA = LOCATION_ALL_FIRST_REGION_KEYS.indexOf(a.region.key);
      const regionRankB = LOCATION_ALL_FIRST_REGION_KEYS.indexOf(b.region.key);
      const normalizedRegionRankA = regionRankA === -1 ? LOCATION_ALL_FIRST_REGION_KEYS.length : regionRankA;
      const normalizedRegionRankB = regionRankB === -1 ? LOCATION_ALL_FIRST_REGION_KEYS.length : regionRankB;
      return normalizedRegionRankA - normalizedRegionRankB
        || a.region.name.localeCompare(b.region.name, "uk")
        || a.z - b.z
        || b.y - a.y
        || a.x - b.x
        || a.name.localeCompare(b.name, "uk")
        || a.key.localeCompare(b.key);
    });
    const pages = splitLocationsIntoPages(orderedLocations, LOCATION_PAGE_MAX_CHARS);
    const page = Math.max(0, Math.min(requestedPage, pages.length - 1));
    const pageLocations = pages[page] ?? [];
    const pageLines = pageLocations.map(formatLocationAllLine);
    logStatusPerf("buildLocationAllPage", startedAt, `ok=1; locations=${locations.length}; pages=${pages.length}`);

    return {
      text: `📍 Усі місцини\nСторінка ${page + 1}/${pages.length}; місцин ${locations.length}\n\n${pageLines.length ? pageLines.join("\n") : "немає"}`,
      keyboard: buildLocationAllPaginationKeyboard(page, pages.length),
    };
  } catch (error) {
    logStatusPerf("buildLocationAllPage", startedAt, "ok=0");
    throw error;
  }
}

export async function buildAllPage(requestOrShowDead: AllReturnContext | boolean, legacyRequestedPage = 0) {
  const startedAt = statusPerfNow();
  const request: AllReturnContext = typeof requestOrShowDead === "boolean"
    ? { showDead: requestOrShowDead, page: legacyRequestedPage, filter: { kind: "all" } }
    : requestOrShowDead;
  const showDead = request.showDead;
  try {
    const requestedPage = request.page;
    const filter = request.filter;
    const creatureWhere = creatureWhereForAll(showDead, filter);
    const includePlayers = allIncludesPlayers(filter);
    const includeCreatures = allIncludesCreatures(filter);
    const [players, creatureCount] = await Promise.all([
      includePlayers ? prisma.player.findMany({
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
          sessionPresence: true,
        },
        orderBy: { id: "asc" },
      }) : Promise.resolve([]),
      includeCreatures && creatureWhere ? prisma.creature.count({ where: creatureWhere }) : Promise.resolve(0),
    ]);
    const playerPages = includePlayers ? Math.ceil(players.length / ALL_PLAYER_PAGE_SIZE) : 0;
    const creaturePages = includeCreatures ? Math.ceil(creatureCount / ALL_CREATURE_PAGE_SIZE) : 0;
    const totalPages = Math.max(1, playerPages + creaturePages);
    const page = Math.max(0, Math.min(requestedPage, totalPages - 1));
    const pageContext = { ...request, page };
    const isPlayerPage = page < playerPages || creaturePages === 0;
    const creaturePage = Math.max(0, page - playerPages);
    const playerSlice = isPlayerPage
      ? players.slice(page * ALL_PLAYER_PAGE_SIZE, page * ALL_PLAYER_PAGE_SIZE + ALL_PLAYER_PAGE_SIZE)
      : [];
    const creatures = isPlayerPage || !creatureWhere ? [] : await prisma.creature.findMany({
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
        skip: creaturePage * ALL_CREATURE_PAGE_SIZE,
        take: ALL_CREATURE_PAGE_SIZE,
      });

    const playerLines = playerSlice.map((p) => {
      const loc = p.currentLocation ? `${p.currentLocation.name} (${p.currentLocation.x},${p.currentLocation.y},${p.currentLocation.z})` : "невідомо";
      const name = playerPresenceName(p);
      return `#${p.id} ${name} — ${loc}; життя ${p.hp}; снага ${p.stamina}; голод ${p.hunger}; авто ${yesNo(p.isAutoEnabled)}`;
    });

    const creatureLines = creatures.map((c) => {
      const loc = c.location ? `${c.location.name} (${c.location.x},${c.location.y},${c.location.z})` : "невідомо";
      const state = c.isGone ? "gone" : c.isAlive ? "alive" : "corpse/inactive";
      const decay = !c.isAlive && !c.isGone ? `; decay ${c.corpseDecayTicksLeft ?? "?"}` : "";
      const marker = c.species.kind === "ANIMAL" ? "істота" : "NPC";
      return `#${c.id} ${c.name ?? c.species.name} [${marker}] [${c.species.key}] — ${loc}; ${state}; життя ${c.hp}; age ${c.age}/${c.ageTicks}; ${c.activity ?? "IDLE"}; ${c.currentAction ?? "без дії"}${decay}`;
    });

    const bodyLines = isPlayerPage
      ? [
          "Гравці:",
          ...(playerLines.length ? playerLines : ["немає"]),
        ]
      : [
          "NPC / істоти:",
          ...(creatureLines.length ? creatureLines : ["немає"]),
        ];
    const visiblePlayerIds = playerSlice.map((player) => player.id);
    const visibleCreatureIds = creatures.map((creature) => creature.id);
    const mode = showDead ? "усі записи" : "тільки живі; /all dead покаже всі записи";
    const text = truncateTelegramText(`🧾 Усі персонажі (${mode}; фільтр: ${allFilterLabel(filter)})\nСторінка ${page + 1}/${totalPages}; гравців ${players.length}, істот ${creatureCount}\n\n${bodyLines.join("\n")}`);
    logStatusPerf("buildAllPage", startedAt, `ok=1; players=${players.length}; creatures=${creatureCount}; playerRows=${playerSlice.length}; creatureRows=${creatures.length}; pages=${totalPages}; showDead=${showDead}; filter=${allFilterToken(filter)}`);

    return {
      text,
      keyboard: buildAllPaginationKeyboard(pageContext, totalPages, visiblePlayerIds, visibleCreatureIds),
    };
  } catch (error) {
    logStatusPerf("buildAllPage", startedAt, `ok=0; showDead=${showDead}`);
    throw error;
  }
}

export function registerStatusHandlers(bot: Bot) {
  async function replyDebugGet(ctx: any) {
    if (!ctx.from) return;
    if (!(await requireScribeAdmin(ctx))) return;
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    await ctx.reply(player.showTechnicalDetails ? "Технічні деталі: 1 (увімкнено для вашого персонажа)." : "Технічні деталі: 0 (приховано для вашого персонажа).");
  }

  async function runDebugSet(ctx: any, rawValue = String(ctx.match || "").trim().toLowerCase()) {
    if (!ctx.from) return;
    if (!(await requireScribeAdmin(ctx))) return;
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const value = rawValue;
    const enabled = ["1", "true", "on", "yes", "так", "увімкнути", "увімкнено"].includes(value);
    const disabled = ["0", "false", "off", "no", "ні", "вимкнути", "вимкнено"].includes(value);
    if (!enabled && !disabled) {
      await ctx.reply("Формат: /debugSet 1 або /debugSet 0. Також працюють true/false.");
      return;
    }

    await prisma.player.updateMany({ where: { id: player.id }, data: { showTechnicalDetails: enabled } });
    await ctx.reply(enabled ? "Технічні деталі: 1 (увімкнено для вашого персонажа)." : "Технічні деталі: 0 (приховано для вашого персонажа).");
  }

  bot.command(["debugGet", "debugget"], replyDebugGet);
  bot.hears(DEBUG_GET_TEXT_COMMAND, replyDebugGet);

  bot.command(["debugSet", "debugset"], (ctx) => runDebugSet(ctx));
  bot.hears(DEBUG_SET_TEXT_COMMAND, (ctx) => runDebugSet(ctx, String(ctx.match?.[1] ?? "").trim().toLowerCase()));

  async function performRestartCommand(ctx: any, confirmedPlayerId: number) {
    if (!ctx.from) return;

    const telegramId = String(ctx.from.id);
    stopPlayerAuto(ctx.from.id);
    const hadOnboardingState = clearOnboardingStateForTelegramId(telegramId);

    const player = await prisma.player.findUnique({
      where: { id: confirmedPlayerId },
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

    if (player.telegramId !== telegramId) {
      await ctx.reply("Це підтвердження вже не підходить до вашого поточного персонажа. Якщо справді треба почати заново, напишіть /restart ще раз.");
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
  }

  async function requestRestartCommand(ctx: any) {
    if (!ctx.from) return;

    const telegramId = String(ctx.from.id);
    const player = await prisma.player.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!player) {
      const hadOnboardingState = clearOnboardingStateForTelegramId(telegramId);
      await ctx.reply(hadOnboardingState
        ? "Початок скинуто. Напиши /start, щоб знову обрати ім’я й увійти в перший сон."
        : "Персонажа ще немає. Напиши /start, щоб почати шлях.", {
        reply_markup: REMOVE_REPLY_KEYBOARD,
      });
      return;
    }

    await ctx.reply("Почати спочатку означає стерти персонажа, речі й записи цього шляху. Підтвердити?", {
      reply_markup: buildRestartConfirmKeyboard(player.id),
    });
  }

  bot.command("restart", requestRestartCommand);
  bot.hears(RESTART_TEXT_COMMAND, requestRestartCommand);

  bot.callbackQuery(/^restart:(confirm|cancel):(\d+)$/, async (ctx) => {
    const action = ctx.match[1];
    const playerId = Number(ctx.match[2]);
    if (!Number.isFinite(playerId)) {
      await ctx.answerCallbackQuery({ text: "Старе підтвердження вже не спрацює.", show_alert: true });
      return;
    }

    if (action === "cancel") {
      await ctx.answerCallbackQuery({ text: "Лишаємо як є." });
      await ctx.reply("Добре, старий слід лишається.");
      return;
    }

    await ctx.answerCallbackQuery({ text: "Починаємо спочатку." });
    await performRestartCommand(ctx, playerId);
  });

  bot.command(["locationAll", "locationall"], replyLocationAllPage);
  bot.hears(LOCATION_ALL_TEXT_COMMAND, replyLocationAllPage);
  bot.hears(["📍 Місцини", "Місцини", "📍 Місцини (/locationAll)", "Місцини (/locationAll)"], replyLocationAllPage);

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

  bot.callbackQuery(/^locationTeleport:(\d+)$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const locationId = Number(ctx.match[1]);
    const scribe = await getPlayerByTelegramId(ctx.from.id);
    if (!scribe) {
      await ctx.answerCallbackQuery({ text: "Спершу увійди у світ через /start.", show_alert: true });
      return;
    }

    const result = await teleportPlayerByScribe(bot, scribe.id, locationId, ctx.from.id);
    if (!result.ok) {
      await ctx.answerCallbackQuery({ text: result.message, show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery({ text: `Перенесено: ${result.location.name}` });
    await ctx.reply(`🧭 Перенесено ${playerForms(result.player).nominative} до місцини: ${result.location.name} (${result.location.key}).`);
  });

  async function replyAddCreatureHelp(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;

    const species = await prisma.creatureSpecies.findMany({ where: { kind: "ANIMAL" }, orderBy: { key: "asc" } });
    const lines = species.map(
      (s) => `${s.key} — ${s.name}; життя=${s.baseHp}; diet=${s.diet}; lifecycle=${s.childTicks}/${s.youngTicks}/${s.adultTicks}/${s.oldTicks}; corpse=${s.corpseDecayTicks}`
    );
    await ctx.reply(
      `🐾 Можливі тварини для /addCreature\n\n${lines.join("\n") || "немає"}\n\nФормат:\n/addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD]\n\nПонад ${ADD_CREATURE_BATCH_SIZE} створюється кількома батчами. Разова межа: ${ADD_CREATURE_MAX_COUNT}.\n\nПриклади:\n/addCreature rabbit forest_04_00 3\n/addCreature mouse meadow_16_05 100 YOUNG\n/addCreature wolf forest_00_08 1 OLD\n\nТрупи для тестів:\n/addCreatureCorpse <speciesKey> [locationKey|x,y,z] [count] [YOUNG|ADULT|OLD] [fresh|decaying|old]\nБез місцини бере поточну місцину Писаря.\n/addCreatureCorpse mouse\n/addCreatureCorpse rabbit forest_04_00 3 OLD`
    );
  }

  bot.command(["addCreatureHelp", "addcreaturehelp"], replyAddCreatureHelp);
  bot.hears(ADD_CREATURE_HELP_TEXT_COMMAND, replyAddCreatureHelp);

  bot.command("world", replyWorldStatus);
  bot.hears(WORLD_TEXT_COMMAND, replyWorldStatus);
  bot.hears(["🌲 Світ", "Світ", "🌲 Світ (/world)", "Світ (/world)"], replyWorldStatus);

  bot.command(["stat", "stats"], replyStatBrief);

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
    if (!(await requireScribeChatAccess(ctx))) return;
    const { mode, window } = parseChatLogRequest(ctx.match?.trim());
    const page = await buildChatLogPage(mode, window, 0);
    await ctx.reply(page.text, { reply_markup: page.keyboard });
  });

  bot.hears(["💬 Репліки", "Репліки"], async (ctx) => {
    if (!(await requireScribeChatAccess(ctx))) return;
    const page = await buildChatLogPage("time", normalizeChatLogWindow(undefined), 0);
    await ctx.reply(page.text, { reply_markup: page.keyboard });
  });

  bot.callbackQuery(/^chat:(time|location|character):(all|\d+(?:\.\d+)?):(\d+)$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }
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
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }
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
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
  });

  bot.command(["restAdmin", "restadmin"], (ctx) => runRestAdminCommand(bot, ctx));
  bot.hears(REST_ADMIN_TEXT_COMMAND, (ctx) => runRestAdminCommand(bot, ctx, String(ctx.match?.[1] ?? "").trim()));
  bot.hears(["✨ Відновити снагу", "Відновити снагу", "✨ Відновити снагу (/restAdmin)", "Відновити снагу (/restAdmin)"], (ctx) => runRestAdminCommand(bot, ctx, ""));

  bot.hears(["📊 Статистика", "Статистика", "📊 Статистика (/stat)", "Статистика (/stat)"], replyStatBrief);

  bot.command("all", async (ctx) => {
    await replyAllPage(ctx, parseAllRequest(ctx.match ?? ""));
  });
  bot.hears(ALL_TEXT_COMMAND, (ctx) => replyAllPage(ctx, parseAllRequest(String(ctx.match?.[1] ?? ""))));
  bot.hears(["👥 Усі", "Усі", "👥 Усі (/all)", "Усі (/all)"], (ctx) => replyAllPage(ctx));

  async function runPlayerAdminCommand(ctx: any, rawTarget = String(ctx.match ?? "")) {
    if (!(await requireScribeAdmin(ctx))) return;

    const resolved = await resolveAdminPlayerForContext(ctx, rawTarget);
    if (!resolved.player) {
      await ctx.reply(resolved.error ?? "Не знайшов такого персонажа.");
      return;
    }

    const view = await buildAdminPlayerDetailsView(resolved.player.id);
    await ctx.reply(view.text, { reply_markup: view.keyboard });
  }

  bot.command(["playerAdmin", "playeradmin", "player"], (ctx) => runPlayerAdminCommand(ctx));
  bot.hears(PLAYER_ADMIN_TEXT_COMMAND, (ctx) => runPlayerAdminCommand(ctx, String(ctx.match?.[1] ?? "").trim()));

  bot.callbackQuery(/^adminPlayer:(\d+)(?::(live|dead):(?:(all|player|npc|animal|animal-[a-z0-9_-]+):)?(\d+))?$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const playerId = Number(ctx.match[1]);
    const returnContext = allReturnContextFromMatch(ctx.match[2], ctx.match[3], ctx.match[4]);
    await ctx.answerCallbackQuery();
    const view = await buildAdminPlayerDetailsView(playerId, returnContext);
    await ctx.reply(view.text, { reply_markup: view.keyboard });
  });

  bot.callbackQuery(/^adminPlayerName:(approve|reject):(\d+)(?::(live|dead):(?:(all|player|npc|animal|animal-[a-z0-9_-]+):)?(\d+))?$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const action = ctx.match[1];
    const playerId = Number(ctx.match[2]);
    const returnContext = allReturnContextFromMatch(ctx.match[3], ctx.match[4], ctx.match[5]);
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

  bot.callbackQuery(/^adminPlayerAuto:(on|off):(\d+)(?::(live|dead):(?:(all|player|npc|animal|animal-[a-z0-9_-]+):)?(\d+))?$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const action = ctx.match[1];
    const playerId = Number(ctx.match[2]);
    const returnContext = allReturnContextFromMatch(ctx.match[3], ctx.match[4], ctx.match[5]);
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
      const result = await enablePlayerAuto(bot, telegramId);
      if (result.blocked) {
        await ctx.answerCallbackQuery({ text: "Уві сні авто не вмикається.", show_alert: true });
        await notifyPlayerByTelegram(bot, { ...player, isAutoEnabled: false }, "Сон тихо не пустив авто-режим: уві сні краще йти власним кроком.");
        return;
      }
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

  bot.callbackQuery(/^adminPlayerTeleport:(menu|here|start|ask):(\d+)(?::(live|dead):(?:(all|player|npc|animal|animal-[a-z0-9_-]+):)?(\d+))?$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const action = ctx.match[1];
    const playerId = Number(ctx.match[2]);
    const returnContext = allReturnContextFromMatch(ctx.match[3], ctx.match[4], ctx.match[5]);
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

  bot.callbackQuery(/^adminCreature:(\d+)(?::(live|dead):(?:(all|player|npc|animal|animal-[a-z0-9_-]+):)?(\d+))?$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const creatureId = Number(ctx.match[1]);
    const returnContext = allReturnContextFromMatch(ctx.match[2], ctx.match[3], ctx.match[4]);
    await ctx.answerCallbackQuery();
    const view = await buildAdminCreatureDetailsView(creatureId, returnContext);
    await ctx.reply(view.text, { reply_markup: view.keyboard });
  });

  bot.callbackQuery(/^adminCreatureConfig:(\d+)$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Налаштування NPC ще в планах.", show_alert: true });
  });

  bot.callbackQuery(/^adminBrowse:(player|creature):(prev|next):(\d+):(live|dead):(?:(all|player|npc|animal|animal-[a-z0-9_-]+):)?(\d+)$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const targetKind = ctx.match[1] as "player" | "creature";
    const direction = ctx.match[2] as "prev" | "next";
    const currentId = Number(ctx.match[3]);
    const returnContext = allReturnContextFromMatch(ctx.match[4], ctx.match[5], ctx.match[6]);
    const nextId = targetKind === "player"
      ? await findAdjacentAdminPlayerId(currentId, direction, returnContext)
      : await findAdjacentAdminCreatureId(currentId, direction, returnContext);

    if (!nextId) {
      await ctx.answerCallbackQuery({ text: direction === "prev" ? "Попереднього запису немає." : "Наступного запису немає.", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();
    const view = targetKind === "player"
      ? await buildAdminPlayerDetailsView(nextId, returnContext)
      : await buildAdminCreatureDetailsView(nextId, returnContext);
    if (ctx.callbackQuery.message) {
      await editMessageTextIfChanged(ctx, view.text, { reply_markup: view.keyboard });
      return;
    }
    await ctx.reply(view.text, { reply_markup: view.keyboard });
  });

  bot.callbackQuery(/^all:(live|dead):(?:(all|player|npc|animal|animal-[a-z0-9_-]+):)?(\d+)$/, async (ctx) => {
    if (!(await isScribeAdmin(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Ця дія доступна тільки писарям Порубіжжя.", show_alert: true });
      return;
    }

    const requestedPage = Number(ctx.match[3]);
    const page = await buildAllPage({
      showDead: ctx.match[1] === "dead",
      filter: allFilterFromToken(ctx.match[2]),
      page: Number.isFinite(requestedPage) ? requestedPage : 0,
    });
    await ctx.answerCallbackQuery();

    if (ctx.callbackQuery.message) {
      await editMessageTextIfChanged(ctx, page.text, { reply_markup: page.keyboard });
      return;
    }

    await ctx.reply(page.text, { reply_markup: page.keyboard });
  });

  async function runCleanupCreaturesCommand(ctx: any) {
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
  }

  async function runCleanupCreatureCommand(ctx: any, rawSpeciesKey = String(ctx.match ?? "").trim()) {
    if (!(await requireScribeAdmin(ctx))) return;

    if (!ctx.from) return;
    const speciesKey = rawSpeciesKey || undefined;
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
  }

  bot.command(["cleanupCreatures", "cleanupcreatures"], runCleanupCreaturesCommand);
  bot.hears(CLEANUP_CREATURES_TEXT_COMMAND, runCleanupCreaturesCommand);

  bot.command(["cleanupCreature", "cleanupcreature"], (ctx) => runCleanupCreatureCommand(ctx));
  bot.hears(CLEANUP_CREATURE_TEXT_COMMAND, (ctx) => runCleanupCreatureCommand(ctx, String(ctx.match?.[1] ?? "").trim()));

  async function runAddCreatureCommand(ctx: any, rawArgs = String(ctx.match ?? "")) {
    if (!(await requireScribeAdmin(ctx))) return;

    const { speciesKey, locationArg, requestedCount, age } = parseAddCreatureArgs(rawArgs);
    const plan = planAddCreatureBatches(requestedCount);

    if (!speciesKey || !locationArg || !Number.isFinite(plan.count)) {
      return void (await ctx.reply(`⚠️ Формат: /addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD]\nПонад ${ADD_CREATURE_BATCH_SIZE} створюється кількома батчами. Разова межа: ${ADD_CREATURE_MAX_COUNT}.\nНаприклад: /addCreature rabbit forest_04_00 3`));
    }

    const species = await prisma.creatureSpecies.findUnique({ where: { key: speciesKey } });
    const location = await findLocationByKeyOrCoords(locationArg);

    if (!species) return void (await ctx.reply(`⚠️ Невідомий вид: ${speciesKey}. Спробуй /addCreatureHelp.`));
    if (!location) return void (await ctx.reply(`⚠️ Невідома місцина: ${locationArg}. Спробуй /locationAll, реальний ключ на кшталт forest_04_00 або координати типу 0,0,0.`));
    if (species.kind !== "ANIMAL") return void (await ctx.reply("⚠️ /addCreature зараз призначена для тварин. Унікальні NPC керуються seed/cleanup."));

    const ageTicks = ageTicksFor(species, age);
    const hp = hpForAge(species, age);

    for (const batchCount of plan.batches) {
      await prisma.creature.createMany({
        data: Array.from({ length: batchCount }, () => ({
          speciesId: species.id,
          locationId: location.id,
          hp,
          sex: Math.random() < 0.5 ? "MALE" : "FEMALE",
          age,
          ageTicks,
          isAlive: true,
          isGone: false,
          activity: "IDLE",
          currentAction: age === "OLD" ? "повільно рухається" : "прислухається",
        })),
      });
    }

    const batchNote = plan.batches.length > 1 ? `\nСтворено батчами по ${ADD_CREATURE_BATCH_SIZE}, щоб не робити один важкий запис.` : "";
    const capNote = plan.capped ? `\nЗапитано ${plan.requestedCount}, разова межа команди: ${plan.count}.` : "";
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Creature added",
        description: `Added ${speciesKey} ×${plan.count} (${age}) to ${location.key}; requested=${plan.requestedCount}; batches=${plan.batches.join("+")}.`,
        locationId: location.id,
      },
    });
    await ctx.reply(`✅ Додано: ${species.name} ×${plan.count} (${age}) → ${location.name} (${location.x},${location.y},${location.z})${batchNote}${capNote}`);
  }

  bot.command(["addCreature", "addcreature"], (ctx) => runAddCreatureCommand(ctx));
  bot.hears(ADD_CREATURE_TEXT_COMMAND, (ctx) => runAddCreatureCommand(ctx, String(ctx.match?.[1] ?? "").trim()));

  async function runAddCreatureCorpseCommand(ctx: any, rawArgs = String(ctx.match ?? "")) {
    if (!(await requireScribeAdmin(ctx))) return;

    const { speciesKey, locationArg, requestedCount, age, freshness } = parseAddCreatureCorpseArgs(rawArgs);
    const plan = planAddCreatureBatches(requestedCount);
    const formatText = `⚠️ Формат: /addCreatureCorpse <speciesKey> [locationKey|x,y,z] [count] [YOUNG|ADULT|OLD] [fresh|decaying|old]\nБез місцини команда бере поточну місцину Писаря.\nПонад ${ADD_CREATURE_BATCH_SIZE} створюється кількома батчами. Разова межа: ${ADD_CREATURE_MAX_COUNT}.\nНаприклад: /addCreatureCorpse mouse або /addCreatureCorpse rabbit forest_04_00 3 OLD`;

    if (!speciesKey || !Number.isFinite(plan.count)) return void (await ctx.reply(formatText));

    const species = await prisma.creatureSpecies.findUnique({ where: { key: speciesKey } });
    if (!species) return void (await ctx.reply(`⚠️ Невідомий вид: ${speciesKey}. Спробуй /addCreatureHelp.`));
    if (species.kind !== "ANIMAL") return void (await ctx.reply("⚠️ /addCreatureCorpse зараз призначена для тварин. Унікальні NPC керуються seed/cleanup."));

    let location = locationArg ? await findLocationByKeyOrCoords(locationArg) : null;
    if (!location && !locationArg && ctx.from) {
      const player = await getPlayerByTelegramId(ctx.from.id);
      location = player?.currentLocationId ? await prisma.cellLocation.findUnique({ where: { id: player.currentLocationId } }) : null;
    }
    if (!location) {
      return void (await ctx.reply(locationArg
        ? `⚠️ Невідома місцина: ${locationArg}. Спробуй /locationAll, реальний ключ на кшталт forest_04_00 або координати типу 0,0,0.`
        : `${formatText}\n\nСпершу увійди у світ через /start, щоб команда могла взяти поточну місцину.`
      ));
    }

    const ageTicks = ageTicksFor(species, age);
    const maxHp = hpForAge(species, age);
    const corpseDecayTicksLeft = corpseDecayTicksForFreshness(species.corpseDecayTicks, freshness);
    const currentAction = freshness === "fresh"
      ? "лежить нерухомо"
      : freshness === "decaying"
        ? "починає розкладатися"
        : "майже розклалося";

    for (const batchCount of plan.batches) {
      await prisma.creature.createMany({
        data: Array.from({ length: batchCount }, () => ({
          speciesId: species.id,
          locationId: location.id,
          hp: 0,
          maxHp,
          sex: Math.random() < 0.5 ? "MALE" : "FEMALE",
          age: CreatureAge.CORPSE,
          ageTicks,
          diedAtTick: null,
          corpseDecayTicksLeft,
          isAlive: false,
          isGone: false,
          activity: "RESTING",
          currentAction,
        })),
      });
    }

    const batchNote = plan.batches.length > 1 ? `\nСтворено батчами по ${ADD_CREATURE_BATCH_SIZE}, щоб не робити один важкий запис.` : "";
    const capNote = plan.capped ? `\nЗапитано ${plan.requestedCount}, разова межа команди: ${plan.count}.` : "";
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Creature corpses added",
        description: `Added corpse ${speciesKey} ×${plan.count} (${age}, ${freshness}) to ${location.key}; requested=${plan.requestedCount}; batches=${plan.batches.join("+")}.`,
        locationId: location.id,
      },
    });
    await ctx.reply(`✅ Додано трупи: ${species.name} ×${plan.count} (${age}, ${freshness}) → ${location.name} (${location.x},${location.y},${location.z})${batchNote}${capNote}`);
  }

  bot.command(["addCreatureCorpse", "addcreaturecorpse"], (ctx) => runAddCreatureCorpseCommand(ctx));
  bot.hears(ADD_CREATURE_CORPSE_TEXT_COMMAND, (ctx) => runAddCreatureCorpseCommand(ctx, String(ctx.match?.[1] ?? "").trim()));

  async function runForceOldCommand(ctx: any, rawArgs = String(ctx.match ?? "")) {
    if (!(await requireScribeAdmin(ctx))) return;

    if (!ctx.from) return;
    const args = rawArgs.trim().split(/\s+/).filter(Boolean);
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
  }

  bot.command(["forceOld", "forceold"], (ctx) => runForceOldCommand(ctx));
  bot.hears(FORCE_OLD_TEXT_COMMAND, (ctx) => runForceOldCommand(ctx, String(ctx.match?.[1] ?? "")));
}
