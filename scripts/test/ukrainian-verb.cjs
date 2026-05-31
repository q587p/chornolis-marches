const assert = require("node:assert/strict");

require("ts-node/register");

const { actorGrammarGender, actorPastVerb } = require("../../src/services/grammar");

assert.equal(actorGrammarGender({ grammaticalGender: "FEMININE" }), "FEMININE");
assert.equal(actorGrammarGender({ grammaticalGender: "PLURAL" }), "PLURAL");
assert.equal(actorGrammarGender({ pronoun: "SHE" }), "FEMININE");
assert.equal(actorGrammarGender({ pronoun: "THEY" }), "PLURAL");
assert.equal(actorGrammarGender({ sex: "FEMALE" }), "FEMININE");
assert.equal(actorGrammarGender({ sex: "MALE" }), "MASCULINE");
assert.equal(actorGrammarGender({}), "MASCULINE");

assert.equal(actorPastVerb({ grammaticalGender: "FEMININE" }, "зайшов", "зайшла", "зайшли"), "зайшла");
assert.equal(actorPastVerb({ sex: "FEMALE" }, "пішов", "пішла", "пішли"), "пішла");
assert.equal(actorPastVerb({ grammaticalGender: "PLURAL" }, "пішов", "пішла", "пішли"), "пішли");
assert.equal(actorPastVerb({ sex: "MALE" }, "пішов", "пішла", "пішли"), "пішов");

console.log("Ukrainian verb helpers OK");
