import type { Bot } from "grammy";
import { Direction } from "@prisma/client";
import { prisma } from "../db";
import { actionDurationMs, movementDurationMs } from "./actionRules";
import { enqueueCreatureAction } from "./actionLifecycle";
import { GATE_CARCASS_DROPOFF_FEATURE_KEY, getGateHuntingSaturationState, hunterFieldLine, recordNpcCarcassDropoffContribution } from "./carcassDropoff";
import { corpseResourceKey, resourceTypeDisplayName } from "./corpses";
import { notifyLocationAll } from "./notifications";
import { findLocationRoute, type RouteStep } from "./routeFinding";
import { logEvent } from "./worldEvents";

export const HUNTER_TORCH_BUNDLE_SIZE = 5;
export const HUNTER_RETURN_TORCH_RESERVE = 1;
export const HUNTER_DEFAULT_MAGIC_CAMPFIRE_FEATURE_KEY = "start_unfading_campfire";
export const HUNTER_PROFESSION_KEY = "hunter";
export const HUNTER_CLAIMED_CORPSE_PREFIX = "claimed_by_hunter:";
export const HUNTER_CARRIED_TORCH_PREFIX = "hunter_torches:";
export const HUNTER_RETURNING_FOR_TORCHES_MARKER = "hunter_returning_for_torches";
export const HUNTER_GROUND_TORCH_KEYS = ["torch", "lit_torch"] as const;
const HUNTER_PREY_SPECIES_KEYS = ["mouse", "rabbit"] as const;
const HUNTER_ROUTE_MAX_DEPTH = 16;
const HUNTER_PREY_AGE_PRIORITY: Record<string, number> = {
  ADULT: 3,
  OLD: 2,
  YOUNG: 1,
};
const HUNTER_STAND_DOWN_EVENT_TITLE = "Hunter stand-down line";
const HUNTER_STAND_DOWN_LINE_COOLDOWN_MS = 10 * 60 * 1000;

export type HunterRoutePlan = {
  gateLocationId: number;
  campfireLocationId: number;
  dropoffFeatureKey: string;
  campfireFeatureKey: string;
  toCampfire: RouteStep[];
  toGate: RouteStep[];
  totalTravelCost: number;
};

export type HunterRoutePlanResult =
  | { ok: true; plan: HunterRoutePlan }
  | {
      ok: false;
      reason:
        | "missing-dropoff"
        | "missing-campfire"
        | "no-route-to-campfire"
        | "no-route-to-gate";
    };

function routeCost(route: RouteStep[]) {
  return route.reduce((sum, step) => sum + step.travelCost, 0);
}

export function isHunterCreature(creature: { professionKey?: string | null }) {
  return creature.professionKey === HUNTER_PROFESSION_KEY;
}

export function hunterClaimedCorpseAction(hunterId: number) {
  return `${HUNTER_CLAIMED_CORPSE_PREFIX}${hunterId}; мисливець несе здобич до падального рову`;
}

export function hunterClaimedCorpseOwnerId(currentAction: string | null | undefined) {
  if (!currentAction?.startsWith(HUNTER_CLAIMED_CORPSE_PREFIX)) return null;
  const raw = currentAction.slice(HUNTER_CLAIMED_CORPSE_PREFIX.length).split(";")[0];
  const hunterId = Number(raw);
  return Number.isSafeInteger(hunterId) ? hunterId : null;
}

export function isHunterGroundTorchKey(key: string): key is (typeof HUNTER_GROUND_TORCH_KEYS)[number] {
  return (HUNTER_GROUND_TORCH_KEYS as readonly string[]).includes(key);
}

