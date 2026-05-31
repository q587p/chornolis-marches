const assert = require("node:assert/strict");

require("ts-node/register");

const {
  ADD_CREATURE_BATCH_SIZE,
  ADD_CREATURE_MAX_COUNT,
  corpseDecayTicksForFreshness,
  parseAddCreatureArgs,
  parseAddCreatureCorpseArgs,
  planAddCreatureBatches,
} = require("../../src/services/adminCreatures");

assert.deepEqual(parseAddCreatureArgs("mouse meadow_16_05 100 Young"), {
  speciesKey: "mouse",
  locationArg: "meadow_16_05",
  requestedCount: 100,
  age: "YOUNG",
});
assert.deepEqual(parseAddCreatureArgs("rabbit 0,0,0"), {
  speciesKey: "rabbit",
  locationArg: "0,0,0",
  requestedCount: 1,
  age: "ADULT",
});
assert.deepEqual(parseAddCreatureArgs("wolf forest_00_08 OLD"), {
  speciesKey: "wolf",
  locationArg: "forest_00_08",
  requestedCount: 1,
  age: "OLD",
});

assert.deepEqual(parseAddCreatureCorpseArgs("mouse"), {
  speciesKey: "mouse",
  locationArg: undefined,
  requestedCount: 1,
  age: "ADULT",
  freshness: "fresh",
});
assert.deepEqual(parseAddCreatureCorpseArgs("rabbit forest_04_00 3 OLD decaying"), {
  speciesKey: "rabbit",
  locationArg: "forest_04_00",
  requestedCount: 3,
  age: "OLD",
  freshness: "decaying",
});
assert.deepEqual(parseAddCreatureCorpseArgs("rabbit forest_04_00 3 OLD"), {
  speciesKey: "rabbit",
  locationArg: "forest_04_00",
  requestedCount: 3,
  age: "OLD",
  freshness: "fresh",
});
assert.deepEqual(parseAddCreatureCorpseArgs("wolf 0,0,0 old"), {
  speciesKey: "wolf",
  locationArg: "0,0,0",
  requestedCount: 1,
  age: "ADULT",
  freshness: "old",
});

assert.equal(corpseDecayTicksForFreshness(24, "fresh"), 24);
assert.equal(corpseDecayTicksForFreshness(24, "decaying"), 12);
assert.equal(corpseDecayTicksForFreshness(24, "old"), 1);

assert.deepEqual(planAddCreatureBatches(1), {
  requestedCount: 1,
  count: 1,
  capped: false,
  batches: [1],
});
assert.deepEqual(planAddCreatureBatches(100), {
  requestedCount: 100,
  count: 100,
  capped: false,
  batches: [ADD_CREATURE_BATCH_SIZE, ADD_CREATURE_BATCH_SIZE],
});
assert.deepEqual(planAddCreatureBatches(125), {
  requestedCount: 125,
  count: 125,
  capped: false,
  batches: [50, 50, 25],
});
assert.deepEqual(planAddCreatureBatches(ADD_CREATURE_MAX_COUNT + 1), {
  requestedCount: ADD_CREATURE_MAX_COUNT + 1,
  count: ADD_CREATURE_MAX_COUNT,
  capped: true,
  batches: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
});

console.log("Admin creature helpers OK");
