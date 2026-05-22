import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";

const START_LOCATION_KEY = "start_border_camp";
const LISOVYK_NAME = "Дід лісовик";
const LISOVYK_LEGACY_NAMES = ["Дід Чорноліс"];

const STARTER_RABBITS: Array<{ locationKey: string; count: number }> = [
  { locationKey: "forest_04_00", count: 2 },
  { locationKey: "forest_07_02", count: 2 },
  { locationKey: "forest_02_06", count: 2 },
  { locationKey: "meadow_10_03", count: 2 },
  { locationKey: "meadow_12_07", count: 2 },
  { locationKey: "meadow_14_05", count: 1 },
];

type SeedResourceNode = {
  locationKey: string;
  resourceKey: string;
  amount: number;
  maxAmount: number;
};

type SeedUniqueCreature = {
  speciesKey: string;
  locationKey: string;
  name: string;
  legacyNames?: string[];
  isAlive: boolean;
  isHidden?: boolean;
  action: string;
  activity: "IDLE" | "GATHERING" | "RESTING" | "LOOKING" | "SLEEPING";
  professionKey?: string;
  professionName?: string;
  nameOverrides?: Record<string, string>;
};

type WorldSeed = {
  meta: { version: string; startLocationKey: string };
  locations: Array<{ key: string }>;
  resourceNodes: SeedResourceNode[];
  uniqueCreatures: SeedUniqueCreature[];
};

type ResetSummary = {
  version: string;
  resetResources: number;
  removedResourceNodes: number;
  resetUniqueCreatures: number;
  removedDuplicateUniqueCreatures: number;
  rabbitsCreated: number;
};

