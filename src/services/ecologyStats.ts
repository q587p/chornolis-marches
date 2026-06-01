import { CreatureAge } from "@prisma/client";
import { prisma } from "../db";
import { getRuntimeTimingConfig } from "../gameConfig";
import { ATTACK_KILL_SOURCE_EVENT_TITLE } from "./attackLearningRules";
import { creatureForms } from "./grammar";

const TICK_EVENT_TAKE = 120;
export const PLAYER_KILL_EVENT_TITLE = "Player killed animal";
export const PREDATOR_KILL_EVENT_TITLE = "Creature killed prey";
export const STARVATION_DEATH_EVENT_TITLE = "Animal starved";
export const POPULATION_FLOOR_RESTORED_EVENT_TITLE = "Population floor restored";

export const TICK_COUNTER_KEYS = [
  "rabbitBirths",
  "mouseBirths",
  "foxBirths",
  "wolfBirths",
  "rabbitsSpread",
  "miceSpread",
  "foxPreyUnits",
  "wolfPreyUnits",
  "overgrazedLocations",
  "overgrazedResources",
  "depletedByOvergrazing",
  "oldAgeDeaths",
  "starvationDeaths",
  "predatorKills",
  "playerKills",
  "corpsesGone",
  "regenerated",
  "creatureCandidates",
  "creatureProcessed",
  "creatureDeferred",
  "creatureProtected",
  "populationFloorRestored",
] as const;

type TickCounterKey = typeof TICK_COUNTER_KEYS[number];

type TickCounterSummary = Record<TickCounterKey, number>;

const EMPTY_COUNTERS = Object.fromEntries(TICK_COUNTER_KEYS.map((key) => [key, 0])) as TickCounterSummary;
const CREATURE_AGES: CreatureAge[] = ["CHILD", "YOUNG", "ADULT", "OLD", "CORPSE"];

export type PublicEcologySignStats = {
  totals: {
    aliveAnimals: number;
    corpseAnimals: number;
    predatorKills: number;
    playerKills: number;
    starvationDeaths: number;
  };
  speciesRows: Array<{
    key: string;
    name: string;
    alive: number;
  }>;
  recent: {
    eventCount: number;
    observedMinutes: number;
    counters: Pick<TickCounterSummary, "rabbitBirths" | "mouseBirths" | "foxBirths" | "wolfBirths" | "oldAgeDeaths" | "starvationDeaths" | "predatorKills" | "playerKills">;
  };
};

export type PredatorKillSpeciesRow = {
  speciesKey: string;
  speciesName: string;
  kills: number;
  attackAttempts: number;
  successfulAttacks: number;
};

