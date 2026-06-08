import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const worldDir = path.join(root, "prisma", "data", "world");

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(worldDir, fileName), "utf8"));
}

function keySet(items, label) {
  const keys = new Set();
  for (const item of items) {
    assert.equal(typeof item.key, "string", `${label} item is missing key`);
    assert.ok(item.key.length > 0, `${label} item has an empty key`);
    assert.ok(!keys.has(item.key), `Duplicate ${label} key: ${item.key}`);
    keys.add(item.key);
  }
  return keys;
}

function assertKnown(set, key, message) {
  assert.ok(set.has(key), `${message}: ${key}`);
}

function assertFeatureExamineSummary(feature, message) {
  assert.ok(feature, `${message}: missing feature`);
  const summary = typeof feature.data?.examine_summary === "string" ? feature.data.examine_summary.trim() : "";
  assert.ok(summary.length >= 40, `${message}: examine_summary should be substantial`);
  assert.notEqual(summary, feature.name, `${message}: examine_summary should not collapse to the feature name`);
  assert.notEqual(summary, feature.description, `${message}: examine_summary should not duplicate the full description`);
}

function sourceLocationKeys(filePath) {
  const source = fs.readFileSync(path.join(root, filePath), "utf8");
  return [...source.matchAll(/locationKey:\s*"([^"]+)"/g)].map((match) => match[1]);
}

const meta = readJson("meta.json");
const regions = readJson("regions.json");
const locations = readJson("locations.json");
const exits = readJson("exits.json");
const resourceTypes = readJson("resourceTypes.json");
const resourceNodes = readJson("resourceNodes.json");
const resourceRules = readJson("resourceRules.json");
const features = readJson("features.json");
const uniqueCreatures = readJson("uniqueCreatures.json");

assert.equal(typeof meta.startLocationKey, "string", "meta.startLocationKey must be set");
assert.ok(
  meta.notes?.some((note) => /\+1 upper rooms and -1 lower rooms/.test(note)),
  "meta.json should document that authored +1 and -1 rooms are allowed",
);

const regionKeys = keySet(regions, "region");
const locationKeys = keySet(locations, "location");
const locationByKey = new Map(locations.map((location) => [location.key, location]));
const resourceTypeKeys = keySet(resourceTypes, "resource type");
keySet(features, "feature");

const starterCampRegion = regions.find((item) => item.key === "starter_camp");
assert.ok(starterCampRegion, "Starter camp infrastructure region should exist");
assert.equal(starterCampRegion.name, "Межовий табір", "Starter camp region should have the authored Ukrainian name");

function assertUniqueLocationText(field, label) {
  const seen = new Map();
  for (const location of locations) {
    const value = String(location[field] ?? "").trim();
    assert.ok(value.length > 0, `Location ${location.key} is missing ${label}`);
    const duplicate = seen.get(value);
    assert.equal(
      duplicate,
      undefined,
      `Duplicate location ${label}: "${value}" on ${duplicate} and ${location.key}`,
    );
    seen.set(value, location.key);
  }
}

assertUniqueLocationText("name", "name");
assertUniqueLocationText("description", "description");

assertKnown(locationKeys, meta.startLocationKey, "Start location from meta.json is not present in locations.json");

const coordinatesByRegion = new Map();
for (const location of locations) {
  assertKnown(regionKeys, location.regionKey, `Unknown regionKey for location ${location.key}`);
  const coordKey = `${location.regionKey}:${location.x},${location.y},${location.z ?? 0}`;
  assert.ok(!coordinatesByRegion.has(coordKey), `Duplicate location coordinates ${coordKey}: ${coordinatesByRegion.get(coordKey)} and ${location.key}`);
  coordinatesByRegion.set(coordKey, location.key);
}

for (const exit of exits) {
  assertKnown(locationKeys, exit.fromKey, "Unknown fromKey for exit");
  assertKnown(locationKeys, exit.toKey, "Unknown toKey for exit");
}

const exitDirectionKeys = new Set();
for (const exit of exits) {
  const directionKey = `${exit.fromKey}:${exit.direction}`;
  assert.equal(exitDirectionKeys.has(directionKey), false, `Duplicate exit direction from ${exit.fromKey}: ${exit.direction}`);
  exitDirectionKeys.add(directionKey);
}

const resourceNodeKeys = new Set();
for (const node of resourceNodes) {
  assertKnown(locationKeys, node.locationKey, "Unknown locationKey for resource node");
  assertKnown(resourceTypeKeys, node.resourceKey, "Unknown resourceKey for resource node");
  const nodeKey = `${node.locationKey}:${node.resourceKey}`;
  assert.ok(!resourceNodeKeys.has(nodeKey), `Duplicate resource node ${nodeKey}`);
  resourceNodeKeys.add(nodeKey);
  assert.ok(Number.isInteger(node.amount) && node.amount >= 0, `Invalid resource amount for ${nodeKey}`);
  assert.ok(Number.isInteger(node.maxAmount) && node.maxAmount >= node.amount, `Invalid resource maxAmount for ${nodeKey}`);
}

