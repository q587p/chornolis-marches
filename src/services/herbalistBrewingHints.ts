import { prisma } from "../db";
import { escapeHtml } from "../utils/text";
import { EMPTY_BOTTLE_KEY } from "./bottles";
import { HERBALISM_HERBAL_TINCTURE_CONTEXT_KEY, HERBALISM_PRACTICE_SOURCE_KEY, HERBALISM_SKILL_KEY } from "./herbalism";
import { learningLevelForTotalProgress } from "./learning";
import { createWorldEventMarker, findRecentWorldEventMarker } from "./worldEventMarkers";

export const HERBALIST_BREWING_HINT_MARKER_KEY = "herbalist_brewing_hint:v1";
export const HERBALIST_BREWING_HINT_EVENT_TITLE = "Herbalist brewing hint";
export const HERBALIST_BREWING_HINT_CONTEXT_KEY = "bottle_tincture_intro";
export const HERBALIST_BREWING_HINT_DEDUPE_MS = Number(process.env.HERBALIST_BREWING_HINT_DEDUPE_MS || 100 * 365 * 24 * 60 * 60 * 1000);
export const HERBALIST_BREWING_HINT_CHANCE = Number(process.env.HERBALIST_BREWING_HINT_CHANCE || 0.35);

const ROOT_POCKET_BOTTLE_NICHE_KEY = "start_root_pocket_bottle_niche";
const HERBALIST_PROFESSION_PATTERN = /(herbalist|znakhar|travnyk|travnytsia|healer|трав|знах|лікар|відун|зіл|корен)/iu;

type LearningProgressRowLike = {
  skillKey?: string | null;
  level?: number | null;
  progress?: number | null;
  totalProgress?: number | null;
  milestoneCount?: number | null;
};

type HerbalistCreatureLike = {
  professionKey?: string | null;
  professionName?: string | null;
  isAlive?: boolean | null;
  isGone?: boolean | null;
  isHidden?: boolean | null;
  species?: { kind?: string | null; key?: string | null; name?: string | null } | null;
};

type HerbalistBrewingHintDb = {
  cellLocation?: any;
  characterLearningProgress?: any;
  creature?: any;
  locationFeature?: any;
  playerMentorship?: any;
  resourceType?: any;
  worldEvent?: any;
  worldEventMarker?: any;
};

export type HerbalistBrewingHintEligibilityInput = {
  hasBottleSourceImplemented: boolean;
  hasCraftedHerbalTincture: boolean;
  hasSeenHint: boolean;
  gatheringLevel?: number;
  herbalismLevel?: number;
  gatheringMilestoneCount?: number;
  herbalismMilestoneCount?: number;
  hasActiveHerbalistMentor?: boolean;
  nearbyHerbalistCount?: number;
  hasRelevantLearningProgress?: boolean;
};

export type HerbalistBrewingHintResult =
  | {
      ok: true;
      text: string;
      marker: any;
      event?: any;
    }
  | {
      ok: false;
      reason:
        | "already-tried-brewing"
        | "already-seen"
        | "bottle-source-missing"
        | "chance"
        | "dream-location"
        | "ineligible"
        | "missing-marker-storage";
    };

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value ?? 0)) : 0;
}

export function isHerbalistBrewingHintEligible(input: HerbalistBrewingHintEligibilityInput): boolean {
  if (!input.hasBottleSourceImplemented) return false;
  if (input.hasCraftedHerbalTincture) return false;
  if (input.hasSeenHint) return false;

  const hasHerbalistNearby = (input.nearbyHerbalistCount ?? 0) > 0 || input.hasActiveHerbalistMentor === true;
  if (!hasHerbalistNearby) return false;

  const gatheringLevel = safeNumber(input.gatheringLevel);
  const herbalismLevel = safeNumber(input.herbalismLevel);
  const gatheringMilestoneCount = safeNumber(input.gatheringMilestoneCount);
  const herbalismMilestoneCount = safeNumber(input.herbalismMilestoneCount);

  return herbalismLevel >= 1 ||
    gatheringLevel >= 2 ||
    gatheringMilestoneCount >= 2 ||
    herbalismMilestoneCount >= 1 ||
    (input.hasActiveHerbalistMentor === true && input.hasRelevantLearningProgress === true);
}

function quoteBlock(text: string) {
  return `<blockquote>${escapeHtml(text)}</blockquote>`;
}

export function herbalistBrewingHintText(style: "long" | "short" = "long") {
  if (style === "short") {
    return [
      "Знахарські очі спиняються не на торбі, а на ваших пальцях.",
      quoteBlock("Траву можна не тільки носити. Під погребом є стара ніша з пляшечками. Коли руки дозріють до настоянки, згадайте про неї."),
    ].join("\n");
  }

  return [
    "Знахарські очі спиняються не на торбі, а на ваших пальцях.",
    quoteBlock("Вже не просто рвете траву. Добре. Якщо ще не пробували настоювати — під погребом є коренева кишеня. Там лишають пляшечки для тих, хто не плутає поспіх із умінням."),
  ].join("\n");
}

