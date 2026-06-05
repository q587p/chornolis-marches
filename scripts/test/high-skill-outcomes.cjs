const assert = require("node:assert/strict");

require("ts-node/register");

const {
  highSkillOutcomeChanceForLevel,
  highSkillOutcomeSucceeds,
  maybeHighSkillQualitativeOutcome,
} = require("../../src/services/highSkillOutcomes");

assert.equal(highSkillOutcomeChanceForLevel(0), 0);
assert.equal(highSkillOutcomeChanceForLevel(1), 0);
assert.equal(highSkillOutcomeChanceForLevel(2), 0);
assert.equal(highSkillOutcomeChanceForLevel(3), 0.03);
assert.equal(highSkillOutcomeChanceForLevel(4), 0.05);
assert.equal(highSkillOutcomeChanceForLevel(5), 0.08);
assert.equal(highSkillOutcomeChanceForLevel(8), 0.08);

assert.deepEqual(highSkillOutcomeSucceeds({ level: 2, roll: 0 }), { chance: 0, triggered: false });
assert.deepEqual(highSkillOutcomeSucceeds({ level: 3, roll: 0.02 }), { chance: 0.03, triggered: true });
assert.deepEqual(highSkillOutcomeSucceeds({ level: 3, roll: 0.03 }), { chance: 0.03, triggered: false });
assert.deepEqual(highSkillOutcomeSucceeds({ level: 5, roll: 0.079 }), { chance: 0.08, triggered: true });
assert.deepEqual(highSkillOutcomeSucceeds({ level: 5, roll: 0.08 }), { chance: 0.08, triggered: false });

const lowGathering = maybeHighSkillQualitativeOutcome({
  kind: "gathering",
  level: 2,
  resourceKey: "herbs",
  roll: 0,
});
assert.equal(lowGathering.triggered, false);
assert.equal(lowGathering.extraAmount, undefined);

const unsupportedGathering = maybeHighSkillQualitativeOutcome({
  kind: "gathering",
  level: 5,
  resourceKey: "honey",
  roll: 0,
});
assert.equal(unsupportedGathering.triggered, false);
assert.equal(unsupportedGathering.extraAmount, undefined);

const tutorialGathering = maybeHighSkillQualitativeOutcome({
  kind: "gathering",
  level: 5,
  resourceKey: "berries",
  roll: 0,
  tutorial: true,
});
assert.equal(tutorialGathering.triggered, false);

const failedGathering = maybeHighSkillQualitativeOutcome({
  kind: "gathering",
  level: 5,
  resourceKey: "mushrooms",
  roll: 0,
  success: false,
});
assert.equal(failedGathering.triggered, false);

const highGathering = maybeHighSkillQualitativeOutcome({
  kind: "gathering",
  level: 5,
  resourceKey: "herbs",
  roll: 0,
});
assert.equal(highGathering.triggered, true);
assert.equal(highGathering.extraAmount, 1);
assert.match(highGathering.text, /Рука|Серед/);

const highFreshening = maybeHighSkillQualitativeOutcome({
  kind: "freshening",
  level: 5,
  roll: 0,
});
assert.equal(highFreshening.triggered, true);
assert.equal(highFreshening.extraAmount, undefined);
assert.match(highFreshening.text, /Розріз|м'яса/);

const highCookingDeferred = maybeHighSkillQualitativeOutcome({
  kind: "cooking",
  level: 5,
  roll: 0,
});
assert.equal(highCookingDeferred.triggered, false);

for (const text of [highGathering.text, highFreshening.text]) {
  assert.ok(text);
  assert.doesNotMatch(text, /XP|level|chance|bonus|0\.08|5|рівень|шанс|бонус/i);
}

console.log("high-skill outcome helper tests passed");
