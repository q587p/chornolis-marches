import { prisma } from "../db";
import {
  GATHERING_OBSERVATION_INTERVAL,
  GATHERING_SOURCE_EVENT_TITLE,
} from "./gatheringLearningRules";
import { observableGatheringContextKey } from "./gatheringLearning";
import { recordActorLearningProgress } from "./learning";
import { withSlowLog } from "../utils/slowLog";

export const CREATURE_GATHERING_OBSERVATION_EVENT_TITLE = "Creature gathering observation";

const CREATURE_OBSERVATION_WINDOW_MS = Number(process.env.WORLD_CREATURE_OBSERVATION_WINDOW_MS || 120_000);
const CREATURE_OBSERVATION_SOURCE_SCAN_LIMIT = 8;

type CreatureObservationDb = {
  creature: {
    findUnique: (...args: any[]) => Promise<any>;
  };
  worldEvent: {
    findMany: (...args: any[]) => Promise<any[]>;
    findFirst: (...args: any[]) => Promise<any>;
    create: (...args: any[]) => Promise<any>;
  };
  creatureLearningProgress?: any;
  characterLearningProgress?: any;
};

type ObservationCreature = {
  id: number;
  locationId: number;
  isAlive?: boolean | null;
  isGone?: boolean | null;
  isHidden?: boolean | null;
  age?: string | null;
  professionKey?: string | null;
  professionName?: string | null;
  species?: { key?: string | null; kind?: string | null; diet?: string | null } | null;
};

export function creatureObservationDescription(input: {
  creatureId: number;
  sourceEventId: number;
  skillKey: string;
  contextKey: string;
}) {
  return `creature=${input.creatureId}; source=${input.sourceEventId}; skillKey=${input.skillKey}; contextKey=${input.contextKey}`;
}

export function sourceWasCreatedByCreature(sourceDescription: string | null | undefined, creatureId: number) {
  return new RegExp(`(?:^|;\\s*)actorCreature=${creatureId}(?:$|;)`, "u").test(sourceDescription ?? "");
}

export function canCreatureLearnByObservation(
  creature: Partial<ObservationCreature> | null | undefined,
  skillKey: string,
  contextKey?: string | null,
) {
  if (!creature || creature.isAlive === false || creature.isGone || creature.age === "CORPSE") return false;
  if (creature.isHidden) return false;

  const profession = `${creature.professionKey ?? ""} ${creature.professionName ?? ""}`.toLowerCase();
  const isGatheringContext = skillKey === "gathering" && Boolean(contextKey?.startsWith("resource:"));
  const isHerbalist = /(herbalist|znakhar|travnytsia|трав|знах)/u.test(profession);
  const isHunter = /(hunter|мислив)/u.test(profession);

  if (isHerbalist) {
    return isGatheringContext || skillKey === "freshening" || skillKey === "cooking";
  }
  if (isHunter) {
    return isGatheringContext || skillKey === "freshening";
  }
  return false;
}

export function creatureObservationLearningInput(input: {
  creatureId: number;
  sourceEventId: number;
  sourceDescription?: string | null;
}) {
  if (sourceWasCreatedByCreature(input.sourceDescription, input.creatureId)) return null;
  const contextKey = observableGatheringContextKey(input.sourceDescription);
  if (!contextKey) return null;
  return {
    skillKey: "gathering",
    sourceKey: "observation",
    contextKey,
    amount: 1,
    milestoneEvery: GATHERING_OBSERVATION_INTERVAL,
    lastSourceEventId: input.sourceEventId,
  };
}

export async function recordCreatureGatheringObservation(input: {
  creatureId: number;
  now?: Date;
}, db: CreatureObservationDb = prisma) {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - CREATURE_OBSERVATION_WINDOW_MS);

  try {
    const creature: ObservationCreature | null = await db.creature.findUnique({
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
        species: { select: { key: true, kind: true, diet: true } },
      },
    });
    if (!creature) return { observed: false, canonicalProgressRecorded: false, canonicalMilestone: false };

    const sources = await db.worldEvent.findMany({
      where: {
        title: GATHERING_SOURCE_EVENT_TITLE,
        locationId: creature.locationId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: CREATURE_OBSERVATION_SOURCE_SCAN_LIMIT,
      select: { id: true, description: true },
    });

    for (const source of sources) {
      const learningInput = creatureObservationLearningInput({
        creatureId: creature.id,
        sourceEventId: source.id,
        sourceDescription: source.description,
      });
      if (!learningInput) continue;
      if (!canCreatureLearnByObservation(creature, learningInput.skillKey, learningInput.contextKey)) continue;

      const description = creatureObservationDescription({
        creatureId: creature.id,
        sourceEventId: source.id,
        skillKey: learningInput.skillKey,
        contextKey: learningInput.contextKey,
      });
      const existing = await db.worldEvent.findFirst({
        where: {
          title: CREATURE_GATHERING_OBSERVATION_EVENT_TITLE,
          description,
        },
        select: { id: true },
      });
      if (existing) continue;

      await db.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: CREATURE_GATHERING_OBSERVATION_EVENT_TITLE,
          description,
          locationId: creature.locationId,
        },
      });

      const learning = await recordActorLearningProgress({
        actorType: "CREATURE",
        creatureId: creature.id,
      }, learningInput, db as any);

      return {
        observed: true,
        canonicalProgressRecorded: true,
        canonicalMilestone: learning.milestone,
      };
    }

    return { observed: false, canonicalProgressRecorded: false, canonicalMilestone: false };
  } catch (error) {
    console.warn("Failed to record creature gathering observation learning:", error);
    return { observed: false, canonicalProgressRecorded: false, canonicalMilestone: false };
  }
}

export async function maybeRecordCreatureObservationLearning(input: {
  creatureId: number;
  now?: Date;
}, db: CreatureObservationDb = prisma) {
  return withSlowLog("creature.observationLearning", () => recordCreatureGatheringObservation(input, db));
}
