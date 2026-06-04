const assert = require("node:assert/strict");

require("ts-node/register");

const {
  isOwlActiveDaypart,
  owlNocturnalSyncPlan,
  predatorAttackChance,
  predatorPreyPreference,
} = require("../../src/services/worldTick");
const { canCreatureAttackComplete } = require("../../src/services/actionCompletions");
const {
  predatorKillCurrentAction,
  predatorKillObserverText,
  predatorMissCurrentAction,
  predatorMissObserverText,
  predatorWoundCurrentAction,
  predatorWoundObserverText,
} = require("../../src/services/predatorActionText");
const {
  owlSignDetailLine,
  owlSignInspectionText,
  isStarterCampOwlSafeLocationKey,
} = require("../../src/services/owlSigns");
const { canCreatureUseExit, creatureUsableExits } = require("../../src/services/creatureMovement");

assert.equal(isOwlActiveDaypart("dawn"), true);
assert.equal(isOwlActiveDaypart("dusk"), true);
assert.equal(isOwlActiveDaypart("night"), true);
assert.equal(isOwlActiveDaypart("day"), false);
assert.equal(isStarterCampOwlSafeLocationKey("start_border_camp"), true);
assert.equal(isStarterCampOwlSafeLocationKey("start_border_watchtower"), true);
assert.equal(isStarterCampOwlSafeLocationKey("meadow_14_04"), false);

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
assert.equal(predatorMissCurrentAction("owl", "мишу", "миша"), "промахнулася, падаючи на мишу");
assert.equal(predatorKillCurrentAction("owl", "мишу", "миша"), "безшумно вполювала мишу й тримається поруч зі здобиччю");
assert.equal(predatorWoundCurrentAction("owl", "мишу", "миша"), "зачепила мишу кігтями");
assert.equal(predatorMissObserverText("owl", "мишу", "миша"), "Крилата тінь беззвучно падає на мишу, але здобич вислизає.");
assert.equal(predatorKillObserverText("owl", "миша"), "Крилата тінь падає згори. За мить миша завмирає в траві.");
assert.equal(predatorWoundObserverText("owl", "мишу", "миша"), "Крилата тінь зачіпає мишу й знову губиться вгорі.");
assert.equal(predatorKillObserverText("fox", "миша"), "Щось кидається на здобич. За мить миша падає нерухомо.");
assert.equal(predatorMissCurrentAction("fox", "зайця", "заєць"), "промахнувся, нападаючи на зайця");
assert.equal(predatorKillCurrentAction("fox", "зайця", "заєць"), "убив зайця і тримається поруч зі здобиччю");
assert.equal(predatorWoundCurrentAction("fox", "зайця", "заєць"), "атакує зайця");
assert.equal(predatorMissObserverText("fox", "зайця", "заєць", "Лукан"), "Лукан кидається на зайця, але здобич вислизає.");
assert.equal(predatorWoundObserverText("fox", "зайця", "заєць", "Лукан"), "Лукан нападає на зайця.");
assert.equal(owlSignDetailLine(), "підказує, що вночі тут полює щось крилате");
assert.match(owlSignInspectionText("night", "Пір'їна лежить у траві."), /нічного слухача/);
assert.match(owlSignInspectionText("day", "Пір'їна лежить у траві."), /Удень тут тихо/);
assert.match(owlSignInspectionText("dawn", "Пір'їна лежить у траві."), /відступає в гілля/);

const owlCreature = { species: { key: "owl", kind: "ANIMAL" } };
const foxCreature = { species: { key: "fox", kind: "ANIMAL" } };
const campExit = { direction: "WEST", toLocation: { key: "start_border_camp" } };
const forestExit = { direction: "EAST", toLocation: { key: "forest_04_02" } };
assert.equal(canCreatureUseExit(owlCreature, campExit), false);
assert.equal(canCreatureUseExit(foxCreature, campExit), true);
assert.deepEqual(creatureUsableExits(owlCreature, [campExit, forestExit]), [forestExit]);

console.log("Owl nocturnal profile OK");
