const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const {
  TRACK_GATE_DESTINATION_KEY,
  TRACK_GATE_EVENT_TITLE,
  TRACK_GATE_FEATURE_KEY,
  TRACK_GATE_SOURCE_KEY,
  canRevealTrackGate,
  trackGateDarkInspectionText,
  trackGateDarkOutline,
  trackGateEventDescription,
  trackGateRevealText,
  trackGateUseDecision,
} = require("../../src/services/trackGatedLocation");
const {
  darkFeatureInspectionText,
  featureBriefInspectionText,
} = require("../../src/services/locations");
const { parseAlias } = require("../../src/input/aliases");

const locations = JSON.parse(fs.readFileSync("prisma/data/world/locations.json", "utf8"));
const exits = JSON.parse(fs.readFileSync("prisma/data/world/exits.json", "utf8"));
const features = JSON.parse(fs.readFileSync("prisma/data/world/features.json", "utf8"));
const resources = JSON.parse(fs.readFileSync("prisma/data/world/resourceNodes.json", "utf8"));

const source = locations.find((location) => location.key === TRACK_GATE_SOURCE_KEY);
const destination = locations.find((location) => location.key === TRACK_GATE_DESTINATION_KEY);
assert.ok(source, "Track-gated source location should exist");
assert.ok(destination, "Track-gated destination location should exist");
assert.equal(destination.name, "Низький звіриний лаз");
assert.equal(destination.regionKey, source.regionKey);
assert.equal(destination.z, -1);
assert.equal(destination.dangerLevel, 0);

const sameNameLocations = locations.filter((location) => location.name === destination.name);
assert.equal(sameNameLocations.length, 1, "Track-gated destination name should be unique");
const sameDescriptionLocations = locations.filter((location) => location.description === destination.description);
assert.equal(sameDescriptionLocations.length, 1, "Track-gated destination description should be unique");

const hiddenEntry = exits.find((exit) =>
  exit.fromKey === TRACK_GATE_SOURCE_KEY
  && exit.toKey === TRACK_GATE_DESTINATION_KEY
);
assert.ok(hiddenEntry, "Track-gated entry should be authored");
assert.equal(hiddenEntry.direction, "INSIDE");
assert.equal(hiddenEntry.isHidden, true, "Track-gated entry must not appear as an ordinary visible exit");

const visibleReturn = exits.find((exit) =>
  exit.fromKey === TRACK_GATE_DESTINATION_KEY
  && exit.toKey === TRACK_GATE_SOURCE_KEY
);
assert.ok(visibleReturn, "Track-gated place should have a visible return path");
assert.equal(visibleReturn.direction, "OUTSIDE");
assert.equal(visibleReturn.isHidden, false);

assert.equal(
  resources.some((resource) => resource.locationKey === TRACK_GATE_DESTINATION_KEY),
  false,
  "Track-gated place should not become a resource or loot cache",
);

const feature = features.find((item) => item.key === TRACK_GATE_FEATURE_KEY);
assert.ok(feature, "Track-gated feature should exist");
assert.equal(feature.locationKey, TRACK_GATE_SOURCE_KEY);
assert.equal(feature.data?.attention_gate, "fresh_tracks");
assert.equal(feature.data?.destination_location_key, TRACK_GATE_DESTINATION_KEY);
assert.equal(feature.data?.no_loot, true);
assert.ok(Array.isArray(feature.data?.aliases) && feature.data.aliases.includes("прим’ята трава"));

for (const darkText of [
  trackGateDarkOutline(),
  trackGateDarkInspectionText(),
  darkFeatureInspectionText(feature),
  featureBriefInspectionText(feature, false, {}, false),
]) {
  assert.doesNotMatch(darkText, /Низький звіриний лаз/i, "Dark/no-track text should not name the destination");
  assert.doesNotMatch(darkText, /meadow_16_05_grass_run/i, "Dark/no-track text should not expose raw destination key");
  assert.doesNotMatch(darkText, /Пройти за слідом/i, "Dark/no-track text should not expose the action");
  assert.doesNotMatch(darkText, /людина пройде тільки боком/i, "Dark/no-track text should not reveal the full track clue");
}

