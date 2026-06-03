const assert = require("node:assert/strict");

require("ts-node/register");

const {
  herbalistCellarDepositText,
  herbalistCellarShelfCheckText,
  herbalistGatherText,
  herbalistRouteDirections,
  herbalistSupplyRunTorchPrepText,
  HERBALIST_CELLAR_LOCATION_KEY,
  HERBALIST_GATHER_LOCATION_KEY,
  HERBALIST_GATHER_RESOURCE_KEYS,
  HERBALIST_SUPPLY_RUN_FORCE_INTERVAL_MINUTES,
  HERBALIST_SUPPLY_RUN_MIN_INTERVAL_MINUTES,
  HERBALIST_WATCHTOWER_LOCATION_KEY,
  isHerbalistCreature,
  isHerbalistGatherResourceKey,
  isHerbalistSupplyRunDue,
} = require("../../src/services/npcHerbalist");

assert.equal(HERBALIST_CELLAR_LOCATION_KEY, "start_border_cellar");
assert.equal(HERBALIST_WATCHTOWER_LOCATION_KEY, "start_border_watchtower");
assert.equal(HERBALIST_GATHER_LOCATION_KEY, "meadow_16_05");
assert.deepEqual(HERBALIST_GATHER_RESOURCE_KEYS, ["herbs", "berries", "mushrooms"]);

assert.equal(isHerbalistCreature({ species: { key: "herbalist" }, professionKey: null }), true);
assert.equal(isHerbalistCreature({ species: { key: "wolf" }, professionKey: "znakhar" }), true);
assert.equal(isHerbalistCreature({ species: { key: "hunter" }, professionKey: "hunter" }), false);

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
assert.equal(herbalistGatherText("herbs").includes("лікарські трави"), true);
assert.equal(herbalistGatherText("berries").includes("ягоди"), true);
assert.equal(herbalistGatherText("mushrooms").includes("гриб"), true);
assert.deepEqual(herbalistRouteDirections([
  { fromLocationId: 1, toLocationId: 2, direction: "DOWN", travelCost: 1 },
  { fromLocationId: 2, toLocationId: 3, direction: "WEST", travelCost: 1 },
]), ["DOWN", "WEST"]);

console.log("NPC herbalist helpers OK");
