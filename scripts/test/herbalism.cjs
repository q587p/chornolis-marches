const assert = require("node:assert/strict");

require("ts-node/register");

const {
  HERBALISM_BREW_CONTEXT_PREFIX,
  HERBALISM_BREW_OUTCOME_TABLE,
  HERBALISM_HERBAL_TINCTURE_CONTEXT_KEY,
  HERBALISM_OBSERVATION_SOURCE_KEY,
  HERBALISM_PRACTICE_SOURCE_KEY,
  HERBALISM_SKILL_KEY,
  HERBALISM_SKILL_UKRAINIAN_LABEL,
  herbalismBrewChancesForLevel,
  herbalismBrewConsumptionPolicy,
  herbalismBrewOutcomeText,
  herbalismPracticeAmountForOutcome,
  rollHerbalismBrewOutcome,
} = require("../../src/services/herbalism");
const { learningSkillDisplayName } = require("../../src/services/learning");

assert.equal(HERBALISM_SKILL_KEY, "herbalism");
assert.equal(HERBALISM_SKILL_UKRAINIAN_LABEL, "знахарство");
assert.equal(HERBALISM_PRACTICE_SOURCE_KEY, "practice");
assert.equal(HERBALISM_OBSERVATION_SOURCE_KEY, "observation");
assert.equal(HERBALISM_BREW_CONTEXT_PREFIX, "brew:");
assert.equal(HERBALISM_HERBAL_TINCTURE_CONTEXT_KEY, "brew:herbal_tincture");
assert.equal(learningSkillDisplayName(HERBALISM_SKILL_KEY), "знахарство");

assert.deepEqual(HERBALISM_BREW_OUTCOME_TABLE.map((row) => row.level), [0, 1, 2, 3, 4, 5]);
for (const row of HERBALISM_BREW_OUTCOME_TABLE) {
  assert.equal(
    row.successPermille + row.ordinaryFailurePermille + row.criticalFailurePermille,
    1000,
    `level ${row.level} chance row sums to 1000`,
  );
}

assert.deepEqual(herbalismBrewChancesForLevel(-1), HERBALISM_BREW_OUTCOME_TABLE[0]);
assert.deepEqual(herbalismBrewChancesForLevel(Number.NaN), HERBALISM_BREW_OUTCOME_TABLE[0]);
assert.deepEqual(herbalismBrewChancesForLevel(Number.POSITIVE_INFINITY), HERBALISM_BREW_OUTCOME_TABLE[0]);
assert.deepEqual(herbalismBrewChancesForLevel(99), HERBALISM_BREW_OUTCOME_TABLE[5]);

assert.equal(rollHerbalismBrewOutcome(0, 0), "success");
assert.equal(rollHerbalismBrewOutcome(0, 449), "success");
assert.equal(rollHerbalismBrewOutcome(0, 450), "ordinary_failure");
assert.equal(rollHerbalismBrewOutcome(0, 949), "ordinary_failure");
assert.equal(rollHerbalismBrewOutcome(0, 950), "critical_failure");
assert.equal(rollHerbalismBrewOutcome(5, 949), "success");
assert.equal(rollHerbalismBrewOutcome(5, 950), "ordinary_failure");
assert.equal(rollHerbalismBrewOutcome(5, 999), "ordinary_failure");
assert.equal(rollHerbalismBrewOutcome(-5, -1), "success");
assert.equal(rollHerbalismBrewOutcome(2, 10000), "critical_failure");

assert.equal(herbalismPracticeAmountForOutcome("success"), 2);
assert.equal(herbalismPracticeAmountForOutcome("ordinary_failure"), 1);
assert.equal(herbalismPracticeAmountForOutcome("critical_failure"), 2);

assert.deepEqual(herbalismBrewConsumptionPolicy("success"), {
  consumeNonBottleIngredients: true,
  consumeEmptyBottle: true,
  produceOutput: true,
});
assert.deepEqual(herbalismBrewConsumptionPolicy("ordinary_failure"), {
  consumeNonBottleIngredients: true,
  consumeEmptyBottle: false,
  produceOutput: false,
});
assert.deepEqual(herbalismBrewConsumptionPolicy("critical_failure"), {
  consumeNonBottleIngredients: true,
  consumeEmptyBottle: true,
  produceOutput: false,
});

for (const outcome of ["success", "ordinary_failure", "critical_failure"]) {
  const text = herbalismBrewOutcomeText(outcome);
  assert.doesNotMatch(text, /%|\b0?\.\d+\b|\b\d+\s*\/\s*\d+\b/);
  assert.doesNotMatch(text, /ordinary_failure|critical_failure|success|skillKey|level|chance/i);
}

const ordinaryText = herbalismBrewOutcomeText("ordinary_failure");
assert.match(ordinaryText, /запах|мутніє|осідає|не так/u);

const criticalText = herbalismBrewOutcomeText("critical_failure");
assert.match(criticalText, /Скло|тріщину|уламків/u);
assert.doesNotMatch(criticalText, /кров|рани|Життя|HP/i);

const successText = herbalismBrewOutcomeText("success");
assert.match(successText, /трав|ягід|пляшечці|настоянка/u);

console.log("Herbalism policy helpers OK");
