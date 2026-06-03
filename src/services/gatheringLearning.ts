import { prisma } from "../db";
import {
  GATHERING_PRACTICE_ATTEMPT_INTERVAL,
  GATHERING_OBSERVATION_INTERVAL,
  GATHERING_OBSERVATION_EVENT_TITLE,
  GATHERING_OBSERVATION_MILESTONE_EVENT_TITLE,
  GATHERING_SOURCE_EVENT_TITLE,
  gatheringObservationDescription,
  gatheringSourceDescription,
} from "./gatheringLearningRules";
import { learningLevelForTotalProgress, recordLearningProgress } from "./learning";

export {
  GATHERING_OBSERVATION_GROWTH_MESSAGE,
  GATHERING_PRACTICE_GROWTH_MESSAGE,
  gatheringObservationDescription,
  gatheringSourceDescription,
  isGatheringObservationMilestone,
  isGatheringPracticeMilestone,
} from "./gatheringLearningRules";

const GATHERING_OBSERVATION_WINDOW_MS = Number(process.env.WORLD_GATHERING_OBSERVATION_WINDOW_MS || 120_000);
const GATHERING_OBSERVATION_SOURCE_SCAN_LIMIT = 8;
const GATHERING_SKILL_SUCCESS_BONUS_PER_LEVEL = 0.03;
const GATHERING_SKILL_SUCCESS_BONUS_CAP = 0.15;
const GATHERING_SKILL_SUCCESS_CHANCE_CAP = 0.95;
const GATHERING_SKILL_STAMINA_FLOOR = 3;

type GatheringLearningDb = {
  worldEvent: {
    findFirst: (...args: any[]) => Promise<any>;
    findMany: (...args: any[]) => Promise<any[]>;
    create: (...args: any[]) => Promise<any>;
    count: (...args: any[]) => Promise<number>;
  };
  characterLearningProgress: any;
};

const OBSERVABLE_GATHERING_RESOURCE_KEYS = new Set(["berries", "mushrooms", "herbs"]);
const GATHERING_SKILL_RESOURCE_KEYS = OBSERVABLE_GATHERING_RESOURCE_KEYS;

export function gatheringLearningContextKeyForResource(resourceKey: string | null | undefined) {
  return resourceKey && OBSERVABLE_GATHERING_RESOURCE_KEYS.has(resourceKey)
    ? `resource:${resourceKey}`
    : null;
}

export function observableGatheringContextKey(sourceDescription: string | null | undefined) {
  const resourceKey = sourceDescription?.match(/(?:^|;\s*)resource=([A-Za-z0-9_-]+)/u)?.[1];
  return gatheringLearningContextKeyForResource(resourceKey);
}

export type GatheringSkillEffect = {
  supported: boolean;
  level: number;
  successChanceBonus: number;
  successChance: number;
  staminaCostReduction: number;
  staminaCost: number;
};

type GatheringProgressRow = {
  level?: number | null;
  totalProgress?: number | null;
};

export function gatheringSkillEffectForProgressRows(input: {
  resourceKey?: string | null;
  baseSuccessChance: number;
  baseStaminaCost: number;
  progressRows?: GatheringProgressRow[];
}): GatheringSkillEffect {
  const supported = Boolean(input.resourceKey && GATHERING_SKILL_RESOURCE_KEYS.has(input.resourceKey));
  const baseSuccessChance = Number.isFinite(input.baseSuccessChance) ? input.baseSuccessChance : 0;
  const baseStaminaCost = Number.isFinite(input.baseStaminaCost) ? Math.max(0, Math.floor(input.baseStaminaCost)) : 0;
  if (!supported) {
    return {
      supported: false,
      level: 0,
      successChanceBonus: 0,
      successChance: baseSuccessChance,
      staminaCostReduction: 0,
      staminaCost: baseStaminaCost,
    };
  }

  const level = Math.max(
    0,
    ...(input.progressRows ?? []).map((row) => Math.max(
      Number.isFinite(row.level) ? Math.floor(row.level ?? 0) : 0,
      learningLevelForTotalProgress(row.totalProgress ?? 0),
    )),
  );
  const successChanceBonus = Math.min(GATHERING_SKILL_SUCCESS_BONUS_CAP, level * GATHERING_SKILL_SUCCESS_BONUS_PER_LEVEL);
  const staminaCostReduction = level >= 4 ? 2 : level >= 2 ? 1 : 0;

  return {
    supported: true,
    level,
    successChanceBonus,
    successChance: Math.min(GATHERING_SKILL_SUCCESS_CHANCE_CAP, baseSuccessChance + successChanceBonus),
    staminaCostReduction,
    staminaCost: Math.max(GATHERING_SKILL_STAMINA_FLOOR, baseStaminaCost - staminaCostReduction),
  };
}

export async function gatheringSkillEffectForPlayer(input: {
  playerId: number;
  resourceKey?: string | null;
  baseSuccessChance: number;
  baseStaminaCost: number;
}, db: Pick<typeof prisma, "characterLearningProgress"> = prisma) {
  if (!input.resourceKey || !GATHERING_SKILL_RESOURCE_KEYS.has(input.resourceKey)) {
    return gatheringSkillEffectForProgressRows(input);
  }

  const contextKey = `resource:${input.resourceKey}`;
  const progressRows = await db.characterLearningProgress.findMany({
    where: {
      playerId: input.playerId,
      skillKey: "gathering",
      OR: [
        { contextKey },
        { contextKey: "general" },
      ],
    },
    select: { level: true, totalProgress: true },
  });

  return gatheringSkillEffectForProgressRows({ ...input, progressRows });
}

