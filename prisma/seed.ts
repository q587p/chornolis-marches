import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const { Pool } = pg;

const isRenderInternalDb = process.env.DATABASE_URL.includes(".internal");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderInternalDb
    ? false
    : {
        rejectUnauthorized: false,
      },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const locations = [
  {
    x: -1,
    y: 1,
    key: "north_west_wood",
    name: "Похмуре узлісся",
    description: "Старі сосни тут стоять густо, а земля вкрита темним мохом.",
  },
  {
    x: 0,
    y: 1,
    key: "north_old_pine",
    name: "Стара сосна",
    description: "Величезна сосна скрипить на вітрі. На корі видно давні зарубки.",
  },
  {
    x: 1,
    y: 1,
    key: "north_east_burrow",
    name: "Заячі нори",
    description: "Між корінням видно дрібні нори й сліди лап.",
  },
  {
    x: -1,
    y: 0,
    key: "west_fox_path",
    name: "Лисяча стежка",
    description: "Вузька стежка петляє між кущами. Пахне звіром.",
  },
  {
    x: 0,
    y: 0,
    key: "center_chornolis_edge",
    name: "Порубіжжя Чорнолісу",
    description: "Тут починається Чорноліс. Ліс ніби дивиться у відповідь.",
  },
  {
    x: 1,
    y: 0,
    key: "east_berry_thicket",
    name: "Ягідні хащі",
    description: "Колючі кущі вкриті темними ягодами.",
  },
  {
    x: -1,
    y: -1,
    key: "south_wolf_track",
    name: "Вовча стежка",
    description: "На вологій землі видно великі сліди. Тут краще не шуміти.",
  },
  {
    x: 0,
    y: -1,
    key: "south_moss_clearing",
    name: "Мохова галявина",
    description: "Тиха галявина, де мох заглушує кроки.",
  },
  {
    x: 1,
    y: -1,
    key: "south_east_old_stump",
    name: "Старий пень",
    description: "Пень чорний від часу. Поруч ростуть гриби.",
  },
];

const resourceTypes = [
  { key: "berries", name: "ягоди", description: "Темні лісові ягоди." },
  { key: "mushrooms", name: "гриби", description: "Гриби біля коріння та пнів." },
  { key: "herbs", name: "трави", description: "Корисні лісові трави." },
];

const creatureSpecies = [
  {
    key: "rabbit",
    name: "заєць",
    description: "Швидкий лісовий заєць.",
    kind: "ANIMAL",
    diet: "HERBIVORE",
    baseHp: 4,
    strength: 1,
    agility: 8,
    perception: 6,
    endurance: 3,
    instinct: 7,
  },
  {
    key: "mouse",
    name: "миша",
    description: "Мала польова миша.",
    kind: "ANIMAL",
    diet: "HERBIVORE",
    baseHp: 1,
    strength: 1,
    agility: 7,
    perception: 5,
    endurance: 2,
    instinct: 6,
  },
  {
    key: "fox",
    name: "лисиця",
    description: "Обережна руда мисливиця.",
    kind: "ANIMAL",
    diet: "CARNIVORE",
    baseHp: 10,
    strength: 3,
    agility: 7,
    perception: 7,
    endurance: 4,
    instinct: 8,
  },
  {
    key: "wolf",
    name: "вовк",
    description: "Сірий вовк, що тримається стежок і тіні.",
    kind: "ANIMAL",
    diet: "CARNIVORE",
    baseHp: 18,
    strength: 7,
    agility: 5,
    perception: 7,
    endurance: 7,
    instinct: 8,
  },
  {
    key: "lesovyk",
    name: "лісовик",
    description: "Дух і хазяїн лісової межі.",
    kind: "SPIRIT",
    diet: "SPIRITUAL",
    baseHp: 80,
    strength: 8,
    agility: 6,
    perception: 10,
    endurance: 9,
    instinct: 10,
  },
] as const;

function directionFromDelta(dx: number, dy: number) {
  if (dx === 0 && dy === 1) return "NORTH";
  if (dx === 1 && dy === 0) return "EAST";
  if (dx === 0 && dy === -1) return "SOUTH";
  if (dx === -1 && dy === 0) return "WEST";
  return null;
}

