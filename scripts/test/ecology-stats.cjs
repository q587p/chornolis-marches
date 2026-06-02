const assert = require("node:assert/strict");

require("ts-node/register");

const {
  PLAYER_KILL_EVENT_TITLE,
  POPULATION_FLOOR_RESTORED_EVENT_TITLE,
  PREDATOR_KILL_EVENT_TITLE,
  STARVATION_DEATH_EVENT_TITLE,
  TICK_COUNTER_KEYS,
  buildPredatorKillRowsForSpecies,
  countNpcCharacterKillEvents,
  parsePopulationFloorRestorationDescription,
} = require("../../src/services/ecologyStats");

assert.equal(PLAYER_KILL_EVENT_TITLE, "Player killed animal");
assert.equal(PREDATOR_KILL_EVENT_TITLE, "Creature killed prey");
assert.equal(STARVATION_DEATH_EVENT_TITLE, "Animal starved");
assert.equal(POPULATION_FLOOR_RESTORED_EVENT_TITLE, "Population floor restored");
assert.equal(TICK_COUNTER_KEYS.includes("playerKills"), true);
assert.equal(TICK_COUNTER_KEYS.includes("predatorKills"), true);
assert.equal(TICK_COUNTER_KEYS.includes("starvationDeaths"), true);
assert.equal(TICK_COUNTER_KEYS.includes("creatureDeferred"), true);
assert.equal(TICK_COUNTER_KEYS.includes("populationFloorRestored"), true);
assert.deepEqual(
  parsePopulationFloorRestorationDescription("Restored animal population floors: rabbit=9, mouse=15."),
  { rabbit: 9, mouse: 15 }
);
assert.deepEqual(parsePopulationFloorRestorationDescription("nothing useful here"), {});
assert.equal(
  countNpcCharacterKillEvents(
    [
      { description: "attackerCreature=9; victimCreature=12" },
      { description: "attackerCreature=11; victimCreature=13" },
      { description: "attackerPlayer=7; victimCreature=14" },
      { description: null },
    ],
    new Set([9, 42])
  ),
  1
);

const predatorRows = buildPredatorKillRowsForSpecies(
  [
    { id: 1, key: "fox", name: "лисиця", diet: "CARNIVORE" },
    { id: 2, key: "owl", name: "сова", diet: "CARNIVORE" },
    { id: 3, key: "hawk", name: "яструб", diet: "CARNIVORE" },
    { id: 4, key: "rabbit", name: "заєць", diet: "HERBIVORE" },
  ],
  [
    {
      speciesId: 2,
      _sum: { kills: 7, attackAttempts: 9, successfulAttacks: 8 },
    },
  ],
);
assert.deepEqual(
  predatorRows.map((row) => [row.speciesKey, row.kills, row.attackAttempts, row.successfulAttacks]),
  [
    ["owl", 7, 9, 8],
    ["fox", 0, 0, 0],
    ["hawk", 0, 0, 0],
  ],
);

console.log("Ecology stat counters OK");
