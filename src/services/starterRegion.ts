export const STARTER_CAMP_REGION_KEY = "starter_camp";

export const STARTER_CAMP_LOCATION_KEYS = [
  "start_border_camp",
  "start_border_watchtower",
  "start_border_cellar",
] as const;

const STARTER_CAMP_LOCATION_KEY_SET = new Set<string>(STARTER_CAMP_LOCATION_KEYS);

export function isStarterCampRegionKey(regionKey: string | null | undefined) {
  return regionKey === STARTER_CAMP_REGION_KEY;
}

export function isStarterCampLocationKey(locationKey: string | null | undefined) {
  return Boolean(locationKey && STARTER_CAMP_LOCATION_KEY_SET.has(locationKey));
}
