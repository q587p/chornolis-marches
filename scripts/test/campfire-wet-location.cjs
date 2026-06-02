const assert = require("node:assert/strict");

require("ts-node/register");

const {
  CAMPFIRE_DURATION_MS,
  WET_RIVER_CAMPFIRE_DURATION_MULTIPLIER,
  WET_SWAMP_CAMPFIRE_DURATION_MULTIPLIER,
  campfireDurationForLocation,
  isWetCampfireLocation,
} = require("../../src/services/fire");

assert.equal(isWetCampfireLocation({ biome: "RIVER" }), true);
assert.equal(isWetCampfireLocation({ biome: "SWAMP" }), true);
assert.equal(isWetCampfireLocation({ biome: "FOREST" }), false);
assert.equal(isWetCampfireLocation(null), false);

assert.equal(campfireDurationForLocation({ biome: "FOREST" }), CAMPFIRE_DURATION_MS);
assert.equal(campfireDurationForLocation({ biome: "RIVER" }), Math.floor(CAMPFIRE_DURATION_MS * WET_RIVER_CAMPFIRE_DURATION_MULTIPLIER));
assert.equal(campfireDurationForLocation({ biome: "SWAMP" }), Math.floor(CAMPFIRE_DURATION_MS * WET_SWAMP_CAMPFIRE_DURATION_MULTIPLIER));

console.log("Campfire wet location helpers OK");
