const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const {
  STARTER_MICE,
  STARTER_PREDATORS,
  STARTER_RABBITS,
} = require("../../src/data/starterAnimals");

const resourceRules = JSON.parse(fs.readFileSync("prisma/data/world/resourceRules.json", "utf8"));

function allGroups() {
  return [...STARTER_MICE, ...STARTER_RABBITS, ...STARTER_PREDATORS];
}

function adultBreedingLocations(groups, speciesKey) {
  const adults = groups.filter((group) =>
    group.speciesKey === speciesKey
    && group.age === "ADULT"
    && group.count > 0
  );
  const byLocation = new Map();
  for (const group of adults) {
    const sexes = byLocation.get(group.locationKey) ?? new Set();
    if (group.sex) sexes.add(group.sex);
    byLocation.set(group.locationKey, sexes);
  }
  return [...byLocation.entries()]
    .filter(([, sexes]) => sexes.has("FEMALE") && sexes.has("MALE"))
    .map(([locationKey]) => locationKey);
}

for (const group of allGroups()) {
  assert.ok(group.count > 0, `Starter animal group should have positive count: ${JSON.stringify(group)}`);
}

const mouseBreedingLocations = adultBreedingLocations(STARTER_MICE, "mouse");
const rabbitBreedingLocations = adultBreedingLocations(STARTER_RABBITS, "rabbit");
const predatorStartLocations = new Set(
  STARTER_PREDATORS
    .filter((group) => group.age !== "CORPSE" && group.count > 0)
    .map((group) => group.locationKey),
);
const starterOwlCount = STARTER_PREDATORS
  .filter((group) => group.speciesKey === "owl" && group.age !== "CORPSE")
  .reduce((sum, group) => sum + group.count, 0);

assert.deepEqual(
  mouseBreedingLocations.sort(),
  ["forest_03_02", "meadow_11_04", "riverbank_14_01"].sort(),
  "Mice should have forest, meadow and riverbank adult breeding clusters",
);
assert.ok(rabbitBreedingLocations.length >= 2, "Rabbits should have at least two adult breeding clusters");
assert.ok(rabbitBreedingLocations.includes("forest_04_00"), "Rabbits should breed at forest_04_00");
assert.ok(rabbitBreedingLocations.includes("meadow_12_04"), "Rabbits should breed at meadow_12_04");

for (const locationKey of [...mouseBreedingLocations, ...rabbitBreedingLocations]) {
  assert.equal(
    predatorStartLocations.has(locationKey),
    false,
    `Prey breeding cluster should not overlap predator starter location: ${locationKey}`,
  );
}

assert.equal(
  STARTER_PREDATORS.filter((group) => group.speciesKey === "wolf" && group.age !== "CORPSE")
    .reduce((sum, group) => sum + group.count, 0),
  1,
  "Starter predators should include only one wolf in this balance slice",
);
assert.equal(starterOwlCount, 3, "Starter predators should include exactly three owls");

const expectedFoodOverrides = {
  forest_03_02: { grass: 80, berries: 15, mushrooms: 15, herbs: 10 },
  forest_04_00: { grass: 80, berries: 15, mushrooms: 15, herbs: 10 },
  meadow_11_04: { grass: 95, berries: 8, herbs: 20 },
  meadow_12_04: { grass: 90, berries: 8, herbs: 20 },
  riverbank_14_01: { grass: 90, herbs: 20 },
  riverbank_15_02: { grass: 90, herbs: 20 },
};

for (const [locationKey, expected] of Object.entries(expectedFoodOverrides)) {
  assert.deepEqual(
    resourceRules.locationOverrides?.[locationKey],
    expected,
    `Food-rich breeding override should be present for ${locationKey}`,
  );
  for (const amount of Object.values(expected)) {
    assert.ok(amount <= resourceRules.maxAmount, `Resource override should not exceed maxAmount at ${locationKey}`);
  }
}

for (const locationKey of ["start_border_camp", "start_border_watchtower", "old_bridge_west_span", "old_bridge_east_span", "closed_east_gate"]) {
  const override = resourceRules.locationOverrides?.[locationKey];
  assert.ok(override, `Special zero-resource override should remain for ${locationKey}`);
  assert.equal(override.grass, 0, `${locationKey} should remain grass-free`);
  assert.equal(override.berries, 0, `${locationKey} should remain berry-free`);
  assert.equal(override.herbs, 0, `${locationKey} should remain herb-free`);
}

console.log("Starter animal authoring OK");