assert.match(trackGateRevealText("tracks"), /Слід не йде далі відкритою стежкою/i);
assert.match(trackGateRevealText("follow-memory"), /чужий рух/i);
assert.match(trackGateRevealText("tracks"), /пройти за слідом/i);

assert.equal(canRevealTrackGate({ hasFreshVisibleTrack: true }), true);
assert.equal(canRevealTrackGate({ hasFreshFollowRouteMemory: true }), true);
assert.equal(canRevealTrackGate({ hasHiddenRouteMemory: true }), false);
assert.equal(canRevealTrackGate({}), false);

assert.deepEqual(
  trackGateUseDecision({
    playerLocationId: 101,
    playerLocationKey: TRACK_GATE_SOURCE_KEY,
    feature: {
      id: 202,
      key: TRACK_GATE_FEATURE_KEY,
      locationId: 101,
      isActive: true,
      data: { attention_gate: "fresh_tracks" },
    },
    hasFreshVisibleTrack: true,
  }),
  { ok: true, featureId: 202, revealReason: "tracks" },
  "Fresh visible tracks should pass the track gate use decision",
);
assert.deepEqual(
  trackGateUseDecision({
    playerLocationId: 101,
    playerLocationKey: TRACK_GATE_SOURCE_KEY,
    feature: {
      id: 202,
      key: TRACK_GATE_FEATURE_KEY,
      locationId: 101,
      isActive: true,
      data: { attention_gate: "fresh_tracks" },
    },
    hasFreshFollowRouteMemory: true,
  }),
  { ok: true, featureId: 202, revealReason: "follow-memory" },
  "Fresh clear follow route memory should pass the track gate use decision",
);
assert.deepEqual(
  trackGateUseDecision({
    playerLocationId: 101,
    playerLocationKey: TRACK_GATE_SOURCE_KEY,
    feature: {
      id: 202,
      key: TRACK_GATE_FEATURE_KEY,
      locationId: 101,
      isActive: true,
      data: { attention_gate: "fresh_tracks" },
    },
    hasHiddenRouteMemory: true,
  }),
  { ok: false, reason: "no-track", featureId: 202 },
  "Hidden water-word style memory must not count as ordinary track-gate memory",
);

for (const input of [
  "/follow_trace",
  "follow_trace",
  "follow trace",
  "track passage",
  "пройти за слідом",
  "пролізти за слідом",
  "пройти за прим’ятою травою",
]) {
  const parsed = parseAlias(input);
  assert.equal(parsed?.kind, "track-gate", `Expected track-gate alias for ${input}`);
}

const eventDescription = trackGateEventDescription(17, "tracks");
assert.equal(TRACK_GATE_EVENT_TITLE, "Track-gated grass run passage");
assert.match(eventDescription, /player=17/);
assert.match(eventDescription, new RegExp(`source=${TRACK_GATE_SOURCE_KEY}`));
assert.match(eventDescription, new RegExp(`destination=${TRACK_GATE_DESTINATION_KEY}`));
assert.match(eventDescription, new RegExp(`feature=${TRACK_GATE_FEATURE_KEY}`));
assert.match(eventDescription, /gate=fresh_tracks/);

const news = fs.readFileSync("news.md", "utf8");
assert.doesNotMatch(news, /meadow_16_05_grass_run/i, "Public news should not expose the raw hidden location key");

const locationsServiceSource = fs.readFileSync("src/services/locations.ts", "utf8");
assert.match(
  locationsServiceSource,
  /canPlayerRevealTrackGate/,
  "Feature interaction rendering should import the player-aware track-gate reveal helper",
);
assert.match(
  locationsServiceSource,
  /isTrackGateFeature\(feature\)[\s\S]{0,190}canPlayerRevealTrackGate\(viewerPlayerId, feature\.locationId\)/,
  "Direct track-gate feature inspection should use player-aware track/follow-memory reveal before showing the dark fallback",
);

console.log("Track-gated location helpers OK");
