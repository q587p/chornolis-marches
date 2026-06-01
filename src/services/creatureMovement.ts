import { Direction, LocationExit } from "@prisma/client";
import { isStarterCampOwlSafeLocationKey } from "./owlSigns";

const ANIMAL_RESTRICTED_DIRECTIONS = new Set<Direction>(["UP"]);

function exitData(exit: LocationExit | Record<string, unknown>) {
  const data = (exit as any).data;
  return data && typeof data === "object" ? data : {};
}

export function isAnimalFriendlyExit(exit: LocationExit | Record<string, unknown>) {
  const data = exitData(exit);
  return (exit as any).animalFriendly === true
    || (exit as any).animal_friendly === true
    || (data as any).animalFriendly === true
    || (data as any).animal_friendly === true;
}

export function canCreatureUseExit(creature: { species?: { key?: string | null; kind?: string | null } | null }, exit: LocationExit | Record<string, unknown>) {
  if (creature.species?.kind !== "ANIMAL") return true;
  if (creature.species.key === "owl" && isStarterCampOwlSafeLocationKey((exit as any).toLocation?.key)) return false;
  const direction = (exit as any).direction as Direction | undefined;
  if (!direction) return false;
  if (!ANIMAL_RESTRICTED_DIRECTIONS.has(direction)) return true;
  return isAnimalFriendlyExit(exit);
}

export function creatureUsableExits<T extends LocationExit | Record<string, unknown>>(creature: { species?: { key?: string | null; kind?: string | null } | null }, exits: T[]) {
  return exits.filter((exit) => canCreatureUseExit(creature, exit));
}
