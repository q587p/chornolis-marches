const assert = require("node:assert/strict");

require("ts-node/register");

const {
  actorGrammarGender,
  actorPastVerb,
  actorWord,
  creatureGrammarGender,
  creatureWord,
  playerGrammarGender,
  playerWord,
  wordByGender,
} = require("../../src/services/grammar");
const { formatCreatureLifeState, formatCreatureStatusLine } = require("../../src/services/targets");
const { formatObservedPostureText, formatObservedVitalsText } = require("../../src/utils/playerText");

assert.equal(actorGrammarGender({ grammaticalGender: "FEMININE" }), "FEMININE");
assert.equal(actorGrammarGender({ grammaticalGender: "NEUTER" }), "NEUTER");
assert.equal(actorGrammarGender({ grammaticalGender: "PLURAL" }), "PLURAL");
assert.equal(actorGrammarGender({ pronoun: "SHE" }), "FEMININE");
assert.equal(actorGrammarGender({ pronoun: "THEY" }), "PLURAL");
assert.equal(actorGrammarGender({ sex: "FEMALE" }), "FEMININE");
assert.equal(actorGrammarGender({ sex: "MALE" }), "MASCULINE");
assert.equal(actorGrammarGender({}), "MASCULINE");
assert.equal(playerGrammarGender({ grammaticalGender: "NEUTER", pronoun: "SHE" }), "NEUTER");
assert.equal(playerGrammarGender({ pronoun: "SHE" }), "FEMININE");
assert.equal(playerGrammarGender({ pronoun: "THEY" }), "PLURAL");
assert.equal(creatureGrammarGender({ sex: "MALE", species: { grammaticalGender: "FEMININE" } }), "MASCULINE");
assert.equal(creatureGrammarGender({ sex: "FEMALE", species: { grammaticalGender: "MASCULINE" } }), "FEMININE");
assert.equal(creatureGrammarGender({ species: { grammaticalGender: "PLURAL" } }), "PLURAL");
assert.equal(creatureGrammarGender({ species: { grammaticalGender: "NEUTER" } }), "NEUTER");

const genderForms = {
  MASCULINE: "живий",
  FEMININE: "жива",
  NEUTER: "живе",
  PLURAL: "живі",
};
assert.equal(wordByGender("MASCULINE", genderForms), "живий");
assert.equal(wordByGender("FEMININE", genderForms), "жива");
assert.equal(wordByGender("NEUTER", genderForms), "живе");
assert.equal(wordByGender("PLURAL", genderForms), "живі");
assert.equal(actorWord({ pronoun: "THEY" }, genderForms), "живі");
assert.equal(playerWord({ pronoun: "SHE" }, genderForms), "жива");
assert.equal(creatureWord({ sex: "FEMALE", species: { grammaticalGender: "MASCULINE" } }, genderForms), "жива");

assert.equal(actorPastVerb({ grammaticalGender: "FEMININE" }, "зайшов", "зайшла", "зайшли"), "зайшла");
assert.equal(actorPastVerb({ sex: "FEMALE" }, "пішов", "пішла", "пішли"), "пішла");
assert.equal(actorPastVerb({ grammaticalGender: "PLURAL" }, "пішов", "пішла", "пішли"), "пішли");
assert.equal(actorPastVerb({ sex: "MALE" }, "пішов", "пішла", "пішли"), "пішов");

assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: true, grammaticalGender: "PLURAL" }), "Сидять і відпочивають.");
assert.equal(formatObservedVitalsText({
  hp: 3,
  hpMax: 10,
  stamina: 10,
  staminaMax: 10,
  grammaticalGender: "FEMININE",
}), "Виглядає тяжко пораненою.\nВиглядає відпочилою.");
assert.equal(formatObservedVitalsText({
  hp: 6,
  hpMax: 10,
  stamina: 2,
  staminaMax: 10,
  pronoun: "THEY",
}), "Виглядають побитими, але тримаються.\nВиглядають втомленими.");
assert.equal(formatCreatureStatusLine({
  isAlive: true,
  sex: "FEMALE",
  species: { grammaticalGender: "MASCULINE" },
}, "їсть ягоди."), "Стан: жива, їсть ягоди.");
assert.equal(formatCreatureLifeState({
  hp: 1,
  maxHp: 12,
  sex: "MALE",
  species: { baseHp: 12, grammaticalGender: "FEMININE" },
}), "Життя: тяжко поранений.");

console.log("Ukrainian verb helpers OK");
