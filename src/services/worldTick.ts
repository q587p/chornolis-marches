import { Bot } from "grammy";
import { CreatureAge, Direction, LocationExit, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { notifyLocationAll, notifyRegion, notifyRegionTechnicalScribes } from "./notifications";
import { actionDurationMs, enqueueCreatureAction, movementDurationMs, restartActionQueueLoop } from "./actionQueue";
import { BASE_STAMINA, TICK_MS, VERY_TIRED_STAMINA, getRuntimeTimingConfig, setRuntimeTickMs } from "../gameConfig";
import { restartPlayerAutoTimers } from "../handlers/auto";
import { carriedCorpseAction, carriedCorpseOwnerId, removeDecayedCorpseFromInventory } from "./corpses";
import { requireScribeAdmin } from "./adminAccess";
import { notifyFadingFireTimers } from "./fire";
import { filterLisovykAllowedLocations, isLisovykForbiddenLocation, isLisovykForbiddenRegion } from "./lisovykBoundaries";
import { DREAM_GATE_FEATURE_KEY, DREAM_GATE_FEATURE_KEYS } from "./tutorial";
import { hunterClaimedCorpseDecayAction, isHunterCreature, tickNpcHunter } from "./npcHunter";
import { isHerbalistCreature, tickNpcHerbalist } from "./npcHerbalist";
import { tickNpcLearner } from "./npcLearner";
import { chance, chancePermille, pickOptional as pick, randomInt } from "../utils/random";
import { restorePopulationFloors } from "./populationRestoration";
import { PREDATOR_PREY_CLAIM_PREFIX, isUnclaimedHerbivoreCorpseForScavenging, predatorClaimedCorpseDecayAction, predatorClaimedCorpseMarker } from "./predatorFeeding";
import { slashlessCommandPattern } from "../utils/slashlessCommands";
import { advanceWorldClock } from "./worldTime";
import { notifyWorldDaypartChangeIfNeeded } from "./worldDaypartNotices";
import { creatureUsableExits } from "./creatureMovement";
import { worldTimeSnapshotFromAbsoluteMinute, type WorldDaypart } from "../data/worldClock";
import { CAMP_SPIRIT_CAT_START_LOCATION_KEY, campSpiritCatMouseBehaviorPlan, campSpiritCatShouldPrioritizeLocalMice, campSpiritCatWatchPosture, isCampSpiritCatAllowedExit, isCampSpiritCatCreature, isCampSpiritCatLocationKey } from "./campSpiritCat";
import { isStarterCampOwlSafeLocationKey } from "./owlSigns";
import { advancePassivePlayerHunger } from "./playerHunger";
import { ageStrangeTotemsIfNeeded, maybeSpawnDailyStrangeTotem } from "./strangeTotems";
import { isStarterCampRegionKey } from "./starterRegion";

const DEFAULT_TICK_INTERVAL_MS = TICK_MS;
const TICK_TEXT_COMMAND = slashlessCommandPattern(["tick"]);
const TICK_GET_TEXT_COMMAND = slashlessCommandPattern(["tickGet", "tickget"]);
const TICK_SET_TEXT_COMMAND = slashlessCommandPattern(["tickSet", "tickset"]);
const DEBUG = process.env.WORLD_DEBUG === "true" || process.env.WORLD_TICK_DEBUG === "true";
const RESOURCE_REGEN_EVERY_TICKS = Number(process.env.WORLD_RESOURCE_REGEN_EVERY_TICKS || 160);
const RESOURCE_REGEN_AMOUNT = Number(process.env.WORLD_RESOURCE_REGEN_AMOUNT || 1);
const GRASS_REGEN_EVERY_TICKS = Number(process.env.WORLD_GRASS_REGEN_EVERY_TICKS || 120);
const EXHAUSTED_LOCATION_REGEN_EVERY_TICKS = Number(process.env.WORLD_EXHAUSTED_LOCATION_REGEN_EVERY_TICKS || 720);
const NATURAL_TWIGS_REGEN_INTERVAL_MS = Number(process.env.WORLD_NATURAL_TWIGS_REGEN_INTERVAL_MS || 2 * 60 * 60 * 1000);
const NATURAL_TWIGS_MAX_AMOUNT = Number(process.env.WORLD_NATURAL_TWIGS_MAX_AMOUNT || 5);
const NATURAL_TWIGS_LOCATION_DIVISOR = Number(process.env.WORLD_NATURAL_TWIGS_LOCATION_DIVISOR || 3);
const NATURAL_TWIGS_REGION_KEYS = new Set((process.env.WORLD_NATURAL_TWIGS_REGION_KEYS || "chornolis_border").split(",").map((key) => key.trim()).filter(Boolean));
const LISOVYK_WAKE_DELAY_TICKS = Number(process.env.WORLD_LISOVYK_WAKE_DELAY_TICKS || 12);
const RABBIT_REPRODUCTION_EVERY_TICKS = Number(process.env.WORLD_RABBIT_REPRODUCTION_EVERY_TICKS || 120);
const RABBIT_MIN_LITTER_SIZE = Number(process.env.WORLD_RABBIT_MIN_LITTER_SIZE || 5);
const RABBIT_MAX_LITTER_SIZE = Number(process.env.WORLD_RABBIT_MAX_LITTER_SIZE || 10);
const RABBIT_MAX_LITTERS_PER_LOCATION = Number(process.env.WORLD_RABBIT_MAX_LITTERS_PER_LOCATION || 2);
const RABBIT_LOCAL_SOFT_CAP = Number(process.env.WORLD_RABBIT_LOCAL_SOFT_CAP || 6);
const OVERGRAZING_RABBIT_THRESHOLD = Number(process.env.WORLD_OVERGRAZING_RABBIT_THRESHOLD || 5);
const RABBIT_SPREAD_EVERY_TICKS = Number(process.env.WORLD_RABBIT_SPREAD_EVERY_TICKS || 20);
const RABBIT_MAX_SPREAD_PER_LOCATION = Number(process.env.WORLD_RABBIT_MAX_SPREAD_PER_LOCATION || 4);
const MOUSE_REPRODUCTION_EVERY_TICKS = Number(process.env.WORLD_MOUSE_REPRODUCTION_EVERY_TICKS || 20);
const MOUSE_MIN_LITTER_SIZE = Number(process.env.WORLD_MOUSE_MIN_LITTER_SIZE || 5);
const MOUSE_MAX_LITTER_SIZE = Number(process.env.WORLD_MOUSE_MAX_LITTER_SIZE || 10);
const MOUSE_MAX_LITTERS_PER_LOCATION = Number(process.env.WORLD_MOUSE_MAX_LITTERS_PER_LOCATION || 8);
const MOUSE_LOCAL_SOFT_CAP = Number(process.env.WORLD_MOUSE_LOCAL_SOFT_CAP || 8);
const MOUSE_SPREAD_EVERY_TICKS = Number(process.env.WORLD_MOUSE_SPREAD_EVERY_TICKS || 15);
const MOUSE_MAX_SPREAD_PER_LOCATION = Number(process.env.WORLD_MOUSE_MAX_SPREAD_PER_LOCATION || 6);
const FOX_REPRODUCTION_EVERY_TICKS = Number(process.env.WORLD_FOX_REPRODUCTION_EVERY_TICKS || 720);
const FOX_MIN_LITTER_SIZE = Number(process.env.WORLD_FOX_MIN_LITTER_SIZE || 2);
const FOX_MAX_LITTER_SIZE = Number(process.env.WORLD_FOX_MAX_LITTER_SIZE || 5);
const FOX_PREY_UNITS_REQUIRED_BASE = Number(process.env.WORLD_FOX_PREY_UNITS_REQUIRED_BASE || 12);
const FOX_PREY_UNITS_REQUIRED_PER_FOX = Number(process.env.WORLD_FOX_PREY_UNITS_REQUIRED_PER_FOX || 6);
const WOLF_REPRODUCTION_EVERY_TICKS = Number(process.env.WORLD_WOLF_REPRODUCTION_EVERY_TICKS || 2400);
const WOLF_MIN_LITTER_SIZE = Number(process.env.WORLD_WOLF_MIN_LITTER_SIZE || 2);
const WOLF_MAX_LITTER_SIZE = Number(process.env.WORLD_WOLF_MAX_LITTER_SIZE || 4);
const WOLF_PREY_UNITS_REQUIRED_BASE = Number(process.env.WORLD_WOLF_PREY_UNITS_REQUIRED_BASE || 60);
const WOLF_PREY_UNITS_REQUIRED_PER_WOLF = Number(process.env.WORLD_WOLF_PREY_UNITS_REQUIRED_PER_WOLF || 20);
const CROWD_DANGER_THRESHOLD = Number(process.env.WORLD_CROWD_DANGER_THRESHOLD || 13);
const CROWD_DANGER_INITIAL_BONUS = Number(process.env.WORLD_CROWD_DANGER_INITIAL_BONUS || 4);
const CROWD_DANGER_STEP = Number(process.env.WORLD_CROWD_DANGER_STEP || 4);
const CROWD_DANGER_STEP_BONUS = Number(process.env.WORLD_CROWD_DANGER_STEP_BONUS || 1);
const CROWD_HERBIVORE_MOVE_BASE_CHANCE = Number(process.env.WORLD_CROWD_HERBIVORE_MOVE_BASE_CHANCE || 12);
const CROWD_HERBIVORE_MOVE_PER_EXTRA_CHANCE = Number(process.env.WORLD_CROWD_HERBIVORE_MOVE_PER_EXTRA_CHANCE || 4);
const CROWD_HERBIVORE_MOVE_MAX_CHANCE = Number(process.env.WORLD_CROWD_HERBIVORE_MOVE_MAX_CHANCE || 55);
const CREATURE_STARVATION_HUNGER_THRESHOLD = Number(process.env.WORLD_CREATURE_STARVATION_HUNGER_THRESHOLD || 20);
const CREATURE_STARVATION_BASE_CHANCE_PERMILLE = Number(process.env.WORLD_CREATURE_STARVATION_BASE_CHANCE_PERMILLE || 80);
const CREATURE_STARVATION_EXTRA_CHANCE_PER_HUNGER_PERMILLE = Number(process.env.WORLD_CREATURE_STARVATION_EXTRA_CHANCE_PER_HUNGER_PERMILLE || 25);
const CREATURE_TICK_BUDGET = Math.max(0, Number(process.env.WORLD_CREATURE_TICK_BUDGET || 180));
const RECENT_ATTACK_FEATURE_PREFIX = "recent_attack_";
const EDIBLE_RESOURCE_KEYS = ["grass", "berries", "herbs", "mushrooms"] as const;
const NATURAL_TWIGS_RESOURCE_KEY = "twigs";
const LISOVYK_IGNORED_DEPLETION_RESOURCE_KEYS = new Set(["torch", "lit_torch", "twigs"]);
const LISOVYK_DEPLETION_NOTICE_TITLE = "Лісовик почув виснаження";
const LISOVYK_DEPLETION_RESOLVED_TITLE = "Лісовик виснаження минуло";
const DEPLETED_VEGETATION_FEATURE_PREFIX = "depleted_vegetation_";
const MOUSE_OVERGRAZING_PRESSURE_DIVISOR = 2;

let tickIntervalMs = DEFAULT_TICK_INTERVAL_MS;
let tickTimer: NodeJS.Timeout | null = null;
let running = false;
let botInstance: Bot | null = null;
let tickNumber = 0;

export function isOwlActiveDaypart(daypart: WorldDaypart) {
  return daypart === "dawn" || daypart === "dusk" || daypart === "night";
}

export function owlNocturnalSyncPlan(daypart: WorldDaypart) {
  if (isOwlActiveDaypart(daypart)) {
    return {
      cancelActiveActions: false,
      creatureData: {
        activity: "IDLE",
        isHidden: false,
        currentAction: "прокидається в присмерку й дослухається до трави",
      },
    } as const;
  }

  return {
    cancelActiveActions: true,
    creatureData: {
      activity: "SLEEPING",
      isHidden: true,
      currentAction: "спить у дуплі, злившись із корою",
    },
  } as const;
}

async function syncOwlNocturnalActivity(daypart: WorldDaypart) {
  const plan = owlNocturnalSyncPlan(daypart);

  if (!plan.cancelActiveActions) {
    const woke = await prisma.creature.updateMany({
      where: {
        isAlive: true,
        isGone: false,
        species: { key: "owl", kind: "ANIMAL" },
        OR: [{ activity: "SLEEPING" }, { isHidden: true }],
      },
      data: plan.creatureData,
    });
    return { slept: 0, woke: woke.count };
  }

  const livingOwls = await prisma.creature.findMany({
    where: {
      isAlive: true,
      isGone: false,
      species: { key: "owl", kind: "ANIMAL" },
    },
    select: { id: true },
  });
  const ids = livingOwls.map((owl) => owl.id);
  if (ids.length === 0) return { slept: 0, woke: 0 };

  await prisma.worldAction.updateMany({
    where: {
      actorType: "CREATURE",
      creatureId: { in: ids },
      status: { in: ["QUEUED", "RUNNING"] },
    },
    data: { status: "CANCELLED", note: "сова ховається на день" },
  });

  const slept = await prisma.creature.updateMany({
    where: { id: { in: ids } },
    data: plan.creatureData,
  });

  return { slept: slept.count, woke: 0 };
}

const STAGE_HP_MULTIPLIER: Record<CreatureAge, number> = {
  CHILD: 0.35,
  YOUNG: 0.75,
  ADULT: 1,
  OLD: 0.65,
  CORPSE: 0,
};

function crowdDangerBonus(presenceCount: number) {
  if (presenceCount <= CROWD_DANGER_THRESHOLD) return 0;
  const extra = presenceCount - CROWD_DANGER_THRESHOLD;
  return CROWD_DANGER_INITIAL_BONUS + Math.ceil(extra / Math.max(1, CROWD_DANGER_STEP)) * CROWD_DANGER_STEP_BONUS;
}

function activeRecentAttackFeature(feature: any) {
  if (!feature?.isActive || !String(feature.key).startsWith(RECENT_ATTACK_FEATURE_PREFIX)) return false;
  const expiresAt = typeof feature.data === "object" && feature.data ? (feature.data as any).expiresAt : null;
  return !expiresAt || new Date(String(expiresAt)).getTime() > Date.now();
}

function recentAttackDangerBonus(features: any[] | undefined) {
  return features?.some(activeRecentAttackFeature) ? 5 : 0;
}

function recentAttackHerbivoreMoveBonus(features: any[] | undefined) {
  return features?.some(activeRecentAttackFeature) ? 25 : 0;
}

function effectiveLocationDanger(baseDangerLevel: number, presenceCount: number, features?: any[]) {
  return baseDangerLevel + crowdDangerBonus(presenceCount) + recentAttackDangerBonus(features);
}

function herbivorePressureMoveChance(presenceCount: number, features?: any[]) {
  let result = recentAttackHerbivoreMoveBonus(features);
  if (presenceCount <= CROWD_DANGER_THRESHOLD) return result;
  const extra = presenceCount - CROWD_DANGER_THRESHOLD;
  result += CROWD_HERBIVORE_MOVE_BASE_CHANCE + extra * CROWD_HERBIVORE_MOVE_PER_EXTRA_CHANCE;
  return Math.min(CROWD_HERBIVORE_MOVE_MAX_CHANCE, result);
}

export type CreatureTickCandidate = {
  id: number;
  locationId: number;
  species: {
    kind: string;
    key: string;
    diet: string | null;
  };
};

function creatureTickPriority(candidate: CreatureTickCandidate, playerCountsByLocationId: Map<number, number>) {
  if ((playerCountsByLocationId.get(candidate.locationId) ?? 0) > 0) return 100;
  if (candidate.species.kind !== "ANIMAL") return 90;
  if (candidate.species.diet === "CARNIVORE") return 70;
  return 0;
}

export function selectCreaturesForTick(
  candidates: CreatureTickCandidate[],
  playerCountsByLocationId: Map<number, number>,
  tick: number,
  budget = CREATURE_TICK_BUDGET,
) {
  const protectedCount = candidates.filter((candidate) => creatureTickPriority(candidate, playerCountsByLocationId) > 0).length;
  if (budget <= 0 || candidates.length <= budget) {
    return { selectedIds: candidates.map((candidate) => candidate.id), deferred: 0, protectedCount };
  }

  const scored = candidates
    .map((candidate) => ({
      candidate,
      priority: creatureTickPriority(candidate, playerCountsByLocationId),
      rotation: (candidate.id + tick * 7919) % 104729,
    }))
    .sort((a, b) =>
      b.priority - a.priority
      || a.rotation - b.rotation
      || a.candidate.id - b.candidate.id
    );

  const protectedItems = scored.filter((item) => item.priority > 0);
  const backgroundSlots = Math.max(0, budget - protectedItems.length);
  const selected = [
    ...protectedItems,
    ...scored.filter((item) => item.priority <= 0).slice(0, backgroundSlots),
  ];
  const selectedIds = new Set(selected.map((item) => item.candidate.id));

  return {
    selectedIds: selected.map((item) => item.candidate.id),
    deferred: candidates.length - selectedIds.size,
    protectedCount,
  };
}

function isExit(value: unknown): value is LocationExit {
  return Boolean(value && typeof value === "object" && "toLocationId" in value);
}

function creatureRestChance(c: any) {
  if (c.stamina >= 0) return 0;
  const debt = Math.abs(Math.min(0, c.stamina));
  const ratio = Math.min(1, debt / Math.abs(VERY_TIRED_STAMINA));
  let restChance = 20 + Math.round(ratio * 70);

  const dangerLevel = c.location?.effectiveDangerLevel ?? c.location?.dangerLevel ?? 0;
  if (c.species?.diet === "HERBIVORE" && dangerLevel >= 4) {
    restChance = Math.max(5, Math.round(restChance / (dangerLevel >= 7 ? 4 : 2)));
  }

  return Math.min(95, restChance);
}

async function maybeQueueCreatureRest(c: any) {
  const restChance = creatureRestChance(c);
  if (restChance <= 0 || !chance(restChance)) return false;
  await enqueueCreatureAction({
    creatureId: c.id,
    type: "REST",
    payload: { reason: c.stamina <= VERY_TIRED_STAMINA ? "ледь тримається на ногах" : "відчуває втому" },
    durationMs: actionDurationMs("REST", c.stamina),
  });
  return true;
}

function stageFor(creature: any, nextAgeTicks: number): CreatureAge {
  const species = creature.species;
  const childEnd = species.childTicks;
  const youngEnd = childEnd + species.youngTicks;
  const adultEnd = youngEnd + species.adultTicks;

  if (nextAgeTicks < childEnd) return "CHILD";
  if (nextAgeTicks < youngEnd) return "YOUNG";
  if (nextAgeTicks < adultEnd) return "ADULT";
  return "OLD";
}

function stageMaxHp(creature: any, stage: CreatureAge) {
  const multiplier = STAGE_HP_MULTIPLIER[stage] ?? 1;
  return Math.max(1, Math.round(creature.species.baseHp * multiplier));
}

function isEdibleResourceKey(key: string) {
  return (EDIBLE_RESOURCE_KEYS as readonly string[]).includes(key);
}

export function naturalTwigsRegenEveryTicks(tickMs = TICK_MS) {
  return Math.max(1, Math.ceil(NATURAL_TWIGS_REGEN_INTERVAL_MS / Math.max(1, tickMs)));
}

export function isNaturalTwigsLocation(location: { z?: number | null; region?: { key?: string | null } | null }) {
  return (location.z ?? 0) === 0 && NATURAL_TWIGS_REGION_KEYS.has(location.region?.key ?? "");
}

export function shouldRegenerateNaturalTwigsInLocation(locationId: number, currentTick: number, intervalTicks = naturalTwigsRegenEveryTicks()) {
  if (currentTick <= 0 || currentTick % intervalTicks !== 0) return false;
  const divisor = Math.max(1, NATURAL_TWIGS_LOCATION_DIVISOR);
  const cycle = Math.floor(currentTick / intervalTicks);
  return (locationId + cycle) % divisor === 0;
}

function canBreedSpecies(creature: any, speciesKey: string) {
  return creature.species?.key === speciesKey && creature.isAlive && !creature.isGone && creature.age === "ADULT";
}

function hasBreedingPair(creatures: any[], speciesKey: string) {
  const adults = creatures.filter((creature) => canBreedSpecies(creature, speciesKey));
  if (adults.length < 2) return false;

  const males = adults.filter((creature) => creature.sex === "MALE").length;
  const females = adults.filter((creature) => creature.sex === "FEMALE").length;
  const unknown = adults.length - males - females;

  return (males > 0 || unknown > 0) && (females > 0 || unknown > 0);
}

function breedingFemaleCapacity(creatures: any[], speciesKey: string) {
  const adults = creatures.filter((creature) => canBreedSpecies(creature, speciesKey));
  if (adults.length < 2) return 0;

  const males = adults.filter((creature) => creature.sex === "MALE").length;
  const females = adults.filter((creature) => creature.sex === "FEMALE").length;
  const unknown = adults.length - males - females;
  if (males <= 0 && unknown <= 0) return 0;

  return Math.max(females, Math.floor(unknown / 2));
}

function localFoodAmount(location: any) {
  return location.resources
    .filter((resource: any) => isEdibleResourceKey(resource.resourceType.key))
    .reduce((sum: number, resource: any) => sum + resource.amount, 0);
}

function smallHerbivoreBirthChance(input: { adults: number; localCount: number; food: number; predatorsInRegion: number; dangerLevel: number; localSoftCap: number; baseChance: number }) {
  if (input.food <= 0) return 0;

  const adultBonus = Math.min(30, input.adults * 6);
  const foodBonus = Math.min(20, Math.floor(input.food / 5));
  const predatorPenalty = input.predatorsInRegion * 18;
  const dangerPenalty = Math.max(0, input.dangerLevel - 1) * 6;
  const crowdedPenalty = input.localCount > input.localSoftCap ? (input.localCount - input.localSoftCap) * 4 : 0;

  return Math.max(0, Math.min(85, input.baseChance + adultBonus + foodBonus - predatorPenalty - dangerPenalty - crowdedPenalty));
}

async function createSmallHerbivoreOffspring(species: any, locationId: number) {
  await createSmallHerbivoreOffspringMany(species, locationId, 1);
}

async function createSmallHerbivoreOffspringMany(species: any, locationId: number, count: number) {
  const maxHp = Math.max(1, Math.round(species.baseHp * STAGE_HP_MULTIPLIER.CHILD));
  if (count <= 0) return;
  await prisma.creature.createMany({
    data: Array.from({ length: count }, () => ({
      speciesId: species.id,
      locationId,
      hp: maxHp,
      maxHp,
      hunger: 0,
      stamina: BASE_STAMINA,
      staminaMax: BASE_STAMINA,
      fatigueState: "RESTED",
      activity: "IDLE",
      currentAction: "народилося й ховається в траві",
      age: "CHILD",
      ageTicks: 0,
      sex: Math.random() < 0.5 ? "MALE" : "FEMALE",
      isAlive: true,
      isGone: false,
      isHidden: false,
    })),
  });
}

function depletedVegetationFeatureKey(locationKey: string) {
  return `${DEPLETED_VEGETATION_FEATURE_PREFIX}${locationKey}`;
}

async function markLocationVegetationDepleted(location: { id: number; key: string }) {
  await prisma.locationFeature.upsert({
    where: { key: depletedVegetationFeatureKey(location.key) },
    update: {
      isActive: true,
      name: "Винищена трава",
      description: "Ви бачите, як гризуни виїли всю траву. Її відновлення займе довший час, якщо не допоможуть дощ, магія чи спокій.",
      data: { ecology: "depleted_vegetation", depletedAtTick: tickNumber, minRecoverTick: tickNumber + EXHAUSTED_LOCATION_REGEN_EVERY_TICKS },
    },
    create: {
      key: depletedVegetationFeatureKey(location.key),
      locationId: location.id,
      type: "LANDMARK",
      name: "Винищена трава",
      description: "Ви бачите, як гризуни виїли всю траву. Її відновлення займе довший час, якщо не допоможуть дощ, магія чи спокій.",
      isActive: true,
      data: { ecology: "depleted_vegetation", depletedAtTick: tickNumber, minRecoverTick: tickNumber + EXHAUSTED_LOCATION_REGEN_EVERY_TICKS },
    },
  });
}

async function maybeMarkLocationVegetationDepleted(location: { id: number; key: string }) {
  const edibleNodes = await prisma.resourceNode.findMany({
    where: { locationId: location.id, resourceType: { key: { in: [...EDIBLE_RESOURCE_KEYS] } } },
    include: { resourceType: true },
  });
  if (edibleNodes.length === 0) return false;
  const total = edibleNodes.reduce((sum, node) => sum + node.amount, 0);
  if (total > 0) return false;
  await markLocationVegetationDepleted(location);
  return true;
}

async function consumeOvergrazedResources(location: any, rabbitCount: number) {
  if (rabbitCount < OVERGRAZING_RABBIT_THRESHOLD) return { consumed: 0, depleted: 0 };

  const pressure = rabbitCount - OVERGRAZING_RABBIT_THRESHOLD + 1;
  const edibleResources = location.resources
    .filter((resource: any) => resource.amount > 0 && isEdibleResourceKey(resource.resourceType.key))
    .sort((a: any, b: any) => b.amount - a.amount);

  let consumed = 0;
  let depleted = 0;
  let remainingDamage = Math.max(1, Math.ceil(pressure / 2));

  for (const resource of edibleResources) {
    if (remainingDamage <= 0) break;
    const amount = Math.min(resource.amount, remainingDamage);
    const nextAmount = resource.amount - amount;
    const updated = await prisma.resourceNode.updateMany({ where: { id: resource.id }, data: { amount: nextAmount } });
    if (updated.count > 0) {
      consumed += amount;
      remainingDamage -= amount;
      if (nextAmount <= 0) depleted++;
    }
  }

  return { consumed, depleted };
}

async function spreadOvercrowdedAnimals(location: any, animals: any[], countsByLocationId: Map<number, number>, config: { everyTicks: number; localSoftCap: number; maxSpread: number; action: string }) {
  if (tickNumber === 0 || tickNumber % config.everyTicks !== 0) return 0;
  if (animals.length <= config.localSoftCap) return 0;

  const exits = creatureUsableExits(animals[0] ?? { species: { kind: "ANIMAL" } }, location.exitsFrom.filter((exit: any) => !exit.isHidden)) as LocationExit[];
  if (!exits.length) return 0;

  const movable = animals
    .filter((animal) => animal.age !== "CHILD")
    .sort((a, b) => (b.ageTicks ?? 0) - (a.ageTicks ?? 0));
  const spreadCount = Math.min(animals.length - config.localSoftCap, movable.length, config.maxSpread);
  let spread = 0;

  for (let i = 0; i < spreadCount; i++) {
    const animal = movable[i];
    if (!animal) break;

    const exit = exits
      .slice()
      .sort((a: any, b: any) => (countsByLocationId.get(a.toLocationId) ?? 0) - (countsByLocationId.get(b.toLocationId) ?? 0))[0];
    if (!exit) break;

    await prisma.worldAction.updateMany({
      where: { actorType: "CREATURE", creatureId: animal.id, status: { in: ["QUEUED", "RUNNING"] } },
      data: { status: "CANCELLED" },
    });
    const moved = await prisma.creature.updateMany({
      where: { id: animal.id, isAlive: true, isGone: false },
      data: { locationId: exit.toLocationId, activity: "MOVING", currentAction: config.action },
    });
    if (moved.count === 0) continue;

    countsByLocationId.set(location.id, Math.max(0, (countsByLocationId.get(location.id) ?? animals.length) - 1));
    countsByLocationId.set(exit.toLocationId, (countsByLocationId.get(exit.toLocationId) ?? 0) + 1);
    spread++;
  }

  return spread;
}

async function processSmallHerbivoreEcology() {
  const canReproduceThisTick = tickNumber > 0 && tickNumber % RABBIT_REPRODUCTION_EVERY_TICKS === 0;
  const canMouseReproduceThisTick = tickNumber > 0 && tickNumber % MOUSE_REPRODUCTION_EVERY_TICKS === 0;
  const canSpreadThisTick = tickNumber > 0 && (tickNumber % RABBIT_SPREAD_EVERY_TICKS === 0 || tickNumber % MOUSE_SPREAD_EVERY_TICKS === 0);
  if (!canReproduceThisTick && !canMouseReproduceThisTick && !canSpreadThisTick) return { rabbitBirths: 0, mouseBirths: 0, rabbitsSpread: 0, miceSpread: 0, overgrazedLocations: 0, overgrazedResources: 0, depletedByOvergrazing: 0 };

  const rabbitSpecies = await prisma.creatureSpecies.findUnique({ where: { key: "rabbit" } });
  const mouseSpecies = await prisma.creatureSpecies.findUnique({ where: { key: "mouse" } });
  if (!rabbitSpecies && !mouseSpecies) return { rabbitBirths: 0, mouseBirths: 0, rabbitsSpread: 0, miceSpread: 0, overgrazedLocations: 0, overgrazedResources: 0, depletedByOvergrazing: 0 };

  const regions = await prisma.region.findMany({
    include: {
      locations: {
        include: {
          creatures: { where: { isAlive: true, isGone: false }, include: { species: true } },
          exitsFrom: true,
          resources: { include: { resourceType: true } },
          features: { where: { isActive: true } },
          _count: { select: { players: true } },
        },
      },
    },
  });

  let rabbitBirths = 0;
  let mouseBirths = 0;
  let rabbitsSpread = 0;
  let miceSpread = 0;
  let overgrazedLocations = 0;
  let overgrazedResources = 0;
  let depletedByOvergrazing = 0;

  for (const region of regions) {
    const predatorsInRegion = region.locations.reduce(
      (sum, location) => sum + location.creatures.filter((creature: any) => creature.species.kind === "ANIMAL" && creature.species.diet === "CARNIVORE").length,
      0
    );

    let regionBirths = 0;
    let regionMouseBirths = 0;
    let regionConsumed = 0;
    let regionSpread = 0;
    let regionMiceSpread = 0;
    const rabbitCountsByLocationId = new Map<number, number>();
    const mouseCountsByLocationId = new Map<number, number>();
    for (const location of region.locations) {
      rabbitCountsByLocationId.set(location.id, location.creatures.filter((creature: any) => creature.species.key === "rabbit").length);
      mouseCountsByLocationId.set(location.id, location.creatures.filter((creature: any) => creature.species.key === "mouse").length);
    }

    for (const location of region.locations) {
      const rabbits = location.creatures.filter((creature: any) => creature.species.key === "rabbit");
      const mice = location.creatures.filter((creature: any) => creature.species.key === "mouse");
      const adultRabbits = rabbits.filter((creature: any) => canBreedSpecies(creature, "rabbit")).length;
      const adultMice = mice.filter((creature: any) => canBreedSpecies(creature, "mouse")).length;

      if (rabbitSpecies && canReproduceThisTick && hasBreedingPair(rabbits, "rabbit")) {
        const food = localFoodAmount(location);
        const breedingFemales = breedingFemaleCapacity(rabbits, "rabbit");
        const birthChance = smallHerbivoreBirthChance({
          adults: adultRabbits,
          localCount: rabbits.length,
          food,
          predatorsInRegion,
          dangerLevel: effectiveLocationDanger(location.dangerLevel, location.creatures.length + (location._count?.players ?? 0), location.features),
          localSoftCap: RABBIT_LOCAL_SOFT_CAP,
          baseChance: 25,
        });

        if (birthChance > 0 && chance(birthChance)) {
          const litters = Math.max(1, Math.min(breedingFemales, RABBIT_MAX_LITTERS_PER_LOCATION));
          let born = 0;
          for (let i = 0; i < litters; i++) born += randomInt(RABBIT_MIN_LITTER_SIZE, RABBIT_MAX_LITTER_SIZE);
          await createSmallHerbivoreOffspringMany(rabbitSpecies, location.id, born);
          rabbitBirths += born;
          regionBirths += born;
          rabbitCountsByLocationId.set(location.id, (rabbitCountsByLocationId.get(location.id) ?? rabbits.length) + born);
        }
      }

      if (mouseSpecies && canMouseReproduceThisTick && hasBreedingPair(mice, "mouse")) {
        const food = localFoodAmount(location);
        const breedingFemales = breedingFemaleCapacity(mice, "mouse");
        const birthChance = smallHerbivoreBirthChance({
          adults: adultMice,
          localCount: mice.length,
          food,
          predatorsInRegion,
          dangerLevel: effectiveLocationDanger(location.dangerLevel, location.creatures.length + (location._count?.players ?? 0), location.features),
          localSoftCap: MOUSE_LOCAL_SOFT_CAP,
          baseChance: 60,
        });

        if (birthChance > 0 && chance(birthChance)) {
          const litters = Math.max(1, Math.min(breedingFemales, MOUSE_MAX_LITTERS_PER_LOCATION));
          let born = 0;
          for (let i = 0; i < litters; i++) born += randomInt(MOUSE_MIN_LITTER_SIZE, MOUSE_MAX_LITTER_SIZE);
          await createSmallHerbivoreOffspringMany(mouseSpecies, location.id, born);
          mouseBirths += born;
          regionMouseBirths += born;
          mouseCountsByLocationId.set(location.id, (mouseCountsByLocationId.get(location.id) ?? mice.length) + born);
        }
      }

      const overgrazing = await consumeOvergrazedResources(location, rabbits.length + Math.ceil(mice.length / MOUSE_OVERGRAZING_PRESSURE_DIVISOR));
      if (overgrazing.consumed > 0) {
        overgrazedLocations++;
        overgrazedResources += overgrazing.consumed;
        depletedByOvergrazing += overgrazing.depleted;
        regionConsumed += overgrazing.consumed;
        if (overgrazing.depleted > 0) await maybeMarkLocationVegetationDepleted(location);
      }

      const spread = await spreadOvercrowdedAnimals(location, rabbits, rabbitCountsByLocationId, {
        everyTicks: RABBIT_SPREAD_EVERY_TICKS,
        localSoftCap: RABBIT_LOCAL_SOFT_CAP,
        maxSpread: RABBIT_MAX_SPREAD_PER_LOCATION,
        action: "розбігається від тиску зграї",
      });
      if (spread > 0) {
        rabbitsSpread += spread;
        regionSpread += spread;
      }

      const mouseSpread = await spreadOvercrowdedAnimals(location, mice, mouseCountsByLocationId, {
        everyTicks: MOUSE_SPREAD_EVERY_TICKS,
        localSoftCap: MOUSE_LOCAL_SOFT_CAP,
        maxSpread: MOUSE_MAX_SPREAD_PER_LOCATION,
        action: "розбігається тонкими стежками між корінням",
      });
      if (mouseSpread > 0) {
        miceSpread += mouseSpread;
        regionMiceSpread += mouseSpread;
      }
    }

    if (regionBirths > 0) {
      const title = predatorsInRegion > 0 ? "Зайці розмножуються під тиском хижаків" : "Зайці розмножуються без стриму";
      const description = predatorsInRegion > 0
        ? `У регіоні «${region.name}» народилося зайченят: ${regionBirths}. Хижаки ще тримають популяцію в напрузі.`
        : `У регіоні «${region.name}» народилося зайченят: ${regionBirths}. Хижацького тиску майже немає, тож кущі дедалі частіше ворушаться.`;
      await prisma.worldEvent.create({ data: { type: "SYSTEM", title, description, locationId: region.locations[0]?.id } });
    }

    if (regionConsumed > 0) {
      await prisma.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: "Зайці об'їдають підлісок",
          description: `У регіоні «${region.name}» надмірна кількість зайців з'їла ресурсів: ${regionConsumed}. Трави, ягоди й гриби відновлюватимуться повільніше, якщо тиск не спаде.`,
          locationId: region.locations[0]?.id,
        },
      });
    }

    if (regionSpread > 0) {
      await prisma.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: "Зайці розбігаються",
          description: `У регіоні «${region.name}» перенаселені зайці розійшлися в сусідні місцини: ${regionSpread}. Без хижаків вони поступово займають нові клітинки.`,
          locationId: region.locations[0]?.id,
        },
      });
    }

    if (regionMouseBirths > 0) {
      await prisma.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: "Миші швидко множаться",
          description: `У регіоні «${region.name}» народилося мишенят: ${regionMouseBirths}. Їхній цикл коротший за заячий, тож популяція реагує швидше.`,
          locationId: region.locations[0]?.id,
        },
      });
    }

    if (regionMiceSpread > 0) {
      await prisma.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: "Миші розбігаються",
          description: `У регіоні «${region.name}» перенаселені миші перейшли в сусідні місцини: ${regionMiceSpread}.`,
          locationId: region.locations[0]?.id,
        },
      });
    }
  }

  return { rabbitBirths, mouseBirths, rabbitsSpread, miceSpread, overgrazedLocations, overgrazedResources, depletedByOvergrazing };
}

