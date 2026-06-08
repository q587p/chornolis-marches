import { Bot } from "grammy";
import { CreatureAge, CreatureSex, Direction } from "@prisma/client";
import { prisma } from "../db";
import {
  POPULATION_FLOOR_GROUPS,
  POPULATION_FLOOR_SPECIES_KEYS,
  planPopulationFloorRestoration,
  type PopulationFloorCreateRow,
} from "./populationRestoration";
import { findLocationRoute, type RouteStep } from "./routeFinding";
import { canCreatureUseExit, creatureUsableExits } from "./creatureMovement";
import { isLisovykForbiddenLocation } from "./lisovykBoundaries";
import { actionDurationMs, movementDurationMs } from "./actionRules";
import { enqueueCreatureAction, hasActiveCreatureActions } from "./actionLifecycle";
import { POPULATION_FLOOR_RESTORED_EVENT_TITLE } from "./ecologyStats";

export const LISOVYK_NAME = "Дід лісовик";
export const LISOVYK_LEGACY_NAMES = ["Дід Чорноліс"] as const;
export const LISOVYK_RESTORATION_MARKER = "lisovyk_restoration:v1";
export const LISOVYK_RESTORATION_EVENT_TITLE = POPULATION_FLOOR_RESTORED_EVENT_TITLE;
export const LISOVYK_RESTORATION_FRIGHT_EVENT_TITLE = "Лісовик зрушив звіра";
export const LISOVYK_ROUTE_MAX_DEPTH = 90;
export const LISOVYK_HOME_LOCATION_KEY = "forest_00_00";
export const LISOVYK_SETTLE_TICKS = 1;
export const LISOVYK_FRIGHT_CHANCE = 0.25;
export const LISOVYK_FRIGHT_PRIORITY = 55;

type PopulationFloorSpecies = Parameters<typeof planPopulationFloorRestoration>[0]["species"][number];
type PopulationFloorLocation = Parameters<typeof planPopulationFloorRestoration>[0]["locations"][number];

export type LisovykRestorationLivingCreature = {
  speciesKey: string;
  locationKey: string;
  age: CreatureAge;
  sex: CreatureSex | null;
};

export type LisovykRestorationState = {
  speciesKey: string;
  locationKey: string;
  phase: "travel" | "restore" | "settle" | "return";
  settleTicks: number;
  frightCooldown: number;
};

export type LisovykRestorationTarget = Pick<LisovykRestorationState, "speciesKey" | "locationKey"> & {
  locationId: number;
  age: Exclude<CreatureAge, "CORPSE">;
  sex: CreatureSex | null;
  expectedCount: number;
  missingCount: number;
  rows: PopulationFloorCreateRow[];
};

const SPECIES_TARGET_PRIORITY = new Map<string, number>(POPULATION_FLOOR_SPECIES_KEYS.map((key, index) => [key, index]));
const AGE_TARGET_PRIORITY = new Map<CreatureAge, number>([
  ["ADULT", 0],
  ["YOUNG", 1],
  ["CHILD", 2],
  ["OLD", 3],
  ["CORPSE", 999],
]);

function groupSignature(input: {
  speciesKey: string;
  locationKey: string;
  age: CreatureAge | string;
  sex?: CreatureSex | null;
}) {
  return [input.speciesKey, input.locationKey, input.age, input.sex ?? "any"].join(":");
}

function livingCountsBySpecies(livingCreatures: LisovykRestorationLivingCreature[]) {
  const counts = new Map<string, number>();
  for (const creature of livingCreatures) {
    counts.set(creature.speciesKey, (counts.get(creature.speciesKey) ?? 0) + 1);
  }
  return counts;
}

function livingBreedingBySpecies(livingCreatures: LisovykRestorationLivingCreature[]) {
  const counts = new Map<string, { adultFemales: number; adultMales: number }>();
  for (const creature of livingCreatures) {
    if (creature.age !== "ADULT") continue;
    const breeding = counts.get(creature.speciesKey) ?? { adultFemales: 0, adultMales: 0 };
    if (creature.sex === "FEMALE") breeding.adultFemales++;
    if (creature.sex === "MALE") breeding.adultMales++;
    counts.set(creature.speciesKey, breeding);
  }
  return counts;
}

