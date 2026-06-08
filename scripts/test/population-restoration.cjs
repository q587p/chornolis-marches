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
  { id: 3, key: "frog", kind: "ANIMAL", baseHp: 2, childTicks: 18, youngTicks: 36, adultTicks: 360 },
  { id: 4, key: "fox", kind: "ANIMAL", baseHp: 14, childTicks: 60, youngTicks: 120, adultTicks: 360 },
  { id: 5, key: "wolf", kind: "ANIMAL", baseHp: 22, childTicks: 90, youngTicks: 180, adultTicks: 720 },
  { id: 6, key: "owl", kind: "ANIMAL", baseHp: 5, childTicks: 120, youngTicks: 360, adultTicks: 1800 },
  { id: 7, key: "hawk", kind: "ANIMAL", baseHp: 6, childTicks: 120, youngTicks: 360, adultTicks: 1800 },
  { id: 8, key: "snake", kind: "ANIMAL", baseHp: 4, childTicks: 90, youngTicks: 240, adultTicks: 1200 },
];

const locationKeys = [...new Set(POPULATION_FLOOR_GROUPS.map((group) => group.locationKey))];
const locations = locationKeys.map((key, index) => ({ id: index + 10, key }));

assert.deepEqual(POPULATION_FLOOR_SPECIES_KEYS.sort(), ["fox", "frog", "hawk", "mouse", "owl", "rabbit", "snake", "wolf"]);
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
assert.equal(restoredAll.bySpecies.frog, starterCounts.frog);
assert.equal(restoredAll.bySpecies.fox, starterCounts.fox);
assert.equal(restoredAll.bySpecies.wolf, starterCounts.wolf);
assert.equal(restoredAll.bySpecies.owl, starterCounts.owl);
assert.equal(restoredAll.bySpecies.hawk, starterCounts.hawk);
assert.equal(restoredAll.bySpecies.snake, starterCounts.snake);
assert.equal(restoredAll.rows.some((row) => row.age === "CORPSE"), false);
assert.equal(restoredAll.rows.every((row) => row.isAlive && !row.isGone && !row.isHidden), true);

const restoredOnlyMice = planPopulationFloorRestoration({
  species,
  locations,
  livingCountsBySpeciesKey: { rabbit: 1, mouse: 0, frog: 3, fox: 1, wolf: 1, owl: 1, hawk: 1, snake: 1 },
  livingBreedingBySpeciesKey: {
    rabbit: { adultFemales: 1, adultMales: 1 },
    frog: { adultFemales: 1, adultMales: 1 },
    fox: { adultFemales: 1, adultMales: 0 },
    wolf: { adultFemales: 1, adultMales: 0 },
  },
});

assert.equal(restoredOnlyMice.rows.length, starterCounts.mouse);
assert.deepEqual(Object.keys(restoredOnlyMice.bySpecies), ["mouse"]);

const noDuplicates = planPopulationFloorRestoration({
  species,
  locations,
  livingCountsBySpeciesKey: { rabbit: 3, mouse: 3, frog: 3, fox: 1, wolf: 1, owl: 1, hawk: 1, snake: 1 },
  livingBreedingBySpeciesKey: {
    rabbit: { adultFemales: 1, adultMales: 1 },
    mouse: { adultFemales: 1, adultMales: 1 },
    frog: { adultFemales: 1, adultMales: 1 },
    fox: { adultFemales: 0, adultMales: 0 },
    wolf: { adultFemales: 1, adultMales: 0 },
  },
});

assert.equal(noDuplicates.rows.length, 0);
assert.deepEqual(noDuplicates.bySpecies, {});

const restoredNoRabbitPair = planPopulationFloorRestoration({
  species,
  locations,
  livingCountsBySpeciesKey: { rabbit: 2, mouse: 3, frog: 3, fox: 1, wolf: 1, owl: 1, hawk: 1, snake: 1 },
  livingBreedingBySpeciesKey: {
    rabbit: { adultFemales: 2, adultMales: 0 },
    mouse: { adultFemales: 1, adultMales: 1 },
    frog: { adultFemales: 1, adultMales: 1 },
    fox: { adultFemales: 1, adultMales: 0 },
    wolf: { adultFemales: 1, adultMales: 0 },
  },
});

assert.equal(restoredNoRabbitPair.rows.length, starterCounts.rabbit);
assert.deepEqual(Object.keys(restoredNoRabbitPair.bySpecies), ["rabbit"]);

const restoredNoMousePair = planPopulationFloorRestoration({
  species,
  locations,
  livingCountsBySpeciesKey: { rabbit: 3, mouse: 5, frog: 3, fox: 1, wolf: 1, owl: 1, hawk: 1, snake: 1 },
  livingBreedingBySpeciesKey: {
    rabbit: { adultFemales: 1, adultMales: 1 },
    mouse: { adultFemales: 0, adultMales: 0 },
    frog: { adultFemales: 1, adultMales: 1 },
  },
});

assert.equal(restoredNoMousePair.rows.length, starterCounts.mouse);
assert.deepEqual(Object.keys(restoredNoMousePair.bySpecies), ["mouse"]);

const noOwlBreedingPairRestoration = planPopulationFloorRestoration({
  species,
  locations,
  livingCountsBySpeciesKey: { rabbit: 3, mouse: 5, frog: 3, fox: 1, wolf: 1, owl: 1, hawk: 1, snake: 1 },
  livingBreedingBySpeciesKey: {
    rabbit: { adultFemales: 1, adultMales: 1 },
    mouse: { adultFemales: 1, adultMales: 1 },
    frog: { adultFemales: 1, adultMales: 1 },
    owl: { adultFemales: 1, adultMales: 0 },
  },
});

assert.equal(noOwlBreedingPairRestoration.rows.length, 0);
assert.deepEqual(noOwlBreedingPairRestoration.bySpecies, {});

const restoredNoFrogPair = planPopulationFloorRestoration({
  species,
  locations,
  livingCountsBySpeciesKey: { rabbit: 3, mouse: 5, frog: 4, fox: 1, wolf: 1, owl: 1, hawk: 1, snake: 1 },
  livingBreedingBySpeciesKey: {
    rabbit: { adultFemales: 1, adultMales: 1 },
    mouse: { adultFemales: 1, adultMales: 1 },
    frog: { adultFemales: 4, adultMales: 0 },
  },
});

assert.equal(restoredNoFrogPair.rows.length, starterCounts.frog);
assert.deepEqual(Object.keys(restoredNoFrogPair.bySpecies), ["frog"]);

const missingLocation = planPopulationFloorRestoration({
  groups: [{ speciesKey: "rabbit", locationKey: "missing", count: 2, age: "ADULT" }],
  species,
  locations,
  livingCountsBySpeciesKey: { rabbit: 0 },
});

assert.equal(missingLocation.rows.length, 0);
assert.deepEqual(missingLocation.skippedGroups, [{ speciesKey: "rabbit", locationKey: "missing", reason: "location-missing" }]);

console.log("Population restoration helpers OK");
