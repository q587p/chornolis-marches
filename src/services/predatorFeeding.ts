export const PREDATOR_PREY_CLAIM_PREFIX = "predator_prey_claimed_by:";
const PREDATOR_PREY_FOOD_MARKER = "prey_food:";

export function predatorClaimedCorpseAction(predatorId: number, predatorSpeciesKey: string, foodValue: number) {
  return `убито хижаком: ${predatorSpeciesKey}; ${PREDATOR_PREY_CLAIM_PREFIX}${predatorId}; ${PREDATOR_PREY_FOOD_MARKER}${foodValue}`;
}

export function predatorClaimedCorpseOwnerId(currentAction: string | null | undefined) {
  const match = currentAction?.match(new RegExp(`${PREDATOR_PREY_CLAIM_PREFIX}(\\d+)`));
  return match ? Number(match[1]) : null;
}

export function predatorClaimedCorpseFoodValue(currentAction: string | null | undefined) {
  const match = currentAction?.match(new RegExp(`${PREDATOR_PREY_FOOD_MARKER}(\\d+)`));
  return match ? Math.max(1, Number(match[1])) : null;
}

export function predatorClaimedCorpseDecayAction(currentAction: string | null | undefined, decayLeft: number) {
  const predatorId = predatorClaimedCorpseOwnerId(currentAction);
  const foodValue = predatorClaimedCorpseFoodValue(currentAction);
  if (!predatorId || !foodValue) return null;
  return `розкладається; залишилось ${decayLeft} тіків; ${PREDATOR_PREY_CLAIM_PREFIX}${predatorId}; ${PREDATOR_PREY_FOOD_MARKER}${foodValue}`;
}

export function predatorClaimedCorpseMarker(predatorId: number) {
  return `${PREDATOR_PREY_CLAIM_PREFIX}${predatorId}`;
}
