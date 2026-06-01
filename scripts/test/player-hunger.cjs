const assert = require("node:assert/strict");

require("ts-node/register");

const {
  PASSIVE_PLAYER_HUNGER_INTERVAL_WORLD_MINUTES,
  passivePlayerHungerPlan,
} = require("../../src/services/playerHunger");

const interval = PASSIVE_PLAYER_HUNGER_INTERVAL_WORLD_MINUTES;

assert.equal(interval, 240);

assert.deepEqual(
  passivePlayerHungerPlan({ hunger: 0, currentWorldMinute: 1000, lastPassiveHungerAtMinute: null }),
  {
    hunger: 0,
    lastPassiveHungerAtMinute: 1000,
    increments: 0,
    initialized: true,
    resetBackwards: false,
  },
);

assert.deepEqual(
  passivePlayerHungerPlan({ hunger: 0, currentWorldMinute: 1239, lastPassiveHungerAtMinute: 1000 }),
  {
    hunger: 0,
    lastPassiveHungerAtMinute: 1000,
    increments: 0,
    initialized: false,
    resetBackwards: false,
  },
);

assert.deepEqual(
  passivePlayerHungerPlan({ hunger: 0, currentWorldMinute: 1240, lastPassiveHungerAtMinute: 1000 }),
  {
    hunger: 1,
    lastPassiveHungerAtMinute: 1240,
    increments: 1,
    initialized: false,
    resetBackwards: false,
  },
);

assert.deepEqual(
  passivePlayerHungerPlan({ hunger: 2, currentWorldMinute: 1480, lastPassiveHungerAtMinute: 1000 }),
  {
    hunger: 4,
    lastPassiveHungerAtMinute: 1480,
    increments: 2,
    initialized: false,
    resetBackwards: false,
  },
);

assert.deepEqual(
  passivePlayerHungerPlan({ hunger: 12, currentWorldMinute: 1480, lastPassiveHungerAtMinute: 1000, maxHunger: 13 }),
  {
    hunger: 13,
    lastPassiveHungerAtMinute: 1480,
    increments: 2,
    initialized: false,
    resetBackwards: false,
  },
);

assert.deepEqual(
  passivePlayerHungerPlan({ hunger: 5, currentWorldMinute: 900, lastPassiveHungerAtMinute: 1000 }),
  {
    hunger: 5,
    lastPassiveHungerAtMinute: 900,
    increments: 0,
    initialized: false,
    resetBackwards: true,
  },
);

console.log("Player hunger progression OK");
