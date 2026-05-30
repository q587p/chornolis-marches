export const ATTACK_PRACTICE_KILL_INTERVAL = 13;
export const ATTACK_OBSERVATION_INTERVAL = 5;

export const ATTACK_PRACTICE_GROWTH_MESSAGE = "Навичка <b>атаки</b> підросла.";
export const ATTACK_OBSERVATION_GROWTH_MESSAGE = "Навичка <b>атаки</b> трохи підросла.";

export const ATTACK_KILL_SOURCE_EVENT_TITLE = "Attack kill observable";
export const ATTACK_OBSERVATION_EVENT_TITLE = "Attack kill observed";
export const ATTACK_OBSERVATION_MILESTONE_EVENT_TITLE = "Attack observation milestone";

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
