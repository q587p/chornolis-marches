const assert = require("node:assert/strict");

require("ts-node/register");

const {
  CAMPFIRE_BUILD_TWIG_COST,
  MAX_HANDMADE_CAMPFIRES_PER_LOCATION,
  canBuildAnotherHandmadeCampfire,
  handmadeCampfireCount,
  isHandmadeCampfire,
  isPreparedCampfire,
} = require("../../src/services/fire");

const prepared = {
  type: "CAMPFIRE",
  isActive: true,
  providesLight: false,
  data: {
    is_campfire: true,
    handmade: true,
    created_by: "player",
    prepared: true,
    unlit: true,
    fuelTwigs: CAMPFIRE_BUILD_TWIG_COST,
  },
};

assert.equal(CAMPFIRE_BUILD_TWIG_COST, 5);
assert.equal(MAX_HANDMADE_CAMPFIRES_PER_LOCATION, 3);
assert.equal(isHandmadeCampfire(prepared), true);
assert.equal(isPreparedCampfire(prepared), true);
assert.equal(isHandmadeCampfire({ ...prepared, data: { ...prepared.data, seeded: true } }), false);
assert.equal(isHandmadeCampfire({ ...prepared, type: "MAGIC_CAMPFIRE" }), false);

assert.equal(handmadeCampfireCount([prepared, prepared]), 2);
assert.equal(canBuildAnotherHandmadeCampfire([prepared, prepared]), true);
assert.equal(canBuildAnotherHandmadeCampfire([prepared, prepared, prepared]), false);

console.log("Campfire build helpers OK");