for (const location of locations.filter((item) => item.regionKey === "dream_tutorial")) {
  const biomeRules = resourceRules.defaultsByBiome?.[location.biome] ?? {};
  const overrides = resourceRules.locationOverrides?.[location.key] ?? {};
  const keys = new Set([...Object.keys(biomeRules), ...Object.keys(overrides)]);

  for (const resourceKey of keys) {
    if (!["grass", "berries", "mushrooms", "herbs"].includes(resourceKey)) continue;
    const rule = Object.prototype.hasOwnProperty.call(overrides, resourceKey) ? overrides[resourceKey] : biomeRules[resourceKey];
    const amount = Array.isArray(rule) ? rule[1] : rule;

    if (location.key === "dream_tutorial_foraging" && (resourceKey === "berries" || resourceKey === "herbs")) {
      assert.ok(amount > 0, `Dream foraging lesson should keep ${resourceKey}`);
      continue;
    }

    assert.ok(!amount || amount <= 0, `Dream tutorial location should not inherit biome resource ${location.key}:${resourceKey}`);
  }
}

for (const feature of features) {
  assertKnown(locationKeys, feature.locationKey, `Unknown locationKey for feature ${feature.key}`);
}

function renderedFeatureIcon(feature) {
  const data = feature.data ?? {};
  if (typeof data.icon === "string" && data.icon.trim()) return data.icon.trim();
  if (data.tutorial_inside_prompt === true || data.tutorial_outside_prompt === true) return "🕯️";
  if (data.tutorial_rest_seat === true) return "🪑";
  if (data.tutorial_observation_prompt === true) return "🦊";
  if (feature.type === "CAMPFIRE" || feature.type === "MAGIC_CAMPFIRE" || data.is_campfire === true) {
    return data.extinguished === true ? "🪨" : "🔥";
  }
  if (feature.key.startsWith("depleted_vegetation_") || data.ecology === "depleted_vegetation") return "🌾";
  if (feature.type === "BORDER_MARKER") return "🪧";
  if (feature.type === "GATE") return "🚪";
  return "✦";
}

for (const feature of features) {
  assert.notEqual(renderedFeatureIcon(feature), "✦", `Feature should not fall back to the generic icon: ${feature.key}`);
}

const explicitFeatureIconsByLocation = new Map();
for (const feature of features) {
  const icon = typeof feature.data?.icon === "string" ? feature.data.icon.trim() : "";
  if (!icon) continue;
  const locationIcons = explicitFeatureIconsByLocation.get(feature.locationKey) ?? new Map();
  assert.ok(
    !locationIcons.has(icon),
    `Duplicate explicit feature icon in ${feature.locationKey}: ${icon} on ${locationIcons.get(icon)} and ${feature.key}`,
  );
  locationIcons.set(icon, feature.key);
  explicitFeatureIconsByLocation.set(feature.locationKey, locationIcons);
}

for (const key of ["closed_gate_torch_stand", "closed_gate_hunting_notice", "closed_gate_carcass_dropoff"]) {
  const feature = features.find((item) => item.key === key);
  assert.ok(feature?.data?.icon, `Gate feature should have a distinct icon: ${key}`);
}

