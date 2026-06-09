export const HERBALISM_SKILL_KEY = "herbalism";
export const HERBALISM_SKILL_UKRAINIAN_LABEL = "знахарство";
export const HERBALISM_PRACTICE_SOURCE_KEY = "practice";
export const HERBALISM_OBSERVATION_SOURCE_KEY = "observation";
export const HERBALISM_BREW_CONTEXT_PREFIX = "brew:";
export const HERBALISM_HERBAL_TINCTURE_CONTEXT_KEY = `${HERBALISM_BREW_CONTEXT_PREFIX}herbal_tincture`;

export type HerbalismBrewOutcome = "success" | "ordinary_failure" | "critical_failure";

export type HerbalismBrewChanceRow = {
  level: number;
  successPermille: number;
  ordinaryFailurePermille: number;
  criticalFailurePermille: number;
};

export type HerbalismBrewConsumptionPolicy = {
  consumeNonBottleIngredients: boolean;
  consumeEmptyBottle: boolean;
  produceOutput: boolean;
};

export const HERBALISM_BREW_OUTCOME_TABLE: HerbalismBrewChanceRow[] = [
  { level: 0, successPermille: 450, ordinaryFailurePermille: 500, criticalFailurePermille: 50 },
  { level: 1, successPermille: 550, ordinaryFailurePermille: 420, criticalFailurePermille: 30 },
  { level: 2, successPermille: 680, ordinaryFailurePermille: 300, criticalFailurePermille: 20 },
  { level: 3, successPermille: 780, ordinaryFailurePermille: 210, criticalFailurePermille: 10 },
  { level: 4, successPermille: 880, ordinaryFailurePermille: 110, criticalFailurePermille: 10 },
  { level: 5, successPermille: 950, ordinaryFailurePermille: 50, criticalFailurePermille: 0 },
];

function normalizeLevel(level: number) {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(5, Math.floor(level)));
}

function normalizePermilleRoll(roll: number) {
  if (!Number.isFinite(roll)) return 0;
  return Math.max(0, Math.min(999, Math.floor(roll)));
}

export function herbalismBrewChancesForLevel(level: number) {
  return HERBALISM_BREW_OUTCOME_TABLE[normalizeLevel(level)];
}

export function rollHerbalismBrewOutcome(level: number, roll: number): HerbalismBrewOutcome {
  const chances = herbalismBrewChancesForLevel(level);
  const safeRoll = normalizePermilleRoll(roll);
  if (safeRoll < chances.successPermille) return "success";
  if (safeRoll < chances.successPermille + chances.ordinaryFailurePermille) return "ordinary_failure";
  return "critical_failure";
}

export function randomHerbalismBrewOutcome(level: number, rng = Math.random) {
  return rollHerbalismBrewOutcome(level, rng() * 1000);
}

export function herbalismPracticeAmountForOutcome(outcome: HerbalismBrewOutcome) {
  if (outcome === "ordinary_failure") return 1;
  return 2;
}

export function herbalismBrewConsumptionPolicy(outcome: HerbalismBrewOutcome): HerbalismBrewConsumptionPolicy {
  if (outcome === "success") {
    return {
      consumeNonBottleIngredients: true,
      consumeEmptyBottle: true,
      produceOutput: true,
    };
  }
  if (outcome === "ordinary_failure") {
    return {
      consumeNonBottleIngredients: true,
      consumeEmptyBottle: false,
      produceOutput: false,
    };
  }
  return {
    consumeNonBottleIngredients: true,
    consumeEmptyBottle: true,
    produceOutput: false,
  };
}

export function herbalismBrewOutcomeText(outcome: HerbalismBrewOutcome) {
  if (outcome === "success") {
    return "Гіркота трав і темний сік ягід нарешті тримаються разом. У пляшечці виходить різка, проста настоянка.";
  }
  if (outcome === "ordinary_failure") {
    return "Трави дають запах, але не силу. Настоянка мутніє й осідає на дні, перш ніж ви встигаєте зрозуміти, що саме зробили не так.";
  }
  return "Ви стискаєте пляшечку саме тоді, коли суміш різко теплішає. Скло клацає під пальцями й дає тріщину. Гіркий сік іде в глину, а в руці лишається тільки мокрий блиск уламків.";
}
