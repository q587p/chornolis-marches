const assert = require("node:assert/strict");

require("ts-node/register");

const { animalSpeechReactionPlan } = require("../../src/services/actionCompletions");

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
assert.equal(animalSpeechReactionPlan("owl", 0.5), null);

console.log("Animal speech reactions OK");
