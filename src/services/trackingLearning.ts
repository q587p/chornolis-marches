import { prisma } from "../db";
import { learningLevelForTotalProgress, recordLearningProgress } from "./learning";

export const TRACKING_PRACTICE_EVENT_TITLE = "Tracking practice";
export const TRACKING_PRACTICE_CONTEXT_SEARCH = "track_search";
export const TRACKING_PRACTICE_CONTEXT_DETAIL = "track_detail";
export const TRACKING_PRACTICE_CONTEXT_TRACK_GATE = "track_gate";
export const TRACKING_OBSERVATION_EVENT_TITLE = "Tracking observation";
export const TRACKING_OBSERVATION_CONTEXT_ANIMAL_MOVEMENT = "animal_movement_observation";
export const TRACKING_ANIMAL_MOVEMENT_OBSERVATION_COOLDOWN_MS = 15 * 60_000;
export const TRACKING_ANIMAL_MOVEMENT_OBSERVATION_TEXT = "Ви помічаєте, як трава ще не встигла випростатись за дрібним рухом. Такі сліди легше читати, коли бачиш, як вони народжуються.";

const TRACKING_DEFAULT_DISPLAY_LIMIT = 8;
const TRACKING_MAX_DISPLAY_LIMIT = 12;

type TrackingProgressRow = {
  level?: number | null;
  totalProgress?: number | null;
};

type TrackingLearningDb = {
  worldEvent: {
    findFirst?: (...args: any[]) => Promise<any>;
    create: (...args: any[]) => Promise<any>;
  };
  characterLearningProgress: any;
};

export function trackingPracticeContextKey(input: { detail?: boolean; contextKey?: string | null }) {
  if (input.contextKey) return input.contextKey;
  return input.detail ? TRACKING_PRACTICE_CONTEXT_DETAIL : TRACKING_PRACTICE_CONTEXT_SEARCH;
}

export function trackingPracticeDescription(input: {
  playerId: number;
  locationId?: number | null;
  contextKey: string;
}) {
  const parts = [
    `playerId=${input.playerId}`,
    `contextKey=${input.contextKey}`,
  ];
  if (input.locationId) parts.push(`locationId=${input.locationId}`);
  return parts.join("; ");
}

export function trackingPracticeLearningInput(input: {
  playerId?: number | null;
  detail?: boolean;
  contextKey?: string | null;
  sourceEventId?: number | null;
}) {
  if (!input.playerId) return null;
  return {
    playerId: input.playerId,
    skillKey: "tracking",
    sourceKey: "practice",
    contextKey: trackingPracticeContextKey(input),
    amount: 1,
    ...(input.sourceEventId ? { lastSourceEventId: input.sourceEventId } : {}),
  };
}

export function trackingAnimalMovementObservationDescription(input: {
  playerId: number;
  locationId: number;
  creatureId: number;
  fromLocationId: number;
  toLocationId: number;
  direction: string;
}) {
  return [
    `playerId=${input.playerId}`,
    `contextKey=${TRACKING_OBSERVATION_CONTEXT_ANIMAL_MOVEMENT}`,
    `locationId=${input.locationId}`,
    `creatureId=${input.creatureId}`,
    `fromLocationId=${input.fromLocationId}`,
    `toLocationId=${input.toLocationId}`,
    `direction=${input.direction}`,
  ].join("; ");
}

export function trackingAnimalMovementObservationLearningInput(input: {
  playerId?: number | null;
  sourceEventId?: number | null;
}) {
  if (!input.playerId) return null;
  return {
    playerId: input.playerId,
    skillKey: "tracking",
    sourceKey: "observation",
    contextKey: TRACKING_OBSERVATION_CONTEXT_ANIMAL_MOVEMENT,
    amount: 1,
    ...(input.sourceEventId ? { lastSourceEventId: input.sourceEventId } : {}),
  };
}

export function trackingSkillEffectForProgressRows(rows: TrackingProgressRow[] = []) {
  const totalProgress = rows.reduce((sum, row) => {
    const value = Number.isFinite(row.totalProgress) ? Math.floor(row.totalProgress ?? 0) : 0;
    return sum + Math.max(0, value);
  }, 0);
  const explicitLevel = Math.max(
    0,
    ...rows.map((row) => Number.isFinite(row.level) ? Math.floor(row.level ?? 0) : 0),
  );
  const level = Math.max(explicitLevel, learningLevelForTotalProgress(totalProgress));
  const maxTrackResults = level >= 3 ? TRACKING_MAX_DISPLAY_LIMIT : TRACKING_DEFAULT_DISPLAY_LIMIT;
  return {
    totalProgress,
    level,
    maxTrackResults,
    canShowRoughAgeInBrief: level >= 2,
    canReadWeakTrackHint: level >= 4,
    detailAgePrecisionLabel: level >= 2 ? "clearer" : "ordinary",
  };
}

export async function trackingSkillEffectForPlayer(
  playerId: number,
  db: Pick<typeof prisma, "characterLearningProgress"> = prisma,
) {
  const progressRows = await db.characterLearningProgress.findMany({
    where: { playerId, skillKey: "tracking" },
    select: { level: true, totalProgress: true },
  });
  return trackingSkillEffectForProgressRows(progressRows);
}

