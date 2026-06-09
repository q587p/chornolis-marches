const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  STARTER_FROGS,
  STARTER_MICE,
  STARTER_PREDATORS,
  STARTER_RABBITS,
} = require("../../src/data/starterAnimals");
const { requireLexiconEntry } = require("../../src/content/lexicon/worldLexicon");
const {
  POPULATION_FLOOR_GROUPS,
  POPULATION_FLOOR_SPECIES_KEYS,
} = require("../../src/services/populationRestoration");
const {
  hawkDaytimeSyncPlan,
  isHawkActiveDaypart,
  predatorPreyPreference,
  syncHawkDaytimeActivity,
} = require("../../src/services/worldTick");
const { STRANGE_TOTEM_REGION_CAPS } = require("../../src/services/strangeTotems");

function speciesLocations(groups, speciesKey) {
  return new Set(groups.filter((group) => group.speciesKey === speciesKey).map((group) => group.locationKey));
}

for (const [key, nominative] of [
  ["animal.hawk", "сокіл"],
  ["animal.frog", "жаба"],
  ["animal.snake", "змія"],
]) {
  const entry = requireLexiconEntry(key);
  assert.equal(entry.forms.nominative, nominative, `${key} should keep the expected Ukrainian nominative form`);
  assert.ok(entry.tags.includes("current"), `${key} should be marked current after this fauna pass`);
}

const seedSource = fs.readFileSync("prisma/seed.ts", "utf8");
const worldTickSource = fs.readFileSync("src/services/worldTick.ts", "utf8");
const worldResetSource = fs.readFileSync("src/services/worldReset.ts", "utf8");
const populationRestorationSource = fs.readFileSync("src/services/populationRestoration.ts", "utf8");
for (const speciesKey of ["hawk", "frog", "snake"]) {
  assert.match(
    seedSource,
    new RegExp(`key:\\s*"${speciesKey}"[\\s\\S]*?creatureSpeciesNameFields\\("${speciesKey}"\\)`),
    `${speciesKey} should be a real seeded creature species with lexicon-backed names`,
  );
}

assert.equal(isHawkActiveDaypart("day"), true, "hawk should be active during day");
for (const daypart of ["dawn", "dusk", "night"]) {
  assert.equal(isHawkActiveDaypart(daypart), false, `hawk should not share owl/nocturnal activity at ${daypart}`);
  assert.equal(hawkDaytimeSyncPlan(daypart).cancelActiveActions, true, `hawk should cancel queued/running actions outside day: ${daypart}`);
  assert.equal(hawkDaytimeSyncPlan(daypart).creatureData.activity, "SLEEPING", `hawk should sleep outside day: ${daypart}`);
  assert.equal(hawkDaytimeSyncPlan(daypart).creatureData.isHidden, true, `hawk should hide outside day: ${daypart}`);
}
assert.match(
  populationRestorationSource,
  /POPULATION_FLOOR_GROUPS:\s*StarterAnimalGroup\[\]\s*=\s*STARTER_ANIMAL_GROUPS\.filter/u,
  "population-floor restoration should derive from the shared starter animal groups, so future starter species are not omitted",
);
assert.equal(hawkDaytimeSyncPlan("day").cancelActiveActions, false, "daytime hawk should not cancel actions just because it is day");
assert.equal(hawkDaytimeSyncPlan("day").creatureData.activity, "IDLE", "daytime hawk should wake to IDLE");
assert.equal(hawkDaytimeSyncPlan("day").creatureData.isHidden, false, "daytime hawk should be visible");
assert.equal(
  hawkDaytimeSyncPlan("dawn").creatureData.isHidden,
  true,
  "hawk should not share owl dawn visibility",
);
assert.equal(
  hawkDaytimeSyncPlan("dusk").creatureData.isHidden,
  true,
  "hawk should not share owl dusk visibility",
);
assert.equal(
  hawkDaytimeSyncPlan("night").creatureData.isHidden,
  true,
  "hawk should not share owl night visibility",
);

async function assertHawkDaytimeSyncBehavior() {
  const hawkSleepCalls = [];
  const hawkSleepResult = await syncHawkDaytimeActivity("night", {
    creature: {
      async findMany(args) {
        hawkSleepCalls.push(["creature.findMany", args]);
        return [{ id: 101 }, { id: 102 }];
      },
      async updateMany(args) {
        hawkSleepCalls.push(["creature.updateMany", args]);
        return { count: args.where?.id?.in?.length ?? 0 };
      },
    },
    worldAction: {
      async updateMany(args) {
        hawkSleepCalls.push(["worldAction.updateMany", args]);
        return { count: 2 };
      },
    },
  });
  assert.deepEqual(hawkSleepResult, { slept: 2, woke: 0 });
  assert.equal(hawkSleepCalls.length, 3, "night hawk sync should find hawks, cancel actions, then hide/sleep them");
  assert.deepEqual(hawkSleepCalls[1][1].where.creatureId, { in: [101, 102] });
  assert.deepEqual(hawkSleepCalls[1][1].where.status, { in: ["QUEUED", "RUNNING"] });
  assert.equal(hawkSleepCalls[1][1].data.status, "CANCELLED");
  assert.equal(hawkSleepCalls[2][1].data.activity, "SLEEPING");
  assert.equal(hawkSleepCalls[2][1].data.isHidden, true);

  const hawkWakeCalls = [];
  const hawkWakeResult = await syncHawkDaytimeActivity("day", {
    creature: {
      async findMany() {
        throw new Error("daytime hawk sync should not load all hawks");
      },
      async updateMany(args) {
        hawkWakeCalls.push(["creature.updateMany", args]);
        return { count: 3 };
      },
    },
    worldAction: {
      async updateMany() {
        throw new Error("daytime hawk sync should not cancel actions");
      },
    },
  });
  assert.deepEqual(hawkWakeResult, { slept: 0, woke: 3 });
  assert.equal(hawkWakeCalls.length, 1, "day hawk sync should wake hidden/sleeping hawks with one updateMany call");
  assert.deepEqual(hawkWakeCalls[0][1].where.species, { key: "hawk", kind: "ANIMAL" });
  assert.deepEqual(hawkWakeCalls[0][1].where.OR, [{ activity: "SLEEPING" }, { isHidden: true }]);
  assert.equal(hawkWakeCalls[0][1].data.activity, "IDLE");
  assert.equal(hawkWakeCalls[0][1].data.isHidden, false);
}

