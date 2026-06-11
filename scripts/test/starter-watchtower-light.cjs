const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const {
  canShowFeatureDetailsInCurrentVisibility,
  darkFeatureInspectionText,
  featureBriefInspectionText,
} = require("../../src/services/locations");
const { visibilityRulesFromLight } = require("../../src/services/visibility");

const worldDir = path.join(process.cwd(), "prisma", "data", "world");
const locations = JSON.parse(fs.readFileSync(path.join(worldDir, "locations.json"), "utf8"));
const features = JSON.parse(fs.readFileSync(path.join(worldDir, "features.json"), "utf8"));

const starterLocationKeys = new Set(
  locations.filter((item) => item.regionKey === "starter_camp").map((item) => item.key),
);

const torchStand = features.find((item) => item.key === "start_camp_torch_stand");
assert.ok(torchStand, "Starter watchtower torch stand should exist");
assert.equal(torchStand.locationKey, "start_border_watchtower", "Starter torch stand should stay on the watchtower");
assert.equal(torchStand.data?.torch_source, true, "Starter torch stand should remain a torch source");
assert.equal(torchStand.providesLight, true, "Starter torch stand should provide authored reflected local light");
assert.equal(
  torchStand.data?.starter_reflected_campfire_light,
  true,
  "Starter torch stand light should be explicitly marked as reflected campfire light",
);
assert.match(torchStand.description, /незгасного вогню/, "Torch stand description should explain the reflected campfire light");
assert.match(torchStand.data?.examine_summary ?? "", /відблиск/, "Torch stand examine summary should mention the reflected light");

const starterLightFeatures = features
  .filter((item) => starterLocationKeys.has(item.locationKey) && item.providesLight === true)
  .map((item) => item.key)
  .sort();
assert.deepEqual(
  starterLightFeatures,
  ["start_camp_torch_stand", "start_unfading_campfire"].sort(),
  "Starter camp local light should stay limited to the unfading campfire and watchtower torch stand",
);

const detailedTorchStand = featureBriefInspectionText(torchStand, false, {}, true);
assert.doesNotMatch(detailedTorchStand, /Без світла/, "Lit watchtower torch stand detail should not use the darkness-blocked copy");
assert.match(detailedTorchStand, /факели/, "Lit watchtower torch stand should still explain that torches can be taken");

const darkDetailVisibility = visibilityRulesFromLight({
  level: "dark",
  score: 0,
  hasLocalLight: false,
  label: "темрява",
}, "details");
const dryBunks = features.find((item) => item.key === "start_cellar_dry_bunks");
assert.ok(dryBunks, "Starter cellar dry bunks should exist");
assert.equal(dryBunks.locationKey, "start_border_cellar", "Starter dry bunks should stay in the cellar");
assert.equal(dryBunks.providesLight, false, "Starter dry bunks should not provide light");
assert.equal(dryBunks.data?.sleep_surface, true, "Starter dry bunks should remain a sleep surface");
assert.equal(
  canShowFeatureDetailsInCurrentVisibility(dryBunks, darkDetailVisibility),
  true,
  "Sleep-surface bunks should remain usable without light",
);
const darkBunksLine = featureBriefInspectionText(dryBunks, false, {}, canShowFeatureDetailsInCurrentVisibility(dryBunks, darkDetailVisibility));
assert.doesNotMatch(darkBunksLine, /Без світла/, "Dark sleep-surface line should not use the darkness-blocked copy");
assert.match(darkBunksLine, /лягти й заснути/, "Dark sleep-surface line should still expose lie/sleep affordance");

for (const key of ["start_cellar_old_notch_wall", "start_cellar_torn_map_board"]) {
  const feature = features.find((item) => item.key === key);
  assert.ok(feature, `Starter cellar feature should exist: ${key}`);
  assert.equal(feature.locationKey, "start_border_cellar", `Cellar feature should stay in the dark cellar: ${key}`);
  assert.equal(feature.providesLight, false, `Cellar feature should not provide light: ${key}`);
  assert.equal(
    canShowFeatureDetailsInCurrentVisibility(feature, darkDetailVisibility),
    false,
    `Non-sleep cellar feature details should still require light: ${key}`,
  );

  const darkOutline = featureBriefInspectionText(feature, false, {}, false);
  const darkFull = darkFeatureInspectionText(feature);
  for (const text of [darkOutline, darkFull]) {
    assert.doesNotMatch(text, /До води/i, `Dark cellar feature text should not leak the water-word phrase: ${key}`);
    assert.doesNotMatch(text, /under_bridge_18_05/, `Dark cellar feature text should not leak the destination key: ${key}`);
    assert.doesNotMatch(text, /під мостом/i, `Dark cellar feature text should not reveal the under-bridge destination: ${key}`);
  }
}

console.log("Starter watchtower light OK");
