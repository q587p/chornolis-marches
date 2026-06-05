import { prisma } from "../db";
import { learningLevelForTotalProgress, recordLearningProgress } from "./learning";

export const TRACKING_PRACTICE_EVENT_TITLE = "Tracking practice";
export const TRACKING_PRACTICE_CONTEXT_SEARCH = "track_search";
export const TRACKING_PRACTICE_CONTEXT_DETAIL = "track_detail";
export const TRACKING_PRACTICE_CONTEXT_TRACK_GATE = "track_gate";

const TRACKING_DEFAULT_DISPLAY_LIMIT = 8;
const TRACKING_MAX_DISPLAY_LIMIT = 12;

type TrackingProgressRow = {
  level?: number | null;
  totalProgress?: number | null;
};

type TrackingLearningDb = {
  worldEvent: {
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