function preyUnitsForFox(creatures: any[]) {
  return creatures.reduce((sum, creature) => {
    if (creature.species.key === "mouse") return sum + 1;
    if (creature.species.key === "rabbit") return sum + 4;
    return sum;
  }, 0);
}

function preyUnitsForWolf(creatures: any[]) {
  return creatures.reduce((sum, creature) => creature.species.key === "rabbit" ? sum + 4 : sum, 0);
}

async function createPredatorOffspringMany(species: any, locationId: number, count: number) {
  const maxHp = Math.max(1, Math.round(species.baseHp * STAGE_HP_MULTIPLIER.CHILD));
  if (count <= 0) return;
  await prisma.creature.createMany({
    data: Array.from({ length: count }, () => ({
      speciesId: species.id,
      locationId,
      hp: maxHp,
      maxHp,
      hunger: 0,
      stamina: BASE_STAMINA,
      staminaMax: BASE_STAMINA,
      fatigueState: "RESTED",
      activity: "IDLE",
      currentAction: species.key === "wolf" ? "народилося й тримається лігва" : "народилося й ховається біля нори",
      age: "CHILD",
      ageTicks: 0,
      sex: Math.random() < 0.5 ? "MALE" : "FEMALE",
      isAlive: true,
      isGone: false,
      isHidden: false,
    })),
  });
}

