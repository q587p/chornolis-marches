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
const features = readJson("features.json");
const uniqueCreatures = readJson("uniqueCreatures.json");

assert.equal(typeof meta.startLocationKey, "string", "meta.startLocationKey must be set");

const regionKeys = keySet(regions, "region");
const locationKeys = keySet(locations, "location");
const resourceTypeKeys = keySet(resourceTypes, "resource type");
keySet(features, "feature");

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

for (const feature of features) {
  assertKnown(locationKeys, feature.locationKey, `Unknown locationKey for feature ${feature.key}`);
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

const gateTorchStand = features.find((item) => item.key === "closed_gate_torch_stand");
assert.notEqual(gateTorchStand?.data?.icon, "🔥", "Torch stand should not use the fire icon reserved for flame/campfire actions");

for (const key of ["dream_tutorial_sleep_gate", "dream_tutorial_sleep_gate_return"]) {
  const feature = features.find((item) => item.key === key);
  assert.ok(feature, `Dream gate feature missing: ${key}`);
  assert.ok(feature.data?.aliases?.includes("браму"), `Dream gate should include accusative alias браму: ${key}`);
  assert.ok(feature.data?.aliases?.includes("брами"), `Dream gate should include genitive alias брами: ${key}`);
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

for (const filePath of ["prisma/seed.ts", "src/services/worldReset.ts"]) {
  for (const locationKey of sourceLocationKeys(filePath)) {
    assertKnown(locationKeys, locationKey, `Unknown hardcoded starter location in ${filePath}`);
  }
}

console.log(`World seed OK: ${locations.length} locations, ${exits.length} exits, start=${meta.startLocationKey}`);