const hawk = { species: { key: "hawk" } };
const snake = { species: { key: "snake" } };
const frog = { age: "ADULT", species: { key: "frog" } };
const mouse = { age: "ADULT", species: { key: "mouse" } };
const adultRabbit = { age: "ADULT", species: { key: "rabbit" } };
assert.ok(predatorPreyPreference(hawk, frog) > predatorPreyPreference(hawk, mouse), "hawk should prefer wet prey over mice");
assert.equal(predatorPreyPreference(hawk, adultRabbit), 0, "hawk should not become a broad rabbit predator");
assert.ok(predatorPreyPreference(snake, frog) > predatorPreyPreference(snake, mouse), "snake should prefer frogs in wet zones");
assert.equal(predatorPreyPreference(snake, adultRabbit), 0, "snake should not become a broad dryland predator");

const frogLocations = speciesLocations(STARTER_FROGS, "frog");
assert.ok(frogLocations.has("riverbank_14_01"), "frogs should seed a riverbank starter cluster");
assert.ok(frogLocations.has("willow_frog_pool_17_10"), "frogs should seed a willow frog-pool starter cluster");
assert.ok(frogLocations.has("willow_still_pool_15_10"), "frogs should seed a second willow wet starter cluster");
assert.doesNotMatch(worldTickSource, /\bfrogBirths\b|\bfrogsSpread\b|FROG_REPRODUCTION|frogReproduction/u, "frogs should stay starter/restoration prey only, with no dedicated 0.16.11 reproduction or spread loop");

const hawkLocations = speciesLocations(STARTER_PREDATORS, "hawk");
const snakeLocations = speciesLocations(STARTER_PREDATORS, "snake");
const predatorSpecies = new Set(STARTER_PREDATORS.map((group) => group.speciesKey));
for (const speciesKey of ["fox", "wolf", "owl", "hawk", "snake"]) {
  assert.ok(predatorSpecies.has(speciesKey), `STARTER_PREDATORS should include ${speciesKey}`);
}
assert.ok(hawkLocations.has("riverbank_17_04"), "hawk should add daytime riverbank bird presence");
assert.ok(hawkLocations.has("meadow_15_03"), "hawk should remain a small open-daylight presence, not wet-zone-only");
assert.ok(snakeLocations.has("riverbank_15_02"), "snake should add wet riverbank predator pressure");
assert.ok([...snakeLocations].some((key) => key.startsWith("willow_")), "snake should add willow floodplain predator pressure");

const drylandWetPressure = [...STARTER_RABBITS, ...STARTER_MICE, ...STARTER_PREDATORS]
  .filter((group) => ["rabbit", "mouse", "fox"].includes(group.speciesKey))
  .filter((group) => group.locationKey.startsWith("riverbank_") || group.locationKey.startsWith("willow_"));
assert.deepEqual(drylandWetPressure, [], "riverbank/willow starter slots should not be mainly rabbits, mice or foxes");

for (const speciesKey of ["frog", "hawk", "snake"]) {
  assert.ok(POPULATION_FLOOR_SPECIES_KEYS.includes(speciesKey), `${speciesKey} should be included in population-floor restoration`);
  assert.ok(POPULATION_FLOOR_GROUPS.some((group) => group.speciesKey === speciesKey), `${speciesKey} should have restoration groups`);
}

assert.match(
  worldResetSource,
  /new Set\(STARTER_PREDATORS\.map\(\(group\) => group\.speciesKey\)\)/u,
  "world reset should derive predator reset species from every STARTER_PREDATORS species, not a fox/wolf-only list",
);
assert.match(
  worldResetSource,
  /resetStarterAnimals\(speciesKey,\s*STARTER_PREDATORS\.filter\(\(group\) => group\.speciesKey === speciesKey\)\)/u,
  "world reset should reset each STARTER_PREDATORS species through the shared starter-animal helper",
);

assert.deepEqual(
  STRANGE_TOTEM_REGION_CAPS,
  { dry_luka: 13, riverbank: 3, chornolis_border: 5, willow_floodplain: 1 },
  "0.16.12 totem cap pass should be the only near-term strange-totem cap expansion",
);

assertHawkDaytimeSyncBehavior()
  .then(() => {
    console.log("Fauna diversity authoring OK");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
