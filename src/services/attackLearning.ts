import { prisma } from "../db";
import {
  ATTACK_CANONICAL_OBSERVATION_EVENT_TITLE,
  ATTACK_CANONICAL_PRACTICE_EVENT_TITLE,
  ATTACK_KILL_SOURCE_EVENT_TITLE,
  ATTACK_OBSERVATION_EVENT_TITLE,
  ATTACK_OBSERVATION_MILESTONE_EVENT_TITLE,
  attackCanonicalObservationDescription,
  attackKillSourceDescription,
  attackObservationDescription,
  attackPracticeSourceDescription,
  isAttackObservationMilestone,
} from "./attackLearningRules";
import { recordActorLearningProgress } from "./learning";

export {
  ATTACK_CANONICAL_OBSERVATION_EVENT_TITLE,
  ATTACK_CANONICAL_PRACTICE_EVENT_TITLE,
  ATTACK_OBSERVATION_GROWTH_MESSAGE,
  ATTACK_PRACTICE_GROWTH_MESSAGE,
  attackCanonicalObservationDescription,
  attackKillSourceDescription,
  attackObservationDescription,
  attackPracticeSourceDescription,
  isAttackObservationMilestone,
  isAttackPracticeMilestone,
} from "./attackLearningRules";

const ATTACK_OBSERVATION_WINDOW_MS = Number(process.env.WORLD_ATTACK_OBSERVATION_WINDOW_MS || 120_000);

export async function recordAttackKillSource(input: { locationId: number; attackerPlayerId?: number; attackerCreatureId?: number; victimCreatureId: number }) {
  try {
    const source = await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: ATTACK_KILL_SOURCE_EVENT_TITLE,
        description: attackKillSourceDescription(input),
        playerId: input.attackerPlayerId,
        locationId: input.locationId,
      },
      select: { id: true },
    });
    return { sourceRecorded: true, sourceEventId: source.id };
  } catch (error) {
    console.warn("Failed to write attack learning source event:", error);
    return { sourceRecorded: false, sourceEventId: undefined };
  }
}

function actorForAttackInput(input: { attackerPlayerId?: number; attackerCreatureId?: number }) {
  if (input.attackerPlayerId) return { actorType: "PLAYER" as const, playerId: input.attackerPlayerId };
  if (input.attackerCreatureId) return { actorType: "CREATURE" as const, creatureId: input.attackerCreatureId };
  return null;
}

export function attackPracticeLearningInput(input: {
  attackerPlayerId?: number;
  attackerCreatureId?: number;
  sourceEventId?: number;
}) {
  const actor = actorForAttackInput(input);
  if (!actor) return null;
  return {
    actor,
    progress: {
      skillKey: "attack",
      sourceKey: "practice",
      contextKey: "attack",
      amount: 1,
      lastSourceEventId: input.sourceEventId,
    },
  };
}

export function attackObservationLearningInput(input: { sourceEventId: number }) {
  return {
    skillKey: "attack",
    sourceKey: "observation",
    contextKey: "attack",
    amount: 1,
    lastSourceEventId: input.sourceEventId,
  };
}

export async function recordAttackPracticeLearning(input: {
  locationId: number;
  attackerPlayerId?: number;
  attackerCreatureId?: number;
  targetCreatureId?: number;
  outcome?: "miss" | "wound" | "kill";
}, db: any = prisma) {
  const actor = actorForAttackInput(input);
  if (!actor) return { sourceRecorded: false, canonicalProgressRecorded: false, canonicalMilestone: false };

  try {
    const source = await db.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: ATTACK_CANONICAL_PRACTICE_EVENT_TITLE,
        description: attackPracticeSourceDescription(input),
        playerId: input.attackerPlayerId,
        locationId: input.locationId,
      },
      select: { id: true },
    });
    const learningInput = attackPracticeLearningInput({ ...input, sourceEventId: source.id });
    if (!learningInput) return { sourceRecorded: true, canonicalProgressRecorded: false, canonicalMilestone: false };
    const learning = await recordActorLearningProgress(learningInput.actor, learningInput.progress, db);
    return { sourceRecorded: true, canonicalProgressRecorded: true, canonicalMilestone: learning.milestone, sourceEventId: source.id };
  } catch (error) {
    console.warn("Failed to write canonical attack practice progress:", error);
    return { sourceRecorded: false, canonicalProgressRecorded: false, canonicalMilestone: false };
  }
}

export function sourceWasCreatedByAttackCreature(sourceDescription: string | null | undefined, creatureId: number) {
  return new RegExp(`(?:^|;\\s*)attackerCreature=${creatureId}(?:$|;)`, "u").test(sourceDescription ?? "");
}

export function canCreatureLearnAttackByObservation(creature: {
  isAlive?: boolean | null;
  isGone?: boolean | null;
  isHidden?: boolean | null;
  age?: string | null;
  professionKey?: string | null;
  professionName?: string | null;
  species?: { diet?: string | null; kind?: string | null } | null;
} | null | undefined) {
  if (!creature || creature.isAlive === false || creature.isGone || creature.isHidden || creature.age === "CORPSE") return false;
  const profession = `${creature.professionKey ?? ""} ${creature.professionName ?? ""}`.toLowerCase();
  if (/(hunter|мислив)/u.test(profession)) return true;
  return false;
}

