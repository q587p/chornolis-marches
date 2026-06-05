export const ATTACK_PRACTICE_KILL_INTERVAL = 13;
export const ATTACK_OBSERVATION_INTERVAL = 5;

export const ATTACK_PRACTICE_GROWTH_MESSAGE = "Навичка <b>атаки</b> підросла.";
export const ATTACK_OBSERVATION_GROWTH_MESSAGE = "Навичка <b>атаки</b> трохи підросла.";

export const ATTACK_KILL_SOURCE_EVENT_TITLE = "Attack kill observable";
export const ATTACK_OBSERVATION_EVENT_TITLE = "Attack kill observed";
export const ATTACK_OBSERVATION_MILESTONE_EVENT_TITLE = "Attack observation milestone";
export const ATTACK_CANONICAL_PRACTICE_EVENT_TITLE = "Attack canonical practice";
export const ATTACK_CANONICAL_OBSERVATION_EVENT_TITLE = "Attack canonical observation";

export function isAttackPracticeMilestone(killCount: number) {
  return killCount > 0 && killCount % ATTACK_PRACTICE_KILL_INTERVAL === 0;
}

export function isAttackObservationMilestone(observationCount: number) {
  return observationCount > 0 && observationCount % ATTACK_OBSERVATION_INTERVAL === 0;
}

export function attackKillSourceDescription(input: { attackerPlayerId?: number; attackerCreatureId?: number; victimCreatureId: number }) {
  const actor = input.attackerPlayerId ? `attackerPlayer=${input.attackerPlayerId}` : `attackerCreature=${input.attackerCreatureId ?? "unknown"}`;
  return `${actor}; victimCreature=${input.victimCreatureId}`;
}

export function attackObservationDescription(sourceEventId: number) {
  return `source=${sourceEventId}`;
}

export function attackPracticeSourceDescription(input: {
  attackerPlayerId?: number;
  attackerCreatureId?: number;
  targetCreatureId?: number;
  outcome?: string;
}) {
  const actor = input.attackerPlayerId ? `attackerPlayer=${input.attackerPlayerId}` : `attackerCreature=${input.attackerCreatureId ?? "unknown"}`;
  const target = input.targetCreatureId ? `; targetCreature=${input.targetCreatureId}` : "";
  const outcome = input.outcome ? `; outcome=${input.outcome}` : "";
  return `${actor}${target}${outcome}`;
}

export function attackCanonicalObservationDescription(input: {
  creatureId?: number;
  playerId?: number;
  sourceEventId: number;
}) {
  const observer = input.creatureId ? `creature=${input.creatureId}` : `player=${input.playerId ?? "unknown"}`;
  return `${observer}; source=${input.sourceEventId}; skillKey=attack; contextKey=attack`;
}
