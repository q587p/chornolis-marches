const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const {
  dropoffReactionForTotals,
  GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD,
  GATE_HUNTING_SATURATION_PREY_PRESSURE_MAX,
  HUNTER_FIELD_LINES,
  gateHuntingDropoffText,
  gateHuntingNoticeText,
  gateHuntingAreaLocationWhere,
  gateHuntingSaturationForSignals,
  hunterFieldLine,
  isCarcassDropoffResourceKey,
} = require("../../src/services/carcassDropoff");
const { carcassDropoffButtonRows } = require("../../src/services/locations");

assert.equal(isCarcassDropoffResourceKey("corpse_rabbit"), true);
assert.equal(isCarcassDropoffResourceKey("corpse_fox_female"), true);
assert.equal(isCarcassDropoffResourceKey("raw_meat"), false);
assert.equal(isCarcassDropoffResourceKey("torch"), false);
assert.deepEqual(carcassDropoffButtonRows(42), [[
  { text: "🦴 Покласти тушу", callbackData: "dropoff:put:42:one" },
  { text: "🦴 Покласти всі", callbackData: "dropoff:put:42:all" },
]]);

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
assert.equal(hunterFieldLine("departure", 3), "Перевірю край, доки слід ще теплий.");
assert.equal(hunterFieldLine("deposit", 1), "Ще трохи тиску на стадо.");
assert.equal(hunterFieldLine("giveUp", -1), "Сьогодні ліс не дав легкої стежки.");
assert.equal(hunterFieldLine("standDown", 0), "Досить на сьогодні. Хай трава трохи підведеться.");

const saturated = gateHuntingSaturationForSignals({
  contributionTotal: GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD,
  preyPressure: GATE_HUNTING_SATURATION_PREY_PRESSURE_MAX,
  depletedSignals: 0,
});
assert.equal(saturated.active, true);
assert.equal(saturated.manualOverride, null);
assert.equal(gateHuntingSaturationForSignals({ contributionTotal: GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD - 1, preyPressure: 0 }).active, false);
assert.equal(gateHuntingSaturationForSignals({ contributionTotal: GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD, preyPressure: GATE_HUNTING_SATURATION_PREY_PRESSURE_MAX + 1 }).active, false);
assert.equal(gateHuntingSaturationForSignals({ contributionTotal: GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD, preyPressure: 0, depletedSignals: 1 }).active, false);
assert.equal(gateHuntingSaturationForSignals({
  contributionTotal: GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD,
  preyPressure: 0,
  depletedSignals: 0,
  manualOverride: "start",
}).active, false);
assert.equal(gateHuntingSaturationForSignals({
  contributionTotal: 0,
  preyPressure: GATE_HUNTING_SATURATION_PREY_PRESSURE_MAX + 50,
  depletedSignals: 3,
  manualOverride: "stop",
}).active, true);
assert.match(gateHuntingNoticeText("old notice", saturated), /Поки досить/);
assert.match(gateHuntingDropoffText("old dropoff", saturated), /нових припасів/);
assert.match(gateHuntingDropoffText("old dropoff", saturated), /<i>покласти<\/i> або <i>покласти тушу в рів<\/i>/);
assert.match(gateHuntingDropoffText("old dropoff", { ...saturated, active: false }), /<i>покласти<\/i> або <i>покласти тушу в рів<\/i>/);
assert.equal(gateHuntingNoticeText("old notice", { ...saturated, active: false }), "old notice");
assert.match(gateHuntingNoticeText("old notice", { ...saturated, manualOverride: "stop" }, true), /override=stop/);
assert.deepEqual(gateHuntingAreaLocationWhere({ x: 20, y: 5, z: 0 }), {
  z: 0,
  x: { gte: 16, lte: 24 },
  y: { gte: 1, lte: 9 },
});

const worldFeatures = JSON.parse(fs.readFileSync("prisma/data/world/features.json", "utf8"));
const carcassDropoff = worldFeatures.find((feature) => feature.key === "closed_gate_carcass_dropoff");
assert.ok(carcassDropoff, "Seed should include the carcass drop-off feature");
assert.doesNotMatch(carcassDropoff.description, /\/put/, "Carcass drop-off seed copy should not advertise English slash commands");

console.log("Gate hunting loop helpers OK");
