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
