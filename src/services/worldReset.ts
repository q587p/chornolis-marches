import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";

const START_LOCATION_KEY = "start_border_camp";
const LISOVYK_NAME = "Дід лісовик";
const LISOVYK_LEGACY_NAMES = ["Дід Чорноліс"];

type StarterRabbitAge = "CHILD" | "YOUNG" | "ADULT" | "OLD" | "CORPSE";

type StarterRabbitGroup = {
  locationKey: string;
  count: number;
  age: StarterRabbitAge;
  sex?: "MALE" | "FEMALE";
};

const STARTER_RABBITS: StarterRabbitGroup[] = [
  { locationKey: "forest_04_00", count: 1, age: "ADULT", sex: "FEMALE" },
  { locationKey: "forest_04_00", count: 1, age: "ADULT", sex: "MALE" },
  { locationKey: "forest_07_02", count: 3, age: "CHILD" },
  { locationKey: "forest_07_02", count: 2, age: "YOUNG" },
  { locationKey: "forest_02_06", count: 2, age: "OLD" },
  { locationKey: "meadow_10_03", count: 1, age: "ADULT", sex: "FEMALE" },
  { locationKey: "meadow_10_03", count: 1, age: "ADULT", sex: "MALE" },
  { locationKey: "meadow_10_03", count: 2, age: "CHILD" },
  { locationKey: "meadow_12_07", count: 2, age: "YOUNG" },
  { locationKey: "meadow_12_07", count: 1, age: "OLD" },
  { locationKey: "meadow_14_05", count: 2, age: "CORPSE" },
];

type SeedMeta = {
  version: string;
  startLocationKey: string;
  notes?: string[];
};

type SeedLocation = {
  key: string;
  biome: string;
};

type SeedResourceType = {
  key: string;
};

type SeedResourceNode = {
  locationKey: string;
  resourceKey: string;
  amount: number;
  maxAmount: number;
};

type SeedResourceAmountRule = number | [number, number] | null;

type SeedResourceRules = {
  maxAmount?: number;
  defaultsByBiome: Record<string, Record<string, SeedResourceAmountRule>>;
  locationOverrides?: Record<string, Record<string, SeedResourceAmountRule>>;
  notes?: string[];
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
  sex?: "MALE" | "FEMALE";
  professionKey?: string;
  professionName?: string;
  nameOverrides?: Record<string, string>;
};

type WorldSeed = {
  meta: SeedMeta;
  locations: SeedLocation[];
  resourceTypes: SeedResourceType[];
  resourceNodes: SeedResourceNode[];
  resourceRules?: SeedResourceRules;
  uniqueCreatures: SeedUniqueCreature[];
};

type ResetSummary = {
  version: string;
  resetResources: number;
  removedResourceNodes: number;
  resetUniqueCreatures: number;
  removedDuplicateUniqueCreatures: number;
  rabbitsCreated: number;
  playerAutoStatesCleared: number;
};

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function amountFromRule(rule: SeedResourceAmountRule | undefined, seedKey: string): number | null {
  if (rule === undefined || rule === null) return null;
  if (typeof rule === "number") return rule > 0 ? rule : null;

  const [min, max] = rule;
  if (max <= 0) return null;
  if (min >= max) return min > 0 ? min : null;

  return min + (stableHash(seedKey) % (max - min + 1));
}

function buildResourceNodes(world: WorldSeed): SeedResourceNode[] {
  if (!world.resourceRules) return world.resourceNodes ?? [];

  const nodes: SeedResourceNode[] = [];
  const maxAmount = world.resourceRules.maxAmount ?? 100;
  const resourceKeys = world.resourceTypes.map((resource) => resource.key);

  for (const location of world.locations) {
    const biomeRules = world.resourceRules.defaultsByBiome[location.biome] ?? {};
    const locationOverrides = world.resourceRules.locationOverrides?.[location.key] ?? {};
    const candidateResourceKeys = new Set([...Object.keys(biomeRules), ...Object.keys(locationOverrides)]);

    for (const resourceKey of candidateResourceKeys) {
      if (!resourceKeys.includes(resourceKey)) continue;

      const rule = Object.prototype.hasOwnProperty.call(locationOverrides, resourceKey)
        ? locationOverrides[resourceKey]
        : biomeRules[resourceKey];

      const amount = amountFromRule(rule, `${world.meta.version}:${location.key}:${resourceKey}`);
      if (amount === null) continue;

      nodes.push({ locationKey: location.key, resourceKey, amount, maxAmount });
    }
  }

  return nodes;
}

