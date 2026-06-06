export type HighSkillOutcomeKind = "gathering" | "freshening" | "cooking" | "tracking";

export type HighSkillOutcome = {
  triggered: boolean;
  chance: number;
  text?: string;
  extraAmount?: number;
};

const GATHERING_OUTCOME_TEXTS = [
  "Рука не поспішає. Ви берете не більше, ніж треба, але саме те, що тримається найкраще.",
  "Серед звичайних стебел трапляється одне чистіше — не скарб, а знак досвідченого ока.",
] as const;

const FRESHENING_OUTCOME_TEXTS = [
  "Розріз виходить чистішим, ніж раніше: менше марної рани, більше спокійної роботи.",
  "Ви не отримуєте більше м'яса, але краще розумієте, де тіло ще тримає лад.",
] as const;

const SUPPORTED_GATHERING_RESOURCE_KEYS = new Set(["berries", "mushrooms", "herbs"]);

export function highSkillOutcomeChanceForLevel(level: number): number {
  if (level < 3) return 0;
  if (level === 3) return 0.03;
  if (level === 4) return 0.05;
  return 0.08;
}

export function highSkillOutcomeSucceeds({
  level,
  roll = Math.random(),
}: {
  level: number;
  roll?: number;
}): { chance: number; triggered: boolean } {
  const chance = highSkillOutcomeChanceForLevel(level);
  return { chance, triggered: chance > 0 && roll < chance };
}

export function maybeHighSkillQualitativeOutcome({
  kind,
  level,
  roll,
  resourceKey,
  success = true,
  tutorial = false,
  textIndex = 0,
}: {
  kind: HighSkillOutcomeKind;
  level: number;
  roll?: number;
  resourceKey?: string | null;
  success?: boolean;
  tutorial?: boolean;
  textIndex?: number;
}): HighSkillOutcome {
  const chance = highSkillOutcomeChanceForLevel(level);
  if (!success || tutorial) return { triggered: false, chance };

  if (kind === "gathering" && (!resourceKey || !SUPPORTED_GATHERING_RESOURCE_KEYS.has(resourceKey))) {
    return { triggered: false, chance };
  }

  if (kind !== "gathering" && kind !== "freshening") {
    return { triggered: false, chance };
  }

  const outcome = highSkillOutcomeSucceeds({ level, roll });
  if (!outcome.triggered) return { triggered: false, chance: outcome.chance };

  if (kind === "gathering") {
    return {
      triggered: true,
      chance: outcome.chance,
      text: GATHERING_OUTCOME_TEXTS[Math.abs(textIndex) % GATHERING_OUTCOME_TEXTS.length],
      extraAmount: 1,
    };
  }

  return {
    triggered: true,
    chance: outcome.chance,
    text: FRESHENING_OUTCOME_TEXTS[Math.abs(textIndex) % FRESHENING_OUTCOME_TEXTS.length],
  };
}