export function isHerbalistLikeCreature(creature: HerbalistCreatureLike | null | undefined) {
  if (!creature) return false;
  if (creature.isAlive === false || creature.isGone || creature.isHidden) return false;
  if (creature.species?.kind === "ANIMAL") return false;
  const profile = `${creature.professionKey ?? ""} ${creature.professionName ?? ""} ${creature.species?.key ?? ""} ${creature.species?.name ?? ""}`;
  return HERBALIST_PROFESSION_PATTERN.test(profile);
}

function maxLearningLevel(rows: LearningProgressRowLike[], skillKey: string) {
  return Math.max(
    0,
    ...rows
      .filter((row) => row.skillKey === skillKey)
      .map((row) => Math.max(safeNumber(row.level), learningLevelForTotalProgress(row.totalProgress ?? 0))),
  );
}

function maxMilestoneCount(rows: LearningProgressRowLike[], skillKey: string) {
  return Math.max(0, ...rows.filter((row) => row.skillKey === skillKey).map((row) => safeNumber(row.milestoneCount)));
}

function hasAnyLearningProgress(rows: LearningProgressRowLike[], skillKeys: string[]) {
  const keys = new Set(skillKeys);
  return rows.some((row) => Boolean(
    row.skillKey &&
    keys.has(row.skillKey) &&
    (safeNumber(row.progress) > 0 || safeNumber(row.totalProgress) > 0 || safeNumber(row.milestoneCount) > 0 || safeNumber(row.level) > 0),
  ));
}

function chanceAllows(input: { chance?: number; random?: () => number }) {
  const chance = Number.isFinite(input.chance) ? Math.max(0, Math.min(1, input.chance ?? HERBALIST_BREWING_HINT_CHANCE)) : HERBALIST_BREWING_HINT_CHANCE;
  if (chance >= 1) return true;
  if (chance <= 0) return false;
  return (input.random ?? Math.random)() < chance;
}

async function hasBottleSourceImplemented(db: HerbalistBrewingHintDb) {
  if (!db.resourceType || !db.locationFeature) return false;
  const [bottle, niche] = await Promise.all([
    db.resourceType.findUnique({ where: { key: EMPTY_BOTTLE_KEY }, select: { id: true } }),
    db.locationFeature.findFirst({ where: { key: ROOT_POCKET_BOTTLE_NICHE_KEY, isActive: true }, select: { id: true } }),
  ]);
  return Boolean(bottle && niche);
}

async function isDreamLocation(locationId: number | null | undefined, db: HerbalistBrewingHintDb) {
  if (!locationId || !db.cellLocation) return false;
  const location = await db.cellLocation.findUnique({ where: { id: locationId }, select: { z: true } });
  return (location?.z ?? 0) <= -10;
}

async function hasSeenHerbalistBrewingHint(playerId: number, now: Date, db: HerbalistBrewingHintDb) {
  if (!db.worldEventMarker || HERBALIST_BREWING_HINT_DEDUPE_MS <= 0) return false;
  return Boolean(await findRecentWorldEventMarker({
    markerKey: HERBALIST_BREWING_HINT_MARKER_KEY,
    scopeType: "PLAYER",
    playerId,
    contextKey: HERBALIST_BREWING_HINT_CONTEXT_KEY,
    cooldownMs: HERBALIST_BREWING_HINT_DEDUPE_MS,
    now,
  }, db as any));
}