const oldLogApiary = features.find((item) => item.key === "meadow_old_log_apiary_12_02");
assert.ok(oldLogApiary, "Dry meadow old log apiary feature should exist");
assert.equal(oldLogApiary.locationKey, "meadow_12_02", "Old log apiary should stay in meadow_12_02");
assert.equal(oldLogApiary.type, "LANDMARK", "Old log apiary should be a LANDMARK feature");
assert.equal(oldLogApiary.data?.apiary, true, "Old log apiary should be marked as an apiary");
assert.equal(oldLogApiary.data?.apiary_kind, "old_log_hive", "Old log apiary should keep its apiary kind");
assert.equal(oldLogApiary.data?.hazard_key, "bumblebee_sting", "Old log apiary should expose bumblebee hazard metadata");
assert.equal(oldLogApiary.data?.aura_radius, 1, "Old log apiary should start with a one-step aura");
assert.equal(oldLogApiary.data?.center_sting_chance_permille, 777, "Old log apiary center chance should match authored MVP tuning");
assert.equal(oldLogApiary.data?.neighbor_sting_chance_permille, 130, "Old log apiary neighbor chance should match authored MVP tuning");
assert.deepEqual(oldLogApiary.data?.center_damage, [2, 3], "Old log apiary center sting damage should feel noticeable but survivable");
assert.deepEqual(oldLogApiary.data?.neighbor_damage, [1, 1], "Old log apiary neighbor sting damage should stay mild");
assert.equal(oldLogApiary.data?.passive_cooldown_ms, 120_000, "Old log apiary passive cooldown should match one default in-game hour");
assert.equal(resourceTypeKeys.has("honey"), true, "Apiary harvest MVP should define honey resource type");
assert.equal(resourceTypeKeys.has("beeswax"), true, "Apiary harvest MVP should define beeswax resource type");
assert.equal(oldLogApiary.data?.raid_cooldown_ms, 720_000, "Old log apiary should limit repeated hive robbery to roughly six in-game hours");
assert.equal(oldLogApiary.data?.raid_success_chance_permille, 700, "Old log apiary should have authored raid success chance");
assert.equal(oldLogApiary.data?.raid_wax_chance_permille, 350, "Old log apiary should have authored wax chance");
assert.deepEqual(oldLogApiary.data?.raid_damage, [2, 5], "Old log apiary should have stronger disturbance sting damage");
assert.deepEqual(oldLogApiary.data?.raid_rewards, ["honey", "beeswax"], "Old log apiary should expose current raid rewards");
assertFeatureExamineSummary(oldLogApiary, "Old log apiary should have a meaningful examine summary");
assert.match(oldLogApiary.data.examine_summary, /обачно|рук|щілина/u, "Old log apiary summary should warn through diegetic detail");
for (const alias of ["бортя", "вулик", "мед", "віск"]) {
  assert.ok(oldLogApiary.data?.aliases?.includes(alias), `Old log apiary should include alias: ${alias}`);
}

const gateTorchStand = features.find((item) => item.key === "closed_gate_torch_stand");
assert.notEqual(gateTorchStand?.data?.icon, "🔥", "Torch stand should not use the fire icon reserved for flame/campfire actions");
assert.equal(gateTorchStand?.data?.hunter_resupply, false, "Gate torch stand should no longer be the hunter resupply source");

for (const key of ["start_border_marker", "start_newcomer_tablet", "start_lunar_circles_birchbark", "start_border_watchtower_ladder"]) {
  const feature = features.find((item) => item.key === key);
  assert.ok(feature, `Starter camp feature should exist: ${key}`);
  assert.equal(feature.locationKey, "start_border_camp", `Starter camp feature should stay at the camp: ${key}`);
  assert.ok(feature.data?.icon, `Starter camp feature should have a distinct icon: ${key}`);
  assert.ok(Array.isArray(feature.data?.aliases) && feature.data.aliases.length > 0, `Starter camp feature should have aliases: ${key}`);
}

assert.deepEqual(
  features.filter((item) => item.locationKey === "start_border_camp").slice(0, 5).map((item) => item.key),
  [
    "start_border_watchtower_ladder",
    "start_border_marker",
    "start_newcomer_tablet",
    "start_lunar_circles_birchbark",
    "start_unfading_campfire",
  ],
  "Starter camp feature order should lead with the watchtower and leave the unfading campfire last",
);

const startWatchtowerLadder = features.find((item) => item.key === "start_border_watchtower_ladder");
assert.equal(startWatchtowerLadder?.data?.vertical_hint, "UP", "Starter watchtower feature should expose an UP action hint");
for (const key of ["start_newcomer_tablet", "start_lunar_circles_birchbark", "start_border_watchtower_ladder"]) {
  const feature = features.find((item) => item.key === key);
  assertFeatureExamineSummary(feature, `Starter authored landmark should have meaningful examine summary: ${key}`);
}

