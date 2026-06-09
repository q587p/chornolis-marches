import { CreatureAge, CreatureSex } from "@prisma/client";
import { BASE_STAMINA } from "../gameConfig";
import { prisma } from "../db";
import {
  STARTER_ANIMAL_GROUPS,
  StarterAnimalGroup,
  starterAnimalAction,
  starterAnimalAgeTicks,
  starterAnimalHp,
} from "../data/starterAnimals";
import { POPULATION_FLOOR_RESTORED_EVENT_TITLE } from "./ecologyStats";

type PopulationFloorSpecies = {
  id: number;
  key: string;
  kind?: string;
  baseHp: number;
  childTicks?: number;
  youngTicks?: number;
  adultTicks?: number;
};

type PopulationFloorLocation = {
  id: number;
  key: string;
};

type BreedingCounts = {
  adultFemales: number;
  adultMales: number;
};

export type PopulationFloorCreateRow = {
  speciesId: number;
  locationId: number;
  hp: number;
  maxHp: number;
  hunger: number;
  stamina: number;
  staminaMax: number;
  fatigueState: "RESTED";
  activity: "IDLE";
  currentAction: string;
  age: Exclude<CreatureAge, "CORPSE">;
  ageTicks: number;
  sex: CreatureSex | null;
  isAlive: true;
  isGone: false;
  isHidden: false;
};

export type PopulationFloorPlan = {
  rows: PopulationFloorCreateRow[];
  bySpecies: Record<string, number>;
  skippedGroups: Array<{ speciesKey: string; locationKey: string; reason: "species-missing" | "location-missing" }>;
};

export type PopulationFloorResult = PopulationFloorPlan & {
  restored: number;
};

export const POPULATION_FLOOR_GROUPS: StarterAnimalGroup[] = STARTER_ANIMAL_GROUPS.filter((group) => group.age !== "CORPSE");

export const POPULATION_FLOOR_SPECIES_KEYS = [...new Set(POPULATION_FLOOR_GROUPS.map((group) => group.speciesKey))];
const BREEDING_PAIR_RESTORATION_SPECIES_KEYS = new Set(["rabbit", "mouse", "frog"]);

function livingCountForSpecies(livingCountsBySpeciesKey: Record<string, number> | Map<string, number>, speciesKey: string) {
  if (livingCountsBySpeciesKey instanceof Map) return livingCountsBySpeciesKey.get(speciesKey) ?? 0;
  return livingCountsBySpeciesKey[speciesKey] ?? 0;
}

function breedingCountsForSpecies(
  livingBreedingBySpeciesKey: Record<string, BreedingCounts> | Map<string, BreedingCounts> | undefined,
  speciesKey: string
) {
  if (!livingBreedingBySpeciesKey) return { adultFemales: 0, adultMales: 0 };
  if (livingBreedingBySpeciesKey instanceof Map) return livingBreedingBySpeciesKey.get(speciesKey) ?? { adultFemales: 0, adultMales: 0 };
  return livingBreedingBySpeciesKey[speciesKey] ?? { adultFemales: 0, adultMales: 0 };
}

function shouldRestoreSpecies(input: {
  speciesKey: string;
  livingCountsBySpeciesKey: Record<string, number> | Map<string, number>;
  livingBreedingBySpeciesKey?: Record<string, BreedingCounts> | Map<string, BreedingCounts>;
}) {
  const livingCount = livingCountForSpecies(input.livingCountsBySpeciesKey, input.speciesKey);
  if (livingCount <= 0) return true;
  if (!BREEDING_PAIR_RESTORATION_SPECIES_KEYS.has(input.speciesKey)) return false;
  if (!input.livingBreedingBySpeciesKey) return false;

  const breeding = breedingCountsForSpecies(input.livingBreedingBySpeciesKey, input.speciesKey);
  return breeding.adultFemales <= 0 || breeding.adultMales <= 0;
}

