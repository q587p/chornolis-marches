const assert = require("node:assert/strict");

require("ts-node/register");

const {
  MUSHROOM_POISON_CHANCE,
  mushroomPoisonDamage,
  mushroomPoisoningHits,
  mushroomUsePlan,
} = require("../../src/services/inventoryUse");

assert.equal(MUSHROOM_POISON_CHANCE, 0.1);
assert.equal(mushroomPoisoningHits(0), true);
assert.equal(mushroomPoisoningHits(0.09), true);
assert.equal(mushroomPoisoningHits(0.1), false);
assert.equal(mushroomPoisoningHits(0.99), false);

assert.equal(mushroomPoisonDamage(20), 7);
assert.equal(mushroomPoisonDamage(21), 7);
assert.equal(mushroomPoisonDamage(22), 8);

assert.deepEqual(
  mushroomUsePlan({ hp: 20, hpMax: 20, hunger: 4, poisoned: true, maxHunger: 13 }),
  {
    poisoned: true,
    damage: 7,
    nextHp: 13,
    nextHunger: 5,
    hungerChanged: false,
  },
);

assert.deepEqual(
  mushroomUsePlan({ hp: 3, hpMax: 20, hunger: 13, poisoned: true, maxHunger: 13 }),
  {
    poisoned: true,
    damage: 2,
    nextHp: 1,
    nextHunger: 13,
    hungerChanged: false,
  },
);

assert.deepEqual(
  mushroomUsePlan({ hp: 20, hpMax: 20, hunger: 2, poisoned: false, maxHunger: 13 }),
  {
    poisoned: false,
    damage: 0,
    nextHp: 20,
    nextHunger: 0,
    hungerChanged: true,
  },
);

assert.deepEqual(
  mushroomUsePlan({ hp: 20, hpMax: 20, hunger: 0, poisoned: false, maxHunger: 13 }),
  {
    poisoned: false,
    damage: 0,
    nextHp: 20,
    nextHunger: 0,
    hungerChanged: false,
  },
);

console.log("Inventory use helpers OK");
