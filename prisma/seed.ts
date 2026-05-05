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
  { key: "rabbit", name: "заєць", kind: "ANIMAL", diet: "HERBIVORE", baseHp: 3, strength: 1, agility: 8, perception: 6, endurance: 3, instinct: 7 },
  { key: "mouse", name: "миша", kind: "ANIMAL", diet: "HERBIVORE", baseHp: 1, strength: 1, agility: 7, perception: 5, endurance: 2, instinct: 6 },
  { key: "fox", name: "лисиця", kind: "ANIMAL", diet: "CARNIVORE", baseHp: 8, strength: 3, agility: 8, perception: 7, endurance: 5, instinct: 8 },
  { key: "wolf", name: "вовк", kind: "ANIMAL", diet: "CARNIVORE", baseHp: 14, strength: 7, agility: 6, perception: 7, endurance: 7, instinct: 8 },
  { key: "lisovyk", name: "лісовик", kind: "SPIRIT", diet: "SPIRITUAL", baseHp: 80, strength: 8, agility: 6, perception: 10, endurance: 9, instinct: 10 },
  { key: "herbalist", name: "травник", kind: "HUMAN", diet: "OMNIVORE", baseHp: 18, strength: 3, agility: 4, perception: 8, endurance: 5, instinct: 6 },
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

async function createCreatures(speciesKey: string, locationKey: string, count: number, name?: string, action?: string) {
  const sp = await prisma.creatureSpecies.findUniqueOrThrow({ where: { key: speciesKey } });
  const loc = await prisma.cellLocation.findUniqueOrThrow({ where: { key: locationKey } });

  const existing = await prisma.creature.count({
    where: { speciesId: sp.id, locationId: loc.id, name: name ?? null, isAlive: true },
  });

  for (let i = existing; i < count; i++) {
    await prisma.creature.create({
      data: {
        speciesId: sp.id,
        locationId: loc.id,
        name: name ?? null,
        hp: sp.baseHp,
        currentAction: action ?? "проходить",
        activity: "IDLE",
      },
    });
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

  await createCreatures("rabbit", "north_east_burrow", 6, undefined, "нишпорить між норами");
  await createCreatures("mouse", "south_moss_clearing", 8, undefined, "шурхотить у моху");
  await createCreatures("fox", "west_fox_path", 2, undefined, "нюхає сліди");
  await createCreatures("wolf", "south_wolf_track", 1, undefined, "проходить стежкою");

  // Лісовик є як вид, але не стартує на мапі. Він з’являється, коли в регіоні повністю зникає якийсь ресурс.
  const lisovykSpecies = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" } });
  if (lisovykSpecies) {
    await prisma.creature.updateMany({
      where: { speciesId: lisovykSpecies.id, name: "Дід Чорноліс" },
      data: { isAlive: false, currentAction: "спить у глибині Чорнолісу", activity: "RESTING" },
    });
  }

  await createCreatures("herbalist", "south_moss_clearing", 1, "Травник", "збирає трави");

  await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Seed completed", description: "Initial Chornolis world seeded." } });
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