async function processPredatorReproduction() {
  const canFoxReproduce = tickNumber > 0 && tickNumber % FOX_REPRODUCTION_EVERY_TICKS === 0;
  const canWolfReproduce = tickNumber > 0 && tickNumber % WOLF_REPRODUCTION_EVERY_TICKS === 0;

  const [foxSpecies, wolfSpecies, regions] = await Promise.all([
    prisma.creatureSpecies.findUnique({ where: { key: "fox" } }),
    prisma.creatureSpecies.findUnique({ where: { key: "wolf" } }),
    prisma.region.findMany({
      include: {
        locations: {
          include: {
            creatures: { where: { isAlive: true, isGone: false }, include: { species: true } },
          },
        },
      },
    }),
  ]);

  let foxBirths = 0;
  let wolfBirths = 0;
  let foxPreyUnits = 0;
  let wolfPreyUnits = 0;

  for (const region of regions) {
    const creatures = region.locations.flatMap((location) => location.creatures);
    const foxes = creatures.filter((creature: any) => creature.species.key === "fox");
    const wolves = creatures.filter((creature: any) => creature.species.key === "wolf");
    const regionFoxPreyUnits = preyUnitsForFox(creatures);
    const regionWolfPreyUnits = preyUnitsForWolf(creatures);
    foxPreyUnits += regionFoxPreyUnits;
    wolfPreyUnits += regionWolfPreyUnits;

    if (foxSpecies && canFoxReproduce && hasBreedingPair(foxes, "fox")) {
      const required = FOX_PREY_UNITS_REQUIRED_BASE + foxes.length * FOX_PREY_UNITS_REQUIRED_PER_FOX;
      const den = region.locations.find((location: any) => location.biome === "FOREST" || location.biome === "DEEP_FOREST") ?? region.locations[0];
      if (den && regionFoxPreyUnits >= required && chance(25)) {
        const born = randomInt(FOX_MIN_LITTER_SIZE, FOX_MAX_LITTER_SIZE);
        await createPredatorOffspringMany(foxSpecies, den.id, born);
        foxBirths += born;
        await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Лисиці вивели лисенят", description: `У регіоні «${region.name}» народилося лисенят: ${born}. Prey units: ${regionFoxPreyUnits}/${required}.`, locationId: den.id } });
      }
    }

    if (wolfSpecies && canWolfReproduce && hasBreedingPair(wolves, "wolf")) {
      const required = WOLF_PREY_UNITS_REQUIRED_BASE + wolves.length * WOLF_PREY_UNITS_REQUIRED_PER_WOLF;
      const den = region.locations.find((location: any) => location.biome === "DEEP_FOREST") ?? null;
      if (den && regionWolfPreyUnits >= required && chance(10)) {
        const born = randomInt(WOLF_MIN_LITTER_SIZE, WOLF_MAX_LITTER_SIZE);
        await createPredatorOffspringMany(wolfSpecies, den.id, born);
        wolfBirths += born;
        await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Вовки вивели вовченят", description: `У регіоні «${region.name}» народилося вовченят: ${born}. Prey units: ${regionWolfPreyUnits}/${required}.`, locationId: den.id } });
      }
    }
  }

  return { foxBirths, wolfBirths, foxPreyUnits, wolfPreyUnits };
}

