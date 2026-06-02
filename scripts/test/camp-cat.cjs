const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const {
  CAMP_SPIRIT_CAT_NAME,
  CAMP_SPIRIT_CAT_SPECIES_KEY,
  CAMP_SPIRIT_CAT_START_LOCATION_KEY,
  CAMP_SPIRIT_CAT_WATCHTOWER_LOCATION_KEY,
  campSpiritCatCachePresenceLine,
  campSpiritCatFullInspectionDetail,
  campSpiritCatMouseBehaviorPlan,
  campSpiritCatSafeLocationKey,
  campSpiritCatShouldPrioritizeLocalMice,
  campSpiritCatWatchPosture,
  campSpiritCatInspectionText,
  isCampSpiritCatAllowedExit,
  isCampSpiritCatCreature,
  isCampSpiritCatLocationKey,
} = require("../../src/services/campSpiritCat");
const { creatureSpeciesNameFields } = require("../../src/content/lexicon/worldLexicon");
const {
  predatorKillObserverText,
  predatorMissObserverText,
  predatorWoundObserverText,
} = require("../../src/services/predatorActionText");

const uniqueCreatures = JSON.parse(fs.readFileSync("prisma/data/world/uniqueCreatures.json", "utf8"));
const seedSource = fs.readFileSync("prisma/seed.ts", "utf8");

const cat = uniqueCreatures.find((creature) => creature.speciesKey === CAMP_SPIRIT_CAT_SPECIES_KEY);

assert.ok(cat, "Camp spirit cat should be seeded as a unique creature");
assert.equal(cat.name, CAMP_SPIRIT_CAT_NAME);
assert.equal(cat.locationKey, CAMP_SPIRIT_CAT_START_LOCATION_KEY);
assert.equal(cat.isAlive, true);
assert.equal(cat.isHidden, false);
assert.match(cat.action, /вогню|табір/u);

const seedSpeciesStart = seedSource.indexOf('key: "camp_spirit_cat"');
assert.notEqual(seedSpeciesStart, -1, "Seed should define camp_spirit_cat species");
const seedSpeciesBlock = seedSource.slice(seedSpeciesStart, seedSpeciesStart + 500);
assert.match(seedSpeciesBlock, /kind:\s*"SPIRIT"/, "Camp spirit cat should not be an ordinary animal kind");
assert.match(seedSpeciesBlock, /diet:\s*"SPIRITUAL"/, "Camp spirit cat should not use ordinary hunger diet maintenance");

assert.deepEqual(
  creatureSpeciesNameFields(CAMP_SPIRIT_CAT_SPECIES_KEY),
  {
    name: "кіт-бережник",
    nameGenitive: "кота-бережника",
    nameDative: "коту-бережнику",
    nameAccusative: "кота-бережника",
    nameInstrumental: "котом-бережником",
    nameLocative: "коті-бережнику",
    nameVocative: "коте-бережнику",
    grammaticalGender: "MASCULINE",
    animacy: "ANIMATE",
  },
  "Camp spirit cat species should have full lexicon-backed Ukrainian forms",
);

