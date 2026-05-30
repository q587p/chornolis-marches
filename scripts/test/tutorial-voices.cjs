const assert = require("node:assert/strict");

require("ts-node/register");

const { PACE_COMMENT_PAIRS, tutorialPaceCooldownMs } = require("../../src/services/tutorialVoices");

assert.equal(tutorialPaceCooldownMs(0), 120_000);
assert.equal(tutorialPaceCooldownMs(1), 300_000);
assert.equal(tutorialPaceCooldownMs(2), 600_000);
assert.equal(tutorialPaceCooldownMs(3), 1_200_000);
assert.equal(tutorialPaceCooldownMs(4), 1_800_000);
assert.equal(tutorialPaceCooldownMs(5), 1_800_000);
assert.equal(tutorialPaceCooldownMs(99), 1_800_000);

const paceTexts = PACE_COMMENT_PAIRS.map((pair) => pair.dreamText("нього", "йому"));
assert.ok(
  paceTexts.includes("Мох уміє чекати, і йому теж можна. Тут ніхто не виграє перегони."),
  "Moss patience line should use the dative pronoun helper",
);
assert.equal(paceTexts.some((text) => /і (нього|неї|них) теж можна/.test(text)), false);

const mossPatienceLine = PACE_COMMENT_PAIRS.find((pair) => pair.drowsinessText.includes("мох почне"));
assert.ok(mossPatienceLine, "Moss patience line should exist");
assert.equal(mossPatienceLine.dreamText("нього", "йому"), "Мох уміє чекати, і йому теж можна. Тут ніхто не виграє перегони.");
assert.equal(mossPatienceLine.dreamText("неї", "їй"), "Мох уміє чекати, і їй теж можна. Тут ніхто не виграє перегони.");
assert.equal(mossPatienceLine.dreamText("них", "їм"), "Мох уміє чекати, і їм теж можна. Тут ніхто не виграє перегони.");

console.log("Tutorial voice pacing OK");