const startWatchtower = locations.find((item) => item.key === "start_border_watchtower");
const startCamp = locations.find((item) => item.key === "start_border_camp");
const underBridge = locations.find((item) => item.key === "under_bridge_18_05");
const startRootPocket = locations.find((item) => item.key === "start_cellar_root_pocket");
const meadowTrackRun = locations.find((item) => item.key === "meadow_16_05_grass_run");
assert.ok(startCamp, "Starter camp should exist");
assert.equal(startCamp.regionKey, "starter_camp", "Starter camp should use the starter infrastructure region");
assert.ok(startWatchtower, "Starter camp watchtower should exist as a real location");
assert.equal(startWatchtower.x, 17, "Starter camp watchtower should sit above the camp x coordinate");
assert.equal(startWatchtower.y, 5, "Starter camp watchtower should sit above the camp y coordinate");
assert.equal(startWatchtower.z, 1, "Starter camp watchtower should use z = 1");
assert.equal(startWatchtower.regionKey, "starter_camp", "Starter watchtower should use the starter infrastructure region");
const startCellar = locations.find((item) => item.key === "start_border_cellar");
assert.ok(startCellar, "Starter camp cellar should exist as a real waking-world location");
assert.equal(startCellar.x, 17, "Starter camp cellar should sit below the camp x coordinate");
assert.equal(startCellar.y, 5, "Starter camp cellar should sit below the camp y coordinate");
assert.equal(startCellar.z, -1, "Starter camp cellar should use z = -1");
assert.equal(startCellar.regionKey, "starter_camp", "Starter camp cellar should use the starter infrastructure region");
assert.equal(startCellar.dangerLevel, 0, "Starter camp cellar should stay safe");
assert.ok(startRootPocket, "Starter cellar root pocket should exist as the first attention-gated location");
assert.equal(startRootPocket.z, -1, "Starter cellar root pocket should stay in the intentional lower starter layer");
assert.equal(startRootPocket.regionKey, "starter_camp", "Starter cellar root pocket should use the starter infrastructure region");
assert.equal(startRootPocket.dangerLevel, 0, "Starter cellar root pocket should stay safe");
assert.ok(meadowTrackRun, "Track-aware attention-gated grass run should exist");
assert.equal(meadowTrackRun.regionKey, "dry_luka", "Track-aware grass run should stay in the dry luka region");
assert.equal(meadowTrackRun.z, -1, "Track-aware grass run should use an intentional low surface layer");
assert.equal(meadowTrackRun.dangerLevel, 0, "Track-aware grass run should stay safe");
assert.equal(underBridge?.regionKey, "riverbank", "Under-bridge location should count as riverbank for regional world behavior");
const starterCampLocationKeys = new Set(locations.filter((item) => item.regionKey === "starter_camp").map((item) => item.key));
assert.deepEqual(
  [...starterCampLocationKeys].sort(),
  ["start_border_camp", "start_border_cellar", "start_border_watchtower", "start_cellar_root_pocket"].sort(),
  "Starter infrastructure region should contain only the camp vertical stack and attention-gated root pocket",
);
assert.ok(
  exits.some((exit) => exit.fromKey === "start_border_camp" && exit.toKey === "start_border_watchtower" && exit.direction === "UP"),
  "Starter camp should have an UP exit to the watchtower",
);
assert.ok(
  exits.some((exit) => exit.fromKey === "start_border_watchtower" && exit.toKey === "start_border_camp" && exit.direction === "DOWN"),
  "Starter watchtower should have a DOWN exit to the camp",
);
assert.ok(
  exits.some((exit) => exit.fromKey === "start_border_camp" && exit.toKey === "start_border_cellar" && exit.direction === "DOWN"),
  "Starter camp should have a DOWN exit to the cellar",
);
assert.ok(
  exits.some((exit) => exit.fromKey === "start_border_cellar" && exit.toKey === "start_border_camp" && exit.direction === "UP"),
  "Starter cellar should have an UP exit to the camp",
);
assert.ok(
  exits.some((exit) => exit.fromKey === "start_border_cellar" && exit.toKey === "start_cellar_root_pocket" && exit.direction === "INSIDE" && exit.isHidden === true),
  "Starter cellar should have a hidden attention-gated INSIDE exit to the root pocket",
);
assert.ok(
  exits.some((exit) => exit.fromKey === "start_cellar_root_pocket" && exit.toKey === "start_border_cellar" && exit.direction === "OUTSIDE" && exit.isHidden === false),
  "Starter root pocket should have a visible OUTSIDE return to the cellar",
);

const startCellarHatch = features.find((item) => item.key === "start_border_cellar_hatch");
assert.equal(startCellarHatch?.locationKey, "start_border_camp", "Starter cellar hatch should live at the camp");
assert.equal(startCellarHatch?.data?.vertical_hint, "DOWN", "Starter cellar hatch should expose a DOWN action hint");
assertFeatureExamineSummary(startCellarHatch, "Starter cellar hatch should explain the downward route on examine");