async function killAnimalFromOldAge(creature: any) {
  await prisma.worldAction.updateMany({
    where: { actorType: "CREATURE", creatureId: creature.id, status: { in: ["QUEUED", "RUNNING"] } },
    data: { status: "CANCELLED" },
  });

  const killed = await prisma.creature.updateMany({
    where: { id: creature.id, isAlive: true, isGone: false },
    data: {
      isAlive: false,
      age: "CORPSE",
      hp: 0,
      diedAtTick: tickNumber,
      corpseDecayTicksLeft: creature.species.corpseDecayTicks,
      activity: "RESTING",
      currentAction: "лежить нерухомо",
    },
  });
  if (killed.count === 0) return;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Тварина померла від старості",
      description: `${creature.species.name} помирає від старості. Труп лишається в місцині на ${creature.species.corpseDecayTicks} тіків.`,
      locationId: creature.locationId,
    },
  });
}

function jsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function expiredOpenUntil(data: Record<string, unknown>, now = Date.now()) {
  const openUntil = typeof data.open_until === "string" ? data.open_until : typeof data.openUntil === "string" ? data.openUntil : null;
  if (!openUntil) return null;
  const ms = Date.parse(openUntil);
  return Number.isFinite(ms) && ms <= now ? openUntil : null;
}

async function closeExpiredDreamGates(bot?: Bot | null) {
  const features = await prisma.locationFeature.findMany({
    where: { key: { in: [...DREAM_GATE_FEATURE_KEYS] }, isActive: true },
    select: {
      key: true,
      id: true,
      locationId: true,
      data: true,
    },
  });
  let closed = 0;
  const message = "Дрімота торкається Брами Сну, і дошки знову сходяться без звуку. Прохід замикається з обох боків, доки його знову не покличуть.";
  const notifyLocationIds = new Set<number>();

  for (const feature of features) {
    const data = jsonObject(feature.data);
    const openUntil = expiredOpenUntil(data);
    if (!openUntil || data.last_closed_open_until === openUntil) continue;

    const nextData = { ...data };
    delete nextData.open_until;
    delete nextData.openUntil;
    nextData.closed_at = new Date().toISOString();
    nextData.last_closed_open_until = openUntil;

    await prisma.locationFeature.update({
      where: { id: feature.id },
      data: { data: nextData as Prisma.InputJsonValue },
    });

    if (feature.key === DREAM_GATE_FEATURE_KEY) await prisma.worldEvent.create({
      data: {
        type: "NPC_SAY",
        title: "Дрімота замикає Браму Сну",
        description: message,
        locationId: feature.locationId,
      },
    });

    if (bot && feature.key === DREAM_GATE_FEATURE_KEY) {
      notifyLocationIds.add(feature.locationId);
      const pairedExits = await prisma.locationExit.findMany({
        where: { fromLocationId: feature.locationId, direction: { in: ["NORTH", "SOUTH"] } },
        select: { toLocationId: true },
      });
      for (const exit of pairedExits) {
        if (exit.toLocationId && exit.toLocationId !== feature.locationId) notifyLocationIds.add(exit.toLocationId);
      }
    }
    closed++;
  }

  if (bot) {
    for (const locationId of notifyLocationIds) {
      await notifyLocationAll(bot, locationId, message);
    }
  }

  return closed;
}

async function killAnimalFromStarvation(creature: any) {
  await prisma.worldAction.updateMany({
    where: { actorType: "CREATURE", creatureId: creature.id, status: { in: ["QUEUED", "RUNNING"] } },
    data: { status: "CANCELLED" },
  });

  const killed = await prisma.creature.updateMany({
    where: { id: creature.id, isAlive: true, isGone: false },
    data: {
      isAlive: false,
      age: "CORPSE",
      hp: 0,
      diedAtTick: tickNumber,
      corpseDecayTicksLeft: creature.species.corpseDecayTicks,
      activity: "RESTING",
      currentAction: "загинуло від голоду",
    },
  });
  if (killed.count === 0) return;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Animal starved",
      description: `${creature.name ?? creature.species.name} загинуло від голоду. Труп лишається в місцині на ${creature.species.corpseDecayTicks} тіків.`,
      locationId: creature.locationId,
    },
  });
}

async function ageLivingAnimal(creature: any) {
  if (creature.hunger >= CREATURE_STARVATION_HUNGER_THRESHOLD) {
    const extraHunger = creature.hunger - CREATURE_STARVATION_HUNGER_THRESHOLD;
    const deathChance = CREATURE_STARVATION_BASE_CHANCE_PERMILLE + extraHunger * CREATURE_STARVATION_EXTRA_CHANCE_PER_HUNGER_PERMILLE;
    if (chancePermille(deathChance)) {
      await killAnimalFromStarvation(creature);
      return "starved";
    }
  }

  const nextAgeTicks = creature.ageTicks + 1;
  const nextStage = stageFor(creature, nextAgeTicks);
  const nextMaxHp = stageMaxHp(creature, nextStage);

  const data: any = {
    ageTicks: nextAgeTicks,
    age: nextStage,
    hp: Math.min(creature.hp, nextMaxHp),
  };

  if (nextStage === "OLD") {
    const childEnd = creature.species.childTicks;
    const youngEnd = childEnd + creature.species.youngTicks;
    const adultEnd = youngEnd + creature.species.adultTicks;
    const oldTicks = Math.max(0, nextAgeTicks - adultEnd);
    const deathChance = creature.species.oldDeathChancePermille + oldTicks * creature.species.oldDeathChanceGrowthPermille;

    if (chancePermille(deathChance)) {
      await killAnimalFromOldAge(creature);
      return "died";
    }
  }

  const aged = await prisma.creature.updateMany({ where: { id: creature.id, isAlive: true, isGone: false }, data });
  if (aged.count === 0) return "same";
  return nextStage !== creature.age ? "aged" : "same";
}

