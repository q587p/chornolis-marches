import { prisma } from "../db";

type RegionLike = {
  key?: string | null;
  name?: string | null;
};

type FeatureLike = {
  type?: string | null;
  isActive?: boolean | null;
};

type LocationLike = {
  region?: RegionLike | null;
  features?: FeatureLike[] | null;
};

export function isLisovykForbiddenRegion(region?: RegionLike | null) {
  if (!region) return false;
  const key = String(region.key ?? "").toLowerCase();
  const name = String(region.name ?? "").toLowerCase();
  return key === "old_bridge" || key === "dream_tutorial" || key.includes("bridge") || key.includes("tutorial") || name.includes("міст");
}

export function hasActiveMagicCampfire(features?: FeatureLike[] | null) {
  return Boolean(features?.some((feature) => feature.type === "MAGIC_CAMPFIRE" && feature.isActive !== false));
}

export function isLisovykForbiddenLocation(location?: LocationLike | null) {
  if (!location) return false;
  return isLisovykForbiddenRegion(location.region) || hasActiveMagicCampfire(location.features);
}

export function filterLisovykAllowedLocations<T extends LocationLike>(locations: T[]) {
  return locations.filter((location) => !isLisovykForbiddenLocation(location));
}

export async function canLisovykEnterLocation(locationId: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      region: true,
      features: { where: { isActive: true, type: "MAGIC_CAMPFIRE" } },
    },
  });
  return !isLisovykForbiddenLocation(location);
}
