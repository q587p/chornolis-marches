const assert = require("node:assert/strict");

require("ts-node/register");

const {
  isOwlActiveDaypart,
  predatorAttackChance,
  predatorPreyPreference,
} = require("../../src/services/worldTick");

assert.equal(isOwlActiveDaypart("dawn"), true);
assert.equal(isOwlActiveDaypart("dusk"), true);
assert.equal(isOwlActiveDaypart("night"), true);
assert.equal(isOwlActiveDaypart("day"), false);

const owl = {
  hunger: 0,
  species: { key: "owl", strength: 3 },
};
const mouse = {
  hp: 1,
  maxHp: 1,
  age: "ADULT",
  species: { key: "mouse", agility: 7, endurance: 2 },
};
const childRabbit = {
  hp: 1,
  maxHp: 1,
  age: "CHILD",
  species: { key: "rabbit", agility: 8, endurance: 3 },
};
const youngRabbit = {
  hp: 2,
  maxHp: 2,
  age: "YOUNG",
  species: { key: "rabbit", agility: 8, endurance: 3 },
};
const adultRabbit = {
  hp: 3,
  maxHp: 3,
  age: "ADULT",
  species: { key: "rabbit", agility: 8, endurance: 3 },
};

assert.equal(predatorPreyPreference(owl, mouse), 100);
assert.equal(predatorPreyPreference(owl, childRabbit), 18);
assert.equal(predatorPreyPreference(owl, youngRabbit), 8);
assert.equal(predatorPreyPreference(owl, adultRabbit), 0);
assert.ok(predatorAttackChance(owl, mouse) >= 42);

console.log("Owl nocturnal profile OK");
