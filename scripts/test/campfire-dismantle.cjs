const assert = require("node:assert/strict");

require("ts-node/register");

const {
  CAMPFIRE_BUILD_TWIG_COST,
  campfireRecoveredTwigs,
  isDismantlableCampfire,
} = require("../../src/services/fire");

const prepared = {
  type: "CAMPFIRE",
  providesLight: false,
  data: {
    is_campfire: true,
    handmade: true,
    prepared: true,
    unlit: true,
  },
};

const extinguished = {
  type: "CAMPFIRE",
  providesLight: false,
  data: {
    is_campfire: true,
    handmade: true,
    extinguished: true,
    ashFadingAtMinute: 180,
    ashExpiresAtMinute: 300,
  },
};

assert.equal(isDismantlableCampfire(prepared), true);
assert.equal(campfireRecoveredTwigs(prepared, 100), CAMPFIRE_BUILD_TWIG_COST - 1);
assert.equal(isDismantlableCampfire(extinguished), true);
assert.equal(campfireRecoveredTwigs(extinguished, 120), 2);
assert.equal(campfireRecoveredTwigs(extinguished, 200), 1);
assert.equal(campfireRecoveredTwigs(extinguished, 300), 0);
assert.equal(isDismantlableCampfire({ ...extinguished, providesLight: true, data: { ...extinguished.data, extinguished: false } }), false);
assert.equal(isDismantlableCampfire({ ...extinguished, type: "MAGIC_CAMPFIRE" }), false);

console.log("Campfire dismantle helpers OK");
