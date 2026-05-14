import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
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

const locations = [
  { x: -1, y: 1, key: "north_west_wood", name: "Похмуре узлісся", description: "Старі сосни тут стоять густо, а земля вкрита темним мохом." },
  { x: 0, y: 1, key: "north_old_pine", name: "Стара сосна", description: "Величезна сосна скрипить на вітрі. На корі видно давні зарубки." },
  { x: 1, y: 1, key: "north_east_burrow", name: "Заячі нори", description: "Між корінням видно дрібні нори й сліди лап." },
  { x: -1, y: 0, key: "west_fox_path", name: "Лисяча стежка", description: "Вузька стежка петляє між кущами. Пахне звіром." },
  { x: 0, y: 0, key: "center_chornolis_edge", name: "Порубіжжя Чорнолісу", description: "Тут починається Чорноліс. Ліс ніби дивиться у відповідь." },
  { x: 1, y: 0, key: "east_berry_thicket", name: "Ягідні хащі", description: "Колючі кущі вкриті темними ягодами." },
  { x: -1, y: -1, key: "south_wolf_track", name: "Вовча стежка", description: "На вологій землі видно великі сліди. Тут краще не шуміти." },
  { x: 0, y: -1, key: "south_moss_clearing", name: "Мохова галявина", description: "Тиха галявина, де мох заглушує кроки." },
  { x: 1, y: -1, key: "south_east_old_stump", name: "Старий пень", description: "Пень чорний від часу. Поруч ростуть гриби." },
];

const resourceTypes = [
  { key: "berries", name: "ягоди", description: "Темні лісові ягоди." },
  { key: "mushrooms", name: "гриби", description: "Гриби біля коріння та пнів." },
  { key: "herbs", name: "трави", description: "Корисні лісові трави." },
];

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

function directionFromDelta(dx: number, dy: number) {
  if (dx === 0 && dy === 1) return "NORTH";
  if (dx === 1 && dy === 0) return "EAST";
  if (dx === 0 && dy === -1) return "SOUTH";
  if (dx === -1 && dy === 0) return "WEST";
  return null;
}

function resourceAmount(resourceKey: string, locationKey: string) {
  if (resourceKey === "berries") return locationKey.includes("berry") ? 28 : 4;
  if (resourceKey === "mushrooms") return locationKey.includes("stump") || locationKey.includes("moss") ? 22 : 3;
  if (resourceKey === "herbs") return locationKey.includes("moss") || locationKey.includes("old_pine") ? 14 : 6;
  return 0;
}

type CreatureNameOverrides = {
  nameGenitive?: string;
  nameDative?: string;
  nameAccusative?: string;
  nameInstrumental?: string;
  nameLocative?: string;
  nameVocative?: string;
};

