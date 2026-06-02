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

export type CampSpiritCatWatchContext = {
  locationKey?: string | null;
  daypart?: string | null;
  hasLocalMice?: boolean;
  hasActiveCampfire?: boolean;
};

export function campSpiritCatShouldPrioritizeLocalMice(context: { hasLocalMice?: boolean } = {}) {
  return context.hasLocalMice === true;
}

export function campSpiritCatCachePresenceLine(context: { isPresent?: boolean; hasLocalMice?: boolean } = {}) {
  if (!context.isPresent) return null;
  if (context.hasLocalMice) {
    return "Кіт-бережник сидить біля ніжки скрині й слухає мишаче шарудіння так уважно, ніби саме дерево зараз щось скаже.";
  }
  return "Кіт-бережник тримається неподалік скрині: не стереже її як власність, а просто звіряє, чи табір не забув про прибулих.";
}

export function campSpiritCatWatchPosture(context: CampSpiritCatWatchContext = {}) {
  if (campSpiritCatShouldPrioritizeLocalMice(context)) {
    return "завмер біля нижнього кута табору й слухає мишаче шарудіння";
  }

  if (context.daypart === "night") {
    return context.hasActiveCampfire
      ? "сидить на межі світла й темряви, дивлячись повз вогонь"
      : "сидить дуже прямо й дивиться туди, де табір переходить у темряву";
  }

  if (context.daypart === "dusk") {
    return "підняв вуха до вечірнього повітря й довго не кліпає";
  }

  if (context.daypart === "dawn") {
    return "обходить край табору, ніби звіряє нічні сліди";
  }

  if (context.locationKey === CAMP_SPIRIT_CAT_WATCHTOWER_LOCATION_KEY) {
    return "лежить вище над табором і стежить за рухом унизу";
  }

  if (context.hasActiveCampfire) {
    return "лежить біля межового вогню, але не спускає погляду з краю табору";
  }

  return "тихо стереже межі табору";
}

export function campSpiritCatInspectionText(visibleAction: string, detail: "brief" | "full" = "full") {
  const lines = [
    CAMP_SPIRIT_CAT_NAME,
    "",
    `Стан: ${visibleAction}.`,
  ];

  if (detail === "brief") {
    return [
      ...lines,
      "Він мовчить і тримається так, ніби межовий вогонь має власного сторожа.",
    ].join("\n");
  }

  return [
    ...lines,
    "Це табірний дух у котячій подобі: безмовний, уважний і прив'язаний до меж вогню та людей.",
    "Шерсть здається темнішою там, де світло не дістає землі, а очі довго не відпускають край табору.",
    "Він не відповідає словами. Вуха, хвіст і довгий погляд кажуть тут більше, ніж розмова.",
    "Якщо просто глянути, видно тільки позу. Якщо роздивитися уважніше, стає ясніше, що він стереже не стежку, а саму межу.",
  ].join("\n");
}
