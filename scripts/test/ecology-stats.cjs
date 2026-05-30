const assert = require("node:assert/strict");

require("ts-node/register");

const {
  PLAYER_KILL_EVENT_TITLE,
  PREDATOR_KILL_EVENT_TITLE,
  STARVATION_DEATH_EVENT_TITLE,
  TICK_COUNTER_KEYS,
} = require("../../src/services/ecologyStats");

assert.equal(PLAYER_KILL_EVENT_TITLE, "Player killed animal");
assert.equal(PREDATOR_KILL_EVENT_TITLE, "Creature killed prey");
assert.equal(STARVATION_DEATH_EVENT_TITLE, "Animal starved");
assert.equal(TICK_COUNTER_KEYS.includes("playerKills"), true);
assert.equal(TICK_COUNTER_KEYS.includes("predatorKills"), true);
assert.equal(TICK_COUNTER_KEYS.includes("starvationDeaths"), true);

console.log("Ecology stat counters OK");
