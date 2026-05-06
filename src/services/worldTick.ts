import { Bot } from "grammy";
import { prisma } from "../db";
import { notifyRegion } from "./notifications";

const TICK_INTERVAL = Number(process.env.WORLD_TICK_INTERVAL_MS || 60000);
const DEBUG = process.env.WORLD_DEBUG === "true";

let running = false;
let botInstance: Bot | null = null;
let tickNumber = 0;

function chance(p: number) {
  return Math.random() * 100 < p;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function move(c: any, toLocationId: number, action: string) {
  if (c.locationId === toLocationId) return;

  await prisma.creature.update({
    where: { id: c.id },
    data: {
      locationId: toLocationId,
      activity: "MOVING",
      currentAction: action,
      steps: { increment: 1 },
      hunger: { increment: 1 },
    },
  });
}

async function tickHerbalist(c: any) {
  const herbs = c.location.resources.find((r: any) => r.resourceType.key === "herbs");

  if (herbs && herbs.amount > 0) {
    await prisma.resourceNode.update({
      where: { id: herbs.id },
      data: { amount: { decrement: 1 } },
    });

    await prisma.creature.update({
      where: { id: c.id },
      data: {
        activity: "GATHERING",
        currentAction: "збирає трави",
      },
    });

    return "gathered";
  }

  const exit = pick(c.location.exitsFrom);
  if (exit) {
    await move(c, exit.toLocationId, "шукає трави");
    return "moved";
  }

  return "idle";
}

async function tickHerbivore(c: any) {
  if (chance(50)) {
    const exit = pick(c.location.exitsFrom);
    if (exit) {
      await move(c, exit.toLocationId, "шукає їжу");
      return "moved";
    }
  }

  await prisma.creature.update({
    where: { id: c.id },
    data: { currentAction: "прислухається" },
  });

  return "idle";
}

async function tickCarnivore(c: any) {
  const prey = await prisma.creature.findFirst({
    where: {
      isAlive: true,
      locationId: c.locationId,
      species: { diet: "HERBIVORE" },
    },
  });

  if (prey) {
    await prisma.creature.update({
      where: { id: c.id },
      data: { currentAction: "вистежує здобич" },
    });
    return "looking";
  }

  if (chance(50)) {
    const exit = pick(c.location.exitsFrom);
    if (exit) {
      await move(c, exit.toLocationId, "патрулює");
      return "moved";
    }
  }

  return "idle";
}

async function wakeLisovykIfRegionDepleted() {
  const regions = await prisma.region.findMany({
    include: {
      locations: {
        include: {
          resources: { include: { resourceType: true } },
        },
      },
    },
  });

  for (const region of regions) {
    const resourceKeys = new Set<string>();

    region.locations.forEach((l) =>
      l.resources.forEach((r) => resourceKeys.add(r.resourceType.key))
    );

    for (const key of resourceKeys) {
      const nodes = region.locations.flatMap((l) =>
        l.resources.filter((r) => r.resourceType.key === key)
      );

      const total = nodes.reduce((s, n) => s + n.amount, 0);
      if (total > 0) continue;

      const name = nodes[0]?.resourceType.name ?? key;

      const species = await prisma.creatureSpecies.findUnique({
        where: { key: "lisovyk" },
      });

      if (!species) return false;

      const existing = await prisma.creature.findFirst({
        where: { speciesId: species.id, name: "Дід Чорноліс" },
      });

      if (existing?.isAlive) return false;

      const location = region.locations[0];

      await prisma.creature.create({
        data: {
          speciesId: species.id,
          name: "Дід Чорноліс",
          locationId: location.id,
          hp: species.baseHp,
          activity: "LOOKING",
          currentAction: `прокинувся: зник ресурс ${name}`,
        },
      });

      await prisma.worldEvent.create({
        data: {
          type: "NPC_SAY",
          title: "Лісовик прокинувся",
          description: `У регіоні «${region.name}» зник ресурс «${name}».`,
          locationId: location.id,
        },
      });

      if (botInstance) {
        await notifyRegion(
          botInstance,
          region.id,
          `🌲 Дід Чорноліс прокинувся.\n\nУ всьому регіоні зник ресурс «${name}».`
        );
      }

      return true;
    }
  }

  return false;
}

export async function worldTick() {
  if (running) return;
  running = true;

  let moved = 0;
  let gathered = 0;
  let idle = 0;
  let looking = 0;
  let errors = 0;

  try {
    if (DEBUG) {
      console.log(`[WORLD TICK] start ${new Date().toISOString()}`);
    }

    const lisovykAwakened = await wakeLisovykIfRegionDepleted();

    const creatures = await prisma.creature.findMany({
      where: { isAlive: true },
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

    for (const c of creatures) {
      try {
        let result = "idle";

        if (c.species.key === "herbalist") result = await tickHerbalist(c);
        else if (c.species.key === "lisovyk") result = "idle";
        else if (c.species.diet === "HERBIVORE") result = await tickHerbivore(c);
        else if (c.species.diet === "CARNIVORE") result = await tickCarnivore(c);

        if (result === "moved") moved++;
        else if (result === "gathered") gathered++;
        else if (result === "looking") looking++;
        else idle++;
      } catch {
        errors++;
      }
    }

    tickNumber++;

    if (DEBUG) {
      console.log(
        `[WORLD TICK] done: moved=${moved}, gathered=${gathered}, idle=${idle}, errors=${errors}`
      );
    }

    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "World Tick",
        description: `Tick #${tickNumber}: moved=${moved}, gathered=${gathered}, idle=${idle}, lisovyk=${lisovykAwakened}`,
      },
    });

    if (botInstance && tickNumber % 5 === 0) {
      const region = await prisma.region.findFirst();
      if (region) {
        await notifyRegion(
          botInstance,
          region.id,
          `🌿 Світ ворухнувся.\n\nРух: ${moved}, збір: ${gathered}`
        );
      }
    }
  } finally {
    running = false;
  }
}

export function startWorldTick(bot?: Bot) {
  botInstance = bot ?? null;

  if (DEBUG) {
    console.log("TICK INTERVAL ENV:", process.env.WORLD_TICK_INTERVAL_MS);
    console.log(`World tick loop started: every ${TICK_INTERVAL}ms`);
  }

  setInterval(() => {
    worldTick().catch(console.error);
  }, TICK_INTERVAL);
}