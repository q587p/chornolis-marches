import { prisma } from "../db";

export const DEFAULT_LEARNING_SOURCE_KEY = "practice";
export const DEFAULT_LEARNING_CONTEXT_KEY = "general";
export const LEARNING_LEVEL_THRESHOLDS = [0, 3, 8, 18, 35, 60] as const;
export const MAX_LEARNING_LEVEL = LEARNING_LEVEL_THRESHOLDS.length - 1;
export const LEARNING_LEVEL_LABELS = [
  "unfamiliar",
  "noticed",
  "practiced",
  "skilled",
  "seasoned",
  "masterful",
] as const;
export const LEARNING_QUALITATIVE_LEVEL_LABELS = [
  "ледве знайоме",
  "помічене",
  "призвичаєне",
  "уміле",
  "бувале",
  "майстерне",
] as const;

const LEARNING_SKILL_UKRAINIAN_LABELS: Record<string, string> = {
  attack: "атака",
  cooking: "готування",
  freshening: "свіжування",
  gathering: "збирання",
  herbalism: "травництво",
  hunting: "полювання",
  movement: "рух",
  stealth: "скрадливість",
  tracking: "сліди",
};

export type LearningProgressState = {
  level: number;
  progress: number;
  totalProgress: number;
  milestoneCount: number;
};

export type LearningProgressDelta = LearningProgressState & {
  amount: number;
  changed: boolean;
  milestone: boolean;
  previousTotalProgress: number;
  previousMilestoneCount: number;
};

export type RecordLearningProgressInput = {
  playerId: number;
  skillKey: string;
  amount?: number;
  sourceKey?: string;
  contextKey?: string;
  milestoneEvery?: number;
  lastSourceEventId?: number;
};

export type ActorLearningRef =
  | { actorType: "PLAYER"; playerId: number }
  | { actorType: "CREATURE"; creatureId: number };

export type RecordActorLearningProgressInput = Omit<RecordLearningProgressInput, "playerId">;

type LearningDb = Pick<typeof prisma, "characterLearningProgress"> & Partial<Pick<typeof prisma, "creatureLearningProgress" | "creature">>;

type LearningRowLike = {
  id?: number;
  playerId?: number | null;
  creatureId?: number | null;
  skillKey: string;
  sourceKey: string;
  contextKey: string;
  level: number;
  progress: number;
  totalProgress: number;
  milestoneCount: number;
  lastSourceEventId?: number | null;
  updatedAt?: Date | string | null;
};

function cleanKey(value: string | undefined, fallback: string) {
  const key = value?.trim();
  return key ? key.slice(0, 96) : fallback;
}

export function normalizeLearningAmount(amount = 1) {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.floor(amount));
}

export function learningLevelForTotalProgress(totalProgress: number) {
  const total = Math.max(0, Math.floor(Number.isFinite(totalProgress) ? totalProgress : 0));
  let level = 0;
  for (let index = 0; index < LEARNING_LEVEL_THRESHOLDS.length; index += 1) {
    if (total >= LEARNING_LEVEL_THRESHOLDS[index]) level = index;
  }
  return Math.min(MAX_LEARNING_LEVEL, level);
}

export function learningLevelLabel(level: number) {
  const safeLevel = Math.max(0, Math.min(MAX_LEARNING_LEVEL, Math.floor(Number.isFinite(level) ? level : 0)));
  return LEARNING_LEVEL_LABELS[safeLevel];
}

export function learningQualitativeLevelLabel(level: number) {
  const safeLevel = Math.max(0, Math.min(MAX_LEARNING_LEVEL, Math.floor(Number.isFinite(level) ? level : 0)));
  return LEARNING_QUALITATIVE_LEVEL_LABELS[safeLevel];
}

export function learningSkillDisplayName(skillKey: string) {
  const key = cleanKey(skillKey, "general");
  return LEARNING_SKILL_UKRAINIAN_LABELS[key] ?? key.replace(/[_:-]+/g, " ");
}

