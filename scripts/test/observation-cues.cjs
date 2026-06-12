const assert = require("node:assert/strict");

require("ts-node/register");

const {
  activeRecentAttackFeature,
  crowdDangerBonus,
  effectiveLocationDanger,
  locationDangerExamineCue,
  locationDangerTechnicalSummary,
  recentAttackDangerBonus,
} = require("../../src/services/locationDanger");
const { emptySmallFindExamineCue } = require("../../src/services/locationExamineCues");
const { owlSignInspectionText } = require("../../src/services/owlSigns");

assert.equal(crowdDangerBonus(13), 0);
assert.equal(crowdDangerBonus(14), 5);
assert.equal(crowdDangerBonus(18), 6);

const futureAttack = {
  key: "recent_attack_1",
  isActive: true,
  data: { expiresAt: new Date(Date.now() + 60_000).toISOString() },
};
const pastAttack = {
  key: "recent_attack_2",
  isActive: true,
  data: { expiresAt: new Date(Date.now() - 60_000).toISOString() },
};

assert.equal(activeRecentAttackFeature(futureAttack), true);
assert.equal(activeRecentAttackFeature(pastAttack), false);
assert.equal(recentAttackDangerBonus([pastAttack]), 0);
assert.equal(recentAttackDangerBonus([futureAttack]), 5);
assert.equal(effectiveLocationDanger(1, 14, [futureAttack]), 11);
assert.equal(locationDangerTechnicalSummary(1, 0, []), "Небезпека: 1");
assert.equal(
  locationDangerTechnicalSummary(1, 0, [futureAttack]),
  "Небезпека: 1; напруга зараз: +5 (+5 від недавнього нападу); відчувається як 6",
);
assert.equal(
  locationDangerTechnicalSummary(1, 14, []),
  "Небезпека: 1; напруга зараз: +5 (+5 від скупчення живих); відчувається як 6",
);
assert.equal(
  locationDangerTechnicalSummary(1, 14, [futureAttack]),
  "Небезпека: 1; напруга зараз: +10 (+5 від скупчення живих, +5 від недавнього нападу); відчувається як 11",
);

assert.equal(locationDangerExamineCue(1), null);
assert.match(locationDangerExamineCue(2), /уважна/u);
assert.match(locationDangerExamineCue(4), /неспокою/u);
assert.match(locationDangerExamineCue(7), /обережнішими/u);

assert.equal(emptySmallFindExamineCue("dream_tutorial"), null);
assert.match(emptySmallFindExamineCue("riverbank"), /вода все пересуває/u);
assert.match(emptySmallFindExamineCue("dry_luka"), /лука тримає кишені порожніми/u);
assert.match(emptySmallFindExamineCue("chornolis_border"), /не кожен уважний погляд/u);

assert.match(owlSignInspectionText("night", "Пір'їна лежить у траві."), /не дивився надто довго/u);
assert.match(owlSignInspectionText("dawn", "Пір'їна лежить у траві."), /простішими, ніж були в темряві/u);

console.log("Observation cues OK");
