import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const { Pool } = pg;
const isRenderInternalDb = process.env.DATABASE_URL.includes(".internal");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderInternalDb ? false : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type SeedMeta = {
  version: string;
  startLocationKey: string;
  notes?: string[];
};

type SeedRegion = {
  key: string;
  name: string;
  description?: string;
};

type SeedLocation = {
  key: string;
  x: number;
  y: number;
  z: number;
  name: string;
  description?: string;
  regionKey: string;
  biome: string;
  dangerLevel: number;
};

type SeedBlockedCell = {
  x: number;
  y: number;
  z: number;
  kind: string;
  note?: string;
};

type SeedExit = {
  fromKey: string;
  toKey: string;
  direction: string;
  label?: string;
  travelCost?: number;
  isHidden?: boolean;
};

type SeedResourceType = {
  key: string;
  name: string;
  description?: string;
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

type SeedFeature = {
  key: string;
  locationKey: string;
  type: string;
  name: string;
  description?: string;
  isActive?: boolean;
  providesLight?: boolean;
  restStaminaCapMultiplier?: number | null;
  data?: Prisma.InputJsonValue;
};

type CreatureNameOverrides = {
  nameGenitive?: string;
  nameDative?: string;
  nameAccusative?: string;
  nameInstrumental?: string;
  nameLocative?: string;
  nameVocative?: string;
};

type SeedUniqueCreature = {
  speciesKey: string;
  locationKey: string;
  name: string;
  isAlive: boolean;
  action: string;
  activity: "IDLE" | "GATHERING" | "RESTING" | "LOOKING" | "SLEEPING";
  legacyNames?: string[];
  isHidden?: boolean;
  professionKey?: string;
  professionName?: string;
  nameOverrides?: CreatureNameOverrides;
};

type WorldSeed = {
  meta: SeedMeta;
  regions: SeedRegion[];
  locations: SeedLocation[];
  blockedCells: SeedBlockedCell[];
  exits: SeedExit[];
  resourceTypes: SeedResourceType[];
  resourceNodes: SeedResourceNode[];
  resourceRules?: SeedResourceRules;
  features: SeedFeature[];
  uniqueCreatures: SeedUniqueCreature[];
};

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function loadWorldSeed(): WorldSeed {
  const splitDir = path.join(__dirname, "data", "world");

  if (fs.existsSync(splitDir) && fs.statSync(splitDir).isDirectory()) {
    const meta = readJsonFile<SeedMeta>(path.join(splitDir, "meta.json"));
    const resourceRulesPath = path.join(splitDir, "resourceRules.json");
    const explicitResourceNodesPath = path.join(splitDir, "resourceNodes.json");

    const world: WorldSeed = {
      meta,
      regions: readJsonFile<SeedRegion[]>(path.join(splitDir, "regions.json")),
      locations: readJsonFile<SeedLocation[]>(path.join(splitDir, "locations.json")),
      blockedCells: fileExists(path.join(splitDir, "blockedCells.json"))
        ? readJsonFile<SeedBlockedCell[]>(path.join(splitDir, "blockedCells.json"))
        : [],
      exits: readJsonFile<SeedExit[]>(path.join(splitDir, "exits.json")),
      resourceTypes: readJsonFile<SeedResourceType[]>(path.join(splitDir, "resourceTypes.json")),
      resourceNodes: fileExists(explicitResourceNodesPath)
        ? readJsonFile<SeedResourceNode[]>(explicitResourceNodesPath)
        : [],
      resourceRules: fileExists(resourceRulesPath) ? readJsonFile<SeedResourceRules>(resourceRulesPath) : undefined,
      features: readJsonFile<SeedFeature[]>(path.join(splitDir, "features.json")),
      uniqueCreatures: readJsonFile<SeedUniqueCreature[]>(path.join(splitDir, "uniqueCreatures.json")),
    };

    world.resourceNodes = buildResourceNodes(world);
    return world;
  }

  const legacyFilePath = path.join(__dirname, "data", "chornolis_world_seed.json");
  const world = readJsonFile<WorldSeed>(legacyFilePath);
  world.blockedCells ??= [];
  world.resourceNodes = buildResourceNodes(world);
  return world;
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

      const rule =
        Object.prototype.hasOwnProperty.call(locationOverrides, resourceKey)
          ? locationOverrides[resourceKey]
          : biomeRules[resourceKey];

      const amount = amountFromRule(rule, `${world.meta.version}:${location.key}:${resourceKey}`);
      if (amount === null) continue;

      nodes.push({ locationKey: location.key, resourceKey, amount, maxAmount });
    }
  }

  return nodes;
}

function nowMs() {
  return Date.now();
}

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

