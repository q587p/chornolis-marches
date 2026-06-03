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
const resourceTypeKeys = keySet(resourceTypes, "resource type");
keySet(features, "feature");

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
assert.equal(oldLogApiary.data?.center_sting_chance_permille, 55, "Old log apiary center chance should match authored MVP tuning");
assert.equal(oldLogApiary.data?.neighbor_sting_chance_permille, 16, "Old log apiary neighbor chance should match authored MVP tuning");
assert.equal(resourceTypeKeys.has("honey"), true, "Apiary harvest MVP should define honey resource type");
assert.equal(resourceTypeKeys.has("beeswax"), true, "Apiary harvest MVP should define beeswax resource type");
assert.equal(oldLogApiary.data?.raid_cooldown_ms, 21_600_000, "Old log apiary should limit repeated hive robbery");
assert.equal(oldLogApiary.data?.raid_success_chance_permille, 700, "Old log apiary should have authored raid success chance");
assert.equal(oldLogApiary.data?.raid_wax_chance_permille, 350, "Old log apiary should have authored wax chance");
assert.deepEqual(oldLogApiary.data?.raid_damage, [2, 5], "Old log apiary should have stronger disturbance sting damage");
assert.deepEqual(oldLogApiary.data?.raid_rewards, ["honey", "beeswax"], "Old log apiary should expose current raid rewards");
assert.ok(typeof oldLogApiary.data?.examine_summary === "string" && oldLogApiary.data.examine_summary.length > 0, "Old log apiary should have an examine summary");
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

const startWatchtowerLadder = features.find((item) => item.key === "start_border_watchtower_ladder");
assert.equal(startWatchtowerLadder?.data?.vertical_hint, "UP", "Starter watchtower feature should expose an UP action hint");
for (const key of ["start_newcomer_tablet", "start_lunar_circles_birchbark", "start_border_watchtower_ladder"]) {
  const feature = features.find((item) => item.key === key);
  assert.ok(typeof feature?.data?.examine_summary === "string" && feature.data.examine_summary.length > 0, `Starter authored landmark should have examine summary: ${key}`);
}

const startWatchtower = locations.find((item) => item.key === "start_border_watchtower");
assert.ok(startWatchtower, "Starter camp watchtower should exist as a real location");
assert.equal(startWatchtower.x, 17, "Starter camp watchtower should sit above the camp x coordinate");
assert.equal(startWatchtower.y, 5, "Starter camp watchtower should sit above the camp y coordinate");
assert.equal(startWatchtower.z, 1, "Starter camp watchtower should use z = 1");
assert.ok(
  exits.some((exit) => exit.fromKey === "start_border_camp" && exit.toKey === "start_border_watchtower" && exit.direction === "UP"),
  "Starter camp should have an UP exit to the watchtower",
);
assert.ok(
  exits.some((exit) => exit.fromKey === "start_border_watchtower" && exit.toKey === "start_border_camp" && exit.direction === "DOWN"),
  "Starter watchtower should have a DOWN exit to the camp",
);

const startCampTorchStand = features.find((item) => item.key === "start_camp_torch_stand");
assert.equal(startCampTorchStand?.data?.torch_source, true, "Starter camp torch stand should be a torch source");
assert.equal(startCampTorchStand?.locationKey, "start_border_watchtower", "Starter torch stand should live in the watchtower");
assert.notEqual(startCampTorchStand?.data?.hunter_resupply, false, "Starter watchtower torch stand should remain available for hunter resupply");
assert.notEqual(startCampTorchStand?.data?.icon, "🔥", "Starter camp torch stand should not use the fire icon reserved for flame/campfire actions");

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
assert.equal(beginnerCache.data?.cache_money_stock?.shah, 0, "Starter shared beginner cache should not restock money by default");
assert.equal(beginnerCache.data?.cache_money_stock?.grivna, 0, "Starter shared beginner cache should not start with grivna");
assert.equal(beginnerCache.data?.cache_money_max_stock?.shah, 200, "Starter shared beginner cache should accept modest shah contributions");
assert.equal(beginnerCache.data?.cache_money_max_stock?.grivna, 20, "Starter shared beginner cache should accept modest grivna contributions");
assert.ok(Array.isArray(beginnerCache.data?.aliases) && beginnerCache.data.aliases.includes("скриня"), "Starter shared beginner cache should have Ukrainian aliases");

assert.equal(resourceTypeKeys.has("shah"), true, "Money MVP should define shah resource type");
assert.equal(resourceTypeKeys.has("grivna"), true, "Money MVP should define grivna resource type");
const starterShahNodes = resourceNodes.filter((node) => node.resourceKey === "shah");
assert.equal(starterShahNodes.reduce((sum, node) => sum + node.amount, 0), 6, "Starter-adjacent authored shah finds should stay modest");
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
  assert.ok(
    typeof feature.data?.examine_summary === "string" && feature.data.examine_summary.trim().length > 0,
    `Tutorial action ladder feature should have examine summary: ${feature.key}`,
  );
}

const tutorialSignFeatures = features.filter((item) => item.locationKey === "dream_tutorial_signs");
assert.equal(tutorialSignFeatures.length, 3, "Tutorial signs location copy describes three signs, so it should expose three sign features");
for (const key of ["dream_tutorial_back_sign", "dream_tutorial_silent_sign", "dream_tutorial_sign_post"]) {
  const feature = features.find((item) => item.key === key);
  assert.ok(feature, `Tutorial sign feature should exist: ${key}`);
  assert.equal(feature.locationKey, "dream_tutorial_signs", `Tutorial sign feature should stay in signs location: ${key}`);
  assert.ok(typeof feature.description === "string" && feature.description.trim().length > 0, `Tutorial sign feature should have full inspect text: ${key}`);
  assert.ok(typeof feature.data?.examine_summary === "string" && feature.data.examine_summary.trim().length > 0, `Tutorial sign feature should have examine summary: ${key}`);
  assert.ok(Array.isArray(feature.data?.aliases) && feature.data.aliases.length > 0, `Tutorial sign feature should have aliases: ${key}`);
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

for (const filePath of ["prisma/seed.ts", "src/services/worldReset.ts"]) {
  for (const locationKey of sourceLocationKeys(filePath)) {
    assertKnown(locationKeys, locationKey, `Unknown hardcoded starter location in ${filePath}`);
  }
}

const seedSource = fs.readFileSync("prisma/seed.ts", "utf8");
assert.ok(
  /worldState\.upsert\(\{\s*where:\s*\{\s*id:\s*1\s*\},\s*\/\/ Deploy seed refreshes authored world data but must not rewind the live world clock\.\s*update:\s*\{\}/s.test(seedSource),
  "npm run seed must create missing WorldState but must not update/rewind an existing live world clock",
);

console.log(`World seed OK: ${locations.length} locations, ${exits.length} exits, start=${meta.startLocationKey}`);
