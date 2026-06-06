export type LearningCreatureLookupCandidate = {
  id: number;
  name?: string | null;
  nameGenitive?: string | null;
  nameDative?: string | null;
  nameAccusative?: string | null;
  nameInstrumental?: string | null;
  nameLocative?: string | null;
  nameVocative?: string | null;
  species?: { name?: string | null } | null;
  location?: { name?: string | null } | null;
};

export function normalizeLearningLookup(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseLearningCreatureTarget(rawTarget: string) {
  const input = rawTarget.trim();
  const prefixed = input.match(/^(?:creature|істота|creature:|істота:)\s*(.+)$/iu);
  return {
    forcedCreature: Boolean(prefixed),
    query: (prefixed?.[1] ?? input).trim(),
  };
}

export function learningCreatureDisplayName(creature: LearningCreatureLookupCandidate) {
  return creature.name ?? creature.species?.name ?? `creature #${creature.id}`;
}

export function learningCreatureLookupKeys(creature: LearningCreatureLookupCandidate) {
  return [
    String(creature.id),
    `#${creature.id}`,
    creature.name,
    creature.nameGenitive,
    creature.nameDative,
    creature.nameAccusative,
    creature.nameInstrumental,
    creature.nameLocative,
    creature.nameVocative,
    creature.species?.name,
  ].map(normalizeLearningLookup).filter(Boolean);
}

export function resolveLearningCreatureCandidates(
  creatures: LearningCreatureLookupCandidate[],
  rawQuery: string,
): { kind: "none" } | { kind: "single"; creature: LearningCreatureLookupCandidate } | { kind: "ambiguous"; creatures: LearningCreatureLookupCandidate[] } {
  const query = normalizeLearningLookup(rawQuery);
  if (!query) return { kind: "none" };

  const exact = creatures.filter((creature) => learningCreatureLookupKeys(creature).some((key) => key === query));
  if (exact.length === 1) return { kind: "single", creature: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous", creatures: exact.slice(0, 8) };

  const partial = creatures.filter((creature) =>
    learningCreatureLookupKeys(creature).some((key) => key.length > 2 && key.includes(query)),
  );
  if (partial.length === 1) return { kind: "single", creature: partial[0] };
  if (partial.length > 1) return { kind: "ambiguous", creatures: partial.slice(0, 8) };
  return { kind: "none" };
}

export function formatLearningCreatureDisambiguation(creatures: LearningCreatureLookupCandidate[]) {
  const lines = creatures.map((creature) => {
    const location = creature.location?.name ? `; ${creature.location.name}` : "";
    return `- ${learningCreatureDisplayName(creature)} (creature #${creature.id}${location})`;
  });
  return ["Знайшлося кілька істот. Уточни:", ...lines].join("\n");
}