const startCellarFeatures = [
  "start_cellar_old_notch_wall",
  "start_cellar_empty_shelf",
  "start_cellar_dry_bunks",
  "start_cellar_root_gap",
  "start_cellar_torn_map_board",
];
for (const key of startCellarFeatures) {
  const feature = features.find((item) => item.key === key);
  assert.ok(feature, `Starter cellar feature should exist: ${key}`);
  assert.equal(feature.locationKey, "start_border_cellar", `Starter cellar feature should stay in the cellar: ${key}`);
  assert.equal(feature.type, "LANDMARK", `Starter cellar feature should be a landmark: ${key}`);
  assert.equal(feature.data?.inspectable, true, `Starter cellar feature should be inspectable: ${key}`);
  assert.ok(feature.data?.icon, `Starter cellar feature should have a distinct icon: ${key}`);
  assert.ok(Array.isArray(feature.data?.aliases) && feature.data.aliases.length >= 3, `Starter cellar feature should have aliases: ${key}`);
  assertFeatureExamineSummary(feature, `Starter cellar feature should have meaningful examine summary: ${key}`);
}
const startCellarShelf = features.find((item) => item.key === "start_cellar_empty_shelf");
assert.equal(startCellarShelf?.data?.no_loot, true, "Starter cellar shelf should stay no-loot");
assert.equal(startCellarShelf?.data?.future_herbalist_deposit, true, "Starter cellar shelf should mark future herbalist deposit staging");
assert.equal(startCellarShelf?.data?.storage_staging, "herbalist_supply_run", "Starter cellar shelf should stage herbalist supply runs without becoming a container");
const startCellarDryBunks = features.find((item) => item.key === "start_cellar_dry_bunks");
assert.equal(startCellarDryBunks?.data?.no_loot, true, "Starter cellar dry bunks should not hide loot");
assert.equal(startCellarDryBunks?.data?.herbalist_rest_staging, true, "Starter cellar dry bunks should stage herbalist rest only");
const startCellarRootGap = features.find((item) => item.key === "start_cellar_root_gap");
assert.equal(startCellarRootGap?.data?.attention_gate, "root_gap_light", "Starter root gap should declare its attention gate");
assert.equal(startCellarRootGap?.data?.destination_location_key, "start_cellar_root_pocket", "Starter root gap should point to the root pocket destination");
assert.equal(startCellarRootGap?.data?.no_loot, true, "Starter root gap should not become a loot source");
const meadowTrackGate = features.find((item) => item.key === "meadow_16_05_animal_run");
assert.equal(meadowTrackGate?.locationKey, "meadow_16_05", "Track-aware gate should stay in the authored meadow source");
assert.equal(meadowTrackGate?.data?.attention_gate, "fresh_tracks", "Track-aware gate should declare a fresh-tracks attention gate");
assert.equal(meadowTrackGate?.data?.destination_location_key, "meadow_16_05_grass_run", "Track-aware gate should point to the grass run destination");
assert.equal(meadowTrackGate?.data?.no_loot, true, "Track-aware gate should not become a loot source");
assertFeatureExamineSummary(meadowTrackGate, "Track-aware gate should have a meaningful examine summary");
assert.ok(
  exits.some((exit) => exit.fromKey === "meadow_16_05" && exit.toKey === "meadow_16_05_grass_run" && exit.direction === "INSIDE" && exit.isHidden === true),
  "Track-aware gate should have a hidden INSIDE entry",
);
assert.ok(
  exits.some((exit) => exit.fromKey === "meadow_16_05_grass_run" && exit.toKey === "meadow_16_05" && exit.direction === "OUTSIDE" && exit.isHidden === false),
  "Track-aware grass run should have a visible OUTSIDE return",
);
assert.equal(resourceNodes.some((node) => node.locationKey === "start_border_cellar"), false, "Starter cellar should not add starter loot/resource nodes");
assert.equal(resourceNodes.some((node) => node.locationKey === "start_cellar_root_pocket"), false, "Starter root pocket should not add starter loot/resource nodes");
assert.equal(resourceNodes.some((node) => node.locationKey === "meadow_16_05_grass_run"), false, "Track-aware grass run should not add loot/resource nodes");
assert.deepEqual(
  resourceNodes.filter((node) => starterCampLocationKeys.has(node.locationKey)).map((node) => `${node.locationKey}:${node.resourceKey}`),
  [],
  "Starter camp infrastructure region should not have ordinary resource nodes",
);

const startCampTorchStand = features.find((item) => item.key === "start_camp_torch_stand");
assert.equal(startCampTorchStand?.data?.torch_source, true, "Starter camp torch stand should be a torch source");
assert.equal(startCampTorchStand?.locationKey, "start_border_watchtower", "Starter torch stand should live in the watchtower");
assert.equal(startCampTorchStand?.providesLight, true, "Starter watchtower torch stand should provide reflected campfire light for beginners at night");
assert.equal(startCampTorchStand?.data?.starter_reflected_campfire_light, true, "Starter torch stand light should be marked as a narrow starter exception");
assert.notEqual(startCampTorchStand?.data?.hunter_resupply, false, "Starter watchtower torch stand should remain available for hunter resupply");
assert.notEqual(startCampTorchStand?.data?.icon, "🔥", "Starter camp torch stand should not use the fire icon reserved for flame/campfire actions");
assertFeatureExamineSummary(startCampTorchStand, "Starter camp torch stand should explain the torch source on examine");

assert.deepEqual(
  features.filter((item) => item.locationKey === "start_border_watchtower").slice(0, 3).map((item) => item.key),
  [
    "start_watchtower_stairs_down",
    "start_beginner_shared_cache",
    "start_camp_torch_stand",
  ],
  "Starter watchtower feature order should lead with stairs, then cache, then torch stand",
);