function loadWorldSeed(): WorldSeed {
  const filePath = path.join(process.cwd(), "prisma", "data", "chornolis_world_seed.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as WorldSeed;
}

async function resetResources(world: WorldSeed) {
  const allowed = new Set(world.resourceNodes.map((node) => `${node.locationKey}:${node.resourceKey}`));
  const locations = await prisma.cellLocation.findMany({
    where: { key: { in: world.locations.map((location) => location.key) } },
    include: { resources: { include: { resourceType: true } } },
  });

  const removedIds: number[] = [];
  for (const location of locations) {
    for (const node of location.resources) {
      if (!allowed.has(`${location.key}:${node.resourceType.key}`)) removedIds.push(node.id);
    }
  }
  if (removedIds.length > 0) await prisma.resourceNode.deleteMany({ where: { id: { in: removedIds } } });

  let reset = 0;
  for (const node of world.resourceNodes) {
    const location = await prisma.cellLocation.findUniqueOrThrow({ where: { key: node.locationKey } });
    const resourceType = await prisma.resourceType.findUniqueOrThrow({ where: { key: node.resourceKey } });
    await prisma.resourceNode.upsert({
      where: { locationId_resourceTypeId: { locationId: location.id, resourceTypeId: resourceType.id } },
      update: { amount: node.amount, maxAmount: node.maxAmount },
      create: { locationId: location.id, resourceTypeId: resourceType.id, amount: node.amount, maxAmount: node.maxAmount },
    });
    reset++;
  }

  return { reset, removed: removedIds.length };
}

async function resetUniqueCreature(creature: SeedUniqueCreature) {
  const species = await prisma.creatureSpecies.findUniqueOrThrow({ where: { key: creature.speciesKey } });
  const location = await prisma.cellLocation.findUniqueOrThrow({ where: { key: creature.locationKey } });
  const names = [creature.name, ...(creature.legacyNames ?? [])];
  const existing = await prisma.creature.findMany({
    where: { speciesId: species.id, name: { in: names } },
    orderBy: [{ isAlive: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
  });

  const data: Prisma.CreatureUncheckedUpdateInput = {
    ...(creature.nameOverrides ?? {}),
    name: creature.name,
    locationId: location.id,
    hp: creature.isAlive ? species.baseHp : 0,
    maxHp: species.baseHp,
    hunger: 0,
    stamina: 13,
    staminaMax: 13,
    fatigueState: "RESTED",
    activity: creature.activity,
    currentAction: creature.action,
    age: "ADULT",
    ageTicks: 0,
    diedAtTick: null,
    corpseDecayTicksLeft: null,
    isGone: false,
    isHidden: creature.isHidden ?? false,
    isAlive: creature.isAlive,
    professionKey: creature.professionKey,
    professionName: creature.professionName,
  };

  const keep = existing[0];
  const duplicateIds = existing.slice(1).map((item) => item.id);
  if (duplicateIds.length > 0) await prisma.creature.deleteMany({ where: { id: { in: duplicateIds } } });

  if (keep) {
    await prisma.creature.update({ where: { id: keep.id }, data });
    return { removedDuplicates: duplicateIds.length };
  }

  await prisma.creature.create({
    data: {
      speciesId: species.id,
      locationId: location.id,
      name: creature.name,
      ...(creature.nameOverrides ?? {}),
      hp: creature.isAlive ? species.baseHp : 0,
      maxHp: species.baseHp,
      isAlive: creature.isAlive,
      isGone: false,
      isHidden: creature.isHidden ?? false,
      currentAction: creature.action,
      activity: creature.activity,
      professionKey: creature.professionKey,
      professionName: creature.professionName,
    },
  });

  return { removedDuplicates: duplicateIds.length };
}

async function resetUniqueCreatures(world: WorldSeed) {
  let reset = 0;
  let duplicates = 0;
  for (const creature of world.uniqueCreatures) {
    const result = await resetUniqueCreature(creature);
    reset++;
    duplicates += result.removedDuplicates;
  }

  // Hard guard: there should be only one lisovyk elder even if old runtime logic made extra records.
  const lisovykSpecies = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" } });
  if (lisovykSpecies) {
    const all = await prisma.creature.findMany({
      where: { speciesId: lisovykSpecies.id, name: { in: [LISOVYK_NAME, ...LISOVYK_LEGACY_NAMES] } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    const keep = all.find((item) => item.name === LISOVYK_NAME) ?? all[0];
    const toDelete = all.filter((item) => item.id !== keep?.id).map((item) => item.id);
    if (toDelete.length > 0) {
      await prisma.creature.deleteMany({ where: { id: { in: toDelete } } });
      duplicates += toDelete.length;
    }
  }

  return { reset, duplicates };
}

async function resetStarterRabbits() {
  const rabbit = await prisma.creatureSpecies.findUniqueOrThrow({ where: { key: "rabbit" } });
  await prisma.creature.deleteMany({ where: { speciesId: rabbit.id } });

  let created = 0;
  for (const group of STARTER_RABBITS) {
    const location = await prisma.cellLocation.findUniqueOrThrow({ where: { key: group.locationKey } });
    for (let i = 0; i < group.count; i++) {
      await prisma.creature.create({
        data: {
          speciesId: rabbit.id,
          locationId: location.id,
          hp: rabbit.baseHp,
          maxHp: rabbit.baseHp,
          hunger: 0,
          stamina: 13,
          staminaMax: 13,
          fatigueState: "RESTED",
          activity: "IDLE",
          currentAction: "насторожено прислухається",
          age: "ADULT",
          ageTicks: 0,
          isAlive: true,
          isGone: false,
          isHidden: false,
        },
      });
      created++;
    }
  }
  return created;
}

export async function resetWorldState(): Promise<ResetSummary> {
  const world = loadWorldSeed();

  await prisma.worldAction.deleteMany();
  await prisma.worldTrack.deleteMany();
  await prisma.worldEvent.deleteMany();
  await prisma.locationFeature.deleteMany({ where: { key: "old_bridge_planks" } });

  const resources = await resetResources(world);
  const unique = await resetUniqueCreatures(world);
  const rabbitsCreated = await resetStarterRabbits();

  const start = await prisma.cellLocation.findUnique({ where: { key: START_LOCATION_KEY } });
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Світ скинуто",
      description: `Reset to ${world.meta.version}: лісовик спить і прихований у forest_00_00, Здравомир стоїть у стартовому таборі, зайці повернулись у ліс і луку.`,
      locationId: start?.id,
    },
  });

  return {
    version: world.meta.version,
    resetResources: resources.reset,
    removedResourceNodes: resources.removed,
    resetUniqueCreatures: unique.reset,
    removedDuplicateUniqueCreatures: unique.duplicates,
    rabbitsCreated,
  };
}
