const assert = require("node:assert/strict");

require("ts-node/register");

const {
  formatWorldClock,
  getCurrentWorldTime,
  worldDaypartForHour,
} = require("../../src/services/worldTime");
const { renderCurrentWorldTime } = require("../../src/services/calendar");

assert.equal(worldDaypartForHour(4), "night");
assert.equal(worldDaypartForHour(5), "dawn");
assert.equal(worldDaypartForHour(8), "day");
assert.equal(worldDaypartForHour(18), "dusk");
assert.equal(worldDaypartForHour(21), "night");
assert.equal(worldDaypartForHour(-1), "night");
assert.equal(worldDaypartForHour(29), "dawn");

const dawn = getCurrentWorldTime(new Date("2026-05-31T03:30:00.000Z"), "Europe/Kyiv");
assert.equal(dawn.daypart, "dawn");
assert.equal(dawn.daypartLabel, "світанок");
assert.equal(formatWorldClock(dawn), "06:30");

const rendered = renderCurrentWorldTime(new Date("2026-05-31T18:10:00.000Z"));
assert.match(rendered, /Час доби:/);
assert.doesNotMatch(rendered, /статична дата/);

console.log("World-time helpers OK");
