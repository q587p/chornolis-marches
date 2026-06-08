const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  LISOVYK_FRIGHT_CHANCE,
  LISOVYK_HOME_LOCATION_KEY,
  LISOVYK_RESTORATION_MARKER,
  LISOVYK_SETTLE_TICKS,
  formatLisovykRestorationAction,
  lisovykFrightPlan,
  lisovykRestorationArrivalAction,
  lisovykRestorationCompleteAction,
  lisovykRestorationReturnAction,
  lisovykRestorationSettleAction,
  lisovykRestorationTravelAction,
  lisovykTravelPlan,
  parseLisovykRestorationState,
  planLisovykRestorationTarget,
  stripLisovykRestorationActionMarker,
} = require("../../src/services/lisovykRestoration");
const { POPULATION_FLOOR_GROUPS, POPULATION_FLOOR_SPECIES_KEYS } = require("../../src/services/populationRestoration");
const { normalizeCreatureActionText } = require("../../src/utils/creatureActionText");

const species = [
  { id: 1, key: "rabbit", kind: "ANIMAL", baseHp: 10, childTicks: 24, youngTicks: 48, adultTicks: 96 },
  { id: 2, key: "mouse", kind: "ANIMAL", baseHp: 4, childTicks: 8, youngTicks: 16, adultTicks: 32 },
  { id: 3, key: "fox", kind: "ANIMAL", baseHp: 14, childTicks: 60, youngTicks: 120, adultTicks: 360 },
  { id: 4, key: "wolf", kind: "ANIMAL", baseHp: 22, childTicks: 90, youngTicks: 180, adultTicks: 720 },
  { id: 5, key: "owl", kind: "ANIMAL", baseHp: 5, childTicks: 120, youngTicks: 360, adultTicks: 1800 },
];
const locationKeys = [...new Set(POPULATION_FLOOR_GROUPS.map((group) => group.locationKey))];
const locations = locationKeys.map((key, index) => ({ id: index + 10, key }));

const emptyTarget = planLisovykRestorationTarget({ species, locations, livingCreatures: [] });
assert.equal(emptyTarget.speciesKey, "rabbit", "Lisovyk should prefer starter prey restoration before predator/bird tuning");
assert.equal(emptyTarget.locationKey, "forest_04_00");
assert.equal(emptyTarget.age, "ADULT", "restoration target should choose an adult starter group first");
assert.equal(emptyTarget.sex, "FEMALE");
assert.equal(emptyTarget.rows.length, 2, "arrival restoration should be bounded to one missing starter group");
assert.equal(emptyTarget.rows.every((row) => row.locationId === emptyTarget.locationId), true);

const noRabbitBreedingPair = planLisovykRestorationTarget({
  species,
  locations,
  livingCreatures: [
    { speciesKey: "rabbit", locationKey: "forest_04_00", age: "ADULT", sex: "FEMALE" },
    { speciesKey: "rabbit", locationKey: "forest_04_00", age: "ADULT", sex: "FEMALE" },
    { speciesKey: "rabbit", locationKey: "forest_04_00", age: "YOUNG", sex: null },
    { speciesKey: "rabbit", locationKey: "forest_04_00", age: "YOUNG", sex: null },
    { speciesKey: "rabbit", locationKey: "forest_04_00", age: "YOUNG", sex: null },
    { speciesKey: "rabbit", locationKey: "forest_04_00", age: "CHILD", sex: null },
    { speciesKey: "rabbit", locationKey: "forest_04_00", age: "CHILD", sex: null },
    { speciesKey: "rabbit", locationKey: "forest_04_00", age: "CHILD", sex: null },
    { speciesKey: "mouse", locationKey: "forest_03_02", age: "ADULT", sex: "FEMALE" },
    { speciesKey: "mouse", locationKey: "forest_03_02", age: "ADULT", sex: "MALE" },
    { speciesKey: "fox", locationKey: "forest_07_02", age: "ADULT", sex: "FEMALE" },
    { speciesKey: "wolf", locationKey: "forest_00_08", age: "ADULT", sex: "FEMALE" },
    { speciesKey: "owl", locationKey: "forest_04_02", age: "ADULT", sex: "FEMALE" },
  ],
});
assert.equal(noRabbitBreedingPair.speciesKey, "rabbit");
assert.equal(noRabbitBreedingPair.locationKey, "meadow_12_04");
assert.equal(noRabbitBreedingPair.age, "ADULT");
assert.equal(noRabbitBreedingPair.sex, "FEMALE");
assert.equal(noRabbitBreedingPair.rows.length, 2);

const healthy = planLisovykRestorationTarget({
  species,
  locations,
  livingCreatures: POPULATION_FLOOR_GROUPS
    .filter((group) => group.age !== "CORPSE")
    .flatMap((group) => Array.from({ length: group.count }, () => ({
      speciesKey: group.speciesKey,
      locationKey: group.locationKey,
      age: group.age,
      sex: group.sex ?? null,
    }))),
});
assert.equal(healthy, null, "Lisovyk should not choose a restoration target when starter floors are present");

