import { prisma } from "../db";
import { BASE_STAMINA } from "../gameConfig";

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
  const features = await prisma.locationFeature.findMany({
    where: { locationId, isActive: true },
    select: { type: true, key: true, name: true, providesLight: true },
  });
  return features.some(isCampfireFeature);
}

