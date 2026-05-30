const assert = require("node:assert/strict");

require("ts-node/register");

const {
  GATHERING_OBSERVATION_GROWTH_MESSAGE,
  GATHERING_PRACTICE_GROWTH_MESSAGE,
  gatheringObservationDescription,
  gatheringSourceDescription,
  isGatheringObservationMilestone,
  isGatheringPracticeMilestone,
} = require("../../src/services/gatheringLearningRules");

assert.equal(isGatheringPracticeMilestone(0), false);
assert.equal(isGatheringPracticeMilestone(12), false);
assert.equal(isGatheringPracticeMilestone(13), true);
assert.equal(isGatheringPracticeMilestone(26), true);
assert.equal(isGatheringPracticeMilestone(27), false);

assert.equal(isGatheringObservationMilestone(0), false);
assert.equal(isGatheringObservationMilestone(4), false);
assert.equal(isGatheringObservationMilestone(5), true);
assert.equal(isGatheringObservationMilestone(10), true);
assert.equal(isGatheringObservationMilestone(11), false);

assert.equal(GATHERING_PRACTICE_GROWTH_MESSAGE, "Навичка <b>збирання</b> підросла.");
assert.equal(GATHERING_OBSERVATION_GROWTH_MESSAGE, "Навичка <b>збирання</b> трохи підросла.");
assert.equal(gatheringSourceDescription({ actorPlayerId: 7, resourceKey: "berries", success: true }), "actorPlayer=7; success=true; resource=berries");
assert.equal(gatheringSourceDescription({ actorCreatureId: 9, success: false }), "actorCreature=9; success=false");
assert.equal(gatheringObservationDescription(42), "source=42");

console.log("Gathering learning helpers OK");