const markerAction = formatLisovykRestorationAction(
  { speciesKey: "rabbit", locationKey: "forest_04_00" },
  "іде старим звіриним слідом",
);
assert.equal(markerAction.startsWith(`${LISOVYK_RESTORATION_MARKER};species=rabbit;location=forest_04_00;phase=travel;settle=0;fright=0;`), true);
assert.deepEqual(parseLisovykRestorationState(markerAction), {
  speciesKey: "rabbit",
  locationKey: "forest_04_00",
  phase: "travel",
  settleTicks: 0,
  frightCooldown: 0,
});
assert.equal(stripLisovykRestorationActionMarker(markerAction), "іде старим звіриним слідом");
assert.equal(normalizeCreatureActionText(markerAction), "іде старим звіриним слідом");
assert.equal(normalizeCreatureActionText(lisovykRestorationTravelAction(emptyTarget)), "іде старим звіриним слідом");
assert.equal(normalizeCreatureActionText(lisovykRestorationArrivalAction(emptyTarget)), "присідає біля старого звіриного сліду");
assert.equal(normalizeCreatureActionText(lisovykRestorationSettleAction(emptyTarget)), "прислухається до поверненого шарудіння");
assert.equal(normalizeCreatureActionText(lisovykRestorationReturnAction(emptyTarget)), "вертається до старого коріння");
assert.equal(lisovykRestorationCompleteAction(), "прислухається до поверненого шарудіння");
assert.equal(LISOVYK_HOME_LOCATION_KEY, "forest_00_00");
assert.equal(LISOVYK_SETTLE_TICKS, 1);

const route = [{ fromLocationId: 7, toLocationId: emptyTarget.locationId, direction: "EAST", travelCost: 1 }];
assert.deepEqual(lisovykTravelPlan({ currentLocationId: 7, target: emptyTarget, route }), {
  kind: "travel",
  target: emptyTarget,
  route,
});
assert.equal(lisovykTravelPlan({ currentLocationId: emptyTarget.locationId, target: emptyTarget, route: [] }).kind, "arrived");
assert.equal(lisovykTravelPlan({ currentLocationId: 7, target: emptyTarget, route: null }).kind, "noRoute");

const frightCreature = {
  id: 40,
  locationId: 20,
  stamina: 42,
  isAlive: true,
  isGone: false,
  isHidden: false,
  age: "ADULT",
  species: { key: "rabbit", kind: "ANIMAL" },
};
const frightExit = { direction: "WEST", toLocationId: 19, travelCost: 1, isHidden: false };
assert.deepEqual(lisovykFrightPlan({
  random: LISOVYK_FRIGHT_CHANCE - 0.01,
  recentFright: false,
  hasPlayers: false,
  candidates: [frightCreature],
  exits: [frightExit],
}), { creature: frightCreature, exit: frightExit });
assert.equal(lisovykFrightPlan({
  random: LISOVYK_FRIGHT_CHANCE + 0.01,
  recentFright: false,
  hasPlayers: false,
  candidates: [frightCreature],
  exits: [frightExit],
}), null);
assert.equal(lisovykFrightPlan({
  random: 0,
  recentFright: true,
  hasPlayers: false,
  candidates: [frightCreature],
  exits: [frightExit],
}), null);
assert.equal(lisovykFrightPlan({
  random: 0,
  recentFright: false,
  hasPlayers: true,
  candidates: [frightCreature],
  exits: [frightExit],
}), null, "fright MVP should not create player-facing room spam");
assert.equal(lisovykFrightPlan({
  random: 0,
  recentFright: false,
  hasPlayers: false,
  candidates: [{ ...frightCreature, isHidden: true }],
  exits: [frightExit],
}), null);

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const markerModel = schema.match(/model WorldEventMarker \{[\s\S]*?\n\}/)?.[0] ?? "";
assert.equal(markerModel.includes("lisovyk"), false, "Lisovyk restoration must not change WorldEventMarker schema");
assert.equal(fs.existsSync("prisma/migrations"), true, "Migrations directory should still exist, but this MVP should not require new migration assertions");

const serviceSource = fs.readFileSync("src/services/lisovykRestoration.ts", "utf8");
const worldTickSource = fs.readFileSync("src/services/worldTick.ts", "utf8");
assert.equal(serviceSource.includes("worldEventMarker"), false, "Lisovyk MVP should use WorldEvent descriptions, not WorldEventMarker writes");
assert.equal(JSON.stringify({ emptyTarget, markerAction }).includes("playerId"), false);
assert.deepEqual(POPULATION_FLOOR_SPECIES_KEYS.sort(), ["fox", "mouse", "owl", "rabbit", "wolf"]);

assert.match(
  worldTickSource,
  /const lisovykRestorationActive = lisovykRestorationReserved \|\| await hasActiveLisovykRestorationWalk\(\);/,
  "worldTick should treat a fresh restoration reservation as an active walk",
);
assert.match(
  worldTickSource,
  /if \(!lisovykAwakened && !lisovykRestorationActive\) lisovykSlept = await putLisovykToSleepIfForestRecovered\(\);/,
  "old resource-recovery sleep hook must not run during active restoration walks",
);
assert.match(
  worldTickSource,
  /if \(parseLisovykRestorationState\(lisovyk\.currentAction\)\) return false;/,
  "sleep hook should defensively ignore lisovyk_restoration:v1 marker state",
);
assert.match(
  worldTickSource,
  /currentAction\?\.match\(\/зник ресурс \(\[a-zA-Z0-9_-\]\+\)\/\)/,
  "resource-depletion Lisovyk sleep behavior should still parse the old resource marker when no restoration marker exists",
);
assert.match(
  worldTickSource,
  /data: \{ isAlive: true, isHidden: true, activity: "SLEEPING"/,
  "old resource-depletion sleep path should remain available for non-restoration Lisovyk state",
);

console.log("Lisovyk restoration-walk helpers OK");
