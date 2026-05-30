import { CreatureAge, CreatureSex } from "@prisma/client";
import { BASE_STAMINA } from "../gameConfig";
import { prisma } from "../db";
import {
  STARTER_MICE,
  STARTER_PREDATORS,
  STARTER_RABBITS,
  StarterAnimalGroup,
  starterAnimalAction,
  starterAnimalAgeTicks,
  starterAnimalHp,
} from "../data/starterAnimals";

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

export const POPULATION_FLOOR_GROUPS: StarterAnimalGroup[] = [
  ...STARTER_RABBITS,
  ...STARTER_MICE,
  ...STARTER_PREDATORS,
].filter((group) => group.age !== "CORPSE");

export const POPULATION_FLOOR_SPECIES_KEYS = [...new Set(POPULATION_FLOOR_GROUPS.map((group) => group.speciesKey))];

function livingCountForSpecies(livingCountsBySpeciesKey: Record<string, number> | Map<string, number>, speciesKey: string) {
  if (livingCountsBySpeciesKey instanceof Map) return livingCountsBySpeciesKey.get(speciesKey) ?? 0;
  return livingCountsBySpeciesKey[speciesKey] ?? 0;
}

export function planPopulationFloorRestoration(input: {
  groups?: StarterAnimalGroup[];
  species: PopulationFloorSpecies[];
  locations: PopulationFloorLocation[];
  livingCountsBySpeciesKey: Record<string, number> | Map<string, number>;
}): PopulationFloorPlan {
  const groups = input.groups ?? POPULATION_FLOOR_GROUPS;
  const speciesByKey = new Map(input.species.filter((species) => species.kind === undefined || species.kind === "ANIMAL").map((species) => [species.key, species]));
  const locationsByKey = new Map(input.locations.map((location) => [location.key, location]));
  const restoreSpeciesKeys = new Set(groups.map((group) => group.speciesKey).filter((speciesKey) => livingCountForSpecies(input.livingCountsBySpeciesKey, speciesKey) <= 0));
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
      select: { species: { select: { key: true } } },
    }),
  ]);

  const livingCountsBySpeciesKey = new Map<string, number>();
  for (const creature of livingCreatures) {
    livingCountsBySpeciesKey.set(creature.species.key, (livingCountsBySpeciesKey.get(creature.species.key) ?? 0) + 1);
  }

  const plan = planPopulationFloorRestoration({ species, locations, livingCountsBySpeciesKey });
  if (plan.rows.length === 0) return { ...plan, restored: 0 };

  await prisma.creature.createMany({ data: plan.rows });
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Population floor restored",
      description: `Restored animal population floors: ${Object.entries(plan.bySpecies).map(([key, count]) => `${key}=${count}`).join(", ")}.`,
    },
  });

  return { ...plan, restored: plan.rows.length };
}
