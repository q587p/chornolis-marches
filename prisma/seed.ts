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
  ssl: isRenderInternalDb ? false : { rejectUnauthorized: false },
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
    biome: "DEEP_FOREST",
    dangerLevel: 2,
  },
  {
    x: 0,
    y: 1,
    key: "north_old_pine",
    name: "Стара сосна",
    description: "Величезна сосна скрипить на вітрі. На корі видно давні зарубки.",
    biome: "FOREST",
    dangerLevel: 1,
  },
  {
    x: 1,
    y: 1,
    key: "north_east_burrow",
    name: "Заячі нори",
    description: "Між корінням видно дрібні нори й сліди лап.",
    biome: "CLEARING",
    dangerLevel: 1,
  },
  {
    x: -1,
    y: 0,
    key: "west_fox_path",
    name: "Лисяча стежка",
    description: "Вузька стежка петляє між кущами. Пахне звіром.",
    biome: "FOREST",
    dangerLevel: 2,
  },
  {
    x: 0,
    y: 0,
    key: "center_chornolis_edge",
    name: "Порубіжжя Чорнолісу",
    description: "Тут починається Чорноліс. Ліс ніби дивиться у відповідь.",
    biome: "FOREST",
    dangerLevel: 1,
  },
  {
    x: 1,
    y: 0,
    key: "east_berry_thicket",
    name: "Ягідні хащі",
    description: "Колючі кущі вкриті темними ягодами.",
    biome: "CLEARING",
    dangerLevel: 1,
  },
  {
    x: -1,
    y: -1,
    key: "south_wolf_track",
    name: "Вовча стежка",
    description: "На вологій землі видно великі сліди. Тут краще не шуміти.",
    biome: "DEEP_FOREST",
    dangerLevel: 3,
  },
  {
    x: 0,
    y: -1,
    key: "south_moss_clearing",
    name: "Мохова галявина",
    description: "Тиха галявина, де мох заглушує кроки.",
    biome: "CLEARING",
    dangerLevel: 1,
  },
  {
    x: 1,
    y: -1,
    key: "south_east_old_stump",
    name: "Старий пень",
    description: "Пень чорний від часу. Поруч ростуть гриби.",
    biome: "FOREST",
    dangerLevel: 1,
  },
] as const;

function directionFromDelta(dx: number, dy: number) {
  if (dx === 0 && dy === 1) return "NORTH";
  if (dx === 1 && dy === 0) return "EAST";
  if (dx === 0 && dy === -1) return "SOUTH";
  if (dx === -1 && dy === 0) return "WEST";
  return null;
}

function resourceAmount(locationKey: string, resourceKey: string) {
  if (resourceKey === "berries") return locationKey.includes("berry") ? 32 : 4;
  if (resourceKey === "mushrooms") return locationKey.includes("stump") || locationKey.includes("moss") ? 24 : 5;
  if (resourceKey === "herbs") return locationKey.includes("moss") || locationKey.includes("old_pine") ? 18 : 6;
  return 0;
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
        biome: loc.biome,
        dangerLevel: loc.dangerLevel,
      },
      create: {
        ...loc,
        z: 0,
        regionId: region.id,
      },
    });
  }

  const all = await prisma.cellLocation.findMany({ where: { regionId: region.id } });

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
        update: { toLocationId: to.id, isHidden: false },
        create: {
          fromLocationId: from.id,
          toLocationId: to.id,
          direction,
          label: direction,
        },
      });
    }
  }

  const resourceTypes = [
    { key: "berries", name: "ягоди", description: "Темні лісові ягоди." },
    { key: "mushrooms", name: "гриби", description: "Гриби біля коріння, пнів і мокрого моху." },
    { key: "herbs", name: "трави", description: "Корисні лісові трави." },
  ];

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
      const amount = resourceAmount(loc.key, resourceType.key);
      await prisma.resourceNode.upsert({
        where: {
          locationId_resourceTypeId: {
            locationId: loc.id,
            resourceTypeId: resourceType.id,
          },
        },
        update: { amount, maxAmount: 100 },
        create: {
          locationId: loc.id,
          resourceTypeId: resourceType.id,
          amount,
          maxAmount: 100,
        },
      });
    }
  }

  const herbalistSpecies = await prisma.creatureSpecies.upsert({
    where: { key: "human_herbalist" },
    update: {
      name: "травник",
      description: "Людина, що знає лісові трави й стежки.",
    },
    create: {
      key: "human_herbalist",
      name: "травник",
      description: "Людина, що знає лісові трави й стежки.",
      kind: "HUMAN",
      diet: "OMNIVORE",
      baseHp: 16,
      strength: 3,
      agility: 4,
      perception: 7,
      endurance: 4,
      instinct: 6,
    },
  });

  const startLocation = await prisma.cellLocation.findUniqueOrThrow({
    where: { key: "center_chornolis_edge" },
  });

  await prisma.creature.upsert({
    where: { id: 1 },
    update: {
      speciesId: herbalistSpecies.id,
      locationId: startLocation.id,
      name: "Травник",
      hp: herbalistSpecies.baseHp,
      activity: "IDLE",
      isAlive: true,
    },
    create: {
      id: 1,
      speciesId: herbalistSpecies.id,
      locationId: startLocation.id,
      name: "Травник",
      hp: herbalistSpecies.baseHp,
      activity: "IDLE",
      isAlive: true,
    },
  });

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Seed completed",
      description: "Порубіжжя Чорнолісу оновлено.",
    },
  });

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
