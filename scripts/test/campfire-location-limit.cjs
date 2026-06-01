const assert = require("node:assert/strict");

require("ts-node/register");

const {
  MAX_HANDMADE_CAMPFIRES_PER_LOCATION,
  canBuildAnotherHandmadeCampfire,
  handmadeCampfireCount,
} = require("../../src/services/fire");

const handmade = {
  type: "CAMPFIRE",
  isActive: true,
  data: { is_campfire: true, handmade: true },
};
const magic = {
  type: "MAGIC_CAMPFIRE",
  isActive: true,
  data: { is_campfire: true, magical: true },
};
const seeded = {
  type: "CAMPFIRE",
  isActive: true,
  data: { is_campfire: true, seeded: true },
};

assert.equal(handmadeCampfireCount([handmade, magic, seeded]), 1);
assert.equal(canBuildAnotherHandmadeCampfire([handmade, magic, seeded]), true);
assert.equal(canBuildAnotherHandmadeCampfire(Array.from({ length: MAX_HANDMADE_CAMPFIRES_PER_LOCATION }, () => handmade)), false);

console.log("Campfire location limit helpers OK");