export function applyLearningProgress(current: LearningProgressState, input: { amount?: number; milestoneEvery?: number }): LearningProgressDelta {
  const amount = normalizeLearningAmount(input.amount);
  const previousTotalProgress = Math.max(0, Math.floor(current.totalProgress));
  const previousMilestoneCount = Math.max(0, Math.floor(current.milestoneCount));
  const milestoneEvery = input.milestoneEvery && input.milestoneEvery > 0 ? Math.floor(input.milestoneEvery) : 0;
  const totalProgress = previousTotalProgress + amount;
  const level = learningLevelForTotalProgress(totalProgress);
  const milestoneCount = milestoneEvery > 0
    ? Math.max(previousMilestoneCount, Math.floor(totalProgress / milestoneEvery))
    : previousMilestoneCount;

  return {
    level,
    progress: Math.max(0, Math.floor(current.progress)) + amount,
    totalProgress,
    milestoneCount,
    amount,
    changed: amount > 0,
    milestone: milestoneCount > previousMilestoneCount,
    previousTotalProgress,
    previousMilestoneCount,
  };
}

export async function getLearningProgress(input: {
  playerId: number;
  skillKey: string;
  sourceKey?: string;
  contextKey?: string;
}, db: LearningDb = prisma) {
  const skillKey = cleanKey(input.skillKey, "");
  if (!skillKey) return null;
  return db.characterLearningProgress.findUnique({
    where: {
      playerId_skillKey_sourceKey_contextKey: {
        playerId: input.playerId,
        skillKey,
        sourceKey: cleanKey(input.sourceKey, DEFAULT_LEARNING_SOURCE_KEY),
        contextKey: cleanKey(input.contextKey, DEFAULT_LEARNING_CONTEXT_KEY),
      },
    },
  });
}

export async function recordLearningProgress(input: RecordLearningProgressInput, db: LearningDb = prisma) {
  const skillKey = cleanKey(input.skillKey, "");
  if (!skillKey) throw new Error("Learning skillKey is required.");

  const sourceKey = cleanKey(input.sourceKey, DEFAULT_LEARNING_SOURCE_KEY);
  const contextKey = cleanKey(input.contextKey, DEFAULT_LEARNING_CONTEXT_KEY);
  const existing = await db.characterLearningProgress.findUnique({
    where: { playerId_skillKey_sourceKey_contextKey: { playerId: input.playerId, skillKey, sourceKey, contextKey } },
  });
  const current: LearningProgressState = existing
    ? {
        level: existing.level,
        progress: existing.progress,
        totalProgress: existing.totalProgress,
        milestoneCount: existing.milestoneCount,
      }
    : { level: 0, progress: 0, totalProgress: 0, milestoneCount: 0 };
  const next = applyLearningProgress(current, input);

  const row = existing
    ? await db.characterLearningProgress.update({
        where: { id: existing.id },
        data: {
          level: next.level,
          progress: next.progress,
          totalProgress: next.totalProgress,
          milestoneCount: next.milestoneCount,
          ...(input.lastSourceEventId ? { lastSourceEventId: input.lastSourceEventId } : {}),
        },
      })
    : await db.characterLearningProgress.create({
        data: {
          playerId: input.playerId,
          skillKey,
          sourceKey,
          contextKey,
          level: next.level,
          progress: next.progress,
          totalProgress: next.totalProgress,
          milestoneCount: next.milestoneCount,
          lastSourceEventId: input.lastSourceEventId,
        },
      });

  return {
    ...next,
    id: row.id,
    playerId: row.playerId,
    skillKey: row.skillKey,
    sourceKey: row.sourceKey,
    contextKey: row.contextKey,
    created: !existing,
  };
}