function livingCountsByGroup(livingCreatures: LisovykRestorationLivingCreature[]) {
  const counts = new Map<string, number>();
  for (const creature of livingCreatures) {
    const exact = groupSignature(creature);
    counts.set(exact, (counts.get(exact) ?? 0) + 1);
    const anySex = groupSignature({ ...creature, sex: null });
    counts.set(anySex, (counts.get(anySex) ?? 0) + 1);
  }
  return counts;
}

export function formatLisovykRestorationAction(
  state: Partial<LisovykRestorationState> & Pick<LisovykRestorationState, "speciesKey" | "locationKey">,
  visibleAction: string,
) {
  const phase = state.phase ?? "travel";
  const settleTicks = Math.max(0, Math.floor(state.settleTicks ?? 0));
  const frightCooldown = Math.max(0, Math.floor(state.frightCooldown ?? 0));
  return `${LISOVYK_RESTORATION_MARKER};species=${state.speciesKey};location=${state.locationKey};phase=${phase};settle=${settleTicks};fright=${frightCooldown}; ${visibleAction}`;
}

export function stripLisovykRestorationActionMarker(action: string | null | undefined) {
  return action?.replace(/^lisovyk_restoration:v1;species=[A-Za-z0-9_-]+;location=[A-Za-z0-9_-]+;(?:phase=(?:travel|restore|settle|return);settle=\d+;fright=\d+;)?\s*/, "");
}

export function parseLisovykRestorationState(action: string | null | undefined): LisovykRestorationState | null {
  const match = String(action ?? "").match(/^lisovyk_restoration:v1;species=([A-Za-z0-9_-]+);location=([A-Za-z0-9_-]+);(?:phase=(travel|restore|settle|return);settle=(\d+);fright=(\d+);)?/);
  if (!match) return null;
  return {
    speciesKey: match[1],
    locationKey: match[2],
    phase: (match[3] ?? "travel") as LisovykRestorationState["phase"],
    settleTicks: Math.max(0, Number(match[4] ?? 0)),
    frightCooldown: Math.max(0, Number(match[5] ?? 0)),
  };
}

export function lisovykRestorationTravelAction(target: Partial<LisovykRestorationState> & Pick<LisovykRestorationState, "speciesKey" | "locationKey">) {
  return formatLisovykRestorationAction({ ...target, phase: "travel" }, "іде старим звіриним слідом");
}

export function lisovykRestorationReturnAction(target: Partial<LisovykRestorationState> & Pick<LisovykRestorationState, "speciesKey" | "locationKey">) {
  return formatLisovykRestorationAction({ ...target, phase: "return" }, "вертається до старого коріння");
}

export function lisovykRestorationArrivalAction(target: Partial<LisovykRestorationState> & Pick<LisovykRestorationState, "speciesKey" | "locationKey">) {
  return formatLisovykRestorationAction({ ...target, phase: "restore" }, "присідає біля старого звіриного сліду");
}

export function lisovykRestorationSettleAction(target: Partial<LisovykRestorationState> & Pick<LisovykRestorationState, "speciesKey" | "locationKey">) {
  return formatLisovykRestorationAction({ ...target, phase: "settle" }, "прислухається до поверненого шарудіння");
}

export function lisovykRestorationCompleteAction(target?: Partial<LisovykRestorationState> & Pick<LisovykRestorationState, "speciesKey" | "locationKey">) {
  return target ? lisovykRestorationSettleAction(target) : "прислухається до поверненого шарудіння";
}

