import { prisma } from "../db";

export const DEFAULT_LEARNING_SOURCE_KEY = "practice";
export const DEFAULT_LEARNING_CONTEXT_KEY = "general";

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

type LearningDb = Pick<typeof prisma, "characterLearningProgress">;

function cleanKey(value: string | undefined, fallback: string) {
  const key = value?.trim();
  return key ? key.slice(0, 96) : fallback;
}

export function normalizeLearningAmount(amount = 1) {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.floor(amount));
}

export function applyLearningProgress(current: LearningProgressState, input: { amount?: number; milestoneEvery?: number }): LearningProgressDelta {
  const amount = normalizeLearningAmount(input.amount);
  const previousTotalProgress = Math.max(0, Math.floor(current.totalProgress));
  const previousMilestoneCount = Math.max(0, Math.floor(current.milestoneCount));
  const milestoneEvery = input.milestoneEvery && input.milestoneEvery > 0 ? Math.floor(input.milestoneEvery) : 0;
  const totalProgress = previousTotalProgress + amount;
  const milestoneCount = milestoneEvery > 0
    ? Math.max(previousMilestoneCount, Math.floor(totalProgress / milestoneEvery))
    : previousMilestoneCount;

  return {
    level: Math.max(0, Math.floor(current.level)),
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

export async function maybeRecordLearningMilestone(input: RecordLearningProgressInput, db: LearningDb = prisma) {
  const result = await recordLearningProgress(input, db);
  return result.milestone ? result : null;
}
