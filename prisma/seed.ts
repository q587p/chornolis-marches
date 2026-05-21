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
  activity: "IDLE" | "GATHERING" | "RESTING" | "LOOKING";
  nameOverrides?: CreatureNameOverrides;
};

type WorldSeed = {
  meta: {
    version: string;
    startLocationKey: string;
    notes?: string[];
  };
  regions: SeedRegion[];
  locations: SeedLocation[];
  exits: SeedExit[];
  resourceTypes: SeedResourceType[];
  resourceNodes: SeedResourceNode[];
  features: SeedFeature[];
  uniqueCreatures: SeedUniqueCreature[];
};

function loadWorldSeed(): WorldSeed {
  const filePath = path.join(__dirname, "data", "chornolis_world_seed.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as WorldSeed;
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

async function ensureUniqueCreature(creature: SeedUniqueCreature) {
  const sp = await prisma.creatureSpecies.findUniqueOrThrow({ where: { key: creature.speciesKey } });
  const loc = await prisma.cellLocation.findUniqueOrThrow({ where: { key: creature.locationKey } });

  const existing = await prisma.creature.findMany({
    where: { speciesId: sp.id, name: creature.name },
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
        activity: creature.activity,
      },
    });
    return;
  }

  const duplicateIds = existing.filter((c) => c.id !== keep.id).map((c) => c.id);
  if (duplicateIds.length > 0) await prisma.creature.deleteMany({ where: { id: { in: duplicateIds } } });

  await prisma.creature.update({
    where: { id: keep.id },
    data: {
      ...creature.nameOverrides,
      isAlive: creature.isAlive,
      isGone: false,
      locationId: loc.id,
      hp: creature.isAlive || keep.hp <= 0 ? sp.baseHp : keep.hp,
      currentAction: creature.action,
      activity: creature.activity,
    },
  });
}

async function main() {
  const world = loadWorldSeed();

  for (const region of world.regions) {
    await prisma.region.upsert({
      where: { key: region.key },
      update: { name: region.name, description: region.description },
      create: region,
    });
  }

  for (const loc of world.locations) {
    const region = await prisma.region.findUniqueOrThrow({ where: { key: loc.regionKey } });
    await prisma.cellLocation.upsert({
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
  }

  // Keep exits data-driven. No automatic full-grid linking here: dead ends and loops are authored in JSON.
  for (const exit of world.exits) {
    const from = await prisma.cellLocation.findUniqueOrThrow({ where: { key: exit.fromKey } });
    const to = await prisma.cellLocation.findUniqueOrThrow({ where: { key: exit.toKey } });
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
  }

  for (const resource of world.resourceTypes) {
    await prisma.resourceType.upsert({ where: { key: resource.key }, update: resource, create: resource });
  }

  for (const node of world.resourceNodes) {
    const loc = await prisma.cellLocation.findUniqueOrThrow({ where: { key: node.locationKey } });
    const resourceType = await prisma.resourceType.findUniqueOrThrow({ where: { key: node.resourceKey } });
    await prisma.resourceNode.upsert({
      where: { locationId_resourceTypeId: { locationId: loc.id, resourceTypeId: resourceType.id } },
      update: { amount: node.amount, maxAmount: node.maxAmount },
      create: { locationId: loc.id, resourceTypeId: resourceType.id, amount: node.amount, maxAmount: node.maxAmount },
    });
  }

  for (const feature of world.features) {
    const loc = await prisma.cellLocation.findUniqueOrThrow({ where: { key: feature.locationKey } });
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
  }

  for (const sp of species) {
    await prisma.creatureSpecies.upsert({ where: { key: sp.key }, update: sp as any, create: sp as any });
  }

  // Seed deliberately does not spawn generic animals.
  // Test animals should be added manually with /addCreature until reproduction/migration/spawn rules exist.
  for (const creature of world.uniqueCreatures) await ensureUniqueCreature(creature);

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Seed completed",
      description: `World seed ${world.meta.version}: expanded western forest, dry luka, riverbank, bridge, closed gate and start camp.`,
    },
  });
  console.log(`Seed completed: ${world.locations.length} locations, ${world.exits.length} exits.`);
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