export function planPopulationFloorRestoration(input: {
  groups?: StarterAnimalGroup[];
  species: PopulationFloorSpecies[];
  locations: PopulationFloorLocation[];
  livingCountsBySpeciesKey: Record<string, number> | Map<string, number>;
  livingBreedingBySpeciesKey?: Record<string, BreedingCounts> | Map<string, BreedingCounts>;
}): PopulationFloorPlan {
  const groups = input.groups ?? POPULATION_FLOOR_GROUPS;
  const speciesByKey = new Map(input.species.filter((species) => species.kind === undefined || species.kind === "ANIMAL").map((species) => [species.key, species]));
  const locationsByKey = new Map(input.locations.map((location) => [location.key, location]));
  const restoreSpeciesKeys = new Set(groups.map((group) => group.speciesKey).filter((speciesKey) => shouldRestoreSpecies({ ...input, speciesKey })));
  const spawnIndexBySpeciesKey = new Map<string, number>();
  const rows: PopulationFloorCreateRow[] = [];
  const bySpecies: Record<string, number> = {};
  const skippedGroups: PopulationFloorPlan["skippedGroups"] = [];

  for (const group of groups) {
    if (group.age === "CORPSE" || !restoreSpeciesKeys.has(group.speciesKey)) continue;

    const species = speciesByKey.get(group.speciesKey);
    if (!species) {
      skippedGroups.push({ speciesKey: group.speciesKey, locationKey: group.locationKey, reason: "species-missing" });
      continue;
    }

    const location = locationsByKey.get(group.locationKey);
    if (!location) {
      skippedGroups.push({ speciesKey: group.speciesKey, locationKey: group.locationKey, reason: "location-missing" });
      continue;
    }

    for (let i = 0; i < group.count; i++) {
      const spawnIndex = spawnIndexBySpeciesKey.get(group.speciesKey) ?? 0;
      spawnIndexBySpeciesKey.set(group.speciesKey, spawnIndex + 1);
      const hp = starterAnimalHp(species.baseHp, group.age);
      rows.push({
        speciesId: species.id,
        locationId: location.id,
        hp,
        maxHp: hp,
        hunger: 0,
        stamina: BASE_STAMINA,
        staminaMax: BASE_STAMINA,
        fatigueState: "RESTED",
        activity: "IDLE",
        currentAction: starterAnimalAction(group.speciesKey, group.age),
        age: group.age,
        ageTicks: starterAnimalAgeTicks(species, group.age, spawnIndex),
        sex: group.sex ?? null,
        isAlive: true,
        isGone: false,
        isHidden: false,
      });
      bySpecies[group.speciesKey] = (bySpecies[group.speciesKey] ?? 0) + 1;
    }
  }

  return { rows, bySpecies, skippedGroups };
}

export async function restorePopulationFloors(): Promise<PopulationFloorResult> {
  const [species, locations, livingCreatures] = await Promise.all([
    prisma.creatureSpecies.findMany({
      where: { key: { in: POPULATION_FLOOR_SPECIES_KEYS }, kind: "ANIMAL" },
      select: { id: true, key: true, kind: true, baseHp: true, childTicks: true, youngTicks: true, adultTicks: true },
    }),
    prisma.cellLocation.findMany({
      where: { key: { in: [...new Set(POPULATION_FLOOR_GROUPS.map((group) => group.locationKey))] } },
      select: { id: true, key: true },
    }),
    prisma.creature.findMany({
      where: { isAlive: true, isGone: false, species: { key: { in: POPULATION_FLOOR_SPECIES_KEYS }, kind: "ANIMAL" } },
      select: { age: true, sex: true, species: { select: { key: true } } },
    }),
  ]);

  const livingCountsBySpeciesKey = new Map<string, number>();
  const livingBreedingBySpeciesKey = new Map<string, BreedingCounts>();
  for (const creature of livingCreatures) {
    livingCountsBySpeciesKey.set(creature.species.key, (livingCountsBySpeciesKey.get(creature.species.key) ?? 0) + 1);
    if (creature.age !== "ADULT") continue;
    const breeding = livingBreedingBySpeciesKey.get(creature.species.key) ?? { adultFemales: 0, adultMales: 0 };
    if (creature.sex === "FEMALE") breeding.adultFemales++;
    if (creature.sex === "MALE") breeding.adultMales++;
    livingBreedingBySpeciesKey.set(creature.species.key, breeding);
  }

  const plan = planPopulationFloorRestoration({ species, locations, livingCountsBySpeciesKey, livingBreedingBySpeciesKey });
  if (plan.rows.length === 0) return { ...plan, restored: 0 };

  await prisma.creature.createMany({ data: plan.rows });
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: POPULATION_FLOOR_RESTORED_EVENT_TITLE,
      description: `Restored animal population floors: ${Object.entries(plan.bySpecies).map(([key, count]) => `${key}=${count}`).join(", ")}.`,
    },
  });

  return { ...plan, restored: plan.rows.length };
}
