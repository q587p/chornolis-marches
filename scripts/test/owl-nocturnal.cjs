const assert = require("node:assert/strict");

require("ts-node/register");

const {
  isOwlActiveDaypart,
  owlNocturnalSyncPlan,
  predatorAttackChance,
  predatorPreyPreference,
} = require("../../src/services/worldTick");
const { canCreatureAttackComplete } = require("../../src/services/actionCompletions");

assert.equal(isOwlActiveDaypart("dawn"), true);
assert.equal(isOwlActiveDaypart("dusk"), true);
assert.equal(isOwlActiveDaypart("night"), true);
assert.equal(isOwlActiveDaypart("day"), false);

const daytimePlan = owlNocturnalSyncPlan("day");
assert.equal(daytimePlan.cancelActiveActions, true);
assert.equal(daytimePlan.creatureData.activity, "SLEEPING");
assert.equal(daytimePlan.creatureData.isHidden, true);

for (const activeDaypart of ["dawn", "dusk", "night"]) {
  const activePlan = owlNocturnalSyncPlan(activeDaypart);
  assert.equal(activePlan.cancelActiveActions, false);
  assert.equal(activePlan.creatureData.activity, "IDLE");
  assert.equal(activePlan.creatureData.isHidden, false);
}

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

assert.equal(canCreatureAttackComplete({ isAlive: true, isGone: false, isHidden: false, activity: "FIGHTING" }), true);
assert.equal(canCreatureAttackComplete({ isAlive: true, isGone: false, isHidden: true, activity: "FIGHTING" }), false);
assert.equal(canCreatureAttackComplete({ isAlive: true, isGone: false, isHidden: false, activity: "SLEEPING" }), false);
assert.equal(canCreatureAttackComplete({ isAlive: true, isGone: true, isHidden: false, activity: "FIGHTING" }), false);

console.log("Owl nocturnal profile OK");
