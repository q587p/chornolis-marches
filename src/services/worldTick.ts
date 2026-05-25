import { Bot } from "grammy";
import { CreatureAge, Direction, LocationExit } from "@prisma/client";
import { prisma } from "../db";
import { notifyRegion } from "./notifications";
import { actionDurationMs, enqueueCreatureAction, gatherDurationMs, hasActiveCreatureActions, movementDurationMs, restartActionQueueLoop } from "./actionQueue";
import { BASE_STAMINA, TICK_MS, VERY_TIRED_STAMINA, getRuntimeTimingConfig, setRuntimeTickMs } from "../gameConfig";
import { restartPlayerAutoTimers } from "../handlers/auto";

const DEFAULT_TICK_INTERVAL_MS = TICK_MS;
const DEBUG = process.env.WORLD_DEBUG === "true" || process.env.WORLD_TICK_DEBUG === "true";
const RESOURCE_REGEN_EVERY_TICKS = Number(process.env.WORLD_RESOURCE_REGEN_EVERY_TICKS || 40);
const RESOURCE_REGEN_AMOUNT = Number(process.env.WORLD_RESOURCE_REGEN_AMOUNT || 1);
const GRASS_REGEN_EVERY_TICKS = Number(process.env.WORLD_GRASS_REGEN_EVERY_TICKS || 30);
const EXHAUSTED_LOCATION_REGEN_EVERY_TICKS = Number(process.env.WORLD_EXHAUSTED_LOCATION_REGEN_EVERY_TICKS || 240);
const HERBALIST_SPEAK_CHANCE = Number(process.env.HERBALIST_SPEAK_CHANCE || 12);
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
const CROWD_DANGER_THRESHOLD = Number(process.env.WORLD_CROWD_DANGER_THRESHOLD || 13);
const CROWD_DANGER_INITIAL_BONUS = Number(process.env.WORLD_CROWD_DANGER_INITIAL_BONUS || 4);
const CROWD_DANGER_STEP = Number(process.env.WORLD_CROWD_DANGER_STEP || 4);
const CROWD_DANGER_STEP_BONUS = Number(process.env.WORLD_CROWD_DANGER_STEP_BONUS || 1);
const CROWD_HERBIVORE_MOVE_BASE_CHANCE = Number(process.env.WORLD_CROWD_HERBIVORE_MOVE_BASE_CHANCE || 12);
const CROWD_HERBIVORE_MOVE_PER_EXTRA_CHANCE = Number(process.env.WORLD_CROWD_HERBIVORE_MOVE_PER_EXTRA_CHANCE || 4);
const CROWD_HERBIVORE_MOVE_MAX_CHANCE = Number(process.env.WORLD_CROWD_HERBIVORE_MOVE_MAX_CHANCE || 55);
const RECENT_ATTACK_FEATURE_PREFIX = "recent_attack_";
const EDIBLE_RESOURCE_KEYS = ["grass", "berries", "herbs", "mushrooms"] as const;
const DEPLETED_VEGETATION_FEATURE_PREFIX = "depleted_vegetation_";
const MOUSE_OVERGRAZING_PRESSURE_DIVISOR = 2;

let tickIntervalMs = DEFAULT_TICK_INTERVAL_MS;
let tickTimer: NodeJS.Timeout | null = null;
let running = false;
let botInstance: Bot | null = null;
let tickNumber = 0;

const HERBALIST_LINES = [
  "Трави самі говорять, якщо слухати тихо.",
  "Не кожен корінь лікує. Деякі тільки пам’ятають біль.",
  "Чорноліс сьогодні пахне дощем і старою корою.",
  "Не топчи мох без потреби — він старший за нас.",
  "Ягоди темнішають. Це не завжди добрий знак.",
  "Коли ліс мовчить — слухай землю.",
  "Тут десь має бути деревій... або щось, що ним прикидається.",
  "Гриби не брешуть. Люди — часто.",
  "Хто забирає все, той будить старше за себе.",
  "Тиша теж буває голодною.",
];

