const assert = require("node:assert/strict");

process.env.WORLD_NATURAL_TWIGS_REGEN_INTERVAL_MS = String(2 * 60 * 60 * 1000);
process.env.WORLD_NATURAL_TWIGS_LOCATION_DIVISOR = "3";
process.env.WORLD_NATURAL_TWIGS_REGION_KEYS = "chornolis_border";

require("ts-node/register");

const {
  isNaturalTwigsLocation,
  naturalTwigsRegenEveryTicks,
  shouldRegenerateNaturalTwigsInLocation,
} = require("../../src/services/worldTick");

assert.equal(naturalTwigsRegenEveryTicks(5000), 1440);
assert.equal(naturalTwigsRegenEveryTicks(1500), 4800);

assert.equal(isNaturalTwigsLocation({ z: 0, region: { key: "chornolis_border" } }), true);
assert.equal(isNaturalTwigsLocation({ z: 0, region: { key: "dry_luka" } }), false);
assert.equal(isNaturalTwigsLocation({ z: -13, region: { key: "chornolis_border" } }), false);

assert.equal(shouldRegenerateNaturalTwigsInLocation(2, 12, 12), true);
assert.equal(shouldRegenerateNaturalTwigsInLocation(1, 12, 12), false);
assert.equal(shouldRegenerateNaturalTwigsInLocation(1, 24, 12), true);
assert.equal(shouldRegenerateNaturalTwigsInLocation(2, 11, 12), false);
assert.equal(shouldRegenerateNaturalTwigsInLocation(2, 0, 12), false);

console.log("Natural twigs helpers OK");
