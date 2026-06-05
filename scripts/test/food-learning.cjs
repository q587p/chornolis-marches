const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  foodObservationLearningProgressInput,
} = require("../../src/services/foodLearning");
const {
  COOKING_OBSERVATION_GROWTH_MESSAGE,
  COOKING_PRACTICE_GROWTH_MESSAGE,
  FRESHENING_OBSERVATION_GROWTH_MESSAGE,
  FRESHENING_PRACTICE_GROWTH_MESSAGE,
  cookingSourceDescription,
  foodObservationDescription,
  fresheningSourceDescription,
  isCookingObservationMilestone,
  isCookingPracticeMilestone,
  isFresheningObservationMilestone,
  isFresheningPracticeMilestone,
} = require("../../src/services/foodLearningRules");

assert.equal(isFresheningPracticeMilestone(0), false);
assert.equal(isFresheningPracticeMilestone(12), false);
assert.equal(isFresheningPracticeMilestone(13), true);
assert.equal(isFresheningPracticeMilestone(26), true);
assert.equal(isFresheningPracticeMilestone(27), false);

assert.equal(isFresheningObservationMilestone(0), false);
assert.equal(isFresheningObservationMilestone(4), false);
assert.equal(isFresheningObservationMilestone(5), true);
assert.equal(isFresheningObservationMilestone(10), true);
assert.equal(isFresheningObservationMilestone(11), false);

assert.equal(isCookingPracticeMilestone(0), false);
assert.equal(isCookingPracticeMilestone(12), false);
assert.equal(isCookingPracticeMilestone(13), true);
assert.equal(isCookingPracticeMilestone(26), true);
assert.equal(isCookingPracticeMilestone(27), false);

assert.equal(isCookingObservationMilestone(0), false);
assert.equal(isCookingObservationMilestone(4), false);
assert.equal(isCookingObservationMilestone(5), true);
assert.equal(isCookingObservationMilestone(10), true);
assert.equal(isCookingObservationMilestone(11), false);

assert.equal(FRESHENING_PRACTICE_GROWTH_MESSAGE, "Навичка <b>освіжування</b> підросла.");
assert.equal(FRESHENING_OBSERVATION_GROWTH_MESSAGE, "Навичка <b>освіжування</b> трохи підросла.");
assert.equal(COOKING_PRACTICE_GROWTH_MESSAGE, "Навичка <b>приготування</b> підросла.");
assert.equal(COOKING_OBSERVATION_GROWTH_MESSAGE, "Навичка <b>приготування</b> трохи підросла.");

assert.equal(fresheningSourceDescription({ actorPlayerId: 7, creatureId: 42, speciesKey: "mouse" }), "actorPlayer=7; creature=42; species=mouse");
assert.equal(fresheningSourceDescription({ actorPlayerId: 7, creatureId: 42, speciesKey: "mouse", success: false }), "actorPlayer=7; creature=42; species=mouse; success=false");
assert.equal(fresheningSourceDescription({ actorCreatureId: 9 }), "actorCreature=9");
assert.equal(cookingSourceDescription({ actorPlayerId: 7, success: true }), "actorPlayer=7; success=true");
assert.equal(cookingSourceDescription({ actorCreatureId: 9, success: false }), "actorCreature=9; success=false");
assert.equal(foodObservationDescription(42), "source=42");

assert.deepEqual(
  foodObservationLearningProgressInput({
    playerId: 7,
    sourceEventId: 42,
    skillKey: "freshening",
    contextKey: "freshening",
  }),
  {
    playerId: 7,
    skillKey: "freshening",
    sourceKey: "observation",
    contextKey: "freshening",
    amount: 1,
    lastSourceEventId: 42,
  },
);
assert.equal(foodObservationLearningProgressInput({ playerId: 7, sourceEventId: 42 }), null);

console.log("Food learning helpers OK");