const STAGE_HP_MULTIPLIER: Record<CreatureAge, number> = {
  CHILD: 0.35,
  YOUNG: 0.75,
  ADULT: 1,
  OLD: 0.65,
  CORPSE: 0,
};

function chance(p: number) {
  return Math.random() * 100 < p;
}

function chancePermille(p: number) {
  return Math.random() * 1000 < p;
}

function pick<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return low + Math.floor(Math.random() * (high - low + 1));
}

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

  const exits = location.exitsFrom.filter((exit: any) => !exit.isHidden);
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

async function processRabbitReproductionAndOvergrazing() {
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
      description: `${creature.species.name} помирає від старості. Труп лишається в локації на ${creature.species.corpseDecayTicks} тіків.`,
      locationId: creature.locationId,
    },
  });
}

async function ageLivingAnimal(creature: any) {
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

  if (decayLeft > 1) {
    const decayed = await prisma.creature.updateMany({
      where: { id: creature.id, isAlive: false, isGone: false },
      data: { age: "CORPSE", isAlive: false, corpseDecayTicksLeft: decayLeft - 1, currentAction: `розкладається; залишилось ${decayLeft - 1} тіків` },
    });
    if (decayed.count === 0) return "gone";
    return "decaying";
  }

  const mushrooms = await prisma.resourceNode.findFirst({ where: { locationId: creature.locationId, resourceType: { key: "mushrooms" } } });
  if (mushrooms) {
    await prisma.resourceNode.updateMany({ where: { id: mushrooms.id }, data: { amount: Math.min(mushrooms.maxAmount, mushrooms.amount + creature.species.mushroomBonusOnDecay) } });
  }

  const gone = await prisma.creature.updateMany({ where: { id: creature.id, isAlive: false, isGone: false }, data: { isGone: true, corpseDecayTicksLeft: 0, currentAction: "зникло, лишивши слід у землі" } });
  if (gone.count === 0) return "gone";
  await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Труп зник", description: `Труп істоти «${creature.name ?? creature.species.name}» зник. Гриби в цій локації отримали +${creature.species.mushroomBonusOnDecay}.`, locationId: creature.locationId } });
  return "gone";
}

async function processAnimalLifecycle() {
  const livingAnimals = await prisma.creature.findMany({ where: { isAlive: true, isGone: false, species: { kind: "ANIMAL" } }, include: { species: true } });
  const corpses = await prisma.creature.findMany({ where: { isAlive: false, isGone: false, species: { kind: "ANIMAL" } }, include: { species: true } });
  let aged = 0, died = 0, decayed = 0, gone = 0;

  for (const creature of livingAnimals) {
    const result = await ageLivingAnimal(creature);
    if (result === "died") died++;
    else if (result === "aged") aged++;
  }

  for (const creature of corpses) {
    const result = await decayCorpse(creature);
    if (result === "gone") gone++;
    else decayed++;
  }

  return { aged, died, decayed, gone };
}

async function maybeHerbalistSpeak(c: any) {
  if (!chance(HERBALIST_SPEAK_CHANCE)) return false;
  const line = pick(HERBALIST_LINES);
  if (!line) return false;
  await enqueueCreatureAction({ creatureId: c.id, type: "SAY", payload: { text: line }, durationMs: actionDurationMs("SAY", c.stamina) });
  return true;
}

async function queueMove(c: any, exit: LocationExit, reason: string) {
  await enqueueCreatureAction({ creatureId: c.id, type: "MOVE", payload: { direction: exit.direction as Direction, reason }, durationMs: movementDurationMs(exit.travelCost, c.stamina) });
  return "queuedMove";
}