async function decayCorpse(creature: any) {
  const decayLeft = creature.corpseDecayTicksLeft ?? creature.species.corpseDecayTicks;
  const carriedByPlayerId = carriedCorpseOwnerId(creature.currentAction);
  const hunterClaimedAction = hunterClaimedCorpseDecayAction(creature.currentAction, Math.max(0, decayLeft - 1));
  const predatorClaimedAction = predatorClaimedCorpseDecayAction(creature.currentAction, Math.max(0, decayLeft - 1));

  if (decayLeft > 1) {
    const nextDecayLeft = decayLeft - 1;
    const decayed = await prisma.creature.updateMany({
      where: { id: creature.id, isAlive: false, isGone: false },
      data: {
        age: "CORPSE",
        isAlive: false,
        corpseDecayTicksLeft: nextDecayLeft,
        currentAction: carriedByPlayerId ? carriedCorpseAction(carriedByPlayerId, nextDecayLeft) : hunterClaimedAction ?? predatorClaimedAction ?? `розкладається; залишилось ${nextDecayLeft} тіків`,
      },
    });
    if (decayed.count === 0) return "gone";
    return "decaying";
  }

  let mushroomBonus = 0;
  if (!carriedByPlayerId) {
    const mushrooms = await prisma.resourceNode.findFirst({ where: { locationId: creature.locationId, resourceType: { key: "mushrooms" } } });
    if (mushrooms) {
      mushroomBonus = creature.species.mushroomBonusOnDecay;
      await prisma.resourceNode.updateMany({ where: { id: mushrooms.id }, data: { amount: Math.min(mushrooms.maxAmount, mushrooms.amount + mushroomBonus) } });
    }
  }

  const gone = await prisma.creature.updateMany({ where: { id: creature.id, isAlive: false, isGone: false }, data: { isGone: true, corpseDecayTicksLeft: 0, currentAction: "зникло, лишивши слід у землі" } });
  if (gone.count === 0) return "gone";
  if (carriedByPlayerId) await removeDecayedCorpseFromInventory(carriedByPlayerId, creature);
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Труп зник",
      description: carriedByPlayerId
        ? `Підібраний труп істоти «${creature.name ?? creature.species.name}» остаточно зіпсувався й зник із речей.`
        : `Труп істоти «${creature.name ?? creature.species.name}» зник. Гриби в цій місцині отримали +${mushroomBonus}.`,
      locationId: creature.locationId,
    },
  });
  return "gone";
}

async function processAnimalLifecycle() {
  const livingAnimals = await prisma.creature.findMany({ where: { isAlive: true, isGone: false, species: { kind: "ANIMAL" } }, include: { species: true } });
  const corpses = await prisma.creature.findMany({ where: { isAlive: false, isGone: false, species: { kind: "ANIMAL" } }, include: { species: true } });
  let aged = 0, died = 0, starved = 0, decayed = 0, gone = 0;

  for (const creature of livingAnimals) {
    const result = await ageLivingAnimal(creature);
    if (result === "died") died++;
    else if (result === "starved") starved++;
    else if (result === "aged") aged++;
  }

  for (const creature of corpses) {
    const result = await decayCorpse(creature);
    if (result === "gone") gone++;
    else decayed++;
  }

  return { aged, died, starved, decayed, gone };
}

async function queueMove(c: any, exit: LocationExit, reason: string) {
  await enqueueCreatureAction({ creatureId: c.id, type: "MOVE", payload: { direction: exit.direction as Direction, reason }, durationMs: movementDurationMs(exit.travelCost, c.stamina) });
  return "queuedMove";
}

async function tickCampSpiritCat(c: any, daypart: WorldDaypart) {
  if (!isCampSpiritCatLocationKey(c.location?.key)) {
    const fallback = await prisma.cellLocation.findUnique({
      where: { key: CAMP_SPIRIT_CAT_START_LOCATION_KEY },
      select: { id: true },
    });
    if (fallback) {
      await prisma.creature.updateMany({
        where: { id: c.id },
        data: {
          locationId: fallback.id,
          activity: "LOOKING",
          currentAction: "повертається до межового вогню",
        },
      });
      await prisma.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: "Camp spirit cat returned to camp",
          description: `creature=${c.id}; from=${c.location?.key ?? c.locationId}; to=${CAMP_SPIRIT_CAT_START_LOCATION_KEY}`,
          locationId: fallback.id,
        },
      });
    }
    return "stoodDown";
  }

  const [localMouse, hasActiveCampfire] = await Promise.all([
    prisma.creature.findFirst({
      where: {
        locationId: c.locationId,
        isAlive: true,
        isGone: false,
        isHidden: false,
        species: { key: "mouse" },
      },
      orderBy: [
        { hp: "asc" },
        { id: "asc" },
      ],
      select: { id: true },
    }),
    Promise.resolve(Boolean(c.location.features?.some((feature: any) => feature.type === "MAGIC_CAMPFIRE" && feature.providesLight))),
  ]);
  const hasLocalMice = Boolean(localMouse);

  if (localMouse && campSpiritCatMouseBehaviorPlan({ hasLocalMice }) === "pounce") {
    await enqueueCreatureAction({
      creatureId: c.id,
      type: "ATTACK",
      payload: { targetType: "creature", targetId: localMouse.id, mode: "mystery" },
      durationMs: actionDurationMs("ATTACK", c.stamina),
    });
    return "queuedAttack";
  }

  const campExits = c.location.exitsFrom.filter((exit: any) => isExit(exit) && isCampSpiritCatAllowedExit(exit));
  const exit = pick(campExits);
  if (!campSpiritCatShouldPrioritizeLocalMice({ hasLocalMice }) && isExit(exit) && chance(45)) {
    const reason = exit.direction === "UP"
      ? "безшумно підіймається над табором"
      : "спускається ближче до межового вогню";
    return queueMove(c, exit, reason);
  }

  const reason = campSpiritCatWatchPosture({
    locationKey: c.location?.key,
    daypart,
    hasLocalMice,
    hasActiveCampfire,
  });

  await enqueueCreatureAction({
    creatureId: c.id,
    type: "LOOK",
    payload: { reason },
    durationMs: actionDurationMs("LOOK", c.stamina),
  });
  return "queuedLook";
}

async function tickHerbivore(c: any, localPresenceCount: number) {
  const hasFood = c.location.resources.some((r: any) => r.amount > 0 && isEdibleResourceKey(r.resourceType.key));
  const exhausted = c.location.features?.some((feature: any) => feature.isActive && String(feature.key).startsWith(DEPLETED_VEGETATION_FEATURE_PREFIX));
  const pressureMoveChance = herbivorePressureMoveChance(localPresenceCount, c.location.features);
  const hunger = Math.max(0, c.hunger ?? 0);
  const hungry = hunger >= 3;
  const starving = hunger >= Math.floor(CREATURE_STARVATION_HUNGER_THRESHOLD * 0.75);

  if (pressureMoveChance > 0 && chance(pressureMoveChance)) {
    const exit = pick(creatureUsableExits(c, c.location.exitsFrom));
    const reason = recentAttackHerbivoreMoveBonus(c.location.features) > 0 ? "лякається недавнього нападу" : "уникає тисняви й надто людного місця";
    if (isExit(exit)) return queueMove(c, exit, reason);
  }

  if (hasFood && hunger > 0 && (starving || chance(hungry ? 85 : 60))) {
    await enqueueCreatureAction({ creatureId: c.id, type: "EAT", payload: {}, durationMs: actionDurationMs("EAT", c.stamina) });
    return "queuedEat";
  }

  if (!hasFood || exhausted || starving || chance(hungry ? 75 : 50)) {
    const exit = pick(creatureUsableExits(c, c.location.exitsFrom));
    if (isExit(exit)) return queueMove(c, exit, "шукає їжу");
  }

  await enqueueCreatureAction({ creatureId: c.id, type: "LOOK", payload: {}, durationMs: actionDurationMs("LOOK", c.stamina) });
  return "queuedLook";
}

async function tickCarnivore(c: any) {
  const hunger = Math.max(0, c.hunger ?? 0);
  const hungry = hunger >= 3;
  const starving = hunger >= Math.floor(CREATURE_STARVATION_HUNGER_THRESHOLD * 0.75);
  const claimedCorpse = await prisma.creature.findFirst({
    where: {
      locationId: c.locationId,
      isAlive: false,
      isGone: false,
      isHidden: false,
      age: "CORPSE",
      currentAction: { contains: predatorClaimedCorpseMarker(c.id) },
    },
    include: { species: true },
    orderBy: { id: "asc" },
  });
  if (claimedCorpse) {
    await enqueueCreatureAction({
      creatureId: c.id,
      type: "EAT",
      payload: { corpseId: claimedCorpse.id },
      durationMs: actionDurationMs("EAT", c.stamina),
      interruptQueued: true,
    });
    return "queuedEat";
  }

  if (starving || (hungry && chance(70))) {
    const localCorpses = await prisma.creature.findMany({
      where: {
        locationId: c.locationId,
        isAlive: false,
        isGone: false,
        isHidden: false,
        age: "CORPSE",
        species: { kind: "ANIMAL", diet: "HERBIVORE" },
      },
      include: { species: true },
      orderBy: { id: "asc" },
      take: 8,
    });
    const scavengableCorpse = localCorpses.find((corpse) => isUnclaimedHerbivoreCorpseForScavenging(corpse));
    if (scavengableCorpse) {
      await enqueueCreatureAction({
        creatureId: c.id,
        type: "EAT",
        payload: { corpseId: scavengableCorpse.id, scavengeCorpse: true },
        durationMs: actionDurationMs("EAT", c.stamina),
        interruptQueued: true,
      });
      return "queuedEat";
    }

    const stealableCorpse = await prisma.creature.findFirst({
      where: {
        locationId: c.locationId,
        isAlive: false,
        isGone: false,
        isHidden: false,
        age: "CORPSE",
        currentAction: { contains: PREDATOR_PREY_CLAIM_PREFIX },
      },
      include: { species: true },
      orderBy: { id: "asc" },
    });
    if (stealableCorpse) {
      await enqueueCreatureAction({
        creatureId: c.id,
        type: "EAT",
        payload: { corpseId: stealableCorpse.id, stealPredatorPrey: true },
        durationMs: actionDurationMs("EAT", c.stamina),
        interruptQueued: true,
      });
      return "queuedEat";
    }
  }

  if (c.species.key === "owl" && isStarterCampOwlSafeLocationKey(c.location?.key)) {
    const exit = pick(creatureUsableExits(c, c.location.exitsFrom)
      .filter((candidate: any) => !isStarterCampOwlSafeLocationKey(candidate.toLocation?.key)));
    if (isExit(exit)) return queueMove(c, exit, "відступає від межового вогню");
    await enqueueCreatureAction({
      creatureId: c.id,
      type: "LOOK",
      payload: { reason: "мовчки тримається осторонь табору" },
      durationMs: actionDurationMs("LOOK", c.stamina),
    });
    return "queuedLook";
  }

  const prey = await selectPredatorPrey(c);
  if (prey) {
    if (starving || chance(predatorAttackChance(c, prey))) {
      await enqueueCreatureAction({
        creatureId: c.id,
        type: "ATTACK",
        payload: { targetType: "creature", targetId: prey.id, mode: "mystery" },
        durationMs: actionDurationMs("ATTACK", c.stamina),
        interruptQueued: true,
      });
      return "queuedAttack";
    }

    await enqueueCreatureAction({ creatureId: c.id, type: "LOOK", payload: { targetType: "creature", targetId: prey.id }, durationMs: actionDurationMs("LOOK", c.stamina) });
    return "queuedLook";
  }

  if (starving || chance(hungry ? 80 : 50)) {
    const exit = pick(creatureUsableExits(c, c.location.exitsFrom));
    if (isExit(exit)) return queueMove(c, exit, hungry ? "шукає здобич" : "патрулює");
  }

  await enqueueCreatureAction({ creatureId: c.id, type: "REST", payload: {}, durationMs: actionDurationMs("REST", c.stamina) });
  return "queuedRest";
}

function preyVulnerabilityScore(prey: any) {
  const ageScore: Record<CreatureAge, number> = {
    CHILD: 45,
    YOUNG: 25,
    ADULT: 0,
    OLD: 20,
    CORPSE: -200,
  };
  const hpRatio = prey.maxHp > 0 ? prey.hp / prey.maxHp : 1;
  const woundedScore = Math.round((1 - hpRatio) * 35);
  return (ageScore[prey.age as CreatureAge] ?? 0) + woundedScore - Math.max(0, prey.species.agility - 5) * 2;
}

export function predatorPreyPreference(predator: any, prey: any) {
  if (predator.species.key === "owl") {
    if (prey.species.key === "mouse") return 100;
    if (prey.species.key === "rabbit" && prey.age === "CHILD") return 18;
    if (prey.species.key === "rabbit" && prey.age === "YOUNG") return 8;
    return 0;
  }
  if (predator.species.key === "fox") {
    if (prey.species.key === "mouse") return 80;
    if (prey.species.key === "rabbit") return 35;
  }
  if (predator.species.key === "wolf") {
    if (prey.species.key === "rabbit") return 70;
    if (prey.species.key === "mouse") return 5;
  }
  return 25;
}

