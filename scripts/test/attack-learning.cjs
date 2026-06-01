const assert = require("node:assert/strict");

require("ts-node/register");

const {
  ATTACK_OBSERVATION_GROWTH_MESSAGE,
  ATTACK_PRACTICE_GROWTH_MESSAGE,
  attackKillSourceDescription,
  attackObservationDescription,
  isAttackObservationMilestone,
  isAttackPracticeMilestone,
} = require("../../src/services/attackLearningRules");

assert.equal(isAttackPracticeMilestone(0), false);
assert.equal(isAttackPracticeMilestone(12), false);
assert.equal(isAttackPracticeMilestone(13), true);
assert.equal(isAttackPracticeMilestone(26), true);
assert.equal(isAttackPracticeMilestone(27), false);

assert.equal(isAttackObservationMilestone(0), false);
assert.equal(isAttackObservationMilestone(4), false);
assert.equal(isAttackObservationMilestone(5), true);
assert.equal(isAttackObservationMilestone(10), true);
assert.equal(isAttackObservationMilestone(11), false);

assert.equal(ATTACK_PRACTICE_GROWTH_MESSAGE, "Навичка <b>атаки</b> підросла.");
assert.equal(ATTACK_OBSERVATION_GROWTH_MESSAGE, "Навичка <b>атаки</b> трохи підросла.");
assert.equal(attackKillSourceDescription({ attackerPlayerId: 7, victimCreatureId: 12 }), "attackerPlayer=7; victimCreature=12");
assert.equal(attackKillSourceDescription({ attackerCreatureId: 9, victimCreatureId: 12 }), "attackerCreature=9; victimCreature=12");
assert.equal(attackObservationDescription(42), "source=42");

console.log("Attack learning helpers OK");
