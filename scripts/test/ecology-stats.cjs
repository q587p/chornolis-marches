const assert = require("node:assert/strict");

require("ts-node/register");

const {
  PLAYER_KILL_EVENT_TITLE,
  POPULATION_FLOOR_RESTORED_EVENT_TITLE,
  PREDATOR_KILL_EVENT_TITLE,
  STARVATION_DEATH_EVENT_TITLE,
  TICK_COUNTER_KEYS,
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

console.log("Ecology stat counters OK");
