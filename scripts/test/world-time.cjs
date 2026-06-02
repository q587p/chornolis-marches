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
const {
  getWorldYearName,
  renderApproximateWorldClock,
  renderCurrentWorldTime,
  renderWorldDreamDateLine,
  renderWorldYearLine,
} = require("../../src/services/calendar");
const { lightSnapshotFromWorldTime } = require("../../src/services/lightSnapshot");
const {
  visibilityDarknessText,
  visibilityPresenceText,
  visibilityRulesFromLight,
} = require("../../src/services/visibility");
const { textTargetVisibleUnderRules } = require("../../src/services/textTargets");
const { isDreamLocationForWorldNotice } = require("../../src/services/notifications");
const {
  shouldShowFirstNightGuidanceForVisibility,
  visibilityReductionActive,
} = require("../../src/services/beginnerGuidance");
const {
  renderCurrentWeather,
  renderWeatherLine,
  weatherLightModifier,
} = require("../../src/services/weather");
const {
  parseWeatherSetTarget,
  parseWorldTimeSetTarget,
  renderWorldTimeDebug,
} = require("../../src/services/worldTimeDebug");
const { daypartFromNoticeDescription, worldDaypartNoticeText } = require("../../src/services/worldDaypartNotices");

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
assert.ok(rendered.includes("Межовий час: близько п'ятої після полудня."));
assert.ok(!rendered.includes("17:00"));
assert.ok(rendered.includes("Місяць:"));
assert.ok(rendered.includes("Погода:"));
assert.ok(rendered.includes("Світло:"));
const renderedDebugTime = renderWorldTimeDebug(start, {
  weatherEndsAtMinute: null,
  lastAdvancedAt: new Date("2026-06-02T12:00:00.000Z"),
});
assert.ok(renderedDebugTime.includes("місячне коло 5/13 — Коло Зеленого Шуму"));
assert.equal(renderApproximateWorldClock({ hour: 17, minute: 22 }), "трохи по п'ятій після полудня");
assert.equal(renderApproximateWorldClock({ hour: 17, minute: 45 }), "ближче до шостої вечора");
assert.equal(renderApproximateWorldClock({ hour: 17, minute: 55 }), "майже шоста вечора");

const dreamDate = renderWorldDreamDateLine(start);
assert.ok(dreamDate.includes("587"));
assert.ok(dreamDate.includes("Коло Зеленого Шуму"));
assert.ok(dreamDate.includes("— рік"));
assert.ok(dreamDate.includes(", Коло Зеленого Шуму"));
assert.ok(dreamDate.includes("17 день"));
assert.ok(!dreamDate.includes("17:00"));
assert.ok(!dreamDate.includes("Погода"));
assert.ok(!dreamDate.includes("передвечір"));
assert.ok(getWorldYearName(start.year).startsWith("рік "));

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

assert.equal(visibilityRulesFromLight(darkLight, "brief").showNearbyDetails, false);
assert.equal(visibilityRulesFromLight(fullLight, "brief").showNearbyDetails, false);
assert.equal(visibilityRulesFromLight(localLight, "brief").showNearbyDetails, true);
assert.equal(visibilityRulesFromLight(darkLight, "details").showLocationDescription, false);
assert.equal(visibilityRulesFromLight(darkLight, "details").showNearbyDetails, false);
assert.equal(visibilityRulesFromLight(darkLight, "details").showTracks, false);
assert.equal(visibilityRulesFromLight(localLight, "details").showLocationDescription, true);
assert.ok(visibilityDarknessText(visibilityRulesFromLight(darkLight, "brief")).includes("Темрява"));
assert.ok(visibilityPresenceText(visibilityRulesFromLight(darkLight, "details"), "tracks").includes("слідів"));
assert.equal(textTargetVisibleUnderRules({ isCorpse: true }, visibilityRulesFromLight(darkLight, "details")), false);
assert.equal(textTargetVisibleUnderRules({ isCorpse: true }, visibilityRulesFromLight(localLight, "details")), true);
assert.equal(textTargetVisibleUnderRules({ isCorpse: false }, visibilityRulesFromLight(darkLight, "details")), false);
assert.equal(textTargetVisibleUnderRules({ isCorpse: false }, visibilityRulesFromLight(localLight, "details")), true);
const darkDetailRules = visibilityRulesFromLight(darkLight, "details");
const locallyLitDetailRules = visibilityRulesFromLight(localLight, "details");
assert.equal(visibilityReductionActive(darkDetailRules), true);
assert.equal(shouldShowFirstNightGuidanceForVisibility(darkDetailRules), true);
assert.equal(shouldShowFirstNightGuidanceForVisibility(locallyLitDetailRules), false);

const dayTarget = parseWorldTimeSetTarget("day", START_WORLD_ABSOLUTE_MINUTE);
assert.ok(dayTarget);
assert.equal(worldTimeSnapshotFromAbsoluteMinute(dayTarget.absoluteMinute).clockLabel, "12:00");

const fullMoonNight = parseWorldTimeSetTarget("fullmoon night", START_WORLD_ABSOLUTE_MINUTE);
assert.ok(fullMoonNight);
const fullMoonNightSnapshot = worldTimeSnapshotFromAbsoluteMinute(fullMoonNight.absoluteMinute);
assert.equal(fullMoonNightSnapshot.moonPhase, "full");
assert.equal(fullMoonNightSnapshot.daypart, "night");

assert.deepEqual(parseWeatherSetTarget("storm 80 30"), {
  key: "storm",
  intensity: 80,
  durationMinutes: 30,
});
assert.equal(parseWeatherSetTarget("not_weather"), null);

assert.ok(renderWorldYearLine(start.year).includes("587"));
const nextYear = worldTimeSnapshotFromAbsoluteMinute(START_WORLD_ABSOLUTE_MINUTE + 364 * 24 * 60);
assert.equal(nextYear.year, 588);
assert.ok(renderWorldYearLine(nextYear.year).includes("588"));
assert.ok(!renderWorldYearLine(nextYear.year).includes("587"));

assert.equal(daypartFromNoticeDescription("daypart=dusk; absoluteMinute=185400; clock=18:00"), "dusk");
assert.equal(daypartFromNoticeDescription("clock=18:00"), null);
assert.ok(worldDaypartNoticeText("dawn").includes("Настав світанок"));
assert.ok(worldDaypartNoticeText("dusk").includes("темнішає"));
assert.ok(worldDaypartNoticeText("night").includes("Настала ніч"));
assert.equal(isDreamLocationForWorldNotice({ key: "dream_tutorial_threshold", z: -13, region: { key: "dream_tutorial" } }), true);
assert.equal(isDreamLocationForWorldNotice({ key: "future_lucid_dream", z: -10, region: { key: "dreams" } }), true);
assert.equal(isDreamLocationForWorldNotice({ key: "underground_cave", z: -1, region: { key: "caves" } }), false);
assert.equal(isDreamLocationForWorldNotice({ key: "start_border_camp", z: 0, region: { key: "riverbank" } }), false);

console.log("World time helpers OK");