export async function recordGatheringSource(input: {
  locationId: number;
  actorPlayerId?: number;
  actorCreatureId?: number;
  resourceKey?: string;
  success: boolean;
  skipCanonicalPractice?: boolean;
}, db: GatheringLearningDb = prisma) {
  let sourceEventId: number | undefined;
  let sourceRecorded = false;
  try {
    const sourceEvent = await db.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: GATHERING_SOURCE_EVENT_TITLE,
        description: gatheringSourceDescription(input),
        playerId: input.actorPlayerId,
        locationId: input.locationId,
      },
    });
    sourceRecorded = true;
    sourceEventId = sourceEvent?.id;
  } catch (error) {
    console.warn("Failed to write gathering learning source event:", error);
  }

  const contextKey = gatheringLearningContextKeyForResource(input.resourceKey);
  if (!input.actorPlayerId || !contextKey || input.skipCanonicalPractice) {
    return {
      sourceRecorded,
      canonicalProgressRecorded: false,
      canonicalMilestone: false,
    };
  }

  try {
    const learning = await recordLearningProgress({
      playerId: input.actorPlayerId,
      skillKey: "gathering",
      sourceKey: "practice",
      contextKey,
      amount: 1,
      milestoneEvery: GATHERING_PRACTICE_ATTEMPT_INTERVAL,
      lastSourceEventId: sourceEventId,
    }, db as any);
    return {
      sourceRecorded,
      canonicalProgressRecorded: true,
      canonicalMilestone: learning.milestone,
    };
  } catch (error) {
    console.warn("Failed to write canonical gathering practice progress:", error);
    return {
      sourceRecorded,
      canonicalProgressRecorded: false,
      canonicalMilestone: false,
    };
  }
}

export async function recordGatheringObservation(input: { playerId: number; locationId: number; now?: Date }, db: GatheringLearningDb = prisma) {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - GATHERING_OBSERVATION_WINDOW_MS);

  try {
    const sources = await db.worldEvent.findMany({
      where: {
        title: GATHERING_SOURCE_EVENT_TITLE,
        locationId: input.locationId,
        createdAt: { gte: since },
        OR: [{ playerId: null }, { playerId: { not: input.playerId } }],
      },
      orderBy: { createdAt: "desc" },
      take: GATHERING_OBSERVATION_SOURCE_SCAN_LIMIT,
      select: { id: true, description: true },
    });
    if (!sources.length) {
      return {
        observed: false,
        milestone: false,
        observationCount: 0,
        canonicalProgressRecorded: false,
        canonicalMilestone: false,
      };
    }

    for (const source of sources) {
      const description = gatheringObservationDescription(source.id);
      const existing = await db.worldEvent.findFirst({
        where: {
          title: GATHERING_OBSERVATION_EVENT_TITLE,
          playerId: input.playerId,
          description,
        },
        select: { id: true },
      });
      if (existing) continue;

      await db.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: GATHERING_OBSERVATION_EVENT_TITLE,
          description,
          playerId: input.playerId,
          locationId: input.locationId,
        },
      });

      const contextKey = observableGatheringContextKey(source.description);
      let canonicalProgressRecorded = false;
      let canonicalMilestone = false;
      if (contextKey) {
        try {
          const learning = await recordLearningProgress({
            playerId: input.playerId,
            skillKey: "gathering",
            sourceKey: "observation",
            contextKey,
            amount: 1,
            milestoneEvery: GATHERING_OBSERVATION_INTERVAL,
            lastSourceEventId: source.id,
          }, db as any);
          canonicalProgressRecorded = true;
          canonicalMilestone = learning.milestone;
        } catch (error) {
          console.warn("Failed to write canonical gathering observation progress:", error);
        }
      }

      const observationCount = await db.worldEvent.count({
        where: {
          title: GATHERING_OBSERVATION_EVENT_TITLE,
          playerId: input.playerId,
        },
      });

      if (canonicalMilestone) {
        await db.worldEvent.create({
          data: {
            type: "SYSTEM",
            title: GATHERING_OBSERVATION_MILESTONE_EVENT_TITLE,
            description: `source=${source.id}; context=${contextKey}; count=${observationCount}`,
            playerId: input.playerId,
            locationId: input.locationId,
          },
        });
      }

      return {
        observed: true,
        milestone: canonicalMilestone,
        observationCount,
        canonicalProgressRecorded,
        canonicalMilestone,
      };
    }

    return {
      observed: false,
      milestone: false,
      observationCount: 0,
      canonicalProgressRecorded: false,
      canonicalMilestone: false,
    };
  } catch (error) {
    console.warn("Failed to record gathering observation:", error);
    return {
      observed: false,
      milestone: false,
      observationCount: 0,
      canonicalProgressRecorded: false,
      canonicalMilestone: false,
    };
  }
}