export function hunterCarriedTorchCount(currentAction: string | null | undefined) {
  const match = currentAction?.match(new RegExp(`(?:^|;\\s*)${HUNTER_CARRIED_TORCH_PREFIX}(\\d+)`));
  const count = Number(match?.[1] ?? 0);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

export function hunterTorchCarryAction(count: number, pickedName = "факел", pickedAmount = 1) {
  const safeCount = Math.max(0, Math.min(HUNTER_TORCH_BUNDLE_SIZE, Math.trunc(count)));
  const itemText = pickedAmount > 1 ? `${pickedName} ×${pickedAmount}` : pickedName;
  return `підбирає ${itemText} до мисливського набору; ${HUNTER_CARRIED_TORCH_PREFIX}${safeCount}`;
}

export function hunterReturningForTorchesAction(torchCount = HUNTER_RETURN_TORCH_RESERVE + 1) {
  const safeCount = Math.max(HUNTER_RETURN_TORCH_RESERVE, Math.min(HUNTER_TORCH_BUNDLE_SIZE, Math.trunc(torchCount)));
  return `вертається до воріт із запаленим факелом і запасним у торбі; ${HUNTER_RETURNING_FOR_TORCHES_MARKER}; ${HUNTER_CARRIED_TORCH_PREFIX}${safeCount}`;
}

export function hunterIsReturningForTorches(currentAction: string | null | undefined) {
  return Boolean(currentAction?.includes(HUNTER_RETURNING_FOR_TORCHES_MARKER));
}

export function hunterRouteDirections(route: RouteStep[]) {
  return route.map((step) => step.direction);
}

type HunterPreyCandidate = {
  id: number;
  hp: number;
  age?: string | null;
  species: { key: string };
};

function hunterPreyAgePriority(age?: string | null) {
  return HUNTER_PREY_AGE_PRIORITY[String(age ?? "")] ?? 0;
}

export function sortHunterPreyCandidates<T extends HunterPreyCandidate>(prey: T[]) {
  return [...prey]
    .filter((target) => hunterPreyAgePriority(target.age) > 0)
    .sort((a, b) => {
      const ageDelta = hunterPreyAgePriority(b.age) - hunterPreyAgePriority(a.age);
      if (ageDelta !== 0) return ageDelta;
      const speciesDelta = (b.species.key === "mouse" ? 1 : 0) - (a.species.key === "mouse" ? 1 : 0);
      if (speciesDelta !== 0) return speciesDelta;
      return a.hp - b.hp || a.id - b.id;
    });
}

export function buildHunterRoutePlan(input: {
  gateLocationId: number;
  campfireLocationId: number;
  dropoffFeatureKey?: string;
  campfireFeatureKey?: string;
  toCampfire: RouteStep[] | null;
  toGate: RouteStep[] | null;
}): HunterRoutePlanResult {
  if (!input.toCampfire) return { ok: false, reason: "no-route-to-campfire" };
  if (!input.toGate) return { ok: false, reason: "no-route-to-gate" };

  return {
    ok: true,
    plan: {
      gateLocationId: input.gateLocationId,
      campfireLocationId: input.campfireLocationId,
      dropoffFeatureKey: input.dropoffFeatureKey ?? GATE_CARCASS_DROPOFF_FEATURE_KEY,
      campfireFeatureKey: input.campfireFeatureKey ?? HUNTER_DEFAULT_MAGIC_CAMPFIRE_FEATURE_KEY,
      toCampfire: input.toCampfire,
      toGate: input.toGate,
      totalTravelCost: routeCost(input.toCampfire) + routeCost(input.toGate),
    },
  };
}

export async function findHunterRoutePlan(options: {
  dropoffFeatureKey?: string;
  campfireFeatureKey?: string;
} = {}): Promise<HunterRoutePlanResult> {
  const dropoffFeatureKey = options.dropoffFeatureKey ?? GATE_CARCASS_DROPOFF_FEATURE_KEY;
  const campfireFeatureKey = options.campfireFeatureKey ?? HUNTER_DEFAULT_MAGIC_CAMPFIRE_FEATURE_KEY;

  const [dropoff, campfire] = await Promise.all([
    prisma.locationFeature.findUnique({
      where: { key: dropoffFeatureKey },
      select: { key: true, locationId: true, isActive: true },
    }),
    prisma.locationFeature.findUnique({
      where: { key: campfireFeatureKey },
      select: { key: true, locationId: true, isActive: true, type: true },
    }),
  ]);

  if (!dropoff?.isActive) return { ok: false, reason: "missing-dropoff" };
  if (!campfire?.isActive || campfire.type !== "MAGIC_CAMPFIRE") return { ok: false, reason: "missing-campfire" };

  const [toCampfire, toGate] = await Promise.all([
    findLocationRoute(dropoff.locationId, campfire.locationId),
    findLocationRoute(campfire.locationId, dropoff.locationId),
  ]);

  return buildHunterRoutePlan({
    gateLocationId: dropoff.locationId,
    campfireLocationId: campfire.locationId,
    dropoffFeatureKey,
    campfireFeatureKey,
    toCampfire,
    toGate,
  });
}

type ClaimedCorpse = {
  id: number;
  sex?: string | null;
  species: {
    key: string;
    name: string;
    nameGenitive?: string | null;
    nameDative?: string | null;
    nameAccusative?: string | null;
    nameInstrumental?: string | null;
    nameLocative?: string | null;
    nameVocative?: string | null;
  };
};

export function groupHunterClaimedCorpses(corpses: ClaimedCorpse[]) {
  const groups = new Map<string, { resourceTypeKey: string; amount: number; corpseIds: number[] }>();
  for (const corpse of corpses) {
    const resourceTypeKey = corpseResourceKey(corpse);
    const group = groups.get(resourceTypeKey) ?? { resourceTypeKey, amount: 0, corpseIds: [] };
    group.amount += 1;
    group.corpseIds.push(corpse.id);
    groups.set(resourceTypeKey, group);
  }
  return [...groups.values()];
}

export async function claimedCorpsesForHunter(hunterId: number) {
  return prisma.creature.findMany({
    where: {
      isAlive: false,
      isGone: false,
      isHidden: true,
      currentAction: { startsWith: `${HUNTER_CLAIMED_CORPSE_PREFIX}${hunterId};` },
    },
    include: { species: true },
    orderBy: { id: "asc" },
  });
}

function isTutorialOrDreamRegionKey(key?: string | null) {
  const normalized = String(key ?? "").toLocaleLowerCase("uk-UA");
  return normalized.includes("dream") || normalized.includes("tutorial") || normalized.includes("sleep");
}

async function routeToNearestPreyLocation(fromLocationId: number) {
  const candidates = await prisma.creature.groupBy({
    by: ["locationId"],
    where: {
      isAlive: true,
      isGone: false,
      isHidden: false,
      age: { not: "CHILD" },
      species: { key: { in: [...HUNTER_PREY_SPECIES_KEYS] }, diet: "HERBIVORE" },
    },
    _count: { _all: true },
    orderBy: { _count: { locationId: "desc" } },
    take: 12,
  });

  const locations = await prisma.cellLocation.findMany({
    where: { id: { in: candidates.map((candidate) => candidate.locationId) } },
    include: { region: true },
  });
  const allowedLocationIds = new Set(locations
    .filter((location) => !isTutorialOrDreamRegionKey(location.region.key))
    .map((location) => location.id));

  const routes: { route: RouteStep[]; preyCount: number }[] = [];
  for (const candidate of candidates) {
    if (!allowedLocationIds.has(candidate.locationId) || candidate.locationId === fromLocationId) continue;
    const route = await findLocationRoute(fromLocationId, candidate.locationId, { maxDepth: HUNTER_ROUTE_MAX_DEPTH });
    if (route?.length) routes.push({ route, preyCount: candidate._count._all });
  }

  return routes
    .sort((a, b) => routeCost(a.route) - routeCost(b.route) || b.preyCount - a.preyCount)[0]?.route ?? null;
}

async function selectLocalHunterPrey(locationId: number) {
  const prey = await prisma.creature.findMany({
    where: {
      locationId,
      isAlive: true,
      isGone: false,
      isHidden: false,
      age: { not: "CHILD" },
      species: { key: { in: [...HUNTER_PREY_SPECIES_KEYS] }, diet: "HERBIVORE" },
    },
    include: { species: true },
    orderBy: [{ speciesId: "asc" }, { hp: "asc" }, { id: "asc" }],
    take: 24,
  });

  return sortHunterPreyCandidates(prey)[0] ?? null;
}

async function queueHunterMove(creature: { id: number; stamina: number }, route: RouteStep[], reason: string) {
  const step = route[0];
  if (!step) return "queuedRest";
  await enqueueCreatureAction({
    creatureId: creature.id,
    type: "MOVE",
    payload: { direction: step.direction as Direction, reason },
    durationMs: movementDurationMs(step.travelCost, creature.stamina),
  });
  return "queuedMove";
}

async function depositClaimedCorpses(bot: Bot | null, hunter: { id: number; name?: string | null }, plan: HunterRoutePlan) {
  const corpses = await claimedCorpsesForHunter(hunter.id);
  const groups = groupHunterClaimedCorpses(corpses);
  if (!groups.length) return false;

  for (const group of groups) {
    const result = await recordNpcCarcassDropoffContribution({
      creatureId: hunter.id,
      dropoffFeatureKey: plan.dropoffFeatureKey,
      resourceTypeKey: group.resourceTypeKey,
      amount: group.amount,
    });
    await prisma.creature.updateMany({
      where: { id: { in: group.corpseIds } },
      data: {
        locationId: plan.gateLocationId,
        isGone: true,
        corpseDecayTicksLeft: 0,
        currentAction: `залишено в падальному рові мисливцем:${hunter.id}`,
      },
    });
    await logEvent("NPC_ACTION", "Hunter deposited claimed carcasses", `${hunter.id}; ${group.resourceTypeKey} ×${group.amount}`, plan.gateLocationId);
    if (bot) await notifyLocationAll(bot, plan.gateLocationId, `${result.observerText}\n\n${hunter.name ?? "Мисливець"} промовляє:\n“${result.fieldLine}”`);
  }

  return true;
}

async function pickUpVisibleGroundTorch(bot: Bot | null, hunter: { id: number; locationId: number; currentAction?: string | null; name?: string | null }) {
  const carried = hunterCarriedTorchCount(hunter.currentAction);
  const remaining = HUNTER_TORCH_BUNDLE_SIZE - carried;
  if (remaining <= 0) return false;

  const picked = await prisma.$transaction(async (tx) => {
    const node = await tx.resourceNode.findFirst({
      where: {
        locationId: hunter.locationId,
        amount: { gt: 0 },
        resourceType: { key: { in: [...HUNTER_GROUND_TORCH_KEYS] } },
      },
      include: { resourceType: true },
      orderBy: { id: "asc" },
    });
    if (!node || !isHunterGroundTorchKey(node.resourceType.key)) return null;

    const amount = Math.min(remaining, node.amount);
    const updated = await tx.resourceNode.updateMany({
      where: { id: node.id, amount: { gte: amount } },
      data: { amount: { decrement: amount } },
    });
    if (updated.count === 0) return null;

    const name = resourceTypeDisplayName(node.resourceType);
    const nextCount = carried + amount;
    await tx.creature.updateMany({
      where: { id: hunter.id, isAlive: true, isGone: false },
      data: { currentAction: hunterTorchCarryAction(nextCount, name, amount) },
    });

    return { key: node.resourceType.key, name, amount, nextCount };
  });

  if (!picked) return false;
  await logEvent("NPC_ACTION", "Hunter picked up ground torch", `${hunter.id}; ${picked.key} ×${picked.amount}; carried=${picked.nextCount}`, hunter.locationId);
  if (bot) {
    const itemText = picked.amount > 1 ? `${picked.name} ×${picked.amount}` : picked.name;
    await notifyLocationAll(bot, hunter.locationId, `${hunter.name ?? "Мисливець"} підбирає ${itemText} із землі й чіпляє до мисливського набору.`);
  }
  return true;
}

async function resupplyHunterTorchesAtGate(bot: Bot | null, hunter: { id: number; locationId: number; name?: string | null }, plan: HunterRoutePlan) {
  if (hunter.locationId !== plan.gateLocationId) return false;
  await prisma.creature.updateMany({
    where: { id: hunter.id, isAlive: true, isGone: false },
    data: { currentAction: `поповнює мисливський набір біля воріт; ${HUNTER_CARRIED_TORCH_PREFIX}${HUNTER_TORCH_BUNDLE_SIZE}` },
  });
  await logEvent("NPC_ACTION", "Hunter resupplied torches at gate", `${hunter.id}; carried=${HUNTER_TORCH_BUNDLE_SIZE}`, hunter.locationId);
  if (bot) await notifyLocationAll(bot, hunter.locationId, `${hunter.name ?? "Мисливець"} поповнює мисливський набір біля воріт.`);
  return true;
}

async function queueHunterStandDown(bot: Bot | null, hunter: { id: number; locationId: number; stamina: number; name?: string | null; steps?: number | null }, plan: HunterRoutePlan) {
  if (hunter.locationId !== plan.campfireLocationId) {
    const route = await findLocationRoute(hunter.locationId, plan.campfireLocationId, { maxDepth: HUNTER_ROUTE_MAX_DEPTH });
    if (route?.length) return queueHunterMove(hunter, route, "йде перечекати біля межового вогню");
  }

  const since = new Date(Date.now() - HUNTER_STAND_DOWN_LINE_COOLDOWN_MS);
  const recentLine = await prisma.worldEvent.findFirst({
    where: {
      title: HUNTER_STAND_DOWN_EVENT_TITLE,
      description: String(hunter.id),
      createdAt: { gte: since },
    },
    select: { id: true },
  });

  if (!recentLine) {
    await prisma.worldEvent.create({
      data: {
        type: "NPC_ACTION",
        title: HUNTER_STAND_DOWN_EVENT_TITLE,
        description: String(hunter.id),
        locationId: hunter.locationId,
      },
    });
    await enqueueCreatureAction({
      creatureId: hunter.id,
      type: "SAY",
      payload: { text: hunterFieldLine("standDown", hunter.id + (hunter.steps ?? 0)) },
      durationMs: actionDurationMs("SAY", hunter.stamina),
    });
    return "queuedSay";
  }

  await enqueueCreatureAction({
    creatureId: hunter.id,
    type: "REST",
    payload: {},
    durationMs: actionDurationMs("REST", hunter.stamina),
  });
  return "queuedRest";
}

export async function tickNpcHunter(bot: Bot | null, hunter: any) {
  if (!isHunterCreature(hunter)) return "queuedRest";

  const planResult = await findHunterRoutePlan();
  if (!planResult.ok) {
    await enqueueCreatureAction({
      creatureId: hunter.id,
      type: "LOOK",
      payload: { reason: "перевіряє шлях до воріт і вогнища" },
      durationMs: actionDurationMs("LOOK", hunter.stamina),
    });
    return "queuedLook";
  }

  const plan = planResult.plan;
  const claimed = await claimedCorpsesForHunter(hunter.id);
  const returningForTorches = hunterIsReturningForTorches(hunter.currentAction);

  if (hunter.locationId === plan.gateLocationId && claimed.length > 0) {
    await depositClaimedCorpses(bot, hunter, plan);
    await enqueueCreatureAction({
      creatureId: hunter.id,
      type: "SAY",
      payload: { text: hunterFieldLine("deposit", hunter.kills ?? claimed.length) },
      durationMs: actionDurationMs("SAY", hunter.stamina),
    });
    return "queuedSay";
  }

  if (claimed.length > 0 && hunter.locationId !== plan.gateLocationId) {
    const route = await findLocationRoute(hunter.locationId, plan.gateLocationId, { maxDepth: HUNTER_ROUTE_MAX_DEPTH });
    if (route?.length) return queueHunterMove(hunter, route, "несе здобич до падального рову");
  }

  if (returningForTorches && await resupplyHunterTorchesAtGate(bot, hunter, plan)) return "queuedGather";

  if (await pickUpVisibleGroundTorch(bot, hunter)) return "queuedGather";

  const saturation = await getGateHuntingSaturationState(plan.dropoffFeatureKey);
  if (saturation.active) return queueHunterStandDown(bot, hunter, plan);

  const prey = await selectLocalHunterPrey(hunter.locationId);
  if (prey) {
    await enqueueCreatureAction({
      creatureId: hunter.id,
      type: "ATTACK",
      payload: { targetType: "creature", targetId: prey.id, mode: "hunter" },
      durationMs: actionDurationMs("ATTACK", hunter.stamina),
      interruptQueued: true,
    });
    return "queuedAttack";
  }

  if (returningForTorches && hunter.locationId !== plan.gateLocationId) {
    const route = await findLocationRoute(hunter.locationId, plan.gateLocationId, { maxDepth: HUNTER_ROUTE_MAX_DEPTH });
    if (route?.length) return queueHunterMove(hunter, route, "вертається до воріт за новими факелами");
  }

  const shouldReachCampfireFirst = hunter.locationId !== plan.campfireLocationId
    && (hunter.locationId === plan.gateLocationId || String(hunter.currentAction ?? "").includes("межового вогню"));
  if (shouldReachCampfireFirst) {
    const route = await findLocationRoute(hunter.locationId, plan.campfireLocationId, { maxDepth: HUNTER_ROUTE_MAX_DEPTH });
    if (route?.length) {
      if (bot && hunter.locationId === plan.gateLocationId) await notifyLocationAll(bot, hunter.locationId, `${hunter.name ?? "Мисливець"} промовляє:\n“${hunterFieldLine("departure", hunter.id)}”`);
      return queueHunterMove(hunter, route, "йде від воріт до межового вогню");
    }
  }

  const preyRoute = await routeToNearestPreyLocation(hunter.locationId);
  if (preyRoute?.length) {
    if (bot && hunter.locationId === plan.campfireLocationId) await notifyLocationAll(bot, hunter.locationId, `${hunter.name ?? "Мисливець"} промовляє:\n“${hunterFieldLine("trail", hunter.id + (hunter.steps ?? 0))}”`);
    return queueHunterMove(hunter, preyRoute, "шукає гризунів і зайців");
  }

  if (hunter.locationId !== plan.gateLocationId) {
    const route = await findLocationRoute(hunter.locationId, plan.gateLocationId, { maxDepth: HUNTER_ROUTE_MAX_DEPTH });
    if (route?.length) {
      if (bot) await notifyLocationAll(bot, hunter.locationId, `${hunter.name ?? "Мисливець"} промовляє:\n“${hunterFieldLine("giveUp", hunter.id + (hunter.steps ?? 0))}”`);
      return queueHunterMove(hunter, route, "вертається до воріт без здобичі");
    }
  }

  await enqueueCreatureAction({
    creatureId: hunter.id,
    type: "REST",
    payload: {},
    durationMs: actionDurationMs("REST", hunter.stamina),
  });
  return "queuedRest";
}