async function tickHerbalist(c: any) {
  if (await maybeHerbalistSpeak(c)) return "queuedSay";

  const herbs = c.location.resources.find((r: any) => r.resourceType.key === "herbs");
  if (herbs && herbs.amount > 0) {
    await enqueueCreatureAction({ creatureId: c.id, type: "GATHER_SPECIFIC", payload: { resourceKey: "herbs" }, durationMs: gatherDurationMs("herbs", c.stamina) });
    return "queuedGather";
  }

  const exit = pick(c.location.exitsFrom);
  if (isExit(exit)) return queueMove(c, exit, "шукає трави");
  await enqueueCreatureAction({ creatureId: c.id, type: "REST", payload: {}, durationMs: actionDurationMs("REST", c.stamina) });
  return "queuedRest";
}

async function tickHerbivore(c: any, localPresenceCount: number) {
  const hasFood = c.location.resources.some((r: any) => r.amount > 0 && isEdibleResourceKey(r.resourceType.key));
  const exhausted = c.location.features?.some((feature: any) => feature.isActive && String(feature.key).startsWith(DEPLETED_VEGETATION_FEATURE_PREFIX));
  const pressureMoveChance = herbivorePressureMoveChance(localPresenceCount, c.location.features);
  if (pressureMoveChance > 0 && chance(pressureMoveChance)) {
    const exit = pick(c.location.exitsFrom);
    const reason = recentAttackHerbivoreMoveBonus(c.location.features) > 0 ? "лякається недавнього нападу" : "уникає тисняви й надто людного місця";
    if (isExit(exit)) return queueMove(c, exit, reason);
  }

  if (hasFood && c.hunger > 0 && chance(60)) {
    await enqueueCreatureAction({ creatureId: c.id, type: "EAT", payload: {}, durationMs: actionDurationMs("EAT", c.stamina) });
    return "queuedEat";
  }

  if (!hasFood || exhausted || chance(50)) {
    const exit = pick(c.location.exitsFrom);
    if (isExit(exit)) return queueMove(c, exit, "шукає їжу");
  }

  await enqueueCreatureAction({ creatureId: c.id, type: "LOOK", payload: {}, durationMs: actionDurationMs("LOOK", c.stamina) });
  return "queuedLook";
}