export async function recordCreatureLearningProgress(input: RecordActorLearningProgressInput & { creatureId: number }, db: LearningDb = prisma) {
  const skillKey = cleanKey(input.skillKey, "");
  if (!skillKey) throw new Error("Learning skillKey is required.");
  if (!db.creatureLearningProgress) throw new Error("Creature learning storage is not available.");

  const sourceKey = cleanKey(input.sourceKey, DEFAULT_LEARNING_SOURCE_KEY);
  const contextKey = cleanKey(input.contextKey, DEFAULT_LEARNING_CONTEXT_KEY);
  const existing = await db.creatureLearningProgress.findUnique({
    where: { creatureId_skillKey_sourceKey_contextKey: { creatureId: input.creatureId, skillKey, sourceKey, contextKey } },
  });
  const current: LearningProgressState = existing
    ? {
        level: existing.level,
        progress: existing.progress,
        totalProgress: existing.totalProgress,
        milestoneCount: existing.milestoneCount,
      }
    : { level: 0, progress: 0, totalProgress: 0, milestoneCount: 0 };
  const next = applyLearningProgress(current, input);

  const row = existing
    ? await db.creatureLearningProgress.update({
        where: { id: existing.id },
        data: {
          level: next.level,
          progress: next.progress,
          totalProgress: next.totalProgress,
          milestoneCount: next.milestoneCount,
          ...(input.lastSourceEventId ? { lastSourceEventId: input.lastSourceEventId } : {}),
        },
      })
    : await db.creatureLearningProgress.create({
        data: {
          creatureId: input.creatureId,
          skillKey,
          sourceKey,
          contextKey,
          level: next.level,
          progress: next.progress,
          totalProgress: next.totalProgress,
          milestoneCount: next.milestoneCount,
          lastSourceEventId: input.lastSourceEventId,
        },
      });

  return {
    ...next,
    id: row.id,
    creatureId: row.creatureId,
    skillKey: row.skillKey,
    sourceKey: row.sourceKey,
    contextKey: row.contextKey,
    created: !existing,
  };
}

export function actorLearningInput(actor: ActorLearningRef, input: RecordActorLearningProgressInput) {
  return actor.actorType === "PLAYER"
    ? { ...input, playerId: actor.playerId }
    : { ...input, creatureId: actor.creatureId };
}

export async function recordActorLearningProgress(actor: ActorLearningRef, input: RecordActorLearningProgressInput, db: LearningDb = prisma) {
  return actor.actorType === "PLAYER"
    ? recordLearningProgress({ ...input, playerId: actor.playerId }, db)
    : recordCreatureLearningProgress({ ...input, creatureId: actor.creatureId }, db);
}

export async function getCreatureLearningProgress(input: {
  creatureId: number;
  skillKey: string;
  sourceKey?: string;
  contextKey?: string;
}, db: LearningDb = prisma) {
  const skillKey = cleanKey(input.skillKey, "");
  if (!skillKey || !db.creatureLearningProgress) return null;
  return db.creatureLearningProgress.findUnique({
    where: {
      creatureId_skillKey_sourceKey_contextKey: {
        creatureId: input.creatureId,
        skillKey,
        sourceKey: cleanKey(input.sourceKey, DEFAULT_LEARNING_SOURCE_KEY),
        contextKey: cleanKey(input.contextKey, DEFAULT_LEARNING_CONTEXT_KEY),
      },
    },
  });
}

export async function getActorLearningProgress(actor: ActorLearningRef, input: {
  skillKey: string;
  sourceKey?: string;
  contextKey?: string;
}, db: LearningDb = prisma) {
  return actor.actorType === "PLAYER"
    ? getLearningProgress({ ...input, playerId: actor.playerId }, db)
    : getCreatureLearningProgress({ ...input, creatureId: actor.creatureId }, db);
}

export async function learningRowsForActor(actor: ActorLearningRef, db: LearningDb = prisma): Promise<LearningRowLike[]> {
  const orderBy = [
    { level: "desc" as const },
    { totalProgress: "desc" as const },
    { skillKey: "asc" as const },
    { sourceKey: "asc" as const },
    { contextKey: "asc" as const },
  ];
  if (actor.actorType === "PLAYER") {
    return db.characterLearningProgress.findMany({ where: { playerId: actor.playerId }, orderBy, take: 50 });
  }
  if (!db.creatureLearningProgress) return [];
  return db.creatureLearningProgress.findMany({ where: { creatureId: actor.creatureId }, orderBy, take: 50 });
}

export function learningSummaryFromRows(rows: LearningRowLike[], limit = 5) {
  const bySkill = new Map<string, { skillKey: string; level: number; totalProgress: number }>();
  for (const row of rows) {
    const previous = bySkill.get(row.skillKey);
    const level = Math.max(row.level ?? 0, learningLevelForTotalProgress(row.totalProgress ?? 0));
    const totalProgress = Math.max(0, Math.floor(row.totalProgress ?? 0));
    if (!previous) {
      bySkill.set(row.skillKey, { skillKey: row.skillKey, level, totalProgress });
      continue;
    }
    previous.level = Math.max(previous.level, level);
    previous.totalProgress += totalProgress;
  }

  return [...bySkill.values()]
    .filter((entry) => entry.level > 0 || entry.totalProgress > 0)
    .sort((a, b) => b.level - a.level || b.totalProgress - a.totalProgress || a.skillKey.localeCompare(b.skillKey))
    .slice(0, limit);
}

