const assert = require("node:assert/strict");

require("ts-node/register");

const { animalSpeechReactionPlan, nextAnimalSpeechProvocationCount } = require("../../src/services/actionCompletions");

assert.deepEqual(animalSpeechReactionPlan("mouse", 0.1), {
  kind: "flee",
  currentAction: "лякається голосу",
});
assert.deepEqual(animalSpeechReactionPlan("mouse", 0.95), {
  kind: "freeze",
  currentAction: "завмирає від голосу",
});
assert.deepEqual(animalSpeechReactionPlan("rabbit", 0.2), {
  kind: "flee",
  currentAction: "сахкається від голосу",
});
assert.deepEqual(animalSpeechReactionPlan("rabbit", 0.9), {
  kind: "freeze",
  currentAction: "насторожено завмирає",
});
assert.deepEqual(animalSpeechReactionPlan("fox", 0.5), {
  kind: "watch",
  currentAction: "насторожено слухає",
});
assert.deepEqual(animalSpeechReactionPlan("wolf", 0.5), {
  kind: "warn",
  currentAction: "низько гарчить",
});
assert.deepEqual(animalSpeechReactionPlan("wolf", 0.5, { provocationCount: 3 }), {
  kind: "threaten",
  currentAction: "готується кинутися",
});
assert.equal(animalSpeechReactionPlan("owl", 0.5), null);

assert.equal(nextAnimalSpeechProvocationCount(undefined, 1000, 500), 1);
assert.equal(nextAnimalSpeechProvocationCount({ count: 2, lastAt: 900 }, 1000, 500), 3);
assert.equal(nextAnimalSpeechProvocationCount({ count: 2, lastAt: 100 }, 1000, 500), 1);

console.log("Animal speech reactions OK");
