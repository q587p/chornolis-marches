const assert = require("node:assert/strict");

require("ts-node/register");

const {
  EMPTY_BOTTLE_KEY,
  EMPTY_BOTTLE_SOURCE_CARRY_CAP,
  EMPTY_BOTTLE_SOURCE_CARRY_CAP_TEXT,
  EMPTY_BOTTLE_TAKE_BUTTON_LABEL,
  canTakeBottleFromSourceAmount,
  emptyBottleSourceInspectionText,
  isEmptyBottleSourceData,
  isEmptyBottleSourceFeature,
  isEmptyBottleTarget,
} = require("../../src/services/bottles");

assert.equal(EMPTY_BOTTLE_KEY, "empty_bottle");
assert.equal(EMPTY_BOTTLE_SOURCE_CARRY_CAP, 3);
assert.equal(EMPTY_BOTTLE_TAKE_BUTTON_LABEL, "🧪 Взяти пляшечку");
assert.match(EMPTY_BOTTLE_SOURCE_CARRY_CAP_TEXT, /кілька порожніх пляшечок/);

assert.equal(isEmptyBottleSourceData({ empty_bottle_source: true }), true);
assert.equal(isEmptyBottleSourceData({ torch_source: true }), false);
assert.equal(isEmptyBottleSourceFeature({ data: { empty_bottle_source: true } }), true);
assert.equal(isEmptyBottleSourceFeature({ data: { empty_bottle_source: false } }), false);

for (const input of [
  "empty bottle",
  "empty_bottle",
  "bottle",
  "порожня пляшечка",
  "порожню пляшечку",
  "пляшечка",
  "пляшечку",
  "пляшка",
  "посудинка",
]) {
  assert.equal(isEmptyBottleTarget(input), true, `Expected empty bottle target: ${input}`);
}

assert.equal(isEmptyBottleTarget("torch"), false);
assert.match(emptyBottleSourceInspectionText(), /пляшечки/);
assert.equal(canTakeBottleFromSourceAmount(0), true);
assert.equal(canTakeBottleFromSourceAmount(1), true);
assert.equal(canTakeBottleFromSourceAmount(2), true);
assert.equal(canTakeBottleFromSourceAmount(3), false);
assert.equal(canTakeBottleFromSourceAmount(4), false);

console.log("Bottle cache helpers OK");