export function roughTrackAgeText(createdAt: Date, now = new Date()) {
  const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
  if (ageMs < 2 * 60_000) return "свіжий слід";
  if (ageMs < 10 * 60_000) return "недавній слід";
  return "старіший слід";
}

export function trackingDarkPresenceText(input: {
  visibilityText: string;
  canReadWeakTrackHint?: boolean;
}) {
  if (!input.canReadWeakTrackHint) return input.visibilityText;
  return "Ви відчуваєте, що сліди тут є, але без світла напрям усе одно губиться.";
}

export async function recordTrackingPractice(input: {
  playerId?: number | null;
  locationId?: number | null;
  detail?: boolean;
  contextKey?: string | null;
}, db: TrackingLearningDb = prisma) {
  if (!input.playerId) return { recorded: false as const };
  const contextKey = trackingPracticeContextKey(input);
  let sourceEventId: number | undefined;
  try {
    const event = await db.worldEvent.create({
      data: {
        type: "PLAYER_ACTION",
        title: TRACKING_PRACTICE_EVENT_TITLE,
        description: trackingPracticeDescription({
          playerId: input.playerId ?? 0,
          locationId: input.locationId,
          contextKey,
        }),
        playerId: input.playerId,
        locationId: input.locationId,
      },
    });
    sourceEventId = event?.id;
  } catch (error) {
    console.warn("Failed to write tracking practice event:", error);
  }

  const learningInput = trackingPracticeLearningInput({
    playerId: input.playerId,
    contextKey,
    sourceEventId,
  });
  if (!learningInput) return { recorded: false as const, sourceEventId };

  try {
    const learning = await recordLearningProgress(learningInput, db as any);
    return {
      recorded: true as const,
      sourceEventId,
      milestone: learning.milestone,
      level: learning.level,
    };
  } catch (error) {
    console.warn("Failed to write canonical tracking practice progress:", error);
    return { recorded: false as const, sourceEventId };
  }
}

export async function recordTrackingAnimalMovementObservation(input: {
  playerId?: number | null;
  locationId: number;
  creatureId: number;
  fromLocationId: number;
  toLocationId: number;
  direction: string;
  now?: Date;
  cooldownMs?: number;
}, db: TrackingLearningDb = prisma) {
  if (!input.playerId) return { recorded: false as const, reason: "no_player" as const };
  const now = input.now ?? new Date();
  const cooldownMs = Math.max(0, input.cooldownMs ?? TRACKING_ANIMAL_MOVEMENT_OBSERVATION_COOLDOWN_MS);
  const description = trackingAnimalMovementObservationDescription({
    playerId: input.playerId,
    locationId: input.locationId,
    creatureId: input.creatureId,
    fromLocationId: input.fromLocationId,
    toLocationId: input.toLocationId,
    direction: input.direction,
  });

  try {
    const duplicate = db.worldEvent.findFirst
      ? await db.worldEvent.findFirst({
        where: {
          type: "SYSTEM",
          title: TRACKING_OBSERVATION_EVENT_TITLE,
          playerId: input.playerId,
          description,
        },
      })
      : null;
    if (duplicate) return { recorded: false as const, reason: "duplicate" as const };

    const recent = db.worldEvent.findFirst
      ? await db.worldEvent.findFirst({
        where: {
          type: "SYSTEM",
          title: TRACKING_OBSERVATION_EVENT_TITLE,
          playerId: input.playerId,
          description: { contains: `contextKey=${TRACKING_OBSERVATION_CONTEXT_ANIMAL_MOVEMENT}` },
          createdAt: { gte: new Date(now.getTime() - cooldownMs) },
        },
        orderBy: { createdAt: "desc" },
      })
      : null;
    if (recent) return { recorded: false as const, reason: "cooldown" as const };
  } catch (error) {
    console.warn("Failed to check tracking observation dedupe:", error);
  }

  let sourceEventId: number | undefined;
  try {
    const event = await db.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: TRACKING_OBSERVATION_EVENT_TITLE,
        description,
        playerId: input.playerId,
        locationId: input.locationId,
        createdAt: now,
      },
    });
    sourceEventId = event?.id;
  } catch (error) {
    console.warn("Failed to write tracking observation event:", error);
  }

  const learningInput = trackingAnimalMovementObservationLearningInput({
    playerId: input.playerId,
    sourceEventId,
  });
  if (!learningInput) return { recorded: false as const, reason: "no_player" as const, sourceEventId };

  try {
    const learning = await recordLearningProgress(learningInput, db as any);
    return {
      recorded: true as const,
      sourceEventId,
      text: TRACKING_ANIMAL_MOVEMENT_OBSERVATION_TEXT,
      milestone: learning.milestone,
      level: learning.level,
    };
  } catch (error) {
    console.warn("Failed to write canonical tracking observation progress:", error);
    return { recorded: false as const, reason: "progress_failed" as const, sourceEventId };
  }
}