for (const key of ["forest_04_02_owl_sign", "forest_09_04_owl_sign", "meadow_14_04_owl_sign", "riverbank_13_00_owl_sign"]) {
  const feature = features.find((item) => item.key === key);
  assert.ok(feature, `Owl sign feature should exist: ${key}`);
  assert.equal(feature.type, "LANDMARK", `Owl sign should be an inspectable landmark: ${key}`);
  assert.equal(feature.data?.owl_sign, true, `Owl sign should be marked for daypart-aware text: ${key}`);
  assert.ok(typeof feature.data?.examine_summary === "string" && feature.data.examine_summary.length > 0, `Owl sign should have an examine summary: ${key}`);
  assert.ok(Array.isArray(feature.data?.aliases) && feature.data.aliases.includes("сова"), `Owl sign should have a simple owl alias: ${key}`);
}

const beginnerCache = features.find((item) => item.key === "start_beginner_shared_cache");
assert.ok(beginnerCache, "Starter shared beginner cache should exist");
assert.equal(beginnerCache.locationKey, "start_border_watchtower", "Starter shared beginner cache should live in the watchtower");
assert.equal(beginnerCache.data?.beginner_cache, true, "Starter shared beginner cache should be marked as beginner cache data");
assert.equal(beginnerCache.data?.hidden_unobserved_restock, true, "Starter shared beginner cache should restock only while unobserved");
assert.equal(beginnerCache.data?.cache_stock?.torch, undefined, "Starter shared beginner cache should not duplicate the nearby torch stand");
assert.equal(beginnerCache.data?.cache_max_stock?.torch, undefined, "Starter shared beginner cache should not accept torch contributions");
assert.equal(beginnerCache.data?.cache_stock?.raw_meat, 4, "Starter shared beginner cache should provide extra raw meat");
assert.equal(beginnerCache.data?.cache_stock?.cooked_meat, 2, "Starter shared beginner cache should demonstrate cooked meat");
assert.equal(beginnerCache.data?.cache_stock?.honey, 0, "Starter shared beginner cache should not start with honey");
assert.equal(beginnerCache.data?.cache_stock?.beeswax, 0, "Starter shared beginner cache should not start with beeswax");
assert.equal(beginnerCache.data?.cache_max_stock?.honey, 5, "Starter shared beginner cache should accept honey contributions");
assert.equal(beginnerCache.data?.cache_max_stock?.beeswax, 5, "Starter shared beginner cache should accept beeswax contributions");
assert.equal(beginnerCache.data?.cache_restock_target?.honey, 0, "Starter shared beginner cache should not hidden-restock honey");
assert.equal(beginnerCache.data?.cache_restock_target?.beeswax, 0, "Starter shared beginner cache should not hidden-restock beeswax");
assert.equal(beginnerCache.data?.cache_money_stock?.shah, 0, "Starter shared beginner cache should not restock money by default");
assert.equal(beginnerCache.data?.cache_money_stock?.grivna, 0, "Starter shared beginner cache should not start with grivna");
assert.equal(beginnerCache.data?.cache_money_max_stock?.shah, 200, "Starter shared beginner cache should accept modest shah contributions");
assert.equal(beginnerCache.data?.cache_money_max_stock?.grivna, 20, "Starter shared beginner cache should accept modest grivna contributions");
assert.ok(Array.isArray(beginnerCache.data?.aliases) && beginnerCache.data.aliases.includes("скриня"), "Starter shared beginner cache should have Ukrainian aliases");
assertFeatureExamineSummary(beginnerCache, "Starter shared beginner cache should have a meaningful examine summary");

assert.equal(resourceTypeKeys.has("shah"), true, "Money MVP should define shah resource type");
assert.equal(resourceTypeKeys.has("grivna"), true, "Money MVP should define grivna resource type");
const starterShahNodes = resourceNodes.filter((node) => node.resourceKey === "shah");
assert.equal(starterShahNodes.reduce((sum, node) => sum + node.amount, 0), 4, "Starter-adjacent authored shah finds should stay modest");
assert.equal(starterShahNodes.some((node) => String(node.locationKey).startsWith("dream_")), false, "Starter shah finds should not appear in tutorial dream locations");
assert.equal(resourceNodes.some((node) => node.resourceKey === "grivna"), false, "Starter seed should not place grivna ground loot");

const tutorialRestBench = features.find((item) => item.key === "dream_tutorial_rest_fire");
assert.ok(tutorialRestBench, "Tutorial rest bench feature should exist");
assert.equal(
  tutorialRestBench.restStaminaCapMultiplier ?? null,
  null,
  "Tutorial rest bench should speed up rest without raising max stamina",
);
assert.equal(
  tutorialRestBench.data?.rest_stamina_cap_multiplier ?? null,
  null,
  "Tutorial rest bench data should not raise max stamina",
);
assert.ok(
  Number(tutorialRestBench.data?.rest_stamina_regen_multiplier ?? 1) > 1,
  "Tutorial rest bench should still speed up stamina recovery",
);

