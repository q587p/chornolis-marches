const assert = require("node:assert/strict");

require("ts-node/register");

const {
  dropoffReactionForTotals,
  GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD,
  GATE_HUNTING_SATURATION_PREY_PRESSURE_MAX,
  HUNTER_FIELD_LINES,
  gateHuntingDropoffText,
  gateHuntingNoticeText,
  gateHuntingSaturationForSignals,
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

assert.deepEqual(dropoffReactionForTotals(12, 13, { saturationActive: true }), {
  first: false,
  smallThreshold: false,
  largeThreshold: false,
});

assert.deepEqual(dropoffReactionForTotals(13, 14), {
  first: false,
  smallThreshold: false,
  largeThreshold: false,
});

assert.equal(HUNTER_FIELD_LINES.departure.includes("Начувайтесь, гризуни."), true);
assert.equal(HUNTER_FIELD_LINES.standDown.length >= 5, true);
assert.equal(hunterFieldLine("departure", 0), "Начувайтесь, гризуни.");
assert.equal(hunterFieldLine("departure", 3), "Начувайтесь, гризуни.");
assert.equal(hunterFieldLine("deposit", 1), "Ще трохи тиску на стадо.");
assert.equal(hunterFieldLine("giveUp", -1), "Сьогодні ліс не дав легкої стежки.");
assert.equal(hunterFieldLine("standDown", 0), "Досить на сьогодні. Хай трава трохи підведеться.");

const saturated = gateHuntingSaturationForSignals({
  contributionTotal: GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD,
  preyPressure: GATE_HUNTING_SATURATION_PREY_PRESSURE_MAX,
  depletedSignals: 0,
});
assert.equal(saturated.active, true);
assert.equal(gateHuntingSaturationForSignals({ contributionTotal: GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD - 1, preyPressure: 0 }).active, false);
assert.equal(gateHuntingSaturationForSignals({ contributionTotal: GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD, preyPressure: GATE_HUNTING_SATURATION_PREY_PRESSURE_MAX + 1 }).active, false);
assert.equal(gateHuntingSaturationForSignals({ contributionTotal: GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD, preyPressure: 0, depletedSignals: 1 }).active, false);
assert.match(gateHuntingNoticeText("old notice", saturated), /Поки досить/);
assert.match(gateHuntingDropoffText("old dropoff", saturated), /нових припасів/);
assert.equal(gateHuntingNoticeText("old notice", { ...saturated, active: false }), "old notice");

console.log("Gate hunting loop helpers OK");