export function formatLearningSummary(rows: LearningRowLike[], options: { limit?: number; prefix?: string } = {}) {
  const summary = learningSummaryFromRows(rows, options.limit ?? 5);
  if (!summary.length) return "";
  const entries = summary.map((entry) => `${learningSkillDisplayName(entry.skillKey)} — ${learningQualitativeLevelLabel(entry.level)}`);
  return `${options.prefix ?? "Навички"}: ${entries.join("; ")}.`;
}

export function formatLearningTechnicalRows(actor: ActorLearningRef, rows: LearningRowLike[]) {
  if (!rows.length) return ["Learning rows: none."];
  return rows.map((row) => [
    `actor=${actor.actorType === "PLAYER" ? `player:${actor.playerId}` : `creature:${actor.creatureId}`}`,
    `skillKey=${row.skillKey}`,
    `sourceKey=${row.sourceKey}`,
    `contextKey=${row.contextKey}`,
    `level=${row.level}`,
    `progress=${row.progress}`,
    `totalProgress=${row.totalProgress}`,
    `milestoneCount=${row.milestoneCount}`,
    `lastSourceEventId=${row.lastSourceEventId ?? "none"}`,
    `updatedAt=${row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt ?? "unknown"}`,
  ].join("; "));
}

function defaultCreatureLearningLevel(creature: {
  professionKey?: string | null;
  professionName?: string | null;
  species?: { key?: string | null; diet?: string | null; kind?: string | null } | null;
}, skillKey: string) {
  const profession = `${creature.professionKey ?? ""} ${creature.professionName ?? ""}`.toLowerCase();
  if (/(herbalist|znakhar|travnytsia|трав|знах)/u.test(profession)) {
    if (skillKey === "gathering" || skillKey === "herbalism") return 3;
    if (skillKey === "freshening" || skillKey === "cooking") return 1;
  }
  if (/(hunter|мислив)/u.test(profession)) {
    if (skillKey === "tracking" || skillKey === "hunting") return 3;
    if (skillKey === "freshening" || skillKey === "attack") return 2;
  }
  if (creature.species?.diet === "CARNIVORE" && (skillKey === "tracking" || skillKey === "hunting")) return 1;
  return 0;
}

export async function observedActorSkillLevel(actor: ActorLearningRef, skillKey: string, db: LearningDb = prisma) {
  const rows = await learningRowsForActor(actor, db);
  const storedLevel = Math.max(
    0,
    ...rows
      .filter((row) => row.skillKey === skillKey)
      .map((row) => Math.max(row.level ?? 0, learningLevelForTotalProgress(row.totalProgress ?? 0))),
  );
  if (actor.actorType === "PLAYER") return storedLevel;

  const creature = db.creature
    ? await db.creature.findUnique({
        where: { id: actor.creatureId },
        select: { professionKey: true, professionName: true, species: { select: { key: true, diet: true, kind: true } } },
      })
    : null;
  return Math.max(storedLevel, creature ? defaultCreatureLearningLevel(creature, skillKey) : 0);
}

export function observedCreatureDefaultLearningRows(creature: {
  professionKey?: string | null;
  professionName?: string | null;
  species?: { key?: string | null; diet?: string | null; kind?: string | null } | null;
}) {
  return ["gathering", "herbalism", "freshening", "cooking", "tracking", "hunting", "attack"]
    .map((skillKey) => ({
      skillKey,
      sourceKey: "profile",
      contextKey: "default",
      level: defaultCreatureLearningLevel(creature, skillKey),
      progress: 0,
      totalProgress: 0,
      milestoneCount: 0,
    }))
    .filter((row) => row.level > 0);
}

export async function maybeRecordLearningMilestone(input: RecordLearningProgressInput, db: LearningDb = prisma) {
  const result = await recordLearningProgress(input, db);
  return result.milestone ? result : null;
}
