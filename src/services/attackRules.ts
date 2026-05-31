export function attackMissChanceForSpecies(speciesKey: string | null | undefined) {
  if (speciesKey === "mouse") return 0.2;
  if (speciesKey === "rabbit") return 0.4;
  return 0;
}

export function attackHitsSpecies(speciesKey: string | null | undefined, roll = Math.random()) {
  return roll >= attackMissChanceForSpecies(speciesKey);
}
