const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const {
  ATTENTION_ROOT_GAP_DESTINATION_KEY,
  ATTENTION_ROOT_GAP_EVENT_TITLE,
  ATTENTION_ROOT_GAP_FEATURE_KEY,
  ATTENTION_ROOT_GAP_SOURCE_KEY,
  attentionRootGapDarkInspectionText,
  attentionRootGapDarkOutline,
  attentionRootGapEventDescription,
  attentionRootGapRevealText,
} = require("../../src/services/attentionGatedLocation");
const {
  darkFeatureInspectionText,
  featureBriefInspectionText,
} = require("../../src/services/locations");
const { parseAlias } = require("../../src/input/aliases");

const locations = JSON.parse(fs.readFileSync("prisma/data/world/locations.json", "utf8"));
const exits = JSON.parse(fs.readFileSync("prisma/data/world/exits.json", "utf8"));
const features = JSON.parse(fs.readFileSync("prisma/data/world/features.json", "utf8"));
const resources = JSON.parse(fs.readFileSync("prisma/data/world/resourceNodes.json", "utf8"));

const source = locations.find((location) => location.key === ATTENTION_ROOT_GAP_SOURCE_KEY);
const rootPocket = locations.find((location) => location.key === ATTENTION_ROOT_GAP_DESTINATION_KEY);
assert.ok(source, "Attention-gated source location should exist");
assert.ok(rootPocket, "Attention-gated root pocket location should exist");
assert.equal(rootPocket.name, "Коренева кишеня під погребом");
assert.equal(rootPocket.regionKey, "starter_camp");
assert.equal(rootPocket.z, -1);
assert.equal(rootPocket.dangerLevel, 0);

const sameNameLocations = locations.filter((location) => location.name === rootPocket.name);
assert.equal(sameNameLocations.length, 1, "Attention-gated location name should be unique");
const sameDescriptionLocations = locations.filter((location) => location.description === rootPocket.description);
assert.equal(sameDescriptionLocations.length, 1, "Attention-gated location description should be unique");

const hiddenEntry = exits.find((exit) =>
  exit.fromKey === ATTENTION_ROOT_GAP_SOURCE_KEY
  && exit.toKey === ATTENTION_ROOT_GAP_DESTINATION_KEY
);
assert.ok(hiddenEntry, "Root pocket entry should be authored");
assert.equal(hiddenEntry.direction, "INSIDE");
assert.equal(hiddenEntry.isHidden, true, "Root pocket entry must not appear as an ordinary visible exit");

const visibleReturn = exits.find((exit) =>
  exit.fromKey === ATTENTION_ROOT_GAP_DESTINATION_KEY
  && exit.toKey === ATTENTION_ROOT_GAP_SOURCE_KEY
);
assert.ok(visibleReturn, "Root pocket should have a visible return path");
assert.equal(visibleReturn.direction, "OUTSIDE");
assert.equal(visibleReturn.isHidden, false);

assert.equal(
  resources.some((resource) => resource.locationKey === ATTENTION_ROOT_GAP_DESTINATION_KEY),
  false,
  "Root pocket should not become a resource or loot cache",
);

const rootGap = features.find((feature) => feature.key === ATTENTION_ROOT_GAP_FEATURE_KEY);
assert.ok(rootGap, "Attention-gated feature should exist");
assert.equal(rootGap.locationKey, ATTENTION_ROOT_GAP_SOURCE_KEY);
assert.equal(rootGap.data?.attention_gate, "root_gap_light");
assert.equal(rootGap.data?.destination_location_key, ATTENTION_ROOT_GAP_DESTINATION_KEY);
assert.equal(rootGap.data?.no_loot, true);
assert.ok(rootGap.data?.aliases?.includes("пролізти під коріння"));

for (const darkText of [
  attentionRootGapDarkOutline(),
  attentionRootGapDarkInspectionText(),
  darkFeatureInspectionText(rootGap),
  featureBriefInspectionText(rootGap, false, {}, false),
]) {
  assert.doesNotMatch(darkText, /Коренева кишеня/i, "Dark text should not name the destination");
  assert.doesNotMatch(darkText, /start_cellar_root_pocket/i, "Dark text should not expose raw destination key");
  assert.doesNotMatch(darkText, /Пролізти/i, "Dark text should not expose the crawl action");
  assert.doesNotMatch(darkText, /вузьку суху щілину/i, "Dark text should not reveal the full lit clue");
}

assert.match(attentionRootGapRevealText(), /вузьку суху щілину/i);
assert.match(attentionRootGapRevealText(), /пролізти обережно/i);
assert.match(featureBriefInspectionText(rootGap), /зі світлом/i);

for (const input of ["/crawl", "crawl", "пролізти", "пролізти в щілину", "лізти в щілину"]) {
  const parsed = parseAlias(input);
  assert.equal(parsed?.kind, "crawl-root-gap", `Expected crawl-root-gap alias for ${input}`);
}

const eventDescription = attentionRootGapEventDescription(17);
assert.equal(ATTENTION_ROOT_GAP_EVENT_TITLE, "Attention-gated root pocket passage");
assert.match(eventDescription, /player=17/);
assert.match(eventDescription, new RegExp(`source=${ATTENTION_ROOT_GAP_SOURCE_KEY}`));
assert.match(eventDescription, new RegExp(`destination=${ATTENTION_ROOT_GAP_DESTINATION_KEY}`));
assert.match(eventDescription, new RegExp(`feature=${ATTENTION_ROOT_GAP_FEATURE_KEY}`));

const news = fs.readFileSync("news.md", "utf8");
assert.doesNotMatch(news, /start_cellar_root_pocket/i, "Public news should not expose the raw hidden location key");

console.log("Attention-gated location helpers OK");