async function findRecentAttackSource(input: {
  locationId: number;
  since: Date;
  observerPlayerId?: number;
  observerCreatureId?: number;
}, db: any = prisma) {
  const sources = await db.worldEvent.findMany({
    where: {
      title: { in: [ATTACK_CANONICAL_PRACTICE_EVENT_TITLE, ATTACK_KILL_SOURCE_EVENT_TITLE] },
      locationId: input.locationId,
      createdAt: { gte: input.since },
      ...(input.observerPlayerId ? { OR: [{ playerId: null }, { playerId: { not: input.observerPlayerId } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, title: true, description: true },
  });
  if (!input.observerCreatureId) return sources[0] ?? null;
  const observerCreatureId = input.observerCreatureId;
  return sources.find((source: any) => !sourceWasCreatedByAttackCreature(source.description, observerCreatureId)) ?? null;
}

export async function recordAttackObservation(input: { playerId: number; locationId: number; now?: Date }, db: any = prisma) {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - ATTACK_OBSERVATION_WINDOW_MS);

  try {
    const source = await findRecentAttackSource({ observerPlayerId: input.playerId, locationId: input.locationId, since }, db);
    if (!source) return { observed: false, milestone: false, observationCount: 0, canonicalProgressRecorded: false, canonicalMilestone: false };

    const description = attackObservationDescription(source.id);
    const existing = await db.worldEvent.findFirst({
      where: {
        title: ATTACK_OBSERVATION_EVENT_TITLE,
        playerId: input.playerId,
        description,
      },
      select: { id: true },
    });
    if (existing) return { observed: false, milestone: false, observationCount: 0, canonicalProgressRecorded: false, canonicalMilestone: false };

    await db.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: ATTACK_OBSERVATION_EVENT_TITLE,
        description,
        playerId: input.playerId,
        locationId: input.locationId,
      },
    });

    let canonicalProgressRecorded = false;
    let canonicalMilestone = false;
    try {
      const learning = await recordActorLearningProgress({ actorType: "PLAYER", playerId: input.playerId }, attackObservationLearningInput({ sourceEventId: source.id }), db);
      canonicalProgressRecorded = true;
      canonicalMilestone = learning.milestone;
    } catch (error) {
      console.warn("Failed to write canonical attack observation progress:", error);
    }

    const observationCount = await db.worldEvent.count({
      where: {
        title: ATTACK_OBSERVATION_EVENT_TITLE,
        playerId: input.playerId,
      },
    });
    const milestone = canonicalMilestone || isAttackObservationMilestone(observationCount);

    if (milestone) {
      await db.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: ATTACK_OBSERVATION_MILESTONE_EVENT_TITLE,
          description: `source=${source.id}; count=${observationCount}`,
          playerId: input.playerId,
          locationId: input.locationId,
        },
      });
    }

    return { observed: true, milestone, observationCount, canonicalProgressRecorded, canonicalMilestone };
  } catch (error) {
    console.warn("Failed to record attack observation:", error);
    return { observed: false, milestone: false, observationCount: 0, canonicalProgressRecorded: false, canonicalMilestone: false };
  }
}

export async function recordCreatureAttackObservation(input: { creatureId: number; now?: Date }, db: any = prisma) {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - ATTACK_OBSERVATION_WINDOW_MS);

  try {
    const creature = await db.creature.findUnique({
      where: { id: input.creatureId },
      select: {
        id: true,
        locationId: true,
        isAlive: true,
        isGone: true,
        isHidden: true,
        age: true,
        professionKey: true,
        professionName: true,
        species: { select: { kind: true, diet: true } },
      },
    });
    if (!canCreatureLearnAttackByObservation(creature)) return { observed: false, canonicalProgressRecorded: false, canonicalMilestone: false };

    const source = await findRecentAttackSource({
      locationId: creature.locationId,
      since,
      observerCreatureId: creature.id,
    }, db);
    if (!source) return { observed: false, canonicalProgressRecorded: false, canonicalMilestone: false };

    const description = attackCanonicalObservationDescription({ creatureId: creature.id, sourceEventId: source.id });
    const existing = await db.worldEvent.findFirst({
      where: { title: ATTACK_CANONICAL_OBSERVATION_EVENT_TITLE, description },
      select: { id: true },
    });
    if (existing) return { observed: false, canonicalProgressRecorded: false, canonicalMilestone: false };

    await db.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: ATTACK_CANONICAL_OBSERVATION_EVENT_TITLE,
        description,
        locationId: creature.locationId,
      },
    });

    const learning = await recordActorLearningProgress({ actorType: "CREATURE", creatureId: creature.id }, attackObservationLearningInput({ sourceEventId: source.id }), db);
    return { observed: true, canonicalProgressRecorded: true, canonicalMilestone: learning.milestone };
  } catch (error) {
    console.warn("Failed to record creature attack observation:", error);
    return { observed: false, canonicalProgressRecorded: false, canonicalMilestone: false };
  }
}