async function ensureUniqueCreature(
  speciesKey: string,
  locationKey: string,
  name: string,
  options: {
    isAlive: boolean;
    action: string;
    activity: "IDLE" | "GATHERING" | "RESTING" | "LOOKING";
    nameOverrides?: CreatureNameOverrides;
  }
) {
  const sp = await prisma.creatureSpecies.findUniqueOrThrow({ where: { key: speciesKey } });
  const loc = await prisma.cellLocation.findUniqueOrThrow({ where: { key: locationKey } });

  const existing = await prisma.creature.findMany({
    where: { speciesId: sp.id, name },
    orderBy: [{ isAlive: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
  });

  const keep = existing[0];

  if (!keep) {
    await prisma.creature.create({
      data: {
        speciesId: sp.id,
        locationId: loc.id,
        name,
        ...options.nameOverrides,
        hp: sp.baseHp,
        isAlive: options.isAlive,
        isGone: false,
        currentAction: options.action,
        activity: options.activity,
      },
    });
    return;
  }

  const duplicateIds = existing.filter((c) => c.id !== keep.id).map((c) => c.id);
  if (duplicateIds.length > 0) {
    await prisma.creature.deleteMany({ where: { id: { in: duplicateIds } } });
  }

  if (speciesKey === "herbalist" && !keep.isAlive) {
    await prisma.creature.update({
      where: { id: keep.id },
      data: {
        ...options.nameOverrides,
        isAlive: true,
        isGone: false,
        locationId: loc.id,
        hp: sp.baseHp,
        currentAction: options.action,
        activity: options.activity,
      },
    });
  }

  if (options.nameOverrides) {
    await prisma.creature.update({ where: { id: keep.id }, data: options.nameOverrides });
  }

  if (speciesKey === "lisovyk" && keep.hp <= 0) {
    await prisma.creature.update({ where: { id: keep.id }, data: { hp: sp.baseHp, isGone: false } });
  }
}

async function main() {
  const region = await prisma.region.upsert({
    where: { key: "chornolis_border" },
    update: { name: "Порубіжжя Чорнолісу", description: "Перший регіон живого світу." },
    create: { key: "chornolis_border", name: "Порубіжжя Чорнолісу", description: "Перший регіон живого світу." },
  });

  for (const loc of locations) {
    await prisma.cellLocation.upsert({
      where: { key: loc.key },
      update: { name: loc.name, description: loc.description },
      create: { ...loc, z: 0, regionId: region.id, biome: "FOREST", dangerLevel: loc.key.includes("wolf") ? 2 : 1 },
    });
  }

  const all = await prisma.cellLocation.findMany({ where: { regionId: region.id } });
  for (const from of all) {
    for (const to of all) {
      const direction = directionFromDelta(to.x - from.x, to.y - from.y);
      if (!direction || from.z !== to.z) continue;
      await prisma.locationExit.upsert({
        where: { fromLocationId_direction: { fromLocationId: from.id, direction } },
        update: { toLocationId: to.id },
        create: { fromLocationId: from.id, toLocationId: to.id, direction, label: direction },
      });
    }
  }

  for (const resource of resourceTypes) {
    await prisma.resourceType.upsert({ where: { key: resource.key }, update: resource, create: resource });
  }

  const allResourceTypes = await prisma.resourceType.findMany();
  for (const loc of all) {
    for (const resourceType of allResourceTypes) {
      await prisma.resourceNode.upsert({
        where: { locationId_resourceTypeId: { locationId: loc.id, resourceTypeId: resourceType.id } },
        update: { amount: resourceAmount(resourceType.key, loc.key), maxAmount: 100 },
        create: { locationId: loc.id, resourceTypeId: resourceType.id, amount: resourceAmount(resourceType.key, loc.key), maxAmount: 100 },
      });
    }
  }

  for (const sp of species) {
    await prisma.creatureSpecies.upsert({ where: { key: sp.key }, update: sp as any, create: sp as any });
  }

  // Seed deliberately does not spawn animals.
  // Test animals should be added manually with /addCreature until reproduction/migration systems exist.

  await ensureUniqueCreature("lisovyk", "north_west_wood", "Дід Чорноліс", {
    isAlive: false,
    action: "спить у глибині Чорнолісу",
    activity: "RESTING",
    nameOverrides: {
      nameGenitive: "Діда Чорноліса",
      nameDative: "Діду Чорнолісу",
      nameAccusative: "Діда Чорноліса",
      nameInstrumental: "Дідом Чорнолісом",
      nameLocative: "Діді Чорнолісі",
      nameVocative: "Діду Чорнолісе",
    },
  });

  await ensureUniqueCreature("herbalist", "south_moss_clearing", "Травник", {
    isAlive: true,
    action: "збирає трави",
    activity: "GATHERING",
    nameOverrides: {
      nameGenitive: "Травника",
      nameDative: "Травнику",
      nameAccusative: "Травника",
      nameInstrumental: "Травником",
      nameLocative: "Травнику",
      nameVocative: "Травнику",
    },
  });

  await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Seed completed", description: "Chornolis world structure seeded with lifecycle profiles and without animal spawning." } });
  console.log("Seed completed without animal spawning.");
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
