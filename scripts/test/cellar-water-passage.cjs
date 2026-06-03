const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const {
  CELLAR_WATER_PASSAGE_DESTINATION_KEY,
  CELLAR_WATER_PASSAGE_EVENT_TITLE,
  CELLAR_WATER_PASSAGE_RESULT_TEXT,
  CELLAR_WATER_PASSAGE_SOURCE_KEY,
  canTriggerCellarWaterWordPassage,
  cellarWaterWordPassageEventDescription,
  isCellarWaterWordPhrase,
  normalizeCellarWaterWordPhrase,
} = require("../../src/services/cellarWaterPassage");
const {
  darkFeatureInspectionText,
  featureBriefInspectionText,
} = require("../../src/services/locations");

assert.equal(normalizeCellarWaterWordPhrase("До води!"), "до води");
assert.equal(isCellarWaterWordPhrase("До води"), true);
assert.equal(isCellarWaterWordPhrase("до води"), true);
assert.equal(isCellarWaterWordPhrase("До води!"), true);
assert.equal(isCellarWaterWordPhrase("до  води..."), true);
assert.equal(isCellarWaterWordPhrase("до мосту"), false);

assert.equal(
  canTriggerCellarWaterWordPassage({ text: "До води!", locationKey: CELLAR_WATER_PASSAGE_SOURCE_KEY, hp: 20, isResting: false, sleepState: "AWAKE" }),
  true,
);
assert.equal(
  canTriggerCellarWaterWordPassage({ text: "До води!", locationKey: "dream_tutorial_start", hp: 20, isResting: false, sleepState: "AWAKE" }),
  false,
);
assert.equal(
  canTriggerCellarWaterWordPassage({ text: "До води!", locationKey: CELLAR_WATER_PASSAGE_SOURCE_KEY, hp: 0, isResting: false, sleepState: "AWAKE" }),
  false,
);
assert.equal(
  canTriggerCellarWaterWordPassage({ text: "До води!", locationKey: CELLAR_WATER_PASSAGE_SOURCE_KEY, hp: 20, isResting: true, sleepState: "AWAKE" }),
  false,
);
assert.equal(
  canTriggerCellarWaterWordPassage({ text: "До води!", locationKey: CELLAR_WATER_PASSAGE_SOURCE_KEY, hp: 20, isResting: false, sleepState: "ORDINARY_SLEEP" }),
  false,
);

const exits = JSON.parse(fs.readFileSync("prisma/data/world/exits.json", "utf8"));
assert.equal(
  exits.some((exit) => exit.fromKey === CELLAR_WATER_PASSAGE_SOURCE_KEY && exit.toKey === CELLAR_WATER_PASSAGE_DESTINATION_KEY),
  false,
  "Cellar water-word passage must not be authored as an ordinary visible exit",
);

const features = JSON.parse(fs.readFileSync("prisma/data/world/features.json", "utf8"));
const notchWall = features.find((item) => item.key === "start_cellar_old_notch_wall");
const mapBoard = features.find((item) => item.key === "start_cellar_torn_map_board");
for (const feature of [notchWall, mapBoard]) {
  assert.ok(feature, "Cellar hint feature should exist");
  assert.equal(feature.locationKey, CELLAR_WATER_PASSAGE_SOURCE_KEY, "Water-word hint should stay in the cellar");
  const text = `${feature.description}\n${feature.data?.examine_summary ?? ""}`;
  assert.match(text, /до води/i, "Feature inspection text should hint the water-word phrase");

  for (const darkText of [
    darkFeatureInspectionText(feature),
    featureBriefInspectionText(feature, false, {}, false),
  ]) {
    assert.doesNotMatch(darkText, /До води/i, "Dark feature text should not reveal the water-word phrase");
    assert.doesNotMatch(darkText, /до води/i, "Dark feature text should not reveal the water-word phrase");
    assert.doesNotMatch(darkText, /under_bridge_18_05/i, "Dark feature text should not reveal the destination key");
    assert.doesNotMatch(darkText, /під мостом/i, "Dark feature text should not reveal the under-bridge clue");
  }
}

assert.match(CELLAR_WATER_PASSAGE_RESULT_TEXT, /Тепер варто озирнутися\./);

const eventDescription = cellarWaterWordPassageEventDescription(42);
assert.equal(CELLAR_WATER_PASSAGE_EVENT_TITLE, "Cellar water-word passage");
assert.match(eventDescription, new RegExp(`source=${CELLAR_WATER_PASSAGE_SOURCE_KEY}`));
assert.match(eventDescription, new RegExp(`destination=${CELLAR_WATER_PASSAGE_DESTINATION_KEY}`));
assert.match(eventDescription, /player=42/);

const news = fs.readFileSync("news.md", "utf8");
assert.doesNotMatch(news, /До води/i, "Public news should not spoil the water-word phrase");

console.log("Cellar water-word passage helpers OK");
