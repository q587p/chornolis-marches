export const GATHERING_PRACTICE_ATTEMPT_INTERVAL = 13;
export const GATHERING_OBSERVATION_INTERVAL = 5;

export const GATHERING_PRACTICE_GROWTH_MESSAGE = "Навичка <b>збирання</b> підросла.";
export const GATHERING_OBSERVATION_GROWTH_MESSAGE = "Навичка <b>збирання</b> трохи підросла.";

export const GATHERING_SOURCE_EVENT_TITLE = "Gathering observable";
export const GATHERING_OBSERVATION_EVENT_TITLE = "Gathering observed";
export const GATHERING_OBSERVATION_MILESTONE_EVENT_TITLE = "Gathering observation milestone";

export function isGatheringPracticeMilestone(attemptCount: number) {
  return attemptCount > 0 && attemptCount % GATHERING_PRACTICE_ATTEMPT_INTERVAL === 0;
}

export function isGatheringObservationMilestone(observationCount: number) {
  return observationCount > 0 && observationCount % GATHERING_OBSERVATION_INTERVAL === 0;
}

export function gatheringSourceDescription(input: {
  actorPlayerId?: number;
  actorCreatureId?: number;
  resourceKey?: string;
  success: boolean;
}) {
  const actor = input.actorPlayerId ? `actorPlayer=${input.actorPlayerId}` : `actorCreature=${input.actorCreatureId ?? "unknown"}`;
  const resource = input.resourceKey ? `; resource=${input.resourceKey}` : "";
  return `${actor}; success=${input.success ? "true" : "false"}${resource}`;
}

export function gatheringObservationDescription(sourceEventId: number) {
  return `source=${sourceEventId}`;
}