const tutorialDeepRestHeat = features.find((item) => item.key === "dream_tutorial_deep_rest_fire");
assert.ok(tutorialDeepRestHeat, "Tutorial deep rest heat feature should exist");
assert.ok(
  Number(tutorialDeepRestHeat.restStaminaCapMultiplier ?? 1) > 1,
  "Tutorial deep rest heat should be the tutorial feature that can raise max stamina",
);
assert.ok(
  Number(tutorialDeepRestHeat.data?.rest_stamina_cap_multiplier ?? 1) > 1,
  "Tutorial deep rest heat data should keep the extra stamina cap",
);

for (const key of ["dream_tutorial_sleep_gate", "dream_tutorial_sleep_gate_return"]) {
  const feature = features.find((item) => item.key === key);
  assert.ok(feature, `Dream gate feature missing: ${key}`);
  assert.ok(feature.data?.aliases?.includes("браму"), `Dream gate should include accusative alias браму: ${key}`);
  assert.ok(feature.data?.aliases?.includes("брами"), `Dream gate should include genitive alias брами: ${key}`);
}

const tutorialEndFeatures = features.filter((item) => item.data?.tutorial_end_prompt === true);
assert.equal(tutorialEndFeatures.length, 1, "Tutorial should expose exactly one end-learning button surface");
assert.equal(
  tutorialEndFeatures[0].locationKey,
  "dream_tutorial_waking_edge",
  "Tutorial end-learning button should live at the forward waking edge",
);

for (const key of [
  "dream_tutorial_attention_path",
  "dream_tutorial_signs",
  "dream_tutorial_traces",
  "dream_tutorial_waking_edge",
]) {
  assertKnown(locationKeys, key, `Tutorial action ladder location should exist: ${key}`);
}

const tutorialActionLadderFeatures = features.filter((item) => typeof item.data?.tutorial_action_ladder === "string");
assert.ok(tutorialActionLadderFeatures.length >= 3, "Tutorial action ladder should have inspectable lesson features");
for (const feature of tutorialActionLadderFeatures) {
  assertFeatureExamineSummary(feature, `Tutorial action ladder feature should have meaningful examine summary: ${feature.key}`);
}

const tutorialSignFeatures = features.filter((item) => item.locationKey === "dream_tutorial_signs");
assert.equal(tutorialSignFeatures.length, 3, "Tutorial signs location copy describes three signs, so it should expose three sign features");
for (const key of ["dream_tutorial_back_sign", "dream_tutorial_silent_sign", "dream_tutorial_sign_post"]) {
  const feature = features.find((item) => item.key === key);
  assert.ok(feature, `Tutorial sign feature should exist: ${key}`);
  assert.equal(feature.locationKey, "dream_tutorial_signs", `Tutorial sign feature should stay in signs location: ${key}`);
  assert.ok(typeof feature.description === "string" && feature.description.trim().length > 0, `Tutorial sign feature should have full inspect text: ${key}`);
  assertFeatureExamineSummary(feature, `Tutorial sign feature should have meaningful examine summary: ${key}`);
  assert.ok(Array.isArray(feature.data?.aliases) && feature.data.aliases.length > 0, `Tutorial sign feature should have aliases: ${key}`);
}

for (const key of [
  "dream_tutorial_future_lessons",
  "dream_tutorial_bushes",
  "dream_tutorial_rest_fire",
  "dream_tutorial_fox_motion",
  "dream_tutorial_observation_bushes",
]) {
  const feature = features.find((item) => item.key === key);
  assertFeatureExamineSummary(feature, `Tutorial nearby feature should have a meaningful examine summary: ${key}`);
}

for (const key of ["willow_reed_wall_dense_reeds", "willow_mudflat_silt_tracks"]) {
  const feature = features.find((item) => item.key === key);
  assertFeatureExamineSummary(feature, `Willow landmark should have a meaningful examine summary: ${key}`);
}

const seededStrangeTotems = features.filter((item) => item.data?.strange_totem === true && item.data?.seeded === true);
assert.ok(seededStrangeTotems.length >= 4, "Seed should include several inspectable Strange Totems");
for (const feature of seededStrangeTotems) {
  assertFeatureExamineSummary(feature, `Seeded Strange Totem should have a meaningful examine summary: ${feature.key}`);
}

