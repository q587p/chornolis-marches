import { prisma } from "../db";
import {
  GATHERING_OBSERVATION_EVENT_TITLE,
  GATHERING_OBSERVATION_MILESTONE_EVENT_TITLE,
  GATHERING_SOURCE_EVENT_TITLE,
  gatheringObservationDescription,
  gatheringSourceDescription,
  isGatheringObservationMilestone,
} from "./gatheringLearningRules";

export {
  GATHERING_OBSERVATION_GROWTH_MESSAGE,
  GATHERING_PRACTICE_GROWTH_MESSAGE,
  gatheringObservationDescription,
  gatheringSourceDescription,
  isGatheringObservationMilestone,
  isGatheringPracticeMilestone,
} from "./gatheringLearningRules";

const GATHERING_OBSERVATION_WINDOW_MS = Number(process.env.WORLD_GATHERING_OBSERVATION_WINDOW_MS || 120_000);

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

export async function recordGatheringObservation(input: { playerId: number; locationId: number; now?: Date }) {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - GATHERING_OBSERVATION_WINDOW_MS);

  try {
    const source = await prisma.worldEvent.findFirst({
      where: {
        title: GATHERING_SOURCE_EVENT_TITLE,
        locationId: input.locationId,
        createdAt: { gte: since },
        OR: [{ playerId: null }, { playerId: { not: input.playerId } }],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!source) return { observed: false, milestone: false, observationCount: 0 };

    const description = gatheringObservationDescription(source.id);
    const existing = await prisma.worldEvent.findFirst({
      where: {
        title: GATHERING_OBSERVATION_EVENT_TITLE,
        playerId: input.playerId,
        description,
      },
      select: { id: true },
    });
    if (existing) return { observed: false, milestone: false, observationCount: 0 };

    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: GATHERING_OBSERVATION_EVENT_TITLE,
        description,
        playerId: input.playerId,
        locationId: input.locationId,
      },
    });

    const observationCount = await prisma.worldEvent.count({
      where: {
        title: GATHERING_OBSERVATION_EVENT_TITLE,
        playerId: input.playerId,
      },
    });
    const milestone = isGatheringObservationMilestone(observationCount);

    if (milestone) {
      await prisma.worldEvent.create({
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
