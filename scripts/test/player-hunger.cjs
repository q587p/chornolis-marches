const assert = require("node:assert/strict");

require("ts-node/register");

const {
  PASSIVE_PLAYER_HUNGER_INTERVAL_WORLD_MINUTES,
  passivePlayerHungerPlan,
  shouldPausePassivePlayerHunger,
  shouldPausePassivePlayerHungerForInactivity,
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

assert.equal(shouldPausePassivePlayerHunger("ENDED"), true, "Ended sessions should pause passive hunger accrual.");
assert.equal(shouldPausePassivePlayerHunger("AFK"), false, "AFK should silence proactive output, not pause passive hunger.");
assert.equal(shouldPausePassivePlayerHunger("ACTIVE"), false, "Active sessions keep passive hunger accrual.");
assert.equal(shouldPausePassivePlayerHunger(null), false, "Missing session state should not pause passive hunger.");

const idleNow = new Date("2026-05-30T13:00:00.000Z");
assert.equal(shouldPausePassivePlayerHungerForInactivity({ isAutoEnabled: false, lastPlayerActionAt: new Date("2026-05-30T12:00:00.000Z") }, idleNow), true, "Non-auto characters should pause passive hunger after long inactivity.");
assert.equal(shouldPausePassivePlayerHungerForInactivity({ isAutoEnabled: true, lastPlayerActionAt: new Date("2026-05-30T12:00:00.000Z") }, idleNow), false, "Auto-enabled characters should keep passive hunger active.");
assert.equal(shouldPausePassivePlayerHungerForInactivity({ isAutoEnabled: false, lastPlayerActionAt: new Date("2026-05-30T12:01:00.000Z") }, idleNow), false, "Recent non-auto inactivity should not pause passive hunger yet.");
assert.equal(shouldPausePassivePlayerHungerForInactivity({ isAutoEnabled: false, lastPlayerActionAt: null }, idleNow), false, "Missing action time should not pause passive hunger.");

console.log("Player hunger progression OK");