async function selectPredatorPrey(c: any) {
  const prey = await prisma.creature.findMany({
    where: { isAlive: true, isGone: false, locationId: c.locationId, species: { diet: "HERBIVORE" } },
    include: { species: true },
  });
  return prey
    .map((target) => ({ target, preference: predatorPreyPreference(c, target) }))
    .filter(({ preference }) => c.species.key !== "owl" || preference > 0)
    .map(({ target, preference }) => ({ target, score: preference + preyVulnerabilityScore(target) + Math.floor(Math.random() * 12) }))
    .sort((a, b) => b.score - a.score)[0]?.target;
}

export function predatorAttackChance(predator: any, prey: any) {
  const hungerBonus = Math.min(25, Math.max(0, predator.hunger ?? 0) * 3);
  const strengthGap = Math.max(-20, Math.min(25, (predator.species.strength - prey.species.endurance) * 4));
  const vulnerabilityBonus = Math.max(0, Math.min(20, Math.round(preyVulnerabilityScore(prey) / 3)));
  const speciesBase = predator.species.key === "wolf" ? 45 : predator.species.key === "owl" ? 42 : predator.species.key === "fox" ? 38 : 35;
  return Math.max(12, Math.min(85, speciesBase + hungerBonus + strengthGap + vulnerabilityBonus));
}

type DepletedRegionResource = { regionId: number; regionName: string; resourceKey: string; resourceName: string; locationId: number };

function lisovykDepletionPhrase(resourceKey: string, resourceName: string) {
  if (resourceKey === "grass") return "де вся трава";
  if (["berries", "herbs", "mushrooms"].includes(resourceKey)) return `де всі ${resourceName}`;
  return `де весь запас «${resourceName}»`;
}

function lisovykWakeText(resourceKey: string, resourceName: string) {
  return `Дід лісовик гарчить:\nО, ${lisovykDepletionPhrase(resourceKey, resourceName)}? Хто винищив це до нуля?!`;
}

function lisovykSleepText(resourceName?: string) {
  const resourcePart = resourceName ? `«${resourceName}» знову є в лісі` : "виснажені ресурси знову є в лісі";
  return `Дід лісовик гарчить:\n${resourcePart}. Йду спати, але стережіться там.`;
}

function lisovykDepletionMarker(depleted: Pick<DepletedRegionResource, "regionId" | "resourceKey">) {
  return `region=${depleted.regionId}; resource=${depleted.resourceKey}`;
}

function lisovykNoticeTick(description?: string | null) {
  const match = String(description ?? "").match(/tick=(\d+)/);
  return match ? Number(match[1]) : null;
}

async function findRegionDepletedResource(): Promise<DepletedRegionResource | null> {
  const regions = await prisma.region.findMany({
    include: {
      locations: {
        include: {
          resources: { include: { resourceType: true } },
          features: { where: { isActive: true, type: "MAGIC_CAMPFIRE" } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  for (const region of regions) {
    if (isLisovykForbiddenRegion(region)) continue;
    const locations = filterLisovykAllowedLocations(region.locations.map((location) => ({ ...location, region })));
    if (!locations.length) continue;
    const resourceKeys = new Set<string>();
    for (const location of locations) {
      for (const node of location.resources) {
        if (!LISOVYK_IGNORED_DEPLETION_RESOURCE_KEYS.has(node.resourceType.key)) resourceKeys.add(node.resourceType.key);
      }
    }
    for (const resourceKey of resourceKeys) {
      const nodes = locations.flatMap((location) => location.resources.filter((node) => node.resourceType.key === resourceKey));
      const total = nodes.reduce((sum, node) => sum + node.amount, 0);
      if (total > 0) continue;
      const location = locations[0];
      if (!location) continue;
      return { regionId: region.id, regionName: region.name, resourceKey, resourceName: nodes[0]?.resourceType.name ?? resourceKey, locationId: location.id };
    }
  }
  return null;
}

async function lisovykWakeDelayElapsed(depleted: DepletedRegionResource) {
  const marker = lisovykDepletionMarker(depleted);
  const notice = await prisma.worldEvent.findFirst({
    where: { type: "SYSTEM", title: LISOVYK_DEPLETION_NOTICE_TITLE, description: { contains: marker } },
    orderBy: { createdAt: "desc" },
  });
  const resolved = await prisma.worldEvent.findFirst({
    where: { type: "SYSTEM", title: LISOVYK_DEPLETION_RESOLVED_TITLE, description: { contains: marker } },
    orderBy: { createdAt: "desc" },
  });
  const noticeIsStale = Boolean(notice && resolved && resolved.createdAt > notice.createdAt);
  const noticedAtTick = noticeIsStale ? null : lisovykNoticeTick(notice?.description);

  if (noticedAtTick == null) {
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: LISOVYK_DEPLETION_NOTICE_TITLE,
        description: `${marker}; tick=${tickNumber}; resourceName=${depleted.resourceName}`,
        locationId: depleted.locationId,
      },
    });
    return false;
  }

  return tickNumber - noticedAtTick >= LISOVYK_WAKE_DELAY_TICKS;
}

async function wakeLisovykIfNeeded() {
  const depleted = await findRegionDepletedResource();
  if (!depleted) return false;
  if (!(await lisovykWakeDelayElapsed(depleted))) return false;
  const species = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" } });
  if (!species) return false;
  const existing = await prisma.creature.findFirst({ where: { speciesId: species.id, name: { in: ["Дід лісовик", "Дід Чорноліс"] } } });
  if (existing?.isAlive && !existing.isHidden && existing.activity !== "SLEEPING") return false;
  const action = `полює через те, що в регіоні зник ресурс ${depleted.resourceKey}`;
  if (existing) await prisma.creature.updateMany({ where: { id: existing.id }, data: { isAlive: true, isGone: false, locationId: depleted.locationId, hp: species.baseHp, name: "Дід лісовик", isHidden: false, activity: "LOOKING", currentAction: action } });
  else await prisma.creature.create({
  data: {
    speciesId: species.id,
    name: "Дід лісовик",
    locationId: depleted.locationId,
    hp: species.baseHp,
    isHidden: false,
    activity: "LOOKING",
    currentAction: action,
  },
});
  const message = lisovykWakeText(depleted.resourceKey, depleted.resourceName);
  await prisma.worldEvent.create({ data: { type: "NPC_SAY", title: "Лісовик прокинувся", description: `У регіоні «${depleted.regionName}» зник ресурс «${depleted.resourceName}». ${message}`, locationId: depleted.locationId } });
  if (botInstance) await notifyRegion(botInstance, depleted.regionId, `🌲 Дід лісовик прокинувся.\n\n${message}`);
  return true;
}

async function markLisovykDepletionResolved(node: { amount: number; locationId: number; location: { regionId: number }; resourceType: { key: string; name: string } }) {
  if (node.amount > 0 || LISOVYK_IGNORED_DEPLETION_RESOURCE_KEYS.has(node.resourceType.key)) return;
  const marker = lisovykDepletionMarker({ regionId: node.location.regionId, resourceKey: node.resourceType.key });
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: LISOVYK_DEPLETION_RESOLVED_TITLE,
      description: `${marker}; tick=${tickNumber}; resourceName=${node.resourceType.name}`,
      locationId: node.locationId,
    },
  });
}

async function putLisovykToSleepIfForestRecovered() {
  const species = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" } });
  if (!species) return false;
  const lisovyk = await prisma.creature.findFirst({ where: { speciesId: species.id, name: { in: ["Дід лісовик", "Дід Чорноліс"] }, isAlive: true }, include: { location: true } });
  const match = lisovyk?.currentAction?.match(/зник ресурс ([a-zA-Z0-9_-]+)/);
  if (!lisovyk || lisovyk.isHidden || lisovyk.activity === "SLEEPING") return false;
  const resourceKey = match?.[1];
  const regionId = lisovyk.location.regionId;
  if (resourceKey) {
    const total = await prisma.resourceNode.aggregate({ where: { location: { regionId }, resourceType: { key: resourceKey } }, _sum: { amount: true } });
    if ((total._sum.amount ?? 0) <= 0) return false;
  } else if (await findRegionDepletedResource()) {
    return false;
  }
  const resource = resourceKey ? await prisma.resourceType.findUnique({ where: { key: resourceKey } }) : null;
  await prisma.worldAction.updateMany({ where: { actorType: "CREATURE", creatureId: lisovyk.id, status: { in: ["QUEUED", "RUNNING"] } }, data: { status: "CANCELLED" } });
  const slept = await prisma.creature.updateMany({ where: { id: lisovyk.id, isAlive: true }, data: { isAlive: true, isHidden: true, activity: "SLEEPING", currentAction: resourceKey ? `спить: ресурс ${resourceKey} відновився` : "спить: виснажені ресурси відновилися" } });
  if (slept.count === 0) return false;
  const message = lisovykSleepText(resource?.name ?? resourceKey);
  await prisma.worldEvent.create({ data: { type: "NPC_SAY", title: "Лісовик заснув", description: message, locationId: lisovyk.locationId } });
  if (botInstance) await notifyRegion(botInstance, regionId, `🌲 Дід лісовик засинає.\n\n${message}`);
  return true;
}

async function regenerateResourcesIfNeeded() {
  if (tickNumber === 0) return 0;
  const nodes = await prisma.resourceNode.findMany({
    where: { amount: { gt: -1 } },
    include: {
      resourceType: true,
      location: { include: { features: { where: { isActive: true } }, region: { select: { key: true } } } },
    },
  });
  let regenerated = 0;
  for (const node of nodes) {
    if (isStarterCampRegionKey(node.location.region?.key)) continue;
    if (node.amount >= node.maxAmount) continue;
    const isExhausted = node.location.features.some((feature) => String(feature.key).startsWith(DEPLETED_VEGETATION_FEATURE_PREFIX));
    const interval = isExhausted
      ? EXHAUSTED_LOCATION_REGEN_EVERY_TICKS
      : node.resourceType.key === "grass"
        ? GRASS_REGEN_EVERY_TICKS
        : RESOURCE_REGEN_EVERY_TICKS;
    if (tickNumber % interval !== 0) continue;
    const updated = await prisma.resourceNode.updateMany({ where: { id: node.id }, data: { amount: Math.min(node.maxAmount, node.amount + RESOURCE_REGEN_AMOUNT) } });
    if (updated.count > 0) {
      regenerated++;
      await markLisovykDepletionResolved(node);
      if (isExhausted && node.resourceType.key === "grass" && node.amount + RESOURCE_REGEN_AMOUNT >= Math.ceil(node.maxAmount / 4)) {
        await prisma.locationFeature.updateMany({
          where: { locationId: node.locationId, key: { startsWith: DEPLETED_VEGETATION_FEATURE_PREFIX } },
          data: { isActive: false },
        });
      }
    }
  }
  if (regenerated > 0) await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Ресурси відновлюються", description: `Ліс повільно відновив ${regenerated} ресурсних вузлів: +${RESOURCE_REGEN_AMOUNT}.` } });
  return regenerated;
}

async function regenerateNaturalTwigsIfNeeded() {
  const interval = naturalTwigsRegenEveryTicks();
  if (tickNumber === 0 || tickNumber % interval !== 0) return 0;

  const twigs = await prisma.resourceType.findUnique({ where: { key: NATURAL_TWIGS_RESOURCE_KEY } });
  if (!twigs) return 0;

  const locations = await prisma.cellLocation.findMany({
    where: {
      z: 0,
      region: { key: { in: [...NATURAL_TWIGS_REGION_KEYS] } },
    },
    select: {
      id: true,
      region: { select: { key: true } },
      resources: {
        where: { resourceTypeId: twigs.id },
        select: { id: true, amount: true },
        take: 1,
      },
    },
    orderBy: { id: "asc" },
  });

  let regenerated = 0;
  for (const location of locations) {
    if (!isNaturalTwigsLocation(location)) continue;
    if (!shouldRegenerateNaturalTwigsInLocation(location.id, tickNumber, interval)) continue;

    const node = location.resources[0];
    if (node) {
      if (node.amount >= NATURAL_TWIGS_MAX_AMOUNT) continue;
      const updated = await prisma.resourceNode.updateMany({
        where: { id: node.id, amount: { lt: NATURAL_TWIGS_MAX_AMOUNT } },
        data: { amount: Math.min(NATURAL_TWIGS_MAX_AMOUNT, node.amount + 1), maxAmount: Math.max(NATURAL_TWIGS_MAX_AMOUNT, node.amount + 1) },
      });
      if (updated.count > 0) regenerated++;
      continue;
    }

    await prisma.resourceNode.create({
      data: {
        locationId: location.id,
        resourceTypeId: twigs.id,
        amount: 1,
        maxAmount: NATURAL_TWIGS_MAX_AMOUNT,
      },
    });
    regenerated++;
  }

  if (regenerated > 0) {
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Хмиз осипався",
        description: `Ліс подекуди скинув сухе гілля: оновлено ${regenerated} місцин, не вище ${NATURAL_TWIGS_MAX_AMOUNT} хмизу природним поповненням.`,
      },
    });
  }
  return regenerated;
}