assert.equal(isCampSpiritCatCreature({ species: { key: CAMP_SPIRIT_CAT_SPECIES_KEY } }), true);
assert.equal(isCampSpiritCatCreature({ species: { key: "cat" } }), false);
assert.equal(isCampSpiritCatLocationKey(CAMP_SPIRIT_CAT_START_LOCATION_KEY), true);
assert.equal(isCampSpiritCatLocationKey(CAMP_SPIRIT_CAT_WATCHTOWER_LOCATION_KEY), true);
assert.equal(isCampSpiritCatLocationKey("meadow_16_05"), false);
assert.equal(campSpiritCatSafeLocationKey("meadow_16_05"), CAMP_SPIRIT_CAT_START_LOCATION_KEY);
assert.equal(campSpiritCatSafeLocationKey(CAMP_SPIRIT_CAT_WATCHTOWER_LOCATION_KEY), CAMP_SPIRIT_CAT_WATCHTOWER_LOCATION_KEY);
assert.match(
  campSpiritCatWatchPosture({ hasLocalMice: true, daypart: "night", hasActiveCampfire: true }),
  /мишаче шарудіння/u,
);
assert.equal(campSpiritCatShouldPrioritizeLocalMice({ hasLocalMice: true }), true);
assert.equal(campSpiritCatShouldPrioritizeLocalMice({ hasLocalMice: false }), false);
assert.equal(campSpiritCatMouseBehaviorPlan({ hasLocalMice: true, roll: 0.1 }), "pounce");
assert.equal(campSpiritCatMouseBehaviorPlan({ hasLocalMice: true, roll: 0.9 }), "watch");
assert.equal(campSpiritCatMouseBehaviorPlan({ hasLocalMice: false, roll: 0.1 }), "watch");
assert.match(
  campSpiritCatWatchPosture({ daypart: "night", hasActiveCampfire: true }),
  /межі світла й темряви/u,
);
assert.equal(campSpiritCatCachePresenceLine({ isPresent: false }), null);
assert.match(
  campSpiritCatCachePresenceLine({ isPresent: true, hasLocalMice: false }),
  /не стереже її як власність/u,
);
assert.match(
  campSpiritCatCachePresenceLine({ isPresent: true, hasLocalMice: true }),
  /мишаче шарудіння/u,
);
assert.match(
  campSpiritCatWatchPosture({ locationKey: CAMP_SPIRIT_CAT_WATCHTOWER_LOCATION_KEY, daypart: "day" }),
  /вище над табором/u,
);
assert.match(campSpiritCatFullInspectionDetail({ hasLocalMice: true }), /пружну лінію/u);
assert.match(campSpiritCatFullInspectionDetail({ daypart: "night", hasActiveCampfire: true }), /Полум'я/u);
assert.match(campSpiritCatFullInspectionDetail({ locationKey: CAMP_SPIRIT_CAT_WATCHTOWER_LOCATION_KEY }), /щілини між дошками/u);
assert.doesNotMatch(
  campSpiritCatWatchPosture({ daypart: "dusk" }),
  /NPC|debug|companion|pet|сова|вовк|лисиц/u,
);
assert.equal(
  isCampSpiritCatAllowedExit({
    direction: "UP",
    toLocation: { key: CAMP_SPIRIT_CAT_WATCHTOWER_LOCATION_KEY },
  }),
  true,
);
assert.equal(
  isCampSpiritCatAllowedExit({
    direction: "WEST",
    toLocation: { key: "meadow_16_05" },
  }),
  false,
);
assert.equal(
  isCampSpiritCatAllowedExit({
    direction: "DOWN",
    toLocation: { key: CAMP_SPIRIT_CAT_START_LOCATION_KEY },
  }),
  true,
);

const briefInspection = campSpiritCatInspectionText("лежить біля межового вогню", "brief");
const fullInspection = campSpiritCatInspectionText("лежить біля межового вогню", "full", { hasLocalMice: true });
assert.match(briefInspection, /Кіт-бережник/u);
assert.match(briefInspection, /межовий вогонь має власного сторожа/u);
assert.doesNotMatch(briefInspection, /Якщо роздивитися уважніше/u);
assert.match(fullInspection, /Кіт-бережник/u);
assert.match(fullInspection, /не відповідає словами/u);
assert.match(fullInspection, /пружну лінію/u);
assert.match(fullInspection, /Якщо роздивитися уважніше/u);
assert.match(fullInspection, /Стан:[^\n]+\n\nЦе табірний дух/u);
assert.match(fullInspection, /людей\.\n\nШерсть/u);
assert.match(fullInspection, /розмова\.\n\nНайменше/u);
assert.doesNotMatch(briefInspection, /\n\nВін мовчить/u);
assert.ok(fullInspection.length > briefInspection.length + 100, "Full cat inspection should be substantially richer than brief look text");
assert.doesNotMatch(`${briefInspection}\n${fullInspection}`, /HP|NPC|debug|companion|pet/u);

assert.match(predatorMissObserverText(CAMP_SPIRIT_CAT_SPECIES_KEY, "миша", "миш"), /Кіт-бережник/u);
assert.doesNotMatch(predatorMissObserverText(CAMP_SPIRIT_CAT_SPECIES_KEY, "миша", "миш"), /Щось/u);
assert.match(predatorWoundObserverText(CAMP_SPIRIT_CAT_SPECIES_KEY, "миша", "миш"), /тиша біля скрині/u);
assert.match(predatorKillObserverText(CAMP_SPIRIT_CAT_SPECIES_KEY, "миш"), /біля його лап/u);

console.log("Camp spirit cat foundation OK");
