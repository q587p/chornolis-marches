import type { Creature, CreatureSpecies, LocationExit, ResourceNode, ResourceType } from "@prisma/client";
import { prisma } from "../db";

const DEFAULT_WORLD_TICK_INTERVAL_MS = 60_000;
const WORLD_TICK_INTERVAL_MS = Number(process.env.WORLD_TICK_INTERVAL_MS || DEFAULT_WORLD_TICK_INTERVAL_MS);
const WORLD_TICK_CREATURE_LIMIT = Number(process.env.WORLD_TICK_CREATURE_LIMIT || 30);
const WORLD_TICK_DEBUG = process.env.WORLD_TICK_DEBUG === "true";
const WORLD_TICK_DEBUG_EVENT = process.env.WORLD_TICK_DEBUG_EVENT === "true";

type CreatureWithWorldData = Creature & {
  species: CreatureSpecies;
  location: {
    id: number;
    key: string;
    name: string;
    exitsFrom: LocationExit[];
    resources: Array<ResourceNode & { resourceType: ResourceType }>;
  };
};

type WorldTickStats = {
  processed: number;
  moved: number;
  gathered: number;
  looking: number;
  idle: number;
  lisovykAwakened: number;
  errors: number;
};

let tickTimer: NodeJS.Timeout | null = null;
let tickInProgress = false;

function createStats(): WorldTickStats {
  return {
    processed: 0,
    moved: 0,
    gathered: 0,
    looking: 0,
    idle: 0,
    lisovykAwakened: 0,
    errors: 0,
  };
}

function formatStats(stats: WorldTickStats) {
  return `processed=${stats.processed}, moved=${stats.moved}, gathered=${stats.gathered}, looking=${stats.looking}, idle=${stats.idle}, lisovykAwakened=${stats.lisovykAwakened}, errors=${stats.errors}`;
}

function debugLog(message: string) {
  if (WORLD_TICK_DEBUG) console.log(`[WORLD TICK] ${message}`);
}

function chance(percent: number) {
  return Math.random() * 100 < percent;
}

function pickOne<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function moveCreature(creature: CreatureWithWorldData, toLocationId: number, action: string, stats: WorldTickStats) {
  if (creature.locationId === toLocationId) return;

  await prisma.creature.update({
    where: { id: creature.id },
    data: {
      locationId: toLocationId,
      activity: "MOVING",
      currentAction: action,
      steps: { increment: 1 },
      stamina: Math.max(0, creature.stamina - 1),
      hunger: { increment: 1 },
    },
  });

  stats.moved += 1;

  await prisma.worldEvent.create({
    data: {
      type: "NPC_MOVE",
      title: "Рух у світі",
      description: `${creature.name ?? creature.species.name} ${action}.`,
      locationId: toLocationId,
    },
  });
}

async function moveRandomly(creature: CreatureWithWorldData, stats: WorldTickStats, action = "бродить лісом") {
  const exit = pickOne(creature.location.exitsFrom.filter((item) => !item.isHidden));
  if (!exit) return;

  await moveCreature(creature, exit.toLocationId, action, stats);
}

async function findNeighborWithResource(creature: CreatureWithWorldData, resourceKey: string) {
  const neighborIds = creature.location.exitsFrom.filter((exit) => !exit.isHidden).map((exit) => exit.toLocationId);
  if (neighborIds.length === 0) return null;

  const node = await prisma.resourceNode.findFirst({
    where: {
      locationId: { in: neighborIds },
      resourceType: { key: resourceKey },
      amount: { gt: 0 },
    },
    orderBy: { amount: "desc" },
  });

  return node?.locationId ?? null;
}

async function tickHerbalist(creature: CreatureWithWorldData, stats: WorldTickStats) {
  const herbs = creature.location.resources.find((node) => node.resourceType.key === "herbs");

  if (herbs && herbs.amount > 0) {
    const gathered = Math.min(herbs.amount, randomInt(1, 3));

    await prisma.$transaction([
      prisma.resourceNode.update({
        where: { id: herbs.id },
        data: { amount: { decrement: gathered } },
      }),
      prisma.creature.update({
        where: { id: creature.id },
        data: {
          activity: "GATHERING",
          currentAction: `збирає трави (${gathered})`,
          gatherAttempts: { increment: 1 },
          successfulGathers: { increment: 1 },
          hunger: { increment: 1 },
        },
      }),
      prisma.worldEvent.create({
        data: {
          type: "GATHER_SUCCESS",
          title: "Травник збирає трави",
          description: `${creature.name ?? "Травник"} зібрав ${gathered} трав у локації «${creature.location.name}».`,
          locationId: creature.locationId,
        },
      }),
    ]);

    stats.gathered += 1;
    return;
  }

  const targetLocationId = await findNeighborWithResource(creature, "herbs");
  if (targetLocationId) {
    await moveCreature(creature, targetLocationId, "йде туди, де пахне травами", stats);
    return;
  }

  await prisma.creature.update({
    where: { id: creature.id },
    data: { activity: "LOOKING", currentAction: "шукає трави", looks: { increment: 1 } },
  });
  stats.looking += 1;
}

async function tickHerbivore(creature: CreatureWithWorldData, stats: WorldTickStats) {
  if (chance(45)) {
    const resourceKey = creature.species.key === "mouse" ? "mushrooms" : "berries";
    const targetLocationId = await findNeighborWithResource(creature, resourceKey);

    if (targetLocationId) {
      await moveCreature(creature, targetLocationId, "перебирається ближче до їжі", stats);
      return;
    }
  }

  if (chance(35)) {
    await moveRandomly(creature, stats, "стрибає між кущами");
    return;
  }

  await prisma.creature.update({
    where: { id: creature.id },
    data: { activity: "IDLE", currentAction: "насторожено прислухається" },
  });
  stats.idle += 1;
}