function resourceAmountForLocation(resourceKey: string, locationKey: string) {
  if (resourceKey === "berries" && locationKey === "east_berry_thicket") return 30;
  if (resourceKey === "berries" && locationKey.includes("wood")) return 10;
  if (resourceKey === "mushrooms" && locationKey === "south_east_old_stump") return 28;
  if (resourceKey === "mushrooms" && locationKey.includes("moss")) return 14;
  if (resourceKey === "herbs" && locationKey.includes("clearing")) return 16;
  if (resourceKey === "herbs" && locationKey.includes("edge")) return 8;
  return 3;
}

async function createCreatures(
  speciesKey: string,
  locationKey: string,
  count: number,
  name?: string
) {
  const species = await prisma.creatureSpecies.findUniqueOrThrow({
    where: { key: speciesKey },
  });

  const location = await prisma.cellLocation.findUniqueOrThrow({
    where: { key: locationKey },
  });

  const existingCount = await prisma.creature.count({
    where: {
      speciesId: species.id,
      locationId: location.id,
      name: name ?? null,
      isAlive: true,
    },
  });

  const missingCount = Math.max(0, count - existingCount);

  for (let i = 0; i < missingCount; i++) {
    await prisma.creature.create({
      data: {
        speciesId: species.id,
        locationId: location.id,
        name: name ?? null,
        hp: species.baseHp,
        stamina: 20,
        hunger: 0,
        age: "ADULT",
        sex: Math.random() > 0.5 ? "MALE" : "FEMALE",
      },
    });
  }
}

async function main() {
  const region = await prisma.region.upsert({
    where: { key: "chornolis_border" },
    update: {
      name: "Порубіжжя Чорнолісу",
      description: "Перший регіон живого світу.",
    },
    create: {
      key: "chornolis_border",
      name: "Порубіжжя Чорнолісу",
      description: "Перший регіон живого світу.",
    },
  });

  for (const loc of locations) {
    await prisma.cellLocation.upsert({
      where: { key: loc.key },
      update: {
        name: loc.name,
        description: loc.description,
      },
      create: {
        ...loc,
        z: 0,
        regionId: region.id,
        biome: "FOREST",
        dangerLevel: loc.key.includes("wolf") ? 2 : 1,
      },
    });
  }

  const all = await prisma.cellLocation.findMany({
    where: { regionId: region.id },
  });

  for (const from of all) {
    for (const to of all) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const direction = directionFromDelta(dx, dy);

      if (!direction || from.z !== to.z) continue;

      await prisma.locationExit.upsert({
        where: {
          fromLocationId_direction: {
            fromLocationId: from.id,
            direction,
          },
        },
        update: {
          toLocationId: to.id,
          isHidden: false,
        },
        create: {
          fromLocationId: from.id,
          toLocationId: to.id,
          direction,
          label: direction,
        },
      });
    }
  }

  for (const resource of resourceTypes) {
    await prisma.resourceType.upsert({
      where: { key: resource.key },
      update: resource,
      create: resource,
    });
  }

  const allResourceTypes = await prisma.resourceType.findMany();

  for (const loc of all) {
    for (const resourceType of allResourceTypes) {
      const amount = resourceAmountForLocation(resourceType.key, loc.key);

      await prisma.resourceNode.upsert({
        where: {
          locationId_resourceTypeId: {
            locationId: loc.id,
            resourceTypeId: resourceType.id,
          },
        },
        update: {
          amount,
          maxAmount: 100,
        },
        create: {
          locationId: loc.id,
          resourceTypeId: resourceType.id,
          amount,
          maxAmount: 100,
        },
      });
    }
  }

  for (const species of creatureSpecies) {
    await prisma.creatureSpecies.upsert({
      where: { key: species.key },
      update: species,
      create: species,
    });
  }

  await createCreatures("rabbit", "north_east_burrow", 5);
  await createCreatures("rabbit", "south_moss_clearing", 3);
  await createCreatures("mouse", "east_berry_thicket", 6);
  await createCreatures("fox", "west_fox_path", 1);
  await createCreatures("wolf", "south_wolf_track", 1);
  await createCreatures("lesovyk", "north_old_pine", 1, "Дід Чорноліс");

  console.log("Seed completed.");
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