async function seedStep<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = nowMs();
  console.log(`◇ ${label}...`);

  try {
    const result = await fn();
    console.log(`◆ ${label}: done in ${seconds(nowMs() - startedAt)}`);
    return result;
  } catch (error) {
    console.error(`✕ ${label}: failed after ${seconds(nowMs() - startedAt)}`);
    throw error;
  }
}

function progress(label: string, current: number, total: number, every = 50) {
  if (current === 1 || current === total || current % every === 0) {
    console.log(`  - ${label}: ${current}/${total}`);
  }
}

async function deleteResourceNodesRemovedFromSeed(world: WorldSeed) {
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

  if (removedIds.length > 0) {
    await prisma.resourceNode.deleteMany({ where: { id: { in: removedIds } } });
    console.log(`  - removed stale resource nodes: ${removedIds.length}`);
  }
}

async function deleteDeprecatedSeedFeatures() {
  const result = await prisma.locationFeature.deleteMany({ where: { key: { in: ["old_bridge_planks"] } } });
  if (result.count > 0) console.log(`  - removed deprecated features: ${result.count}`);
}

const species = [
  {
    key: "rabbit",
    name: "заєць",
    nameGenitive: "зайця",
    nameDative: "зайцю",
    nameAccusative: "зайця",
    nameInstrumental: "зайцем",
    nameLocative: "зайці",
    nameVocative: "зайцю",
    grammaticalGender: "MASCULINE",
    animacy: "ANIMATE",
    kind: "ANIMAL",
    diet: "HERBIVORE",
    baseHp: 3,
    strength: 1,
    agility: 8,
    perception: 6,
    endurance: 3,
    instinct: 7,
    childTicks: 8,
    youngTicks: 24,
    adultTicks: 80,
    oldTicks: 36,
    oldDeathChancePermille: 10,
    oldDeathChanceGrowthPermille: 2,
    corpseDecayTicks: 18,
    mushroomBonusOnDecay: 2,
  },
  {
    key: "mouse",
    name: "миша",
    nameGenitive: "миші",
    nameDative: "миші",
    nameAccusative: "мишу",
    nameInstrumental: "мишею",
    nameLocative: "миші",
    nameVocative: "мише",
    grammaticalGender: "FEMININE",
    animacy: "ANIMATE",
    kind: "ANIMAL",
    diet: "HERBIVORE",
    baseHp: 1,
    strength: 1,
    agility: 7,
    perception: 5,
    endurance: 2,
    instinct: 6,
    childTicks: 4,
    youngTicks: 12,
    adultTicks: 36,
    oldTicks: 18,
    oldDeathChancePermille: 20,
    oldDeathChanceGrowthPermille: 4,
    corpseDecayTicks: 10,
    mushroomBonusOnDecay: 1,
  },
  {
    key: "fox",
    name: "лисиця",
    nameGenitive: "лисиці",
    nameDative: "лисиці",
    nameAccusative: "лисицю",
    nameInstrumental: "лисицею",
    nameLocative: "лисиці",
    nameVocative: "лисице",
    grammaticalGender: "FEMININE",
    animacy: "ANIMATE",
    kind: "ANIMAL",
    diet: "CARNIVORE",
    baseHp: 8,
    strength: 3,
    agility: 8,
    perception: 7,
    endurance: 5,
    instinct: 8,
    childTicks: 20,
    youngTicks: 60,
    adultTicks: 180,
    oldTicks: 80,
    oldDeathChancePermille: 5,
    oldDeathChanceGrowthPermille: 1,
    corpseDecayTicks: 24,
    mushroomBonusOnDecay: 3,
  },
  {
    key: "wolf",
    name: "вовк",
    nameGenitive: "вовка",
    nameDative: "вовку",
    nameAccusative: "вовка",
    nameInstrumental: "вовком",
    nameLocative: "вовку",
    nameVocative: "вовче",
    grammaticalGender: "MASCULINE",
    animacy: "ANIMATE",
    kind: "ANIMAL",
    diet: "CARNIVORE",
    baseHp: 14,
    strength: 7,
    agility: 6,
    perception: 7,
    endurance: 7,
    instinct: 8,
    childTicks: 32,
    youngTicks: 100,
    adultTicks: 300,
    oldTicks: 120,
    oldDeathChancePermille: 3,
    oldDeathChanceGrowthPermille: 1,
    corpseDecayTicks: 30,
    mushroomBonusOnDecay: 4,
  },
  {
    key: "lisovyk",
    name: "лісовик",
    nameGenitive: "лісовика",
    nameDative: "лісовику",
    nameAccusative: "лісовика",
    nameInstrumental: "лісовиком",
    nameLocative: "лісовику",
    nameVocative: "лісовику",
    grammaticalGender: "MASCULINE",
    animacy: "ANIMATE",
    kind: "SPIRIT",
    diet: "SPIRITUAL",
    baseHp: 80,
    strength: 8,
    agility: 6,
    perception: 10,
    endurance: 9,
    instinct: 10,
  },
  {
    key: "herbalist",
    name: "травник",
    nameGenitive: "травника",
    nameDative: "травнику",
    nameAccusative: "травника",
    nameInstrumental: "травником",
    nameLocative: "травнику",
    nameVocative: "травнику",
    grammaticalGender: "MASCULINE",
    animacy: "ANIMATE",
    kind: "HUMAN",
    diet: "OMNIVORE",
    baseHp: 18,
    strength: 3,
    agility: 4,
    perception: 8,
    endurance: 5,
    instinct: 6,
  },
] as const;