export function planLisovykRestorationTarget(input: {
  groups?: typeof POPULATION_FLOOR_GROUPS;
  species: PopulationFloorSpecies[];
  locations: PopulationFloorLocation[];
  livingCreatures: LisovykRestorationLivingCreature[];
}): LisovykRestorationTarget | null {
  const livingCounts = livingCountsBySpecies(input.livingCreatures);
  const livingBreeding = livingBreedingBySpecies(input.livingCreatures);
  const groupCounts = livingCountsByGroup(input.livingCreatures);
  const candidates: LisovykRestorationTarget[] = [];

  for (const group of input.groups ?? POPULATION_FLOOR_GROUPS) {
    if (group.age === "CORPSE") continue;
    const localLiving = groupCounts.get(groupSignature(group)) ?? 0;
    const missingCount = Math.max(0, group.count - localLiving);
    if (missingCount <= 0) continue;

    const plan = planPopulationFloorRestoration({
      groups: [group],
      species: input.species,
      locations: input.locations,
      livingCountsBySpeciesKey: livingCounts,
      livingBreedingBySpeciesKey: livingBreeding,
    });
    if (plan.rows.length === 0) continue;

    candidates.push({
      speciesKey: group.speciesKey,
      locationKey: group.locationKey,
      locationId: plan.rows[0].locationId,
      age: group.age,
      sex: group.sex ?? null,
      expectedCount: group.count,
      missingCount,
      rows: plan.rows,
    });
  }

  return candidates.sort((a, b) => {
    const species = (SPECIES_TARGET_PRIORITY.get(a.speciesKey) ?? 999) - (SPECIES_TARGET_PRIORITY.get(b.speciesKey) ?? 999);
    if (species !== 0) return species;
    const age = (AGE_TARGET_PRIORITY.get(a.age) ?? 999) - (AGE_TARGET_PRIORITY.get(b.age) ?? 999);
    if (age !== 0) return age;
    return b.missingCount - a.missingCount || a.locationKey.localeCompare(b.locationKey);
  })[0] ?? null;
}

export function lisovykTravelPlan(input: {
  currentLocationId: number;
  target: LisovykRestorationTarget;
  route: RouteStep[] | null;
}) {
  if (input.currentLocationId === input.target.locationId) return { kind: "arrived" as const, target: input.target };
  if (!input.route?.length) return { kind: "noRoute" as const, target: input.target };
  return { kind: "travel" as const, target: input.target, route: input.route };
}

async function loadRestorationTargetFromDb(state?: LisovykRestorationState | null) {
  const [species, locations, livingCreatures] = await Promise.all([
    prisma.creatureSpecies.findMany({
      where: { key: { in: POPULATION_FLOOR_SPECIES_KEYS }, kind: "ANIMAL" },
      select: { id: true, key: true, kind: true, baseHp: true, childTicks: true, youngTicks: true, adultTicks: true },
    }),
    prisma.cellLocation.findMany({
      where: { key: { in: [...new Set(POPULATION_FLOOR_GROUPS.map((group) => group.locationKey))] } },
      select: {
        id: true,
        key: true,
        region: true,
        features: { where: { isActive: true, type: "MAGIC_CAMPFIRE" } },
      },
    }),
    prisma.creature.findMany({
      where: { isAlive: true, isGone: false, species: { key: { in: POPULATION_FLOOR_SPECIES_KEYS }, kind: "ANIMAL" } },
      select: { age: true, sex: true, species: { select: { key: true } }, location: { select: { key: true } } },
    }),
  ]);

  const allowedLocations = locations.filter((location) => !isLisovykForbiddenLocation(location));
  const living = livingCreatures.map((creature) => ({
    speciesKey: creature.species.key,
    locationKey: creature.location.key,
    age: creature.age,
    sex: creature.sex,
  }));

  if (state) {
    const groups = POPULATION_FLOOR_GROUPS.filter((item) =>
      item.speciesKey === state.speciesKey
      && item.locationKey === state.locationKey
      && item.age !== "CORPSE"
    );
    if (!groups.length) return null;
    return planLisovykRestorationTarget({
      groups,
      species,
      locations: allowedLocations,
      livingCreatures: living,
    });
  }

  return planLisovykRestorationTarget({ species, locations: allowedLocations, livingCreatures: living });
}

async function queueLisovykMove(creature: { id: number; stamina: number }, route: RouteStep[], reason: string) {
  const step = route[0];
  if (!step) return "queuedLook";
  await enqueueCreatureAction({
    creatureId: creature.id,
    type: "MOVE",
    payload: { direction: step.direction as Direction, reason },
    durationMs: movementDurationMs(step.travelCost, creature.stamina),
  });
  return "queuedMove";
}