function parseTickNumber(description: string | null | undefined) {
  const match = description?.match(/Tick #(\d+)/);
  return match ? Number(match[1]) : null;
}

function sortPredatorKillRows(rows: PredatorKillSpeciesRow[]) {
  return rows.sort((a, b) =>
    b.kills - a.kills
    || b.successfulAttacks - a.successfulAttacks
    || b.attackAttempts - a.attackAttempts
    || a.speciesKey.localeCompare(b.speciesKey)
  );
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

export function parsePopulationFloorRestorationDescription(description: string | null | undefined) {
  const counts: Record<string, number> = {};
  if (!description) return counts;

  for (const match of description.matchAll(/\b([a-z][a-z0-9_-]*)=(-?\d+)\b/g)) {
    const value = Number(match[2]);
    if (!Number.isFinite(value) || value <= 0) continue;
    counts[match[1]] = (counts[match[1]] ?? 0) + value;
  }

  return counts;
}

function attackerCreatureIdFromKillSource(description: string | null | undefined) {
  const match = description?.match(/attackerCreature=(\d+)/);
  return match ? Number(match[1]) : null;
}

export function countNpcCharacterKillEvents(events: Array<{ description: string | null }>, npcCreatureIds: Set<number>) {
  return events.reduce((sum, event) => {
    const attackerCreatureId = attackerCreatureIdFromKillSource(event.description);
    return attackerCreatureId !== null && npcCreatureIds.has(attackerCreatureId) ? sum + 1 : sum;
  }, 0);
}

async function countRecentNpcCharacterKills(since: Date, npcCreatureIds: Set<number>) {
  if (npcCreatureIds.size === 0) return 0;

  const events = await prisma.worldEvent.findMany({
    where: {
      title: ATTACK_KILL_SOURCE_EVENT_TITLE,
      description: { contains: "attackerCreature=" },
      createdAt: { gte: since, lte: new Date() },
    },
    select: { description: true },
  });

  return countNpcCharacterKillEvents(events, npcCreatureIds);
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
    topHunters,
    predatorKillGroups,
    topPlayers,
    topNpcs,
    npcKillStats,
    npcGreetingStats,
    populationRestorationEvents,
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
    prisma.creature.findMany({
      where: {
        species: { kind: "ANIMAL" },
        isGone: false,
        OR: [
          { kills: { gt: 0 } },
          { attackAttempts: { gt: 0 } },
        ],
      },
      include: { species: true, location: true },
      orderBy: [
        { kills: "desc" },
        { successfulAttacks: "desc" },
        { attackAttempts: "desc" },
        { id: "asc" },
      ],
      take: 10,
    }),
    prisma.creature.groupBy({
      by: ["speciesId"],
      where: {
        species: { kind: "ANIMAL", diet: "CARNIVORE" },
        OR: [
          { kills: { gt: 0 } },
          { attackAttempts: { gt: 0 } },
        ],
      },
      _sum: {
        kills: true,
        attackAttempts: true,
        successfulAttacks: true,
      },
    }),
    prisma.player.findMany({
      where: {
        OR: [
          { animalsKilled: { gt: 0 } },
          { successfulGathers: { gt: 0 } },
          { greetings: { gt: 0 } },
          { says: { gt: 0 } },
          { steps: { gt: 0 } },
        ],
      },
      include: { currentLocation: true },
      orderBy: [
        { animalsKilled: "desc" },
        { successfulGathers: "desc" },
        { greetings: "desc" },
        { says: "desc" },
        { steps: "desc" },
        { id: "asc" },
      ],
      take: 10,
    }),
    prisma.creature.findMany({
      where: {
        species: { kind: { not: "ANIMAL" } },
        isAlive: true,
        isGone: false,
        isHidden: false,
      },
      include: { species: true, location: true },
      orderBy: [
        { kills: "desc" },
        { successfulGathers: "desc" },
        { says: "desc" },
        { steps: "desc" },
        { id: "asc" },
      ],
      take: 10,
    }),
    prisma.creature.findMany({
      where: {
        species: { kind: { not: "ANIMAL" } },
        kills: { gt: 0 },
      },
      select: { id: true, kills: true },
    }),
    prisma.worldAction.groupBy({
      by: ["creatureId"],
      where: {
        actorType: "CREATURE",
        type: "GREET",
        status: "DONE",
        creatureId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.worldEvent.findMany({
      where: { title: POPULATION_FLOOR_RESTORED_EVENT_TITLE },
      orderBy: { id: "desc" },
      select: { id: true, createdAt: true, description: true },
    }),
  ]);

  const resourceTypes = await prisma.resourceType.findMany({ orderBy: { key: "asc" } });
  const resourcesById = new Map(resourceTypes.map((item) => [item.id, item]));
  const npcCreatureIdsWithKills = new Set(npcKillStats.map((creature) => creature.id));
  const totalNpcCharacterKills = npcKillStats.reduce((sum, creature) => sum + creature.kills, 0);
  const npcGreetingsByCreatureId = new Map(
    npcGreetingStats
      .filter((group) => group.creatureId !== null)
      .map((group) => [group.creatureId!, group._count._all]),
  );

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
  const speciesById = new Map(species.map((item) => [item.id, item]));

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

  const populationRestorationBySpecies = new Map<string, { speciesKey: string; speciesName: string; restored: number; events: number; latestAt: Date | null }>();
  for (const event of populationRestorationEvents) {
    const counts = parsePopulationFloorRestorationDescription(event.description);
    for (const [speciesKey, restored] of Object.entries(counts)) {
      const speciesName = species.find((item) => item.key === speciesKey)?.name ?? speciesKey;
      const row = populationRestorationBySpecies.get(speciesKey) ?? { speciesKey, speciesName, restored: 0, events: 0, latestAt: null };
      row.restored += restored;
      row.events += 1;
      if (!row.latestAt || event.createdAt > row.latestAt) row.latestAt = event.createdAt;
      populationRestorationBySpecies.set(speciesKey, row);
    }
  }
  const populationRestorationRows = [...populationRestorationBySpecies.values()]
    .sort((a, b) => b.restored - a.restored || a.speciesKey.localeCompare(b.speciesKey));
  const totalPopulationFloorRestored = populationRestorationRows.reduce((sum, row) => sum + row.restored, 0);

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
  if (tickEvents.length > 0) {
    const since = tickEvents[tickEvents.length - 1].createdAt;
    const [predatorKills, starvationDeaths, playerKills, npcCharacterKills] = await Promise.all([
      prisma.worldEvent.count({ where: { title: PREDATOR_KILL_EVENT_TITLE, createdAt: { gte: since, lte: new Date() } } }),
      prisma.worldEvent.count({ where: { title: STARVATION_DEATH_EVENT_TITLE, createdAt: { gte: since, lte: new Date() } } }),
      prisma.worldEvent.count({ where: { title: PLAYER_KILL_EVENT_TITLE, createdAt: { gte: since, lte: new Date() } } }),
      countRecentNpcCharacterKills(since, npcCreatureIdsWithKills),
    ]);
    recentCounters.predatorKills = predatorKills;
    recentCounters.starvationDeaths = starvationDeaths;
    recentCounters.playerKills = playerKills + npcCharacterKills;
  }
  const [totalPredatorKills, totalStarvationDeaths, totalPlayerKills] = await Promise.all([
    prisma.worldEvent.count({ where: { title: PREDATOR_KILL_EVENT_TITLE } }),
    prisma.worldEvent.count({ where: { title: STARVATION_DEATH_EVENT_TITLE } }),
    prisma.worldEvent.count({ where: { title: PLAYER_KILL_EVENT_TITLE } }),
  ]);

  const latestTickNumber = latestTick?.tickNumber ?? null;
  const oldestTickNumber = tickEvents.length ? tickEvents[tickEvents.length - 1].tickNumber : null;
  const observedTicks = latestTickNumber !== null && oldestTickNumber !== null
    ? Math.max(1, latestTickNumber - oldestTickNumber + 1)
    : tickEvents.length;
  const observedMinutes = observedTicks > 0 ? (observedTicks * timing.tickMs) / 60_000 : 0;

  const ratesPerHour = Object.fromEntries(
    TICK_COUNTER_KEYS.map((key) => [key, observedMinutes > 0 ? recentCounters[key] * 60 / observedMinutes : 0])
  ) as TickCounterSummary;

  const playerCharacterRows = topPlayers.map((player) => ({
    id: player.id,
    name: player.nameNominative ?? player.firstName ?? player.username ?? "мандрівник",
    pronoun: player.pronoun,
    grammaticalGender: player.grammaticalGender,
    locationKey: player.currentLocation?.key ?? null,
    locationName: player.currentLocation?.name ?? null,
    animalsKilled: player.animalsKilled,
    successfulGathers: player.successfulGathers,
    greetings: player.greetings,
    says: player.says,
    steps: player.steps,
  }));
  const npcCharacterRows = topNpcs.map((creature) => ({
    id: creature.id,
    name: creatureForms(creature).nominative,
    pronoun: null,
    grammaticalGender: creature.species.grammaticalGender,
    locationKey: creature.location.key,
    locationName: creature.location.name,
    animalsKilled: creature.kills,
    successfulGathers: creature.successfulGathers,
    greetings: npcGreetingsByCreatureId.get(creature.id) ?? 0,
    says: creature.says,
    steps: creature.steps,
  }));
  const topCharacters = [...playerCharacterRows, ...npcCharacterRows]
    .sort((a, b) =>
      b.animalsKilled - a.animalsKilled
      || b.successfulGathers - a.successfulGathers
      || b.greetings - a.greetings
      || b.says - a.says
      || b.steps - a.steps
      || a.name.localeCompare(b.name, "uk-UA")
    )
    .slice(0, 20);
  const predatorKillRows = sortPredatorKillRows(predatorKillGroups.map((group) => {
    const predatorSpecies = speciesById.get(group.speciesId);
    return {
      speciesKey: predatorSpecies?.key ?? String(group.speciesId),
      speciesName: predatorSpecies?.name ?? String(group.speciesId),
      kills: group._sum.kills ?? 0,
      attackAttempts: group._sum.attackAttempts ?? 0,
      successfulAttacks: group._sum.successfulAttacks ?? 0,
    };
  }));

  return {
    generatedAt: new Date(),
    timing,
    totals: {
      species: species.length,
      totalAnimals,
      aliveAnimals,
      corpseAnimals,
      goneAnimals,
      predatorKills: totalPredatorKills,
      playerKills: totalPlayerKills + totalNpcCharacterKills,
      starvationDeaths: totalStarvationDeaths,
      populationFloorRestored: totalPopulationFloorRestored,
      locationCount,
      occupiedAnimalLocations: occupiedLocations.length,
    },
    speciesRows,
    resourceRows,
    topHunters: topHunters.map((creature) => ({
      id: creature.id,
      name: creature.name ?? creature.species.name,
      speciesKey: creature.species.key,
      speciesName: creature.species.name,
      locationKey: creature.location.key,
      locationName: creature.location.name,
      isAlive: creature.isAlive,
      age: creature.age,
      attackAttempts: creature.attackAttempts,
      successfulAttacks: creature.successfulAttacks,
      kills: creature.kills,
    })),
    predatorKillRows,
    topPlayers: playerCharacterRows,
    topCharacters,
    populationRestorationRows,
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

export async function getPublicEcologySignStats(): Promise<PublicEcologySignStats> {
  const timing = getRuntimeTimingConfig();
  const [
    species,
    animalGroups,
    latestTickEvents,
    totalPredatorKills,
    totalStarvationDeaths,
    totalPlayerKills,
    npcKillStats,
  ] = await Promise.all([
    prisma.creatureSpecies.findMany({ where: { kind: "ANIMAL" }, orderBy: { key: "asc" } }),
    prisma.creature.groupBy({
      by: ["speciesId", "age", "isAlive", "isGone"],
      where: { species: { kind: "ANIMAL" } },
      _count: { _all: true },
    }),
    prisma.worldEvent.findMany({
      where: { title: "World Tick" },
      orderBy: { id: "desc" },
      take: TICK_EVENT_TAKE,
    }),
    prisma.worldEvent.count({ where: { title: PREDATOR_KILL_EVENT_TITLE } }),
    prisma.worldEvent.count({ where: { title: STARVATION_DEATH_EVENT_TITLE } }),
    prisma.worldEvent.count({ where: { title: PLAYER_KILL_EVENT_TITLE } }),
    prisma.creature.findMany({
      where: {
        species: { kind: { not: "ANIMAL" } },
        kills: { gt: 0 },
      },
      select: { id: true, kills: true },
    }),
  ]);
  const npcCreatureIdsWithKills = new Set(npcKillStats.map((creature) => creature.id));
  const totalNpcCharacterKills = npcKillStats.reduce((sum, creature) => sum + creature.kills, 0);

  const speciesRows = species.map((item) => ({ key: item.key, name: item.name, alive: 0 }));
  const rowsBySpeciesId = new Map(species.map((item, index) => [item.id, speciesRows[index]]));

  let aliveAnimals = 0;
  let corpseAnimals = 0;
  for (const group of animalGroups) {
    const count = group._count._all;
    const row = rowsBySpeciesId.get(group.speciesId);
    if (!group.isGone && group.isAlive && group.age !== "CORPSE") {
      if (row) row.alive += count;
      aliveAnimals += count;
    } else if (!group.isGone && (!group.isAlive || group.age === "CORPSE")) {
      corpseAnimals += count;
    }
  }

  const tickEvents = latestTickEvents
    .map((event) => ({
      tickNumber: parseTickNumber(event.description),
      createdAt: event.createdAt,
      counters: parseTickCounters(event.description),
    }))
    .filter((event) => event.tickNumber !== null);

  const recentCounters = { ...EMPTY_COUNTERS };
  for (const event of tickEvents) addCounters(recentCounters, event.counters);

  if (tickEvents.length > 0) {
    const since = tickEvents[tickEvents.length - 1].createdAt;
    const [predatorKills, starvationDeaths, playerKills, npcCharacterKills] = await Promise.all([
      prisma.worldEvent.count({ where: { title: PREDATOR_KILL_EVENT_TITLE, createdAt: { gte: since, lte: new Date() } } }),
      prisma.worldEvent.count({ where: { title: STARVATION_DEATH_EVENT_TITLE, createdAt: { gte: since, lte: new Date() } } }),
      prisma.worldEvent.count({ where: { title: PLAYER_KILL_EVENT_TITLE, createdAt: { gte: since, lte: new Date() } } }),
      countRecentNpcCharacterKills(since, npcCreatureIdsWithKills),
    ]);
    recentCounters.predatorKills = predatorKills;
    recentCounters.starvationDeaths = starvationDeaths;
    recentCounters.playerKills = playerKills + npcCharacterKills;
  }

  const latestTickNumber = tickEvents[0]?.tickNumber ?? null;
  const oldestTickNumber = tickEvents.length ? tickEvents[tickEvents.length - 1].tickNumber : null;
  const observedTicks = latestTickNumber !== null && oldestTickNumber !== null
    ? Math.max(1, latestTickNumber - oldestTickNumber + 1)
    : tickEvents.length;

  return {
    totals: {
      aliveAnimals,
      corpseAnimals,
      predatorKills: totalPredatorKills,
      playerKills: totalPlayerKills + totalNpcCharacterKills,
      starvationDeaths: totalStarvationDeaths,
    },
    speciesRows,
    recent: {
      eventCount: tickEvents.length,
      observedMinutes: observedTicks > 0 ? (observedTicks * timing.tickMs) / 60_000 : 0,
      counters: {
        rabbitBirths: recentCounters.rabbitBirths,
        mouseBirths: recentCounters.mouseBirths,
        foxBirths: recentCounters.foxBirths,
        wolfBirths: recentCounters.wolfBirths,
        oldAgeDeaths: recentCounters.oldAgeDeaths,
        starvationDeaths: recentCounters.starvationDeaths,
        predatorKills: recentCounters.predatorKills,
        playerKills: recentCounters.playerKills,
      },
    },
  };
}
