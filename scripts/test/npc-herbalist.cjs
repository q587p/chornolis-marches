const assert = require("node:assert/strict");

require("ts-node/register");

const {
  herbalistCellarDepositText,
  herbalistCellarShelfCheckText,
  herbalistGatherText,
  herbalistRouteDirections,
  herbalistSupplyRunTorchPrepText,
  herbalistWaterWordCellarObserverText,
  herbalistWaterWordCurrentAction,
  herbalistWaterWordDestinationObserverText,
  herbalistWaterWordPassageEventDescription,
  HERBALIST_CELLAR_LOCATION_KEY,
  HERBALIST_GATHER_LOCATION_KEY,
  HERBALIST_GATHER_RESOURCE_KEYS,
  HERBALIST_SUPPLY_RUN_FORCE_INTERVAL_MINUTES,
  HERBALIST_SUPPLY_RUN_MIN_INTERVAL_MINUTES,
  HERBALIST_WATER_WORD_PASSAGE_CHANCE_PERCENT,
  HERBALIST_WATER_WORD_PASSAGE_EVENT_TITLE,
  HERBALIST_WATCHTOWER_LOCATION_KEY,
  isHerbalistCreature,
  isHerbalistGatherResourceKey,
  isHerbalistSupplyRunDue,
  shouldHerbalistUseWaterWordPassage,
} = require("../../src/services/npcHerbalist");
const {
  CELLAR_WATER_PASSAGE_DESTINATION_KEY,
  CELLAR_WATER_PASSAGE_SOURCE_KEY,
} = require("../../src/services/cellarWaterPassage");

assert.equal(HERBALIST_CELLAR_LOCATION_KEY, "start_border_cellar");
assert.equal(HERBALIST_CELLAR_LOCATION_KEY, CELLAR_WATER_PASSAGE_SOURCE_KEY);
assert.equal(HERBALIST_WATCHTOWER_LOCATION_KEY, "start_border_watchtower");
assert.equal(HERBALIST_GATHER_LOCATION_KEY, "meadow_16_05");
assert.deepEqual(HERBALIST_GATHER_RESOURCE_KEYS, ["herbs", "berries", "mushrooms"]);
assert.equal(HERBALIST_WATER_WORD_PASSAGE_CHANCE_PERCENT, 20);
assert.equal(HERBALIST_WATER_WORD_PASSAGE_EVENT_TITLE, "Herbalist water-word passage");

assert.equal(isHerbalistCreature({ species: { key: "herbalist" }, professionKey: null }), true);
assert.equal(isHerbalistCreature({ species: { key: "wolf" }, professionKey: "znakhar" }), true);
assert.equal(isHerbalistCreature({ species: { key: "hunter" }, professionKey: "hunter" }), false);
assert.equal(shouldHerbalistUseWaterWordPassage({
  creature: { species: { key: "herbalist" }, professionKey: null },
  locationKey: CELLAR_WATER_PASSAGE_SOURCE_KEY,
  randomPercent: HERBALIST_WATER_WORD_PASSAGE_CHANCE_PERCENT - 1,
}), true);
assert.equal(shouldHerbalistUseWaterWordPassage({
  creature: { species: { key: "herbalist" }, professionKey: null },
  locationKey: CELLAR_WATER_PASSAGE_SOURCE_KEY,
  randomPercent: HERBALIST_WATER_WORD_PASSAGE_CHANCE_PERCENT,
}), false);
assert.equal(shouldHerbalistUseWaterWordPassage({
  creature: { species: { key: "herbalist" }, professionKey: null },
  locationKey: "start_border_watchtower",
  randomPercent: 0,
}), false);
assert.equal(shouldHerbalistUseWaterWordPassage({
  creature: { species: { key: "hunter" }, professionKey: "hunter" },
  locationKey: CELLAR_WATER_PASSAGE_SOURCE_KEY,
  randomPercent: 0,
}), false);

assert.equal(isHerbalistGatherResourceKey("herbs"), true);
assert.equal(isHerbalistGatherResourceKey("berries"), true);
assert.equal(isHerbalistGatherResourceKey("mushrooms"), true);
assert.equal(isHerbalistGatherResourceKey("honey"), false);
assert.equal(isHerbalistGatherResourceKey("beeswax"), false);

assert.equal(isHerbalistSupplyRunDue({
  currentAbsoluteMinute: 1_000,
  lastAnchorAbsoluteMinute: null,
  randomPercent: 0,
}), false);
assert.equal(isHerbalistSupplyRunDue({
  currentAbsoluteMinute: HERBALIST_SUPPLY_RUN_MIN_INTERVAL_MINUTES - 1,
  lastAnchorAbsoluteMinute: 0,
  randomPercent: 0,
}), false);
assert.equal(isHerbalistSupplyRunDue({
  currentAbsoluteMinute: HERBALIST_SUPPLY_RUN_MIN_INTERVAL_MINUTES,
  lastAnchorAbsoluteMinute: 0,
  randomPercent: 99,
}), false);
assert.equal(isHerbalistSupplyRunDue({
  currentAbsoluteMinute: HERBALIST_SUPPLY_RUN_MIN_INTERVAL_MINUTES,
  lastAnchorAbsoluteMinute: 0,
  randomPercent: 0,
}), true);
assert.equal(isHerbalistSupplyRunDue({
  currentAbsoluteMinute: HERBALIST_SUPPLY_RUN_FORCE_INTERVAL_MINUTES,
  lastAnchorAbsoluteMinute: 0,
  randomPercent: 99,
}), true);

assert.equal(herbalistSupplyRunTorchPrepText().includes("тринадцять вогників"), true);
assert.equal(herbalistSupplyRunTorchPrepText().includes("факелів у наборі"), false);
assert.equal(herbalistCellarShelfCheckText().includes("полицю"), true);
assert.equal(herbalistCellarDepositText(), "сортує трави в погребі");
assert.match(herbalistWaterWordCellarObserverText(), /До води/);
assert.match(herbalistWaterWordCellarObserverText(), /стіни зарубок/);
assert.match(herbalistWaterWordDestinationObserverText(), /мокрої темряви під мостом/);
assert.equal(herbalistWaterWordCurrentAction(), "виходить з мокрої темряви під мостом");
assert.equal(herbalistGatherText("herbs").includes("лікарські трави"), true);
assert.equal(herbalistGatherText("berries").includes("ягоди"), true);
assert.equal(herbalistGatherText("mushrooms").includes("гриб"), true);
assert.deepEqual(herbalistRouteDirections([
  { fromLocationId: 1, toLocationId: 2, direction: "DOWN", travelCost: 1 },
  { fromLocationId: 2, toLocationId: 3, direction: "WEST", travelCost: 1 },
]), ["DOWN", "WEST"]);

const waterWordEventDescription = herbalistWaterWordPassageEventDescription(77, 1234);
assert.match(waterWordEventDescription, /creatureId=77/);
assert.match(waterWordEventDescription, new RegExp(`source=${CELLAR_WATER_PASSAGE_SOURCE_KEY}`));
assert.match(waterWordEventDescription, new RegExp(`destination=${CELLAR_WATER_PASSAGE_DESTINATION_KEY}`));
assert.match(waterWordEventDescription, /trigger=water_word_phrase/);
assert.match(waterWordEventDescription, /stage=supply_run/);

console.log("NPC herbalist helpers OK");
