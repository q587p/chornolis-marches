const assert = require("node:assert/strict");

require("ts-node/register");

const {
  REAL_MS_PER_GAME_HOUR,
  REAL_MS_PER_GAME_MINUTE,
  START_WORLD_ABSOLUTE_MINUTE,
  advanceWorldClockFields,
  worldDaypartForHour,
  worldTimeSnapshotFromAbsoluteMinute,
} = require("../../src/data/worldClock");
const { renderCurrentWorldTime } = require("../../src/services/calendar");
const { lightSnapshotFromWorldTime } = require("../../src/services/lightSnapshot");
const {
  renderCurrentWeather,
  renderWeatherLine,
  weatherLightModifier,
} = require("../../src/services/weather");

assert.equal(REAL_MS_PER_GAME_HOUR, 120_000);
assert.equal(REAL_MS_PER_GAME_MINUTE, 2_000);
assert.equal(START_WORLD_ABSOLUTE_MINUTE, 185_340);

const start = worldTimeSnapshotFromAbsoluteMinute(START_WORLD_ABSOLUTE_MINUTE);
assert.equal(start.year, 587);
assert.equal(start.lunarCircle, 5);
assert.equal(start.lunarCircleName, "Коло Зеленого Шуму");
assert.equal(start.dayOfCircle, 17);
assert.equal(start.hour, 17);
assert.equal(start.minute, 0);
assert.equal(start.clockLabel, "17:00");
assert.equal(start.daypart, "day");
assert.equal(start.moonPhase, "waning_gibbous");

assert.equal(worldDaypartForHour(5), "dawn");
assert.equal(worldDaypartForHour(8), "day");
assert.equal(worldDaypartForHour(18), "dusk");
assert.equal(worldDaypartForHour(21), "night");

const nearFull = worldTimeSnapshotFromAbsoluteMinute(
  START_WORLD_ABSOLUTE_MINUTE - 2 * 24 * 60
);
assert.equal(nearFull.dayOfCircle, 15);
assert.equal(nearFull.moonPhase, "full");
assert.ok(nearFull.moonIllumination >= 95);

const lastAdvancedAt = new Date("2026-05-31T12:00:00.000Z");
const advanced = advanceWorldClockFields(
  { absoluteMinute: START_WORLD_ABSOLUTE_MINUTE, lastAdvancedAt },
  new Date(lastAdvancedAt.getTime() + 3 * REAL_MS_PER_GAME_MINUTE + 1_999)
);
assert.equal(advanced.advancedMinutes, 3);
assert.equal(advanced.absoluteMinute, START_WORLD_ABSOLUTE_MINUTE + 3);
assert.equal(advanced.lastAdvancedAt.toISOString(), "2026-05-31T12:00:06.000Z");

const rendered = renderCurrentWorldTime(start);
assert.ok(rendered.includes("Коло Зеленого Шуму"));
assert.ok(rendered.includes("17:00"));
assert.ok(rendered.includes("Місяць:"));
assert.ok(rendered.includes("Погода:"));
assert.ok(rendered.includes("Світло:"));

assert.equal(renderWeatherLine(worldTimeSnapshotFromAbsoluteMinute(START_WORLD_ABSOLUTE_MINUTE, "rain", 70)), "дощ; густа");
assert.ok(renderCurrentWeather(worldTimeSnapshotFromAbsoluteMinute(START_WORLD_ABSOLUTE_MINUTE, "mist", 55)).includes("Погода Порубіжжя"));
assert.ok(weatherLightModifier("storm", 100) < weatherLightModifier("clear", 100));

const moonlessStormNight = worldTimeSnapshotFromAbsoluteMinute(
  START_WORLD_ABSOLUTE_MINUTE - 16 * 24 * 60 + 4 * 60,
  "storm",
  100
);
const fullClearNight = worldTimeSnapshotFromAbsoluteMinute(
  START_WORLD_ABSOLUTE_MINUTE - 2 * 24 * 60 + 4 * 60,
  "clear",
  15
);
const darkLight = lightSnapshotFromWorldTime(moonlessStormNight);
const fullLight = lightSnapshotFromWorldTime(fullClearNight);
const localLight = lightSnapshotFromWorldTime(moonlessStormNight, { hasLocalLight: true });
assert.equal(darkLight.level, "dark");
assert.ok(fullLight.score > darkLight.score);
assert.ok(localLight.score >= 78);

console.log("World time helpers OK");