export async function worldTick() {
  if (running) return;
  running = true;
  let queuedMove = 0, queuedGather = 0, queuedEat = 0, queuedLook = 0, queuedSay = 0, queuedRest = 0, queuedAttack = 0, stoodDown = 0, skippedBusy = 0, errors = 0, regenerated = 0;
  let creatureCandidates = 0, creatureProcessed = 0, creatureDeferred = 0, creatureProtected = 0;
  let aged = 0, oldAgeDeaths = 0, starvationDeaths = 0, corpsesDecaying = 0, corpsesGone = 0;
  let rabbitBirths = 0, mouseBirths = 0, rabbitsSpread = 0, miceSpread = 0, overgrazedLocations = 0, overgrazedResources = 0, depletedByOvergrazing = 0, populationFloorRestored = 0;
  let foxBirths = 0, wolfBirths = 0, foxPreyUnits = 0, wolfPreyUnits = 0;
  let lisovykAwakened = false, lisovykSlept = false;
  let dreamGatesClosed = 0;
  let worldMinutesAdvanced = 0;
  let daypartNoticeSent = false;
  let playerHungerIncreased = 0;
  let playerHungerInitialized = 0;
  let playerHungerResetBackwards = 0;
  let strangeTotemsScheduled = 0;
  let strangeTotemsDropped = 0;
  let strangeTotemsExpired = 0;
  let strangeTotemSpawned = false;
  try {
    if (DEBUG) console.log(`[WORLD TICK] start ${new Date().toISOString()}`);
    tickNumber++;
    const worldClock = await advanceWorldClock();
    worldMinutesAdvanced = worldClock.advancedMinutes;
    const worldTime = worldTimeSnapshotFromAbsoluteMinute(
      worldClock.state.absoluteMinute,
      worldClock.state.weatherKey,
      worldClock.state.weatherIntensity,
    );
    await syncOwlNocturnalActivity(worldTime.daypart);
    const strangeTotemAging = await ageStrangeTotemsIfNeeded(botInstance, worldTime.absoluteMinute);
    strangeTotemsScheduled = strangeTotemAging.scheduled;
    strangeTotemsDropped = strangeTotemAging.dropped;
    strangeTotemsExpired = strangeTotemAging.expired;
    strangeTotemSpawned = (await maybeSpawnDailyStrangeTotem(botInstance, worldTime.absoluteMinute)).spawned;
    if (botInstance) daypartNoticeSent = await notifyWorldDaypartChangeIfNeeded(botInstance);
    const passiveHunger = await advancePassivePlayerHunger(worldTime.absoluteMinute);
    playerHungerIncreased = passiveHunger.totalIncrease;
    playerHungerInitialized = passiveHunger.initialized;
    playerHungerResetBackwards = passiveHunger.resetBackwards;
    dreamGatesClosed = await closeExpiredDreamGates(botInstance);
    const lifecycle = await processAnimalLifecycle();
    aged = lifecycle.aged;
    oldAgeDeaths = lifecycle.died;
    starvationDeaths = lifecycle.starved;
    corpsesDecaying = lifecycle.decayed;
    corpsesGone = lifecycle.gone;

    const populationFloor = await restorePopulationFloors();
    populationFloorRestored = populationFloor.restored;

    const ecology = await processSmallHerbivoreEcology();
    rabbitBirths = ecology.rabbitBirths;
    mouseBirths = ecology.mouseBirths;
    rabbitsSpread = ecology.rabbitsSpread;
    miceSpread = ecology.miceSpread;
    overgrazedLocations = ecology.overgrazedLocations;
    overgrazedResources = ecology.overgrazedResources;
    depletedByOvergrazing = ecology.depletedByOvergrazing;

    const predatorEcology = await processPredatorReproduction();
    foxBirths = predatorEcology.foxBirths;
    wolfBirths = predatorEcology.wolfBirths;
    foxPreyUnits = predatorEcology.foxPreyUnits;
    wolfPreyUnits = predatorEcology.wolfPreyUnits;

    lisovykAwakened = await wakeLisovykIfNeeded();
    regenerated = await regenerateResourcesIfNeeded();
    regenerated += await regenerateNaturalTwigsIfNeeded();
    if (!lisovykAwakened) lisovykSlept = await putLisovykToSleepIfForestRecovered();

    const [playerLocationCounts, activeCreatureActions, creatureLocationCountRows, sleepingCreatureCount] = await Promise.all([
      prisma.player.groupBy({
        by: ["currentLocationId"],
        where: { currentLocationId: { not: null } },
        _count: { _all: true },
      }),
      prisma.worldAction.findMany({
        where: { actorType: "CREATURE", status: { in: ["QUEUED", "RUNNING"] }, creatureId: { not: null } },
        select: { creatureId: true },
      }),
      prisma.creature.groupBy({
        by: ["locationId"],
        where: { isAlive: true, isGone: false },
        _count: { _all: true },
      }),
      prisma.creature.count({ where: { isAlive: true, isGone: false, activity: "SLEEPING" } }),
    ]);
    const activeCreatureActionIds = new Set(activeCreatureActions.map((action) => action.creatureId).filter((id): id is number => Boolean(id)));
    const activeCreatureIds = [...activeCreatureActionIds];
    const creatureTickCandidates = await prisma.creature.findMany({
      where: {
        isAlive: true,
        isGone: false,
        activity: { not: "SLEEPING" },
        ...(activeCreatureIds.length ? { id: { notIn: activeCreatureIds } } : {}),
      },
      select: {
        id: true,
        locationId: true,
        species: { select: { kind: true, key: true, diet: true } },
      },
    });
    const creatureLocationCounts = new Map<number, number>();
    const playerCountsByLocationId = new Map<number, number>();
    for (const row of creatureLocationCountRows) creatureLocationCounts.set(row.locationId, row._count._all);
    for (const row of playerLocationCounts) {
      if (row.currentLocationId) playerCountsByLocationId.set(row.currentLocationId, row._count._all);
    }
    const creatureSelection = selectCreaturesForTick(creatureTickCandidates, playerCountsByLocationId, tickNumber, CREATURE_TICK_BUDGET);
    creatureCandidates = creatureTickCandidates.length;
    creatureDeferred = creatureSelection.deferred;
    creatureProtected = creatureSelection.protectedCount;
    const selectedCreatureIds = creatureSelection.selectedIds;
    const selectedCreatureOrder = new Map(selectedCreatureIds.map((id, index) => [id, index]));
    const creatures = selectedCreatureIds.length ? await prisma.creature.findMany({
      where: {
        id: { in: selectedCreatureIds },
      },
      include: {
        species: true,
        location: {
          include: {
            exitsFrom: {
              include: {
                toLocation: {
                  include: {
                    region: true,
                    features: { where: { isActive: true, type: "MAGIC_CAMPFIRE" } },
                  },
                },
              },
            },
            features: { where: { isActive: true } },
            resources: { include: { resourceType: true } },
          },
        },
      },
    }) : [];
    creatures.sort((a, b) => (selectedCreatureOrder.get(a.id) ?? 0) - (selectedCreatureOrder.get(b.id) ?? 0));
    creatureProcessed = creatures.length;
    skippedBusy += activeCreatureActionIds.size + sleepingCreatureCount + creatureDeferred;

    for (const c of creatures) {
      try {
        const localPresenceCount = (creatureLocationCounts.get(c.locationId) ?? 0) + (playerCountsByLocationId.get(c.locationId) ?? 0);
        (c.location as any).effectiveDangerLevel = effectiveLocationDanger(c.location.dangerLevel, localPresenceCount, c.location.features);

        if (c.activity === "SLEEPING") {
          skippedBusy++;
          continue;
        }

        if (activeCreatureActionIds.has(c.id)) {
          skippedBusy++;
          continue;
        }

        let result = "queuedRest";
        if (isCampSpiritCatCreature(c)) result = await tickCampSpiritCat(c, worldTime.daypart);
        else if (await maybeQueueCreatureRest(c)) {
          queuedRest++;
          continue;
        }
        else {
          const learnerResult = await tickNpcLearner(c);
          if (learnerResult) result = learnerResult;
          else if (isHunterCreature(c)) result = await tickNpcHunter(botInstance, c);
          else if (isHerbalistCreature(c)) result = await tickNpcHerbalist(botInstance, c, worldTime.absoluteMinute);
          else if (c.species.key === "lisovyk") {
            const exit = pick(c.location.exitsFrom.filter((candidate: any) => isExit(candidate) && !isLisovykForbiddenLocation((candidate as any).toLocation)));
            if (isExit(exit) && chance(50)) {
              result = await queueMove(c, exit, "нишпорить між деревами");
            } else {
              await enqueueCreatureAction({
                creatureId: c.id,
                type: "LOOK",
                payload: { reason: "полює й дослухається до лісу" },
                durationMs: actionDurationMs("LOOK", c.stamina),
              });
              result = "queuedLook";
            }
          }
          else if (c.species.diet === "HERBIVORE") result = await tickHerbivore(c, localPresenceCount);
          else if (c.species.diet === "CARNIVORE") result = await tickCarnivore(c);
          else {
            await enqueueCreatureAction({ creatureId: c.id, type: "REST", payload: {}, durationMs: actionDurationMs("REST", c.stamina) });
            result = "queuedRest";
          }
        }
        if (result === "queuedMove") queuedMove++;
        else if (result === "queuedGather") queuedGather++;
        else if (result === "queuedEat") queuedEat++;
        else if (result === "queuedLook") queuedLook++;
        else if (result === "queuedSay") queuedSay++;
        else if (result === "queuedAttack") queuedAttack++;
        else if (result === "stoodDown") stoodDown++;
        else queuedRest++;
      } catch (error) {
        errors++;
        if (DEBUG) console.warn("Creature tick failed:", error);
      }
    }

    if (DEBUG) console.log(`[WORLD TICK] done: worldMinutesAdvanced=${worldMinutesAdvanced}, daypartNoticeSent=${daypartNoticeSent ? 1 : 0}, playerHungerIncreased=${playerHungerIncreased}, playerHungerInitialized=${playerHungerInitialized}, playerHungerResetBackwards=${playerHungerResetBackwards}, strangeTotemsScheduled=${strangeTotemsScheduled}, strangeTotemsDropped=${strangeTotemsDropped}, strangeTotemsExpired=${strangeTotemsExpired}, strangeTotemSpawned=${strangeTotemSpawned ? 1 : 0}, queuedMove=${queuedMove}, queuedGather=${queuedGather}, queuedEat=${queuedEat}, queuedLook=${queuedLook}, queuedSay=${queuedSay}, queuedRest=${queuedRest}, queuedAttack=${queuedAttack}, stoodDown=${stoodDown}, skippedBusy=${skippedBusy}, creatureBudget=${CREATURE_TICK_BUDGET}, creatureCandidates=${creatureCandidates}, creatureProcessed=${creatureProcessed}, creatureDeferred=${creatureDeferred}, creatureProtected=${creatureProtected}, aged=${aged}, oldAgeDeaths=${oldAgeDeaths}, starvationDeaths=${starvationDeaths}, corpsesDecaying=${corpsesDecaying}, corpsesGone=${corpsesGone}, populationFloorRestored=${populationFloorRestored}, rabbitBirths=${rabbitBirths}, mouseBirths=${mouseBirths}, rabbitsSpread=${rabbitsSpread}, miceSpread=${miceSpread}, foxBirths=${foxBirths}, wolfBirths=${wolfBirths}, foxPreyUnits=${foxPreyUnits}, wolfPreyUnits=${wolfPreyUnits}, overgrazedLocations=${overgrazedLocations}, overgrazedResources=${overgrazedResources}, depletedByOvergrazing=${depletedByOvergrazing}, regenerated=${regenerated}, lisovykAwakened=${lisovykAwakened ? 1 : 0}, lisovykSlept=${lisovykSlept ? 1 : 0}, dreamGatesClosed=${dreamGatesClosed}, errors=${errors}`);
    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "World Tick", description: `Tick #${tickNumber}: worldMinutesAdvanced=${worldMinutesAdvanced}, daypartNoticeSent=${daypartNoticeSent ? 1 : 0}, playerHungerIncreased=${playerHungerIncreased}, playerHungerInitialized=${playerHungerInitialized}, playerHungerResetBackwards=${playerHungerResetBackwards}, strangeTotemsScheduled=${strangeTotemsScheduled}, strangeTotemsDropped=${strangeTotemsDropped}, strangeTotemsExpired=${strangeTotemsExpired}, strangeTotemSpawned=${strangeTotemSpawned ? 1 : 0}, queuedMove=${queuedMove}, queuedGather=${queuedGather}, queuedEat=${queuedEat}, queuedLook=${queuedLook}, queuedSay=${queuedSay}, queuedRest=${queuedRest}, queuedAttack=${queuedAttack}, stoodDown=${stoodDown}, skippedBusy=${skippedBusy}, creatureBudget=${CREATURE_TICK_BUDGET}, creatureCandidates=${creatureCandidates}, creatureProcessed=${creatureProcessed}, creatureDeferred=${creatureDeferred}, creatureProtected=${creatureProtected}, aged=${aged}, oldAgeDeaths=${oldAgeDeaths}, starvationDeaths=${starvationDeaths}, corpsesDecaying=${corpsesDecaying}, corpsesGone=${corpsesGone}, populationFloorRestored=${populationFloorRestored}, rabbitBirths=${rabbitBirths}, mouseBirths=${mouseBirths}, rabbitsSpread=${rabbitsSpread}, miceSpread=${miceSpread}, foxBirths=${foxBirths}, wolfBirths=${wolfBirths}, foxPreyUnits=${foxPreyUnits}, wolfPreyUnits=${wolfPreyUnits}, overgrazedLocations=${overgrazedLocations}, overgrazedResources=${overgrazedResources}, depletedByOvergrazing=${depletedByOvergrazing}, regenerated=${regenerated}, lisovykAwakened=${lisovykAwakened ? 1 : 0}, lisovykSlept=${lisovykSlept ? 1 : 0}, dreamGatesClosed=${dreamGatesClosed}, errors=${errors}` } });
    if (botInstance && tickNumber % 5 === 0) {
      const region = await prisma.region.findFirst();
      if (region) await notifyRegionTechnicalScribes(botInstance, region.id, `🌿 Світ ворухнувся.\n\nТехнічний звіт раз на 5 тіків. Поточний тік #${tickNumber}: заплановано рухів — ${queuedMove}, збору — ${queuedGather}, їжі — ${queuedEat}, оглядів — ${queuedLook}, атак — ${queuedAttack}, зайнятих/відкладених істот — ${skippedBusy}, creature tick — ${creatureProcessed}/${creatureCandidates}, відкладено — ${creatureDeferred}, старість — ${aged}, смертей від старості — ${oldAgeDeaths}, смертей від голоду — ${starvationDeaths}, зниклих трупів — ${corpsesGone}, відновлено стартових тварин — ${populationFloorRestored}, народилося зайченят — ${rabbitBirths}, мишенят — ${mouseBirths}, лисенят — ${foxBirths}, вовченят — ${wolfBirths}, зайців розбіглося — ${rabbitsSpread}, мишей — ${miceSpread}, об'їдено ресурсів — ${overgrazedResources}, відновлено вузлів — ${regenerated}.`);
    }
    if (botInstance) await notifyFadingFireTimers(botInstance);
  } finally {
    running = false;
  }
}

