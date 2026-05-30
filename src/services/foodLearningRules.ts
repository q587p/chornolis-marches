export const FRESHENING_PRACTICE_INTERVAL = 13;
export const FRESHENING_OBSERVATION_INTERVAL = 5;
export const COOKING_PRACTICE_INTERVAL = 13;
export const COOKING_OBSERVATION_INTERVAL = 5;

export const FRESHENING_PRACTICE_GROWTH_MESSAGE = "Навичка <b>освіжування</b> підросла.";
export const FRESHENING_OBSERVATION_GROWTH_MESSAGE = "Навичка <b>освіжування</b> трохи підросла.";
export const COOKING_PRACTICE_GROWTH_MESSAGE = "Навичка <b>приготування</b> підросла.";
export const COOKING_OBSERVATION_GROWTH_MESSAGE = "Навичка <b>приготування</b> трохи підросла.";

export const FRESHENING_SOURCE_EVENT_TITLE = "Freshening observable";
export const FRESHENING_OBSERVATION_EVENT_TITLE = "Freshening observed";
export const FRESHENING_OBSERVATION_MILESTONE_EVENT_TITLE = "Freshening observation milestone";

export const COOKING_SOURCE_EVENT_TITLE = "Cooking observable";
export const COOKING_OBSERVATION_EVENT_TITLE = "Cooking observed";
export const COOKING_OBSERVATION_MILESTONE_EVENT_TITLE = "Cooking observation milestone";

export function isFresheningPracticeMilestone(attemptCount: number) {
  return attemptCount > 0 && attemptCount % FRESHENING_PRACTICE_INTERVAL === 0;
}

export function isFresheningObservationMilestone(observationCount: number) {
  return observationCount > 0 && observationCount % FRESHENING_OBSERVATION_INTERVAL === 0;
}

export function isCookingPracticeMilestone(attemptCount: number) {
  return attemptCount > 0 && attemptCount % COOKING_PRACTICE_INTERVAL === 0;
}

export function isCookingObservationMilestone(observationCount: number) {
  return observationCount > 0 && observationCount % COOKING_OBSERVATION_INTERVAL === 0;
}

export function fresheningSourceDescription(input: {
  actorPlayerId?: number;
  actorCreatureId?: number;
  creatureId?: number;
  speciesKey?: string;
}) {
  const actor = input.actorPlayerId ? `actorPlayer=${input.actorPlayerId}` : `actorCreature=${input.actorCreatureId ?? "unknown"}`;
  const creature = input.creatureId ? `; creature=${input.creatureId}` : "";
  const species = input.speciesKey ? `; species=${input.speciesKey}` : "";
  return `${actor}${creature}${species}`;
}

export function cookingSourceDescription(input: {
  actorPlayerId?: number;
  actorCreatureId?: number;
  success: boolean;
}) {
  const actor = input.actorPlayerId ? `actorPlayer=${input.actorPlayerId}` : `actorCreature=${input.actorCreatureId ?? "unknown"}`;
  return `${actor}; success=${input.success ? "true" : "false"}`;
}

export function foodObservationDescription(sourceEventId: number) {
  return `source=${sourceEventId}`;
}
