export const CAMP_SPIRIT_CAT_SPECIES_KEY = "camp_spirit_cat";
export const CAMP_SPIRIT_CAT_NAME = "Кіт-бережник";
export const CAMP_SPIRIT_CAT_START_LOCATION_KEY = "start_border_camp";
export const CAMP_SPIRIT_CAT_WATCHTOWER_LOCATION_KEY = "start_border_watchtower";

const CAMP_SPIRIT_CAT_LOCATION_KEYS = new Set([
  CAMP_SPIRIT_CAT_START_LOCATION_KEY,
  CAMP_SPIRIT_CAT_WATCHTOWER_LOCATION_KEY,
]);
const CAMP_SPIRIT_CAT_VERTICAL_DIRECTIONS = new Set(["UP", "DOWN"]);

export function isCampSpiritCatCreature(creature: { species?: { key?: string | null } | null }) {
  return creature.species?.key === CAMP_SPIRIT_CAT_SPECIES_KEY;
}

export function isCampSpiritCatLocationKey(locationKey: string | null | undefined) {
  return Boolean(locationKey && CAMP_SPIRIT_CAT_LOCATION_KEYS.has(locationKey));
}

export function campSpiritCatSafeLocationKey(locationKey: string | null | undefined) {
  return isCampSpiritCatLocationKey(locationKey) ? locationKey! : CAMP_SPIRIT_CAT_START_LOCATION_KEY;
}

export function isCampSpiritCatAllowedExit(exit: {
  direction?: string | null;
  toLocation?: { key?: string | null } | null;
}) {
  return Boolean(
    exit.direction
    && CAMP_SPIRIT_CAT_VERTICAL_DIRECTIONS.has(exit.direction)
    && isCampSpiritCatLocationKey(exit.toLocation?.key),
  );
}

export function campSpiritCatInspectionText(visibleAction: string) {
  return [
    CAMP_SPIRIT_CAT_NAME,
    "",
    `Стан: ${visibleAction}.`,
    "Це табірний дух у котячій подобі: безмовний, уважний і прив'язаний до меж вогню та людей.",
    "Він не відповідає словами. Вуха, хвіст і довгий погляд кажуть тут більше, ніж розмова.",
  ].join("\n");
}
