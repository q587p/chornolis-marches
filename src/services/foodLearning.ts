import { prisma } from "../db";
import {
  COOKING_OBSERVATION_EVENT_TITLE,
  COOKING_OBSERVATION_MILESTONE_EVENT_TITLE,
  COOKING_SOURCE_EVENT_TITLE,
  FRESHENING_OBSERVATION_EVENT_TITLE,
  FRESHENING_OBSERVATION_MILESTONE_EVENT_TITLE,
  FRESHENING_SOURCE_EVENT_TITLE,
  cookingSourceDescription,
  foodObservationDescription,
  fresheningSourceDescription,
  isCookingObservationMilestone,
  isCookingPracticeMilestone,
  isFresheningObservationMilestone,
  isFresheningPracticeMilestone,
} from "./foodLearningRules";

export {
  COOKING_OBSERVATION_GROWTH_MESSAGE,
  COOKING_PRACTICE_GROWTH_MESSAGE,
  FRESHENING_OBSERVATION_GROWTH_MESSAGE,
  FRESHENING_PRACTICE_GROWTH_MESSAGE,
  cookingSourceDescription,
  foodObservationDescription,
  fresheningSourceDescription,
  isCookingObservationMilestone,
  isCookingPracticeMilestone,
  isFresheningObservationMilestone,
  isFresheningPracticeMilestone,
} from "./foodLearningRules";

const FOOD_OBSERVATION_WINDOW_MS = Number(process.env.WORLD_FOOD_OBSERVATION_WINDOW_MS || 120_000);

async function recordFoodSource(input: {
  title: string;
  description: string;
  locationId: number;
  actorPlayerId?: number;
  milestoneCheck: (count: number) => boolean;
}) {
  try {
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: input.title,
        description: input.description,
        playerId: input.actorPlayerId,
        locationId: input.locationId,
      },
    });

    if (!input.actorPlayerId) return { sourceCount: 0, milestone: false };

    const sourceCount = await prisma.worldEvent.count({
      where: {
        title: input.title,
        playerId: input.actorPlayerId,
      },
    });
    return { sourceCount, milestone: input.milestoneCheck(sourceCount) };
  } catch (error) {
    console.warn("Failed to write food learning source event:", error);
    return { sourceCount: 0, milestone: false };
  }
}

async function recordFoodObservation(input: {
  playerId: number;
  locationId: number;
  now?: Date;
  sourceTitle: string;
  observationTitle: string;
  milestoneTitle: string;
  milestoneCheck: (count: number) => boolean;
}) {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - FOOD_OBSERVATION_WINDOW_MS);

  try {
    const source = await prisma.worldEvent.findFirst({
      where: {
        title: input.sourceTitle,
        locationId: input.locationId,
        createdAt: { gte: since },
        OR: [{ playerId: null }, { playerId: { not: input.playerId } }],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!source) return { observed: false, milestone: false, observationCount: 0 };

    const description = foodObservationDescription(source.id);
    const existing = await prisma.worldEvent.findFirst({
      where: {
        title: input.observationTitle,
        playerId: input.playerId,
        description,
      },
      select: { id: true },
    });
    if (existing) return { observed: false, milestone: false, observationCount: 0 };

    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: input.observationTitle,
        description,
        playerId: input.playerId,
        locationId: input.locationId,
      },
    });

    const observationCount = await prisma.worldEvent.count({
      where: {
        title: input.observationTitle,
        playerId: input.playerId,
      },
    });
    const milestone = input.milestoneCheck(observationCount);

    if (milestone) {
      await prisma.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: input.milestoneTitle,
          description: `count=${observationCount}`,
          playerId: input.playerId,
          locationId: input.locationId,
        },
      });
    }

    return { observed: true, milestone, observationCount };
  } catch (error) {
    console.warn("Failed to record food learning observation:", error);
    return { observed: false, milestone: false, observationCount: 0 };
  }
}

export async function recordFresheningSource(input: {
  locationId: number;
  actorPlayerId?: number;
  actorCreatureId?: number;
  creatureId?: number;
  speciesKey?: string;
}) {
  return recordFoodSource({
    title: FRESHENING_SOURCE_EVENT_TITLE,
    description: fresheningSourceDescription(input),
    locationId: input.locationId,
    actorPlayerId: input.actorPlayerId,
    milestoneCheck: isFresheningPracticeMilestone,
  });
}

export async function recordCookingSource(input: {
  locationId: number;
  actorPlayerId?: number;
  actorCreatureId?: number;
  success: boolean;
}) {
  return recordFoodSource({
    title: COOKING_SOURCE_EVENT_TITLE,
    description: cookingSourceDescription(input),
    locationId: input.locationId,
    actorPlayerId: input.actorPlayerId,
    milestoneCheck: isCookingPracticeMilestone,
  });
}

export function recordFresheningObservation(input: { playerId: number; locationId: number; now?: Date }) {
  return recordFoodObservation({
    ...input,
    sourceTitle: FRESHENING_SOURCE_EVENT_TITLE,
    observationTitle: FRESHENING_OBSERVATION_EVENT_TITLE,
    milestoneTitle: FRESHENING_OBSERVATION_MILESTONE_EVENT_TITLE,
    milestoneCheck: isFresheningObservationMilestone,
  });
}

export function recordCookingObservation(input: { playerId: number; locationId: number; now?: Date }) {
  return recordFoodObservation({
    ...input,
    sourceTitle: COOKING_SOURCE_EVENT_TITLE,
    observationTitle: COOKING_OBSERVATION_EVENT_TITLE,
    milestoneTitle: COOKING_OBSERVATION_MILESTONE_EVENT_TITLE,
    milestoneCheck: isCookingObservationMilestone,
  });
}
