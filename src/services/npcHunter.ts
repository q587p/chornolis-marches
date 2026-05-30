import { prisma } from "../db";
import { GATE_CARCASS_DROPOFF_FEATURE_KEY } from "./carcassDropoff";
import { findLocationRoute, type RouteStep } from "./routeFinding";

export const HUNTER_TORCH_BUNDLE_SIZE = 5;
export const HUNTER_RETURN_TORCH_RESERVE = 1;
export const HUNTER_DEFAULT_MAGIC_CAMPFIRE_FEATURE_KEY = "start_unfading_campfire";

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

export function hunterRouteDirections(route: RouteStep[]) {
  return route.map((step) => step.direction);
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
