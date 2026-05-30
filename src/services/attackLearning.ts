import { prisma } from "../db";
import {
  ATTACK_KILL_SOURCE_EVENT_TITLE,
  ATTACK_OBSERVATION_EVENT_TITLE,
  ATTACK_OBSERVATION_MILESTONE_EVENT_TITLE,
  attackKillSourceDescription,
  attackObservationDescription,
  isAttackObservationMilestone,
} from "./attackLearningRules";

export {
  ATTACK_OBSERVATION_GROWTH_MESSAGE,
  ATTACK_PRACTICE_GROWTH_MESSAGE,
  attackKillSourceDescription,
  attackObservationDescription,
  isAttackObservationMilestone,
  isAttackPracticeMilestone,
} from "./attackLearningRules";

const ATTACK_OBSERVATION_WINDOW_MS = Number(process.env.WORLD_ATTACK_OBSERVATION_WINDOW_MS || 120_000);

export async function recordAttackKillSource(input: { locationId: number; attackerPlayerId?: number; attackerCreatureId?: number; victimCreatureId: number }) {
  try {
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: ATTACK_KILL_SOURCE_EVENT_TITLE,
        description: attackKillSourceDescription(input),
        playerId: input.attackerPlayerId,
        locationId: input.locationId,
      },
    });
  } catch (error) {
    console.warn("Failed to write attack learning source event:", error);
  }
}

export async function recordAttackObservation(input: { playerId: number; locationId: number; now?: Date }) {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - ATTACK_OBSERVATION_WINDOW_MS);

  try {
    const source = await prisma.worldEvent.findFirst({
      where: {
        title: ATTACK_KILL_SOURCE_EVENT_TITLE,
        locationId: input.locationId,
        createdAt: { gte: since },
        OR: [{ playerId: null }, { playerId: { not: input.playerId } }],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!source) return { observed: false, milestone: false, observationCount: 0 };

    const description = attackObservationDescription(source.id);
    const existing = await prisma.worldEvent.findFirst({
      where: {
        title: ATTACK_OBSERVATION_EVENT_TITLE,
        playerId: input.playerId,
        description,
      },
      select: { id: true },
    });
    if (existing) return { observed: false, milestone: false, observationCount: 0 };

    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: ATTACK_OBSERVATION_EVENT_TITLE,
        description,
        playerId: input.playerId,
        locationId: input.locationId,
      },
    });

    const observationCount = await prisma.worldEvent.count({
      where: {
        title: ATTACK_OBSERVATION_EVENT_TITLE,
        playerId: input.playerId,
      },
    });
    const milestone = isAttackObservationMilestone(observationCount);

    if (milestone) {
      await prisma.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: ATTACK_OBSERVATION_MILESTONE_EVENT_TITLE,
          description: `count=${observationCount}`,
          playerId: input.playerId,
          locationId: input.locationId,
        },
      });
    }

    return { observed: true, milestone, observationCount };
  } catch (error) {
    console.warn("Failed to record attack observation:", error);
    return { observed: false, milestone: false, observationCount: 0 };
  }
}
