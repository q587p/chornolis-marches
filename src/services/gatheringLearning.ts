import { prisma } from "../db";
import {
  GATHERING_OBSERVATION_INTERVAL,
  GATHERING_OBSERVATION_EVENT_TITLE,
  GATHERING_OBSERVATION_MILESTONE_EVENT_TITLE,
  GATHERING_SOURCE_EVENT_TITLE,
  gatheringObservationDescription,
  gatheringSourceDescription,
  isGatheringObservationMilestone,
} from "./gatheringLearningRules";
import { recordLearningProgress } from "./learning";

export {
  GATHERING_OBSERVATION_GROWTH_MESSAGE,
  GATHERING_PRACTICE_GROWTH_MESSAGE,
  gatheringObservationDescription,
  gatheringSourceDescription,
  isGatheringObservationMilestone,
  isGatheringPracticeMilestone,
} from "./gatheringLearningRules";

const GATHERING_OBSERVATION_WINDOW_MS = Number(process.env.WORLD_GATHERING_OBSERVATION_WINDOW_MS || 120_000);

type GatheringLearningDb = {
  worldEvent: {
    findFirst: (...args: any[]) => Promise<any>;
    create: (...args: any[]) => Promise<any>;
    count: (...args: any[]) => Promise<number>;
  };
  characterLearningProgress: any;
};

const OBSERVABLE_GATHERING_RESOURCE_KEYS = new Set(["berries", "mushrooms", "herbs"]);

export function observableGatheringContextKey(sourceDescription: string | null | undefined) {
  const resourceKey = sourceDescription?.match(/(?:^|;\s*)resource=([A-Za-z0-9_-]+)/u)?.[1];
  return resourceKey && OBSERVABLE_GATHERING_RESOURCE_KEYS.has(resourceKey)
    ? `resource:${resourceKey}`
    : null;
}

export async function recordGatheringSource(input: {
  locationId: number;
  actorPlayerId?: number;
  actorCreatureId?: number;
  resourceKey?: string;
  success: boolean;
}) {
  try {
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: GATHERING_SOURCE_EVENT_TITLE,
        description: gatheringSourceDescription(input),
        playerId: input.actorPlayerId,
        locationId: input.locationId,
      },
    });
  } catch (error) {
    console.warn("Failed to write gathering learning source event:", error);
  }
}

export async function recordGatheringObservation(input: { playerId: number; locationId: number; now?: Date }, db: GatheringLearningDb = prisma) {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - GATHERING_OBSERVATION_WINDOW_MS);

  try {
    const source = await db.worldEvent.findFirst({
      where: {
        title: GATHERING_SOURCE_EVENT_TITLE,
        locationId: input.locationId,
        createdAt: { gte: since },
        OR: [{ playerId: null }, { playerId: { not: input.playerId } }],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, description: true },
    });
    if (!source) return { observed: false, milestone: false, observationCount: 0 };

    const description = gatheringObservationDescription(source.id);
    const existing = await db.worldEvent.findFirst({
      where: {
        title: GATHERING_OBSERVATION_EVENT_TITLE,
        playerId: input.playerId,
        description,
      },
      select: { id: true },
    });
    if (existing) return { observed: false, milestone: false, observationCount: 0 };

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
    if (contextKey) {
      try {
        await recordLearningProgress({
          playerId: input.playerId,
          skillKey: "gathering",
          sourceKey: "observation",
          contextKey,
          amount: 1,
          milestoneEvery: GATHERING_OBSERVATION_INTERVAL,
          lastSourceEventId: source.id,
        }, db as any);
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
    const milestone = isGatheringObservationMilestone(observationCount);

    if (milestone) {
      await db.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: GATHERING_OBSERVATION_MILESTONE_EVENT_TITLE,
          description: `count=${observationCount}`,
          playerId: input.playerId,
          locationId: input.locationId,
        },
      });
    }

    return { observed: true, milestone, observationCount };
  } catch (error) {
    console.warn("Failed to record gathering observation:", error);
    return { observed: false, milestone: false, observationCount: 0 };
  }
}