for (const [fromKey, toKey, direction] of [
  ["dream_tutorial_safety", "dream_tutorial_attention_path", "SOUTH"],
  ["dream_tutorial_attention_path", "dream_tutorial_signs", "SOUTH"],
  ["dream_tutorial_signs", "dream_tutorial_traces", "SOUTH"],
  ["dream_tutorial_traces", "dream_tutorial_waking_edge", "SOUTH"],
]) {
  assert.ok(
    exits.some((exit) => exit.fromKey === fromKey && exit.toKey === toKey && exit.direction === direction),
    `Tutorial action ladder should connect ${fromKey} ${direction} -> ${toKey}`,
  );
}

for (const creature of uniqueCreatures) {
  assertKnown(locationKeys, creature.locationKey, `Unknown locationKey for unique creature ${creature.name}`);
  for (const resource of creature.resources ?? []) {
    assertKnown(resourceTypeKeys, resource.resourceKey, `Unknown resourceKey for unique creature ${creature.name}`);
    assert.ok(Number.isInteger(resource.amount) && resource.amount > 0, `Invalid carried resource amount for ${creature.name}:${resource.resourceKey}`);
  }
}

const oryna = uniqueCreatures.find((creature) => creature.name === "Орина");
assert.ok(oryna, "Seed should include hunter Орина");
assert.equal(
  oryna.action.includes("hunter_torches:"),
  false,
  "Орина should use real carried torch resources instead of the lightweight hunter_torches marker",
);
assert.deepEqual(
  (oryna.resources ?? []).map((resource) => `${resource.resourceKey}:${resource.amount}`).sort(),
  ["lit_torch:1", "torch:1"],
  "Орина should start with one lit torch and one spare torch",
);

const campSpiritCat = uniqueCreatures.find((creature) => creature.speciesKey === "camp_spirit_cat");
assert.ok(campSpiritCat, "Seed should include the camp spirit cat");
assert.equal(campSpiritCat.name, "Кіт-бережник");
assert.equal(campSpiritCat.locationKey, "start_border_camp");
assert.equal(campSpiritCat.isAlive, true);
assert.equal(campSpiritCat.isHidden, false);

for (const filePath of ["prisma/seed.ts", "src/services/worldReset.ts", "src/data/starterAnimals.ts"]) {
  for (const locationKey of sourceLocationKeys(filePath)) {
    assertKnown(locationKeys, locationKey, `Unknown hardcoded starter location in ${filePath}`);
  }
}

for (const key of ["riverbank_14_01", "willow_still_pool_15_10", "willow_frog_pool_17_10", "riverbank_17_04"]) {
  assertKnown(locationKeys, key, `Fauna diversity starter location should exist: ${key}`);
}

for (const key of [
  "riverbank_14_00",
  "riverbank_15_01",
  "riverbank_16_02",
  "riverbank_17_03",
  "riverbank_15_08",
  "riverbank_14_09",
  "under_bridge_18_05",
]) {
  const location = locationByKey.get(key);
  assert.ok(location, `Riverbank walk location should exist: ${key}`);
  assert.equal(location.regionKey, "riverbank", `Riverbank walk location should belong to riverbank: ${key}`);
}

function assertVisibleRiverbankRoute(fromKey, toKey) {
  const queue = [[fromKey]];
  const visited = new Set([fromKey]);
  while (queue.length > 0) {
    const route = queue.shift();
    const currentKey = route.at(-1);
    if (currentKey === toKey) return route;
    for (const exit of exits.filter((item) => item.fromKey === currentKey && item.isHidden !== true)) {
      const next = locationByKey.get(exit.toKey);
      if (!next || next.regionKey !== "riverbank" || visited.has(exit.toKey)) continue;
      visited.add(exit.toKey);
      queue.push([...route, exit.toKey]);
    }
  }
  assert.fail(`Expected visible riverbank-only route from ${fromKey} to ${toKey}`);
}

assertVisibleRiverbankRoute("riverbank_14_00", "under_bridge_18_05");
assertVisibleRiverbankRoute("riverbank_15_07", "riverbank_13_09");
for (const exit of exits.filter((item) => item.fromKey === "riverbank_15_08" || item.toKey === "riverbank_15_08")) {
  const otherKey = exit.fromKey === "riverbank_15_08" ? exit.toKey : exit.fromKey;
  assert.notEqual(locationByKey.get(otherKey)?.regionKey, "willow_floodplain", "riverbank_15_08 should not directly cross into willow floodplain");
}

const seedSource = fs.readFileSync("prisma/seed.ts", "utf8");
assert.ok(
  /worldState\.upsert\(\{\s*where:\s*\{\s*id:\s*1\s*\},\s*\/\/ Deploy seed refreshes authored world data but must not rewind the live world clock\.\s*update:\s*\{\}/s.test(seedSource),
  "npm run seed must create missing WorldState but must not update/rewind an existing live world clock",
);

console.log(`World seed OK: ${locations.length} locations, ${exits.length} exits, start=${meta.startLocationKey}`);