function loadWorldSeed(): WorldSeed {
  const splitDir = path.join(process.cwd(), "prisma", "data", "world");

  if (fs.existsSync(splitDir) && fs.statSync(splitDir).isDirectory()) {
    const explicitResourceNodesPath = path.join(splitDir, "resourceNodes.json");
    const resourceRulesPath = path.join(splitDir, "resourceRules.json");
    const world: WorldSeed = {
      meta: readJsonFile<SeedMeta>(path.join(splitDir, "meta.json")),
      locations: readJsonFile<SeedLocation[]>(path.join(splitDir, "locations.json")),
      resourceTypes: readJsonFile<SeedResourceType[]>(path.join(splitDir, "resourceTypes.json")),
      resourceNodes: fileExists(explicitResourceNodesPath) ? readJsonFile<SeedResourceNode[]>(explicitResourceNodesPath) : [],
      resourceRules: fileExists(resourceRulesPath) ? readJsonFile<SeedResourceRules>(resourceRulesPath) : undefined,
      uniqueCreatures: readJsonFile<SeedUniqueCreature[]>(path.join(splitDir, "uniqueCreatures.json")),
    };
    world.resourceNodes = buildResourceNodes(world);
    return world;
  }

  const filePath = path.join(process.cwd(), "prisma", "data", "chornolis_world_seed.json");
  const world = readJsonFile<WorldSeed>(filePath);
  world.resourceNodes = buildResourceNodes(world);
  return world;
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

  const dbLocations = await prisma.cellLocation.findMany({
    where: { key: { in: world.locations.map((location) => location.key) } },
    select: { id: true, key: true },
  });
  const dbResourceTypes = await prisma.resourceType.findMany({
    select: { id: true, key: true },
  });
  const locationsByKey = new Map(dbLocations.map((location) => [location.key, location]));
  const resourceTypesByKey = new Map(dbResourceTypes.map((resourceType) => [resourceType.key, resourceType]));

  let reset = 0;
  for (const node of world.resourceNodes) {
    const location = locationsByKey.get(node.locationKey);
    const resourceType = resourceTypesByKey.get(node.resourceKey);
    if (!location) throw new Error(`Unknown location key for reset resource node: ${node.locationKey}`);
    if (!resourceType) throw new Error(`Unknown resource key for reset resource node: ${node.resourceKey}`);

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
    sex: creature.sex ?? null,
    professionKey: creature.professionKey ?? null,
    professionName: creature.professionName ?? null,
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
      sex: creature.sex,
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

function starterRabbitAgeTicks(
  rabbit: { childTicks: number; youngTicks: number; adultTicks: number },
  age: StarterRabbitAge,
  index: number
) {
  if (age === "CHILD") return Math.min(Math.max(0, rabbit.childTicks - 1), 8 + index * 7);
  if (age === "YOUNG") return rabbit.childTicks + 8 + index * 9;
  if (age === "ADULT") return rabbit.childTicks + rabbit.youngTicks + index * 12;
  if (age === "OLD") return rabbit.childTicks + rabbit.youngTicks + rabbit.adultTicks + 10 + index * 18;
  return rabbit.childTicks + rabbit.youngTicks + rabbit.adultTicks + 40 + index * 20;
}

function starterRabbitHp(baseHp: number, age: StarterRabbitAge) {
  if (age === "CHILD") return Math.max(1, Math.round(baseHp * 0.35));
  if (age === "YOUNG") return Math.max(1, Math.round(baseHp * 0.75));
  if (age === "OLD") return Math.max(1, Math.round(baseHp * 0.65));
  if (age === "CORPSE") return 0;
  return baseHp;
}

function starterRabbitAction(age: StarterRabbitAge) {
  if (age === "CHILD") return "ховається в траві біля нори";
  if (age === "YOUNG") return "обережно вивчає нові запахи";
  if (age === "OLD") return "повільно ворушить вухами";
  if (age === "CORPSE") return "лежить нерухомо серед притоптаної трави";
  return "насторожено прислухається";
}

async function resetStarterRabbits() {
  const rabbit = await prisma.creatureSpecies.findUniqueOrThrow({ where: { key: "rabbit" } });
  await prisma.creature.deleteMany({ where: { speciesId: rabbit.id } });

  let created = 0;
  for (const group of STARTER_RABBITS) {
    const location = await prisma.cellLocation.findUniqueOrThrow({ where: { key: group.locationKey } });
    for (let i = 0; i < group.count; i++) {
      const ageTicks = starterRabbitAgeTicks(rabbit, group.age, i);
      const isCorpse = group.age === "CORPSE";
      const hp = starterRabbitHp(rabbit.baseHp, group.age);
      await prisma.creature.create({
        data: {
          speciesId: rabbit.id,
          locationId: location.id,
          hp: isCorpse ? 0 : hp,
          maxHp: hp,
          hunger: 0,
          stamina: 13,
          staminaMax: 13,
          fatigueState: "RESTED",
          activity: isCorpse ? "RESTING" : "IDLE",
          currentAction: starterRabbitAction(group.age),
          age: group.age,
          ageTicks,
          diedAtTick: isCorpse ? 0 : null,
          corpseDecayTicksLeft: isCorpse ? Math.max(1, rabbit.corpseDecayTicks - i * 20) : null,
          sex: group.sex ?? (i % 2 === 0 ? "FEMALE" : "MALE"),
          isAlive: !isCorpse,
          isGone: false,
          isHidden: false,
        },
      });
      created++;
    }
  }
  return created;
}

async function clearPlayerAutoState() {
  const result = await prisma.player.updateMany({
    where: { isAutoEnabled: true },
    data: { isAutoEnabled: false },
  });
  return result.count;
}

export async function resetWorldState(): Promise<ResetSummary> {
  const world = loadWorldSeed();

  await prisma.worldAction.deleteMany();
  await prisma.worldTrack.deleteMany();
  await prisma.worldEvent.deleteMany();
  await prisma.locationFeature.deleteMany({ where: { key: "old_bridge_planks" } });

  const playerAutoStatesCleared = await clearPlayerAutoState();
  const resources = await resetResources(world);
  const unique = await resetUniqueCreatures(world);
  const rabbitsCreated = await resetStarterRabbits();

  const start = await prisma.cellLocation.findUnique({ where: { key: START_LOCATION_KEY } });
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Світ скинуто",
      description: `Reset to ${world.meta.version}: лісовик спить і прихований у forest_00_00, Здравомир стоїть у стартовому таборі, зайці повернулись у ліс і луку, авто-режими вимкнено.`,
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
    playerAutoStatesCleared,
  };
}