function restartWorldTickTimer() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => { worldTick().catch(console.error); }, tickIntervalMs);
  if (DEBUG) {
    console.log("TICK INTERVAL ENV:", process.env.WORLD_TICK_INTERVAL_MS);
    console.log(`World tick loop started: every ${tickIntervalMs}ms`);
  }
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${(ms / 1000).toLocaleString("uk-UA", { maximumFractionDigits: 1 })} с`;
  if (ms < 60_000) return `${Math.ceil(ms / 1000)} с`;
  return `${Math.ceil(ms / 60_000)} хв`;
}

function runtimeTickStatusText() {
  const timing = getRuntimeTimingConfig();
  return [
    "🌲 Час світу",
    "",
    `Базовий тік: ${timing.tickMs} ms`,
    `World tick: кожен 1 тік`,
    `Action/recovery loop: кожні ${timing.actionQueuePollMs} ms`,
    `Технічне повідомлення «Світ ворухнувся»: кожні 5 тіків, лише писарям/адмінам з увімкненими технічними деталями`,
    `Авто-режим: кожні ${timing.autoIntervalTicks} тіків ≈ ${formatDuration(timing.autoIntervalMs)}`,
    `Tick #: ${tickNumber}`,
    `Creature tick budget: ${CREATURE_TICK_BUDGET > 0 ? CREATURE_TICK_BUDGET : "disabled"} per world tick; player-visible locations, NPCs and predators are protected first.`,
    "",
    "Дії під час втоми або для істот без quick-режиму:",
    `- quick-дії гравця зі снагою > 0: ${formatDuration(timing.actions.quickMs)}`,
    `- рух: ${timing.actions.moveTicks} тіків ≈ ${formatDuration(timing.actions.moveMs)}`,
    `- огляд/вистежування: ${timing.actions.lookTicks} тіків ≈ ${formatDuration(timing.actions.lookMs)}`,
    `- збір: ${timing.actions.gatherTicks} тіків ≈ ${formatDuration(timing.actions.gatherMs)}`,
    `- атака: ${timing.actions.attackTicks} тіків ≈ ${formatDuration(timing.actions.attackMs)} (×2 від руху за часом)`,
    "",
    "Відновлення:",
    `- снага без відпочинку: +${timing.passiveStaminaRegenAmount} раз на ${timing.staminaRegenTicks} тіків ≈ ${formatDuration(timing.staminaRegenMs)}`,
    `- снага під час відпочинку: +${timing.restStaminaRegenAmount} раз на ${timing.restStaminaRegenTicks} тіків ≈ ${formatDuration(timing.restStaminaRegenMs)}`,
    `- життя без відпочинку: +1 раз на ${timing.passiveHealthRegenTicks} тіків ≈ ${formatDuration(timing.passiveHealthRegenMs)}`,
    `- життя під час відпочинку: +1 раз на ${timing.restHealthRegenTicks} тіків ≈ ${formatDuration(timing.restHealthRegenMs)}`,
    "",
    `Регенерація ресурсів: раз на ${RESOURCE_REGEN_EVERY_TICKS} world ticks, +${RESOURCE_REGEN_AMOUNT}`,
    `Природне осипання хмизу: раз на ${naturalTwigsRegenEveryTicks()} world ticks ≈ ${formatDuration(naturalTwigsRegenEveryTicks() * TICK_MS)}; лісові місцини, приблизно 1/${Math.max(1, NATURAL_TWIGS_LOCATION_DIVISOR)}, до ${NATURAL_TWIGS_MAX_AMOUNT} хмизу`,
    `Розмноження зайців: раз на ${RABBIT_REPRODUCTION_EVERY_TICKS} world ticks; виводок ${RABBIT_MIN_LITTER_SIZE}-${RABBIT_MAX_LITTER_SIZE}; світового ліміту немає`,
    `Розмноження мишей: раз на ${MOUSE_REPRODUCTION_EVERY_TICKS} world ticks; виводок ${MOUSE_MIN_LITTER_SIZE}-${MOUSE_MAX_LITTER_SIZE}; цикл коротший за заячий`,
    `Розмноження лисиць: раз на ${FOX_REPRODUCTION_EVERY_TICKS} world ticks; виводок ${FOX_MIN_LITTER_SIZE}-${FOX_MAX_LITTER_SIZE}; поріг prey units ${FOX_PREY_UNITS_REQUIRED_BASE} + ${FOX_PREY_UNITS_REQUIRED_PER_FOX} за лисицю`,
    `Розмноження вовків: раз на ${WOLF_REPRODUCTION_EVERY_TICKS} world ticks; виводок ${WOLF_MIN_LITTER_SIZE}-${WOLF_MAX_LITTER_SIZE}; поріг prey units ${WOLF_PREY_UNITS_REQUIRED_BASE} + ${WOLF_PREY_UNITS_REQUIRED_PER_WOLF} за вовка`,
    "Вагітність хижаків: ще не реалізована; MVP народжує виводок одразу при рідкісній успішній перевірці",
    "Prey units: для лисиць mouse=1, rabbit=4; для вовків rabbit=4, mouse майже ігнорується",
    `Локальний тиск зайців: м'який поріг ${RABBIT_LOCAL_SOFT_CAP}; вище нього падає шанс народження й запускається розселення`,
    `Розселення зайців: раз на ${RABBIT_SPREAD_EVERY_TICKS} world ticks; до ${RABBIT_MAX_SPREAD_PER_LOCATION} з перенаселеної місцини`,
    `Розселення мишей: раз на ${MOUSE_SPREAD_EVERY_TICKS} world ticks; до ${MOUSE_MAX_SPREAD_PER_LOCATION} з перенаселеної місцини`,
    `Надмірний випас: від ${OVERGRAZING_RABBIT_THRESHOLD} одиниць травоїдного тиску в місцині; 1 заєць = 1, ${MOUSE_OVERGRAZING_PRESSURE_DIVISOR} миші ≈ 1`,
    `Сліди живуть: ${timing.trackTtlTicks} тіків ≈ ${formatDuration(timing.trackTtlMs)}`,
    "",
    "Змінити runtime без рестарту: /tickSet <ms>",
  ].join("\n");
}

function registerTickCommands(bot: Bot) {
  async function runTickCommand(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await worldTick();
    await ctx.reply("✅ World tick запущено вручну.");
  }

  async function runTickGetCommand(ctx: any) {
    if (!(await requireScribeAdmin(ctx))) return;
    await ctx.reply(runtimeTickStatusText());
  }

  async function runTickSetCommand(ctx: any, rawValue = String(ctx.match ?? "")) {
    if (!(await requireScribeAdmin(ctx))) return;

    const value = Number(rawValue.trim());
    if (!Number.isFinite(value) || value < 1000) {
      await ctx.reply("⚠️ Формат: /tickSet 5000\nМінімум: 1000 ms.");
      return;
    }

    setRuntimeTickMs(value);
    tickIntervalMs = TICK_MS;
    restartWorldTickTimer();
    restartActionQueueLoop();
    restartPlayerAutoTimers(bot);
    await ctx.reply(`✅ Час світу змінено runtime: ${TICK_MS} ms. Перезапущено world tick, action/recovery loop і авто-таймери.\n\n${runtimeTickStatusText()}`);
  }

  bot.command("tick", runTickCommand);
  bot.hears(TICK_TEXT_COMMAND, runTickCommand);
  bot.command(["tickGet", "tickget"], runTickGetCommand);
  bot.hears(TICK_GET_TEXT_COMMAND, runTickGetCommand);
  bot.command(["tickSet", "tickset"], (ctx) => runTickSetCommand(ctx));
  bot.hears(TICK_SET_TEXT_COMMAND, (ctx) => runTickSetCommand(ctx, String(ctx.match?.[1] ?? "")));
}

export function startWorldTickLoop(bot?: Bot) {
  botInstance = bot ?? null;
  if (botInstance) registerTickCommands(botInstance);
  restartWorldTickTimer();
}
