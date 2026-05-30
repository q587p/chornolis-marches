const assert = require("node:assert/strict");

require("ts-node/register");

const {
  dropoffReactionForTotals,
  HUNTER_FIELD_LINES,
  hunterFieldLine,
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

assert.equal(HUNTER_FIELD_LINES.departure.includes("Начувайтесь, гризуни."), true);
assert.equal(hunterFieldLine("departure", 0), "Начувайтесь, гризуни.");
assert.equal(hunterFieldLine("departure", 3), "Начувайтесь, гризуни.");
assert.equal(hunterFieldLine("deposit", 1), "Ще трохи тиску на стадо.");
assert.equal(hunterFieldLine("giveUp", -1), "Сьогодні ліс не дав легкої стежки.");

console.log("Gate hunting loop helpers OK");
