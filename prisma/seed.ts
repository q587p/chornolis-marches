import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
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

function directionFromDelta(dx: number, dy: number) {
  if (dx === 0 && dy === 1) return "NORTH";
  if (dx === 1 && dy === 0) return "EAST";
  if (dx === 0 && dy === -1) return "SOUTH";
  if (dx === -1 && dy === 0) return "WEST";
  return null;
}

async function main() {
  const region = await prisma.region.upsert({
    where: { key: "chornolis_border" },
    update: {},
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
        dangerLevel: 1,
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