async function ensureUniqueCreature(
  creature: SeedUniqueCreature,
  speciesByKey: Map<string, { id: number; baseHp: number }>,
  locationsByKey: Map<string, { id: number }>
) {
  const sp = speciesByKey.get(creature.speciesKey);
  if (!sp) throw new Error(`Unknown species key for unique creature: ${creature.speciesKey}`);

  const loc = locationsByKey.get(creature.locationKey);
  if (!loc) throw new Error(`Unknown location key for unique creature: ${creature.locationKey}`);

  const names = [creature.name, ...(creature.legacyNames ?? [])];
  const existing = await prisma.creature.findMany({
    where: { speciesId: sp.id, name: { in: names } },
    orderBy: [{ isAlive: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
  });

  const keep = existing[0];

  if (!keep) {
    await prisma.creature.create({
      data: {
        speciesId: sp.id,
        locationId: loc.id,
        name: creature.name,
        ...creature.nameOverrides,
        hp: sp.baseHp,
        isAlive: creature.isAlive,
        isGone: false,
        currentAction: creature.action,
        activity: creature.activity as any,
        isHidden: creature.isHidden ?? false,
        professionKey: creature.professionKey,
        professionName: creature.professionName,
      },
    });
    return;
  }

  const duplicateIds = existing.filter((c) => c.id !== keep.id).map((c) => c.id);
  if (duplicateIds.length > 0) await prisma.creature.deleteMany({ where: { id: { in: duplicateIds } } });

  await prisma.creature.update({
    where: { id: keep.id },
    data: {
      name: creature.name,
      ...creature.nameOverrides,
      isAlive: creature.isAlive,
      isGone: false,
      locationId: loc.id,
      hp: creature.isAlive || keep.hp <= 0 ? sp.baseHp : keep.hp,
      currentAction: creature.action,
      activity: creature.activity as any,
      isHidden: creature.isHidden ?? false,
      professionKey: creature.professionKey,
      professionName: creature.professionName,
    },
  });
}

async function main() {
  const totalStartedAt = nowMs();
  console.log("◇ Seed started");

  const world = await seedStep("Loading world data", async () => loadWorldSeed());
  console.log(
    `  - world ${world.meta.version}: ${world.locations.length} locations, ${world.exits.length} exits, ${world.resourceNodes.length} resource nodes`
  );

  const regionsByKey = new Map<string, { id: number }>();
  await seedStep("Regions", async () => {
    for (let i = 0; i < world.regions.length; i += 1) {
      const region = world.regions[i];
      const saved = await prisma.region.upsert({
        where: { key: region.key },
        update: { name: region.name, description: region.description },
        create: region,
      });
      regionsByKey.set(region.key, saved);
      progress("regions", i + 1, world.regions.length, 25);
    }
  });

  const locationsByKey = new Map<string, { id: number }>();
  await seedStep("Locations", async () => {
    for (let i = 0; i < world.locations.length; i += 1) {
      const loc = world.locations[i];
      const region = regionsByKey.get(loc.regionKey);
      if (!region) throw new Error(`Unknown region key for location ${loc.key}: ${loc.regionKey}`);

      const saved = await prisma.cellLocation.upsert({
        where: { key: loc.key },
        update: {
          name: loc.name,
          description: loc.description,
          regionId: region.id,
          x: loc.x,
          y: loc.y,
          z: loc.z,
          biome: loc.biome as any,
          dangerLevel: loc.dangerLevel,
        },
        create: {
          key: loc.key,
          name: loc.name,
          description: loc.description,
          regionId: region.id,
          x: loc.x,
          y: loc.y,
          z: loc.z,
          biome: loc.biome as any,
          dangerLevel: loc.dangerLevel,
        },
      });

      locationsByKey.set(loc.key, saved);
      progress("locations", i + 1, world.locations.length, 25);
    }
  });

  await seedStep("Exits", async () => {
    for (let i = 0; i < world.exits.length; i += 1) {
      const exit = world.exits[i];
      const from = locationsByKey.get(exit.fromKey);
      const to = locationsByKey.get(exit.toKey);

      if (!from) throw new Error(`Unknown fromKey for exit: ${exit.fromKey}`);
      if (!to) throw new Error(`Unknown toKey for exit: ${exit.toKey}`);

      await prisma.locationExit.upsert({
        where: { fromLocationId_direction: { fromLocationId: from.id, direction: exit.direction as any } },
        update: {
          toLocationId: to.id,
          label: exit.label,
          travelCost: exit.travelCost ?? 1,
          isHidden: exit.isHidden ?? false,
        },
        create: {
          fromLocationId: from.id,
          toLocationId: to.id,
          direction: exit.direction as any,
          label: exit.label,
          travelCost: exit.travelCost ?? 1,
          isHidden: exit.isHidden ?? false,
        },
      });
      progress("exits", i + 1, world.exits.length, 50);
    }
  });

  const resourceTypesByKey = new Map<string, { id: number }>();
  await seedStep("Resource types", async () => {
    for (let i = 0; i < world.resourceTypes.length; i += 1) {
      const resource = world.resourceTypes[i];
      const saved = await prisma.resourceType.upsert({
        where: { key: resource.key },
        update: resource,
        create: resource,
      });
      resourceTypesByKey.set(resource.key, saved);
      progress("resource types", i + 1, world.resourceTypes.length, 25);
    }
  });

  await seedStep("Resource nodes", async () => {
    for (let i = 0; i < world.resourceNodes.length; i += 1) {
      const node = world.resourceNodes[i];
      const loc = locationsByKey.get(node.locationKey);
      const resourceType = resourceTypesByKey.get(node.resourceKey);

      if (!loc) throw new Error(`Unknown location key for resource node: ${node.locationKey}`);
      if (!resourceType) throw new Error(`Unknown resource key for resource node: ${node.resourceKey}`);

      await prisma.resourceNode.upsert({
        where: { locationId_resourceTypeId: { locationId: loc.id, resourceTypeId: resourceType.id } },
        update: { amount: node.amount, maxAmount: node.maxAmount },
        create: { locationId: loc.id, resourceTypeId: resourceType.id, amount: node.amount, maxAmount: node.maxAmount },
      });
      progress("resource nodes", i + 1, world.resourceNodes.length, 50);
    }

    await deleteResourceNodesRemovedFromSeed(world);
  });

  await seedStep("Deprecated seed data cleanup", async () => {
    await deleteDeprecatedSeedFeatures();
  });

  await seedStep("Location features", async () => {
    for (let i = 0; i < world.features.length; i += 1) {
      const feature = world.features[i];
      const loc = locationsByKey.get(feature.locationKey);
      if (!loc) throw new Error(`Unknown location key for feature ${feature.key}: ${feature.locationKey}`);

      await prisma.locationFeature.upsert({
        where: { key: feature.key },
        update: {
          locationId: loc.id,
          type: feature.type as any,
          name: feature.name,
          description: feature.description,
          isActive: feature.isActive ?? true,
          providesLight: feature.providesLight ?? false,
          restStaminaCapMultiplier: feature.restStaminaCapMultiplier ?? null,
          data: feature.data === undefined ? undefined : (feature.data as any),
        },
        create: {
          key: feature.key,
          locationId: loc.id,
          type: feature.type as any,
          name: feature.name,
          description: feature.description,
          isActive: feature.isActive ?? true,
          providesLight: feature.providesLight ?? false,
          restStaminaCapMultiplier: feature.restStaminaCapMultiplier ?? null,
          data: feature.data === undefined ? undefined : (feature.data as any),
        },
      });
      progress("features", i + 1, world.features.length, 25);
    }
  });

  const speciesByKey = new Map<string, { id: number; baseHp: number }>();
  await seedStep("Creature species", async () => {
    for (let i = 0; i < species.length; i += 1) {
      const sp = species[i];
      const saved = await prisma.creatureSpecies.upsert({
        where: { key: sp.key },
        update: sp as any,
        create: sp as any,
      });
      speciesByKey.set(sp.key, saved);
      progress("species", i + 1, species.length, 25);
    }
  });

  await seedStep("Unique creatures", async () => {
    for (let i = 0; i < world.uniqueCreatures.length; i += 1) {
      await ensureUniqueCreature(world.uniqueCreatures[i], speciesByKey, locationsByKey);
      progress("unique creatures", i + 1, world.uniqueCreatures.length, 25);
    }
  });

  await seedStep("World event", async () => {
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Seed completed",
        description: `World seed ${world.meta.version}: split world files, deterministic resource rules, map data, features and starter NPC states.`,
      },
    });
  });

  console.log(`◆ Seed completed in ${seconds(nowMs() - totalStartedAt)}`);
  console.log(
    `  - ${world.locations.length} locations, ${world.exits.length} exits, ${world.resourceNodes.length} resource nodes, ${world.features.length} features, ${world.uniqueCreatures.length} unique creatures`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
