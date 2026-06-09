export const PREDATOR_PREY_CLAIM_PREFIX = "predator_prey_claimed_by:";
const PREDATOR_PREY_FOOD_MARKER = "prey_food:";
export type PredatorFeedingObserverMode = "claimed" | "stolen" | "scavenged" | "lost";
const PROTECTED_CORPSE_MARKERS = [
  "claimed_by_hunter:",
  "carried_corpse_by_player:",
  "freshened_by_player:",
  "freshened_by_hunter:",
  PREDATOR_PREY_CLAIM_PREFIX,
];

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

export function predatorPreyFoodValue(target: any) {
  if (target.species.key === "mouse") return 1;
  if (target.species.key === "rabbit") {
    if (target.age === "CHILD") return 2;
    if (target.age === "OLD") return 3;
    return 4;
  }
  return Math.max(1, Math.round((target.species.baseHp ?? target.maxHp ?? 1) / 3));
}

export function isUnclaimedHerbivoreCorpseForScavenging(corpse: any) {
  if (!corpse || corpse.isAlive || corpse.isGone || corpse.isHidden || corpse.age !== "CORPSE") return false;
  if (corpse.species?.diet !== "HERBIVORE") return false;
  const action = String(corpse.currentAction ?? "");
  return !PROTECTED_CORPSE_MARKERS.some((marker) => action.includes(marker));
}

export function predatorFeedingObserverText(mode: PredatorFeedingObserverMode, predatorLabel = "Щось") {
  if (mode === "stolen") return `${predatorLabel} перехоплює чужу здобич і тягне її в темнішу траву.`;
  if (mode === "scavenged") return `${predatorLabel} знаходить покинуту здобич і тягне її в темнішу траву.`;
  if (mode === "lost") return `${predatorLabel} повертається до здобичі, але знаходить лише прим’ятий мох.`;
  return `${predatorLabel} повертається до здобичі й тягне її в темнішу траву.`;
}
