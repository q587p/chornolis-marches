const assert = require("node:assert/strict");

require("ts-node/register");

const {
  POPULATION_FLOOR_GROUPS,
  POPULATION_FLOOR_SPECIES_KEYS,
  planPopulationFloorRestoration,
} = require("../../src/services/populationRestoration");

const species = [
  { id: 1, key: "rabbit", kind: "ANIMAL", baseHp: 10, childTicks: 24, youngTicks: 48, adultTicks: 96 },
  { id: 2, key: "mouse", kind: "ANIMAL", baseHp: 4, childTicks: 8, youngTicks: 16, adultTicks: 32 },
  { id: 3, key: "fox", kind: "ANIMAL", baseHp: 14, childTicks: 60, youngTicks: 120, adultTicks: 360 },
  { id: 4, key: "wolf", kind: "ANIMAL", baseHp: 22, childTicks: 90, youngTicks: 180, adultTicks: 720 },
];

const locationKeys = [...new Set(POPULATION_FLOOR_GROUPS.map((group) => group.locationKey))];
const locations = locationKeys.map((key, index) => ({ id: index + 10, key }));

assert.deepEqual(POPULATION_FLOOR_SPECIES_KEYS.sort(), ["fox", "mouse", "rabbit", "wolf"]);
assert.equal(POPULATION_FLOOR_GROUPS.some((group) => group.age === "CORPSE"), false);

const starterCounts = Object.fromEntries(
  POPULATION_FLOOR_SPECIES_KEYS.map((speciesKey) => [
    speciesKey,
    POPULATION_FLOOR_GROUPS
      .filter((group) => group.speciesKey === speciesKey)
      .reduce((sum, group) => sum + group.count, 0),
  ])
);

const restoredAll = planPopulationFloorRestoration({
  species,
  locations,
  livingCountsBySpeciesKey: {},
});

assert.equal(restoredAll.rows.length, Object.values(starterCounts).reduce((sum, count) => sum + count, 0));
assert.equal(restoredAll.bySpecies.rabbit, starterCounts.rabbit);
assert.equal(restoredAll.bySpecies.mouse, starterCounts.mouse);
assert.equal(restoredAll.bySpecies.fox, starterCounts.fox);
assert.equal(restoredAll.bySpecies.wolf, starterCounts.wolf);
assert.equal(restoredAll.rows.some((row) => row.age === "CORPSE"), false);
assert.equal(restoredAll.rows.every((row) => row.isAlive && !row.isGone && !row.isHidden), true);

const restoredOnlyMice = planPopulationFloorRestoration({
  species,
  locations,
  livingCountsBySpeciesKey: { rabbit: 1, mouse: 0, fox: 1, wolf: 1 },
});

assert.equal(restoredOnlyMice.rows.length, starterCounts.mouse);
assert.deepEqual(Object.keys(restoredOnlyMice.bySpecies), ["mouse"]);

const noDuplicates = planPopulationFloorRestoration({
  species,
  locations,
  livingCountsBySpeciesKey: { rabbit: 1, mouse: 1, fox: 1, wolf: 1 },
});

assert.equal(noDuplicates.rows.length, 0);
assert.deepEqual(noDuplicates.bySpecies, {});

const missingLocation = planPopulationFloorRestoration({
  groups: [{ speciesKey: "rabbit", locationKey: "missing", count: 2, age: "ADULT" }],
  species,
  locations,
  livingCountsBySpeciesKey: { rabbit: 0 },
});

assert.equal(missingLocation.rows.length, 0);
assert.deepEqual(missingLocation.skippedGroups, [{ speciesKey: "rabbit", locationKey: "missing", reason: "location-missing" }]);

console.log("Population restoration helpers OK");