async function queueLisovykLook(creature: { id: number; stamina: number }, reason: string) {
  await enqueueCreatureAction({
    creatureId: creature.id,
    type: "LOOK",
    payload: { reason },
    durationMs: actionDurationMs("LOOK", creature.stamina),
  });
  return "queuedLook";
}

async function lisovykHomeLocationId() {
  const location = await prisma.cellLocation.findUnique({
    where: { key: LISOVYK_HOME_LOCATION_KEY },
    select: { id: true },
  });
  return location?.id ?? null;
}

async function queueLisovykReturn(creature: { id: number; locationId: number; stamina: number }, state: LisovykRestorationState) {
  const homeLocationId = await lisovykHomeLocationId();
  if (!homeLocationId) return null;
  if (creature.locationId === homeLocationId) {
    await prisma.creature.updateMany({
      where: { id: creature.id },
      data: { activity: "LOOKING", currentAction: "прислухається до старого коріння" },
    });
    return "queuedLook";
  }
  const route = await findLocationRoute(creature.locationId, homeLocationId, { maxDepth: LISOVYK_ROUTE_MAX_DEPTH });
  if (!route?.length) return queueLisovykLook(creature, "шукає шлях до старого коріння");
  return queueLisovykMove(creature, route, lisovykRestorationReturnAction(state));
}

export async function wakeLisovykForStarterAnimalRestorationIfNeeded() {
  const species = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" } });
  if (!species) return false;

  const existing = await prisma.creature.findFirst({
    where: { speciesId: species.id, name: { in: [LISOVYK_NAME, ...LISOVYK_LEGACY_NAMES] } },
    include: { location: true },
    orderBy: { id: "asc" },
  });
  if (existing && existing.isAlive && !existing.isHidden && existing.activity !== "SLEEPING") {
    if (parseLisovykRestorationState(existing.currentAction)) return true;
    if (String(existing.currentAction ?? "").includes("зник ресурс")) return false;
  }

  const target = await loadRestorationTargetFromDb();
  if (!target) return false;
  const startLocationId = existing?.locationId ?? target.locationId;
  const route = await findLocationRoute(startLocationId, target.locationId, { maxDepth: LISOVYK_ROUTE_MAX_DEPTH });
  if (startLocationId !== target.locationId && !route?.length) return false;

  const data = {
    isAlive: true,
    isGone: false,
    isHidden: false,
    hp: species.baseHp,
    maxHp: species.baseHp,
    activity: startLocationId === target.locationId ? "LOOKING" as const : "MOVING" as const,
    currentAction: startLocationId === target.locationId ? lisovykRestorationArrivalAction(target) : lisovykRestorationTravelAction(target),
    locationId: startLocationId,
    name: LISOVYK_NAME,
  };

  if (existing) {
    await prisma.creature.updateMany({ where: { id: existing.id }, data });
  } else {
    await prisma.creature.create({ data: { ...data, speciesId: species.id } });
  }

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Лісовик почув порожній слід",
      description: `${LISOVYK_RESTORATION_MARKER};species=${target.speciesKey};location=${target.locationKey};missing=${target.missingCount};bounded=one-starter-group`,
      locationId: startLocationId,
    },
  });
  return true;
}

export async function hasActiveLisovykRestorationWalk() {
  const species = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" }, select: { id: true } });
  if (!species) return false;
  const lisovyk = await prisma.creature.findFirst({
    where: { speciesId: species.id, name: { in: [LISOVYK_NAME, ...LISOVYK_LEGACY_NAMES] }, isAlive: true, isGone: false, isHidden: false },
    select: { currentAction: true },
  });
  return Boolean(parseLisovykRestorationState(lisovyk?.currentAction));
}