async function tickCarnivore(creature: CreatureWithWorldData, stats: WorldTickStats) {
  const nearbyLocationIds = [creature.locationId, ...creature.location.exitsFrom.map((exit) => exit.toLocationId)];
  const prey = await prisma.creature.findFirst({
    where: {
      isAlive: true,
      locationId: { in: nearbyLocationIds },
      species: { diet: "HERBIVORE" },
    },
    orderBy: { updatedAt: "asc" },
  });

  if (prey && prey.locationId !== creature.locationId) {
    await moveCreature(creature, prey.locationId, "виходить на свіжий слід", stats);
    return;
  }

  if (prey && prey.locationId === creature.locationId) {
    await prisma.creature.update({
      where: { id: creature.id },
      data: { activity: "LOOKING", currentAction: "вистежує здобич", looks: { increment: 1 }, hunger: { increment: 1 } },
    });
    stats.looking += 1;
    return;
  }

  if (chance(45)) {
    await moveRandomly(creature, stats, "патрулює свою стежку");
    return;
  }

  stats.idle += 1;
}

async function wakeLisovykIfNeeded(stats: WorldTickStats) {
  const depletedNode = await prisma.resourceNode.findFirst({
    where: { amount: { lte: 0 } },
    include: { location: true, resourceType: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!depletedNode) return;

  const species = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" } });
  if (!species) return;

  const existing = await prisma.creature.findFirst({
    where: { speciesId: species.id, name: "Дід Чорноліс" },
  });

  if (existing?.isAlive && existing.locationId === depletedNode.locationId) return;

  const data = {
    locationId: depletedNode.locationId,
    hp: species.baseHp,
    isAlive: true,
    activity: "LOOKING" as const,
    currentAction: `прокинувся через зникнення ресурсу: ${depletedNode.resourceType.name}`,
  };

  if (existing) {
    await prisma.creature.update({ where: { id: existing.id }, data });
  } else {
    await prisma.creature.create({
      data: {
        speciesId: species.id,
        name: "Дід Чорноліс",
        stamina: 20,
        hunger: 0,
        ...data,
      },
    });
  }

  stats.lisovykAwakened += 1;

  await prisma.worldEvent.create({
    data: {
      type: "NPC_SAY",
      title: "Лісовик прокинувся",
      description: `Дід Чорноліс прокинувся біля «${depletedNode.location.name}»: у лісі зник ресурс «${depletedNode.resourceType.name}».`,
      locationId: depletedNode.locationId,
    },
  });
}

async function tickLisovyk(creature: CreatureWithWorldData, stats: WorldTickStats) {
  const depletedHere = creature.location.resources.some((node) => node.amount <= 0);

  if (depletedHere) {
    await prisma.creature.update({
      where: { id: creature.id },
      data: { activity: "SPEAKING", currentAction: "бурмоче про порушену рівновагу", says: { increment: 1 } },
    });
    stats.looking += 1;
    return;
  }

  if (chance(25)) {
    await moveRandomly(creature, stats, "безшумно переходить між деревами");
    return;
  }

  await prisma.creature.update({
    where: { id: creature.id },
    data: { activity: "LOOKING", currentAction: "стежить за рівновагою лісу", looks: { increment: 1 } },
  });
  stats.looking += 1;
}

async function tickCreature(creature: CreatureWithWorldData, stats: WorldTickStats) {
  if (creature.species.key === "herbalist") return tickHerbalist(creature, stats);
  if (creature.species.key === "lisovyk") return tickLisovyk(creature, stats);
  if (creature.species.diet === "HERBIVORE") return tickHerbivore(creature, stats);
  if (creature.species.diet === "CARNIVORE") return tickCarnivore(creature, stats);

  if (chance(25)) {
    await moveRandomly(creature, stats);
    return;
  }

  stats.idle += 1;
}

async function writeDebugEvent(stats: WorldTickStats) {
  if (!WORLD_TICK_DEBUG_EVENT) return;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "World Tick Debug",
      description: formatStats(stats),
    },
  });
}

export async function runWorldTick() {
  if (tickInProgress) {
    debugLog("skip: previous tick is still running");
    return;
  }

  const stats = createStats();
  tickInProgress = true;
  debugLog(`start ${new Date().toISOString()}`);

  try {
    await wakeLisovykIfNeeded(stats);

    const creatures = await prisma.creature.findMany({
      where: { isAlive: true },
      take: WORLD_TICK_CREATURE_LIMIT,
      orderBy: { updatedAt: "asc" },
      include: {
        species: true,
        location: {
          include: {
            exitsFrom: true,
            resources: { include: { resourceType: true } },
          },
        },
      },
    });

    for (const creature of creatures) {
      stats.processed += 1;

      try {
        await tickCreature(creature, stats);
      } catch (error) {
        stats.errors += 1;
        console.warn(`World tick failed for creature ${creature.id}:`, error);
      }
    }

    await writeDebugEvent(stats);
    debugLog(`done: ${formatStats(stats)}`);
  } finally {
    tickInProgress = false;
  }
}

export function startWorldTickLoop() {
  if (tickTimer) return;

  tickTimer = setInterval(() => {
    runWorldTick().catch((error) => console.warn("World tick failed:", error));
  }, WORLD_TICK_INTERVAL_MS);

  console.log(`World tick started: every ${WORLD_TICK_INTERVAL_MS}ms`);
}