async function hasTriedHerbalTinctureBrewing(playerId: number, db: HerbalistBrewingHintDb) {
  if (!db.characterLearningProgress) return false;
  const row = await db.characterLearningProgress.findFirst({
    where: {
      playerId,
      skillKey: HERBALISM_SKILL_KEY,
      sourceKey: HERBALISM_PRACTICE_SOURCE_KEY,
      contextKey: HERBALISM_HERBAL_TINCTURE_CONTEXT_KEY,
      OR: [
        { progress: { gt: 0 } },
        { totalProgress: { gt: 0 } },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

async function learningRowsForHint(playerId: number, db: HerbalistBrewingHintDb): Promise<LearningProgressRowLike[]> {
  if (!db.characterLearningProgress) return [];
  return db.characterLearningProgress.findMany({
    where: {
      playerId,
      skillKey: { in: ["gathering", HERBALISM_SKILL_KEY] },
    },
    select: { skillKey: true, level: true, progress: true, totalProgress: true, milestoneCount: true },
  });
}

async function activeHerbalistMentor(input: { playerId: number; mentorCreatureId?: number | null }, db: HerbalistBrewingHintDb) {
  if (!db.playerMentorship) return null;
  const mentorship = await db.playerMentorship.findFirst({
    where: {
      playerId: input.playerId,
      status: "ACTIVE",
      skillKey: "gathering",
      ...(input.mentorCreatureId ? { mentorCreatureId: input.mentorCreatureId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { mentorCreature: { include: { species: true } } },
  });
  return mentorship && isHerbalistLikeCreature(mentorship.mentorCreature) ? mentorship : null;
}

async function nearbyHerbalistCount(input: { locationId?: number | null; mentorCreatureId?: number | null }, db: HerbalistBrewingHintDb) {
  if (!db.creature) return 0;
  if (input.mentorCreatureId) {
    const mentor = await db.creature.findUnique({
      where: { id: input.mentorCreatureId },
      include: { species: true },
    });
    if (!isHerbalistLikeCreature(mentor)) return 0;
    if (input.locationId && mentor.locationId !== input.locationId) return 0;
    return 1;
  }
  if (!input.locationId) return 0;
  const creatures = await db.creature.findMany({
    where: {
      locationId: input.locationId,
      isAlive: true,
      isGone: false,
      isHidden: false,
    },
    include: { species: true },
    take: 12,
  });
  return creatures.filter(isHerbalistLikeCreature).length;
}

export async function maybeHerbalistBrewingHintForPlayer(
  playerId: number,
  options: {
    locationId?: number | null;
    mentorCreatureId?: number | null;
    now?: Date;
    chance?: number;
    random?: () => number;
    style?: "long" | "short";
  } = {},
  db: HerbalistBrewingHintDb = prisma as any,
): Promise<HerbalistBrewingHintResult> {
  if (!db.worldEventMarker) return { ok: false, reason: "missing-marker-storage" };

  const now = options.now ?? new Date();
  if (await isDreamLocation(options.locationId, db)) return { ok: false, reason: "dream-location" };

  const [
    bottleSourceImplemented,
    alreadySeen,
    triedBrewing,
    rows,
    mentorship,
    nearbyCount,
  ] = await Promise.all([
    hasBottleSourceImplemented(db),
    hasSeenHerbalistBrewingHint(playerId, now, db),
    hasTriedHerbalTinctureBrewing(playerId, db),
    learningRowsForHint(playerId, db),
    activeHerbalistMentor({ playerId, mentorCreatureId: options.mentorCreatureId }, db),
    nearbyHerbalistCount({ locationId: options.locationId, mentorCreatureId: options.mentorCreatureId }, db),
  ]);

  if (!bottleSourceImplemented) return { ok: false, reason: "bottle-source-missing" };
  if (triedBrewing) return { ok: false, reason: "already-tried-brewing" };
  if (alreadySeen) return { ok: false, reason: "already-seen" };

  const eligible = isHerbalistBrewingHintEligible({
    hasBottleSourceImplemented: bottleSourceImplemented,
    hasCraftedHerbalTincture: triedBrewing,
    hasSeenHint: alreadySeen,
    gatheringLevel: maxLearningLevel(rows, "gathering"),
    herbalismLevel: maxLearningLevel(rows, HERBALISM_SKILL_KEY),
    gatheringMilestoneCount: maxMilestoneCount(rows, "gathering"),
    herbalismMilestoneCount: maxMilestoneCount(rows, HERBALISM_SKILL_KEY),
    hasActiveHerbalistMentor: Boolean(mentorship),
    nearbyHerbalistCount: nearbyCount,
    hasRelevantLearningProgress: hasAnyLearningProgress(rows, ["gathering", HERBALISM_SKILL_KEY]),
  });
  if (!eligible) return { ok: false, reason: "ineligible" };
  if (!chanceAllows(options)) return { ok: false, reason: "chance" };

  const event = db.worldEvent
    ? await db.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: HERBALIST_BREWING_HINT_EVENT_TITLE,
        description: [
          `player=${playerId}`,
          options.mentorCreatureId ? `mentorCreature=${options.mentorCreatureId}` : null,
          options.locationId ? `location=${options.locationId}` : null,
          `marker=${HERBALIST_BREWING_HINT_MARKER_KEY}`,
        ].filter(Boolean).join("; "),
        playerId,
        locationId: options.locationId ?? undefined,
        ...(options.now ? { createdAt: now } : {}),
      },
    })
    : undefined;

  const marker = await createWorldEventMarker({
    markerKey: HERBALIST_BREWING_HINT_MARKER_KEY,
    scopeType: "PLAYER",
    playerId,
    locationId: options.locationId,
    contextKey: HERBALIST_BREWING_HINT_CONTEXT_KEY,
    worldEventId: event?.id,
    ttlMs: HERBALIST_BREWING_HINT_DEDUPE_MS,
    now,
    metadata: {
      mentorCreatureId: options.mentorCreatureId,
      context: HERBALIST_BREWING_HINT_CONTEXT_KEY,
    },
  }, db as any);

  return {
    ok: true,
    text: herbalistBrewingHintText(options.style),
    marker,
    event,
  };
}