async function tickCarnivore(c: any) {
  const prey = await prisma.creature.findFirst({ where: { isAlive: true, isGone: false, locationId: c.locationId, species: { diet: "HERBIVORE" } } });
  if (prey) {
    if (chance(35)) {
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

  if (chance(50)) {
    const exit = pick(c.location.exitsFrom);
    if (isExit(exit)) return queueMove(c, exit, "патрулює");
  }

  await enqueueCreatureAction({ creatureId: c.id, type: "REST", payload: {}, durationMs: actionDurationMs("REST", c.stamina) });
  return "queuedRest";
}

type DepletedRegionResource = { regionId: number; regionName: string; resourceKey: string; resourceName: string; locationId: number };

function lisovykWakeText(resourceName: string) {
  return `Дід лісовик гарчить: «О, де всі ${resourceName}? Хто винищив їх до нуля?!»`;
}

function lisovykSleepText(resourceName?: string) {
  const resourcePart = resourceName ? `«${resourceName}» знову є в лісі` : "виснажені ресурси знову є в лісі";
  return `Дід лісовик гарчить: «${resourcePart}. Йду спати, але стережіться там».`;
}

async function findRegionDepletedResource(): Promise<DepletedRegionResource | null> {
  const regions = await prisma.region.findMany({ include: { locations: { include: { resources: { include: { resourceType: true } } }, orderBy: { id: "asc" } } } });
  for (const region of regions) {
    const resourceKeys = new Set<string>();
    for (const location of region.locations) for (const node of location.resources) resourceKeys.add(node.resourceType.key);
    for (const resourceKey of resourceKeys) {
      const nodes = region.locations.flatMap((location) => location.resources.filter((node) => node.resourceType.key === resourceKey));
      const total = nodes.reduce((sum, node) => sum + node.amount, 0);
      if (total > 0) continue;
      const location = region.locations[0];
      if (!location) continue;
      return { regionId: region.id, regionName: region.name, resourceKey, resourceName: nodes[0]?.resourceType.name ?? resourceKey, locationId: location.id };
    }
  }
  return null;
}

async function wakeLisovykIfNeeded() {
  const depleted = await findRegionDepletedResource();
  if (!depleted) return false;
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
  const message = lisovykWakeText(depleted.resourceName);
  await prisma.worldEvent.create({ data: { type: "NPC_SAY", title: "Лісовик прокинувся", description: `У регіоні «${depleted.regionName}» зник ресурс «${depleted.resourceName}». ${message}`, locationId: depleted.locationId } });
  if (botInstance) await notifyRegion(botInstance, depleted.regionId, `🌲 Дід лісовик прокинувся.\n\n${message}`);
  return true;
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
      location: { include: { features: { where: { isActive: true } } } },
    },
  });
  let regenerated = 0;
  for (const node of nodes) {
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

export async function worldTick() {
  if (running) return;
  running = true;
  let queuedMove = 0, queuedGather = 0, queuedEat = 0, queuedLook = 0, queuedSay = 0, queuedRest = 0, queuedAttack = 0, skippedBusy = 0, errors = 0, regenerated = 0;
  let aged = 0, oldAgeDeaths = 0, corpsesDecaying = 0, corpsesGone = 0;
  let rabbitBirths = 0, mouseBirths = 0, rabbitsSpread = 0, miceSpread = 0, overgrazedLocations = 0, overgrazedResources = 0, depletedByOvergrazing = 0;
  let lisovykAwakened = false, lisovykSlept = false;
  try {
    if (DEBUG) console.log(`[WORLD TICK] start ${new Date().toISOString()}`);
    tickNumber++;
    const lifecycle = await processAnimalLifecycle();
    aged = lifecycle.aged;
    oldAgeDeaths = lifecycle.died;
    corpsesDecaying = lifecycle.decayed;
    corpsesGone = lifecycle.gone;

    const ecology = await processRabbitReproductionAndOvergrazing();
    rabbitBirths = ecology.rabbitBirths;
    mouseBirths = ecology.mouseBirths;
    rabbitsSpread = ecology.rabbitsSpread;
    miceSpread = ecology.miceSpread;
    overgrazedLocations = ecology.overgrazedLocations;
    overgrazedResources = ecology.overgrazedResources;
    depletedByOvergrazing = ecology.depletedByOvergrazing;

    lisovykAwakened = await wakeLisovykIfNeeded();
    regenerated = await regenerateResourcesIfNeeded();
    if (!lisovykAwakened) lisovykSlept = await putLisovykToSleepIfForestRecovered();

    const creatures = await prisma.creature.findMany({
      where: { isAlive: true, isGone: false },
      include: { species: true, location: { include: { exitsFrom: true, features: { where: { isActive: true } }, resources: { include: { resourceType: true } } } } },
    });
    const playerLocationCounts = await prisma.player.groupBy({
      by: ["currentLocationId"],
      where: { currentLocationId: { not: null } },
      _count: { _all: true },
    });
    const creatureLocationCounts = new Map<number, number>();
    const playerCountsByLocationId = new Map<number, number>();
    for (const c of creatures) creatureLocationCounts.set(c.locationId, (creatureLocationCounts.get(c.locationId) ?? 0) + 1);
    for (const row of playerLocationCounts) {
      if (row.currentLocationId) playerCountsByLocationId.set(row.currentLocationId, row._count._all);
    }

    for (const c of creatures) {
      try {
        const localPresenceCount = (creatureLocationCounts.get(c.locationId) ?? 0) + (playerCountsByLocationId.get(c.locationId) ?? 0);
        (c.location as any).effectiveDangerLevel = effectiveLocationDanger(c.location.dangerLevel, localPresenceCount, c.location.features);

        if (c.activity === "SLEEPING") {
          skippedBusy++;
          continue;
        }

        if (await hasActiveCreatureActions(c.id)) {
          skippedBusy++;
          continue;
        }

        if (await maybeQueueCreatureRest(c)) {
          queuedRest++;
          continue;
        }

        let result = "queuedRest";
        if (c.species.key === "herbalist") result = await tickHerbalist(c);
        else if (c.species.key === "lisovyk") {
          const exit = pick(c.location.exitsFrom);
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

        if (result === "queuedMove") queuedMove++;
        else if (result === "queuedGather") queuedGather++;
        else if (result === "queuedEat") queuedEat++;
        else if (result === "queuedLook") queuedLook++;
        else if (result === "queuedSay") queuedSay++;
        else if (result === "queuedAttack") queuedAttack++;
        else queuedRest++;
      } catch (error) {
        errors++;
        if (DEBUG) console.warn("Creature tick failed:", error);
      }
    }

    if (DEBUG) console.log(`[WORLD TICK] done: queuedMove=${queuedMove}, queuedGather=${queuedGather}, queuedEat=${queuedEat}, queuedLook=${queuedLook}, queuedSay=${queuedSay}, queuedRest=${queuedRest}, queuedAttack=${queuedAttack}, skippedBusy=${skippedBusy}, aged=${aged}, oldAgeDeaths=${oldAgeDeaths}, corpsesDecaying=${corpsesDecaying}, corpsesGone=${corpsesGone}, rabbitBirths=${rabbitBirths}, mouseBirths=${mouseBirths}, rabbitsSpread=${rabbitsSpread}, miceSpread=${miceSpread}, overgrazedLocations=${overgrazedLocations}, overgrazedResources=${overgrazedResources}, depletedByOvergrazing=${depletedByOvergrazing}, regenerated=${regenerated}, lisovykAwakened=${lisovykAwakened ? 1 : 0}, lisovykSlept=${lisovykSlept ? 1 : 0}, errors=${errors}`);
    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "World Tick", description: `Tick #${tickNumber}: queuedMove=${queuedMove}, queuedGather=${queuedGather}, queuedEat=${queuedEat}, queuedLook=${queuedLook}, queuedSay=${queuedSay}, queuedRest=${queuedRest}, queuedAttack=${queuedAttack}, skippedBusy=${skippedBusy}, aged=${aged}, oldAgeDeaths=${oldAgeDeaths}, corpsesDecaying=${corpsesDecaying}, corpsesGone=${corpsesGone}, rabbitBirths=${rabbitBirths}, mouseBirths=${mouseBirths}, rabbitsSpread=${rabbitsSpread}, miceSpread=${miceSpread}, overgrazedLocations=${overgrazedLocations}, overgrazedResources=${overgrazedResources}, depletedByOvergrazing=${depletedByOvergrazing}, regenerated=${regenerated}, lisovykAwakened=${lisovykAwakened ? 1 : 0}, lisovykSlept=${lisovykSlept ? 1 : 0}, errors=${errors}` } });
    if (botInstance && tickNumber % 5 === 0) {
      const region = await prisma.region.findFirst();
      if (region) await notifyRegion(botInstance, region.id, `🌿 Світ ворухнувся.\n\nПублічний звіт раз на 5 тіків. Поточний тік #${tickNumber}: заплановано рухів — ${queuedMove}, збору — ${queuedGather}, їжі — ${queuedEat}, оглядів — ${queuedLook}, атак — ${queuedAttack}, зайнятих істот — ${skippedBusy}, старість — ${aged}, смертей від старості — ${oldAgeDeaths}, зниклих трупів — ${corpsesGone}, народилося зайченят — ${rabbitBirths}, мишенят — ${mouseBirths}, зайців розбіглося — ${rabbitsSpread}, мишей — ${miceSpread}, об'їдено ресурсів — ${overgrazedResources}, відновлено вузлів — ${regenerated}.`);
    }
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
    `Публічне повідомлення «Світ ворухнувся»: кожні 5 тіків`,
    `Авто-режим: кожні ${timing.autoIntervalTicks} тіків ≈ ${formatDuration(timing.autoIntervalMs)}`,
    `Tick #: ${tickNumber}`,
    "",
    "Дії під час втоми або для істот без quick-режиму:",
    `- quick-дії гравця з витривалістю > 0: ${formatDuration(timing.actions.quickMs)}`,
    `- рух: ${timing.actions.moveTicks} тіків ≈ ${formatDuration(timing.actions.moveMs)}`,
    `- огляд/вистежування: ${timing.actions.lookTicks} тіків ≈ ${formatDuration(timing.actions.lookMs)}`,
    `- збір: ${timing.actions.gatherTicks} тіків ≈ ${formatDuration(timing.actions.gatherMs)}`,
    `- атака: ${timing.actions.attackTicks} тіків ≈ ${formatDuration(timing.actions.attackMs)} (×2 від руху за часом)`,
    "",
    "Відновлення:",
    `- витривалість без відпочинку: +${timing.passiveStaminaRegenAmount} раз на ${timing.staminaRegenTicks} тіків ≈ ${formatDuration(timing.staminaRegenMs)}`,
    `- витривалість під час відпочинку: +${timing.restStaminaRegenAmount} раз на ${timing.restStaminaRegenTicks} тіків ≈ ${formatDuration(timing.restStaminaRegenMs)}`,
    `- HP без відпочинку: +1 раз на ${timing.passiveHealthRegenTicks} тіків ≈ ${formatDuration(timing.passiveHealthRegenMs)}`,
    `- HP під час відпочинку: +1 раз на ${timing.restHealthRegenTicks} тіків ≈ ${formatDuration(timing.restHealthRegenMs)}`,
    "",
    `Регенерація ресурсів: раз на ${RESOURCE_REGEN_EVERY_TICKS} world ticks, +${RESOURCE_REGEN_AMOUNT}`,
    `Розмноження зайців: раз на ${RABBIT_REPRODUCTION_EVERY_TICKS} world ticks; виводок ${RABBIT_MIN_LITTER_SIZE}-${RABBIT_MAX_LITTER_SIZE}; світового ліміту немає`,
    `Розмноження мишей: раз на ${MOUSE_REPRODUCTION_EVERY_TICKS} world ticks; виводок ${MOUSE_MIN_LITTER_SIZE}-${MOUSE_MAX_LITTER_SIZE}; цикл коротший за заячий`,
    `Локальний тиск зайців: м'який поріг ${RABBIT_LOCAL_SOFT_CAP}; вище нього падає шанс народження й запускається розселення`,
    `Розселення зайців: раз на ${RABBIT_SPREAD_EVERY_TICKS} world ticks; до ${RABBIT_MAX_SPREAD_PER_LOCATION} з перенаселеної локації`,
    `Розселення мишей: раз на ${MOUSE_SPREAD_EVERY_TICKS} world ticks; до ${MOUSE_MAX_SPREAD_PER_LOCATION} з перенаселеної локації`,
    `Надмірний випас: від ${OVERGRAZING_RABBIT_THRESHOLD} одиниць травоїдного тиску в локації; 1 заєць = 1, ${MOUSE_OVERGRAZING_PRESSURE_DIVISOR} миші ≈ 1`,
    `Сліди живуть: ${timing.trackTtlTicks} тіків ≈ ${formatDuration(timing.trackTtlMs)}`,
    "",
    "Змінити runtime без рестарту: /tickSet <ms>",
  ].join("\n");
}

function registerTickCommands(bot: Bot) {
  bot.command("tick", async (ctx) => { await worldTick(); await ctx.reply("✅ World tick запущено вручну."); });
  bot.command(["tickGet", "tickget"], async (ctx) => { await ctx.reply(runtimeTickStatusText()); });
  bot.command(["tickSet", "tickset"], async (ctx) => {
    const value = Number(ctx.match?.trim());
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
  });
}

export function startWorldTickLoop(bot?: Bot) {
  botInstance = bot ?? null;
  if (botInstance) registerTickCommands(botInstance);
  restartWorldTickTimer();
}
