import { prisma } from "../db";
import { BASE_STAMINA } from "../gameConfig";
import { expireTimedCampfires } from "./fire";

export const CAMPFIRE_REST_STAMINA_REGEN_MULTIPLIER = 3;

export async function getLocationRestStaminaCap(locationId: number | null | undefined, baseMax = BASE_STAMINA) {
  if (!locationId) return baseMax;

  const features = await prisma.locationFeature.findMany({
    where: {
      locationId,
      isActive: true,
      restStaminaCapMultiplier: { not: null },
    },
    select: { restStaminaCapMultiplier: true },
  });

  const multiplier = Math.max(1, ...features.map((feature) => feature.restStaminaCapMultiplier ?? 1));
  return baseMax * multiplier;
}

export async function getPlayerRestStaminaCap(playerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true, staminaMax: true },
  });

  return getLocationRestStaminaCap(player?.currentLocationId, player?.staminaMax ?? BASE_STAMINA);
}

function featureData(feature: { data?: unknown | null }) {
  return feature.data && typeof feature.data === "object" && !Array.isArray(feature.data)
    ? feature.data as Record<string, unknown>
    : {};
}

function restStaminaRegenMultiplierFromData(data: Record<string, unknown>) {
  const value = data.rest_stamina_regen_multiplier ?? data.restStaminaRegenMultiplier;
  const multiplier = Number(value);
  return Number.isFinite(multiplier) && multiplier > 1 ? Math.floor(multiplier) : 1;
}

export async function getLocationRestStaminaRegenMultiplier(locationId: number | null | undefined) {
  if (!locationId) return 1;
  await expireTimedCampfires(locationId);

  const features = await prisma.locationFeature.findMany({
    where: {
      locationId,
      isActive: true,
    },
    select: { type: true, key: true, name: true, providesLight: true, data: true },
  });

  const campfireMultiplier = features.some(isCampfireFeature) ? CAMPFIRE_REST_STAMINA_REGEN_MULTIPLIER : 1;
  return Math.max(campfireMultiplier, ...features.map((feature) => restStaminaRegenMultiplierFromData(featureData(feature))));
}

export async function getPlayerRestStaminaRegenMultiplier(playerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true },
  });

  return getLocationRestStaminaRegenMultiplier(player?.currentLocationId);
}

type CampfireLikeFeature = {
  type: string;
  key?: string | null;
  name?: string | null;
  providesLight?: boolean | null;
};

export function isCampfireFeature(feature: CampfireLikeFeature) {
  if (feature.type === "CAMPFIRE" || feature.type === "MAGIC_CAMPFIRE") return true;
  const key = String(feature.key ?? "").toLowerCase();
  const name = String(feature.name ?? "").toLowerCase();
  return (key.includes("campfire") || key.includes("fire") || name.includes("вогнище")) && Boolean(feature.providesLight);
}

export async function hasActiveCampfire(locationId: number | null | undefined) {
  if (!locationId) return false;
  await expireTimedCampfires(locationId);
  const features = await prisma.locationFeature.findMany({
    where: { locationId, isActive: true },
    select: { type: true, key: true, name: true, providesLight: true },
  });
  return features.some(isCampfireFeature);
}

