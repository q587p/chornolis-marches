import { CreatureAge } from "@prisma/client";
import { prisma } from "../db";
import { getRuntimeTimingConfig } from "../gameConfig";

const TICK_EVENT_TAKE = 120;
const TICK_COUNTER_KEYS = [
  "rabbitBirths",
  "rabbitsSpread",
  "overgrazedLocations",
  "overgrazedResources",
  "depletedByOvergrazing",
  "oldAgeDeaths",
  "corpsesGone",
  "regenerated",
] as const;

type TickCounterKey = typeof TICK_COUNTER_KEYS[number];

type TickCounterSummary = Record<TickCounterKey, number>;

const EMPTY_COUNTERS = Object.fromEntries(TICK_COUNTER_KEYS.map((key) => [key, 0])) as TickCounterSummary;
const CREATURE_AGES: CreatureAge[] = ["CHILD", "YOUNG", "ADULT", "OLD", "CORPSE"];

function parseTickNumber(description: string | null | undefined) {
  const match = description?.match(/Tick #(\d+)/);
  return match ? Number(match[1]) : null;
}

function parseTickCounters(description: string | null | undefined): TickCounterSummary {
  const counters = { ...EMPTY_COUNTERS };
  if (!description) return counters;

  for (const key of TICK_COUNTER_KEYS) {
    const match = description.match(new RegExp(`${key}=(-?\\d+)`));
    if (match) counters[key] = Number(match[1]);
  }

  return counters;
}

function addCounters(target: TickCounterSummary, source: TickCounterSummary) {
  for (const key of TICK_COUNTER_KEYS) target[key] += source[key];
}

function ageCountsTemplate() {
  return Object.fromEntries(CREATURE_AGES.map((age) => [age, 0])) as Record<CreatureAge, number>;
}

export async function getEcologyStats() {
  const timing = getRuntimeTimingConfig();
  const [
    species,
    animalGroups,
    resourceGroups,
    locationCount,
    occupiedLocations,
    latestTickEvents,
  ] = await Promise.all([
    prisma.creatureSpecies.findMany({ where: { kind: "ANIMAL" }, orderBy: { key: "asc" } }),
    prisma.creature.groupBy({
      by: ["speciesId", "age", "isAlive", "isGone"],
      where: { species: { kind: "ANIMAL" } },
      _count: { _all: true },
    }),
    prisma.resourceNode.groupBy({
      by: ["resourceTypeId"],
      _sum: { amount: true, maxAmount: true },
      _count: { _all: true },
    }),
    prisma.cellLocation.count(),
    prisma.creature.groupBy({
      by: ["locationId"],
      where: { isAlive: true, isGone: false, species: { kind: "ANIMAL" } },
      _count: { _all: true },
    }),
    prisma.worldEvent.findMany({
      where: { title: "World Tick" },
      orderBy: { id: "desc" },
      take: TICK_EVENT_TAKE,
    }),
  ]);

  const resourceTypes = await prisma.resourceType.findMany({ orderBy: { key: "asc" } });
  const resourcesById = new Map(resourceTypes.map((item) => [item.id, item]));

  const speciesRows = species.map((item) => ({
    key: item.key,
    name: item.name,
    total: 0,
    alive: 0,
    corpses: 0,
    gone: 0,
    ages: ageCountsTemplate(),
  }));
  const rowsBySpeciesId = new Map(species.map((item, index) => [item.id, speciesRows[index]]));

  let totalAnimals = 0;
  let aliveAnimals = 0;
  let corpseAnimals = 0;
  let goneAnimals = 0;

  for (const group of animalGroups) {
    const row = rowsBySpeciesId.get(group.speciesId);
    if (!row) continue;
    const count = group._count._all;
    row.total += count;
    row.ages[group.age] += count;
    totalAnimals += count;

    if (group.isGone) {
      row.gone += count;
      goneAnimals += count;
    } else if (!group.isAlive || group.age === "CORPSE") {
      row.corpses += count;
      corpseAnimals += count;
    } else {
      row.alive += count;
      aliveAnimals += count;
    }
  }

  const resourceRows = resourceGroups.map((group) => {
    const resource = resourcesById.get(group.resourceTypeId);
    const amount = group._sum.amount ?? 0;
    const maxAmount = group._sum.maxAmount ?? 0;
    return {
      key: resource?.key ?? String(group.resourceTypeId),
      name: resource?.name ?? String(group.resourceTypeId),
      nodes: group._count._all,
      amount,
      maxAmount,
      percent: maxAmount > 0 ? Math.round((amount / maxAmount) * 100) : 0,
    };
  }).sort((a, b) => a.key.localeCompare(b.key));

  const tickEvents = latestTickEvents
    .map((event) => ({
      id: event.id,
      tickNumber: parseTickNumber(event.description),
      createdAt: event.createdAt,
      counters: parseTickCounters(event.description),
      description: event.description,
    }))
    .filter((event) => event.tickNumber !== null);

  const latestTick = tickEvents[0] ?? null;
  const recentCounters = { ...EMPTY_COUNTERS };
  for (const event of tickEvents) addCounters(recentCounters, event.counters);

  const latestTickNumber = latestTick?.tickNumber ?? null;
  const oldestTickNumber = tickEvents.length ? tickEvents[tickEvents.length - 1].tickNumber : null;
  const observedTicks = latestTickNumber !== null && oldestTickNumber !== null
    ? Math.max(1, latestTickNumber - oldestTickNumber + 1)
    : tickEvents.length;
  const observedMinutes = observedTicks > 0 ? (observedTicks * timing.tickMs) / 60_000 : 0;

  const ratesPerHour = Object.fromEntries(
    TICK_COUNTER_KEYS.map((key) => [key, observedMinutes > 0 ? recentCounters[key] * 60 / observedMinutes : 0])
  ) as TickCounterSummary;

  return {
    generatedAt: new Date(),
    timing,
    totals: {
      species: species.length,
      totalAnimals,
      aliveAnimals,
      corpseAnimals,
      goneAnimals,
      locationCount,
      occupiedAnimalLocations: occupiedLocations.length,
    },
    speciesRows,
    resourceRows,
    latestTick,
    recent: {
      eventCount: tickEvents.length,
      observedTicks,
      observedMinutes,
      counters: recentCounters,
      ratesPerHour,
    },
    refreshSeconds: Math.max(30, Math.round((40 * timing.tickMs) / 1000)),
  };
}
