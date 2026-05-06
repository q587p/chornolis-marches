import type { Creature, CreatureSpecies, LocationExit, ResourceNode, ResourceType } from "@prisma/client";
import { prisma } from "../db";

const DEFAULT_WORLD_TICK_INTERVAL_MS = 60_000;
const WORLD_TICK_INTERVAL_MS = Number(process.env.WORLD_TICK_INTERVAL_MS || DEFAULT_WORLD_TICK_INTERVAL_MS);
const WORLD_TICK_CREATURE_LIMIT = Number(process.env.WORLD_TICK_CREATURE_LIMIT || 30);

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

let tickTimer: NodeJS.Timeout | null = null;
let tickInProgress = false;

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

async function moveCreature(creature: CreatureWithWorldData, toLocationId: number, action: string) {
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

  await prisma.worldEvent.create({
    data: {
      type: "NPC_MOVE",
      title: "Рух у світі",
      description: `${creature.name ?? creature.species.name} ${action}.`,
      locationId: toLocationId,
    },
  });
}

async function moveRandomly(creature: CreatureWithWorldData, action = "бродить лісом") {
  const exit = pickOne(creature.location.exitsFrom.filter((item) => !item.isHidden));
  if (!exit) return;

  await moveCreature(creature, exit.toLocationId, action);
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

async function tickHerbalist(creature: CreatureWithWorldData) {
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

    return;
  }

  const targetLocationId = await findNeighborWithResource(creature, "herbs");
  if (targetLocationId) {
    await moveCreature(creature, targetLocationId, "йде туди, де пахне травами");
    return;
  }

  await prisma.creature.update({
    where: { id: creature.id },
    data: { activity: "LOOKING", currentAction: "шукає трави", looks: { increment: 1 } },
  });
}

async function tickHerbivore(creature: CreatureWithWorldData) {
  if (chance(45)) {
    const resourceKey = creature.species.key === "mouse" ? "mushrooms" : "berries";
    const targetLocationId = await findNeighborWithResource(creature, resourceKey);

    if (targetLocationId) {
      await moveCreature(creature, targetLocationId, "перебирається ближче до їжі");
      return;
    }
  }

  if (chance(35)) {
    await moveRandomly(creature, "стрибає між кущами");
    return;
  }

  await prisma.creature.update({
    where: { id: creature.id },
    data: { activity: "IDLE", currentAction: "насторожено прислухається" },
  });
}

async function tickCarnivore(creature: CreatureWithWorldData) {
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
    await moveCreature(creature, prey.locationId, "виходить на свіжий слід");
    return;
  }

  if (prey && prey.locationId === creature.locationId) {
    await prisma.creature.update({
      where: { id: creature.id },
      data: { activity: "LOOKING", currentAction: "вистежує здобич", looks: { increment: 1 }, hunger: { increment: 1 } },
    });
    return;
  }

  if (chance(45)) await moveRandomly(creature, "патрулює свою стежку");
}

async function wakeLisovykIfNeeded() {
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

  await prisma.worldEvent.create({
    data: {
      type: "NPC_SAY",
      title: "Лісовик прокинувся",
      description: `Дід Чорноліс прокинувся біля «${depletedNode.location.name}»: у лісі зник ресурс «${depletedNode.resourceType.name}».`,
      locationId: depletedNode.locationId,
    },
  });
}

async function tickLisovyk(creature: CreatureWithWorldData) {
  const depletedHere = creature.location.resources.some((node) => node.amount <= 0);

  if (depletedHere) {
    await prisma.creature.update({
      where: { id: creature.id },
      data: { activity: "SPEAKING", currentAction: "бурмоче про порушену рівновагу", says: { increment: 1 } },
    });
    return;
  }

  if (chance(25)) {
    await moveRandomly(creature, "безшумно переходить між деревами");
    return;
  }

  await prisma.creature.update({
    where: { id: creature.id },
    data: { activity: "LOOKING", currentAction: "стежить за рівновагою лісу", looks: { increment: 1 } },
  });
}

async function tickCreature(creature: CreatureWithWorldData) {
  if (creature.species.key === "herbalist") return tickHerbalist(creature);
  if (creature.species.key === "lisovyk") return tickLisovyk(creature);
  if (creature.species.diet === "HERBIVORE") return tickHerbivore(creature);
  if (creature.species.diet === "CARNIVORE") return tickCarnivore(creature);

  if (chance(25)) await moveRandomly(creature);
}

export async function runWorldTick() {
  if (tickInProgress) return;
  tickInProgress = true;

  try {
    await wakeLisovykIfNeeded();

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
      try {
        await tickCreature(creature);
      } catch (error) {
        console.warn(`World tick failed for creature ${creature.id}:`, error);
      }
    }
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
