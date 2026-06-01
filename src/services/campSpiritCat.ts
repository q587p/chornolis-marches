export const CAMP_SPIRIT_CAT_SPECIES_KEY = "camp_spirit_cat";
export const CAMP_SPIRIT_CAT_NAME = "Кіт-бережник";
export const CAMP_SPIRIT_CAT_START_LOCATION_KEY = "start_border_camp";

export function isCampSpiritCatCreature(creature: { species?: { key?: string | null } | null }) {
  return creature.species?.key === CAMP_SPIRIT_CAT_SPECIES_KEY;
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