export async function restoreLisovykStarterAnimalGroup(creature: { id: number; locationId: number; currentAction?: string | null }) {
  const state = parseLisovykRestorationState(creature.currentAction);
  const target = await loadRestorationTargetFromDb(state);
  if (!target || target.locationId !== creature.locationId || target.rows.length === 0) {
    await prisma.creature.updateMany({ where: { id: creature.id }, data: { activity: "LOOKING", currentAction: "слухає, чи вернувся звіриний слід" } });
    return { restored: 0, target };
  }

  await prisma.creature.createMany({ data: target.rows });
  const settleState = {
    speciesKey: target.speciesKey,
    locationKey: target.locationKey,
    phase: "settle" as const,
    settleTicks: 0,
    frightCooldown: state?.frightCooldown ?? 0,
  };
  await prisma.creature.updateMany({
    where: { id: creature.id },
    data: { activity: "LOOKING", currentAction: lisovykRestorationCompleteAction(settleState) },
  });
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: LISOVYK_RESTORATION_EVENT_TITLE,
      description: `Restored animal population floor by lisovyk: ${target.speciesKey}=${target.rows.length}; location=${target.locationKey}; bounded=one-starter-group.`,
      locationId: creature.locationId,
    },
  });

  return { restored: target.rows.length, target };
}

export async function tickLisovykRestoration(_bot: Bot | null, creature: any) {
  const state = parseLisovykRestorationState(creature.currentAction);
  if (state?.phase === "return") return queueLisovykReturn(creature, state);

  if (state?.phase === "settle") {
    if (state.settleTicks < LISOVYK_SETTLE_TICKS) {
      const nextState = { ...state, settleTicks: state.settleTicks + 1 };
      await prisma.creature.updateMany({
        where: { id: creature.id },
        data: { activity: "LOOKING", currentAction: lisovykRestorationSettleAction(nextState) },
      });
      return queueLisovykLook(creature, lisovykRestorationSettleAction(nextState));
    }

    const nextTarget = await loadRestorationTargetFromDb();
    if (nextTarget) {
      await prisma.creature.updateMany({
        where: { id: creature.id },
        data: { activity: "MOVING", currentAction: lisovykRestorationTravelAction({ ...nextTarget, frightCooldown: state.frightCooldown }) },
      });
      const route = await findLocationRoute(creature.locationId, nextTarget.locationId, { maxDepth: LISOVYK_ROUTE_MAX_DEPTH });
      if (creature.locationId === nextTarget.locationId) {
        const result = await restoreLisovykStarterAnimalGroup({
          id: creature.id,
          locationId: creature.locationId,
          currentAction: lisovykRestorationArrivalAction({ ...nextTarget, frightCooldown: state.frightCooldown }),
        });
        return result.restored > 0 ? "queuedLook" : null;
      }
      if (route?.length) return queueLisovykMove(creature, route, lisovykRestorationTravelAction({ ...nextTarget, frightCooldown: state.frightCooldown }));
    }

    return queueLisovykReturn(creature, { ...state, phase: "return", settleTicks: 0 });
  }

  const target = await loadRestorationTargetFromDb(state);
  if (!target) {
    if (state) {
      return queueLisovykReturn(creature, { ...state, phase: "return", settleTicks: 0 });
    }
    return null;
  }

  if (!state) {
    await prisma.creature.updateMany({
      where: { id: creature.id },
      data: { activity: "MOVING", currentAction: lisovykRestorationTravelAction(target) },
    });
  }

  if (creature.locationId === target.locationId) {
    const result = await restoreLisovykStarterAnimalGroup({ id: creature.id, locationId: creature.locationId, currentAction: lisovykRestorationArrivalAction({ ...target, frightCooldown: state?.frightCooldown ?? 0 }) });
    return result.restored > 0 ? "queuedLook" : null;
  }

  const route = await findLocationRoute(creature.locationId, target.locationId, { maxDepth: LISOVYK_ROUTE_MAX_DEPTH });
  const travel = lisovykTravelPlan({ currentLocationId: creature.locationId, target, route });
  if (travel.kind !== "travel") return queueLisovykLook(creature, "шукає старий звіриний слід");

  return queueLisovykMove(creature, travel.route, lisovykRestorationTravelAction({ ...target, frightCooldown: state?.frightCooldown ?? 0 }));
}

