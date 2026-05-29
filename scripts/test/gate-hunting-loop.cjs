const assert = require("node:assert/strict");

require("ts-node/register");

const {
  dropoffReactionForTotals,
  isCarcassDropoffResourceKey,
} = require("../../src/services/carcassDropoff");

assert.equal(isCarcassDropoffResourceKey("corpse_rabbit"), true);
assert.equal(isCarcassDropoffResourceKey("corpse_fox_female"), true);
assert.equal(isCarcassDropoffResourceKey("raw_meat"), false);
assert.equal(isCarcassDropoffResourceKey("torch"), false);

assert.deepEqual(dropoffReactionForTotals(0, 1), {
  first: true,
  smallThreshold: false,
  largeThreshold: false,
});

assert.deepEqual(dropoffReactionForTotals(2, 3), {
  first: false,
  smallThreshold: true,
  largeThreshold: false,
});

assert.deepEqual(dropoffReactionForTotals(12, 13), {
  first: false,
  smallThreshold: false,
  largeThreshold: true,
});

assert.deepEqual(dropoffReactionForTotals(13, 14), {
  first: false,
  smallThreshold: false,
  largeThreshold: false,
});

console.log("Gate hunting loop helpers OK");