export function lisovykFrightPlan(input: {
  random: number;
  recentFright: boolean;
  hasPlayers: boolean;
  candidates: Array<{
    id: number;
    locationId: number;
    stamina: number;
    isAlive: boolean;
    isGone: boolean;
    isHidden: boolean;
    age: CreatureAge;
    species: { key: string; kind: string | null };
  }>;
  exits: Array<{ direction: Direction; toLocationId: number; travelCost?: number | null; isHidden?: boolean | null }>;
}) {
  if (input.random >= LISOVYK_FRIGHT_CHANCE) return null;
  if (input.recentFright || input.hasPlayers) return null;
  const exit = input.exits.find((item) => !item.isHidden);
  if (!exit) return null;
  const candidate = input.candidates.find((creature) =>
    creature.isAlive
    && !creature.isGone
    && !creature.isHidden
    && creature.age !== "CORPSE"
    && creature.species.kind === "ANIMAL"
    && creature.locationId !== exit.toLocationId
  );
  if (!candidate) return null;
  return { creature: candidate, exit };
}

export async function maybeQueueLisovykFrightAfterMove(input: {
  lisovykId: number;
  locationId: number;
  random?: () => number;
}) {
  const [lisovyk, recentFright, players, candidates, exits] = await Promise.all([
    prisma.creature.findUnique({
      where: { id: input.lisovykId },
      select: { currentAction: true },
    }),
    prisma.worldEvent.findFirst({
      where: {
        title: LISOVYK_RESTORATION_FRIGHT_EVENT_TITLE,
        locationId: input.locationId,
        description: { contains: `lisovyk=${input.lisovykId}` },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.player.count({ where: { currentLocationId: input.locationId } }),
    prisma.creature.findMany({
      where: {
        locationId: input.locationId,
        isAlive: true,
        isGone: false,
        isHidden: false,
        species: { kind: "ANIMAL" },
      },
      include: { species: true },
      orderBy: [{ speciesId: "asc" }, { id: "asc" }],
      take: 12,
    }),
    prisma.locationExit.findMany({
      where: { fromLocationId: input.locationId, isHidden: false },
      orderBy: [{ direction: "asc" }],
    }),
  ]);
  const state = parseLisovykRestorationState(lisovyk?.currentAction);
  if (!state) return false;
  if (state.frightCooldown > 0) {
    const visible = stripLisovykRestorationActionMarker(lisovyk?.currentAction) ?? "іде старим звіриним слідом";
    await prisma.creature.updateMany({
      where: { id: input.lisovykId },
      data: { currentAction: formatLisovykRestorationAction({ ...state, frightCooldown: state.frightCooldown - 1 }, visible) },
    });
    return false;
  }

  const plan = lisovykFrightPlan({
    random: input.random?.() ?? Math.random(),
    recentFright: Boolean(recentFright),
    hasPlayers: players > 0,
    candidates,
    exits: creatureUsableExits(candidates[0] ?? { species: { kind: "ANIMAL" } }, exits),
  });
  if (!plan) return false;
  if (!canCreatureUseExit(plan.creature, plan.exit)) return false;
  if (await hasActiveCreatureActions(plan.creature.id)) return false;

  await prisma.creature.updateMany({
    where: { id: plan.creature.id, isAlive: true, isGone: false },
    data: { activity: "MOVING", currentAction: "лякається важкого кроку Діда лісовика" },
  });
  await enqueueCreatureAction({
    creatureId: plan.creature.id,
    type: "MOVE",
    payload: { direction: plan.exit.direction, reason: "лякається важкого кроку Діда лісовика" },
    durationMs: movementDurationMs(plan.exit.travelCost ?? 1, plan.creature.stamina),
    priority: LISOVYK_FRIGHT_PRIORITY,
  });
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: LISOVYK_RESTORATION_FRIGHT_EVENT_TITLE,
      description: `lisovyk=${input.lisovykId}; creature=${plan.creature.id}; direction=${plan.exit.direction}; guarded=no-player-location`,
      locationId: input.locationId,
    },
  });
  const visible = stripLisovykRestorationActionMarker(lisovyk?.currentAction) ?? "іде старим звіриним слідом";
  await prisma.creature.updateMany({
    where: { id: input.lisovykId },
    data: { currentAction: formatLisovykRestorationAction({ ...state, frightCooldown: 1 }, visible) },
  });
  return true;
}
