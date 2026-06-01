const assert = require("node:assert/strict");

require("ts-node/register");

const {
  fresheningSuccessChanceForSpecies,
  fresheningSucceeds,
  meatYieldForSpecies,
} = require("../../src/services/meat");
const { cookingResultReplyOptions } = require("../../src/ui/inventoryItemKeyboard");

assert.equal(meatYieldForSpecies("mouse"), 1);
assert.equal(meatYieldForSpecies("rabbit"), 3);
assert.equal(meatYieldForSpecies("fox"), 5);
assert.equal(meatYieldForSpecies("wolf"), 7);
assert.equal(meatYieldForSpecies("unknown"), 2);

assert.equal(fresheningSuccessChanceForSpecies("mouse"), 0.8);
assert.equal(fresheningSuccessChanceForSpecies("rabbit"), 0.6);
assert.equal(fresheningSuccessChanceForSpecies("fox"), 0.4);
assert.equal(fresheningSuccessChanceForSpecies("wolf"), 0.4);
assert.equal(fresheningSuccessChanceForSpecies("unknown"), 0.5);

assert.equal(fresheningSucceeds("mouse", 0.79), true);
assert.equal(fresheningSucceeds("mouse", 0.8), false);
assert.equal(fresheningSucceeds("rabbit", 0.59), true);
assert.equal(fresheningSucceeds("rabbit", 0.6), false);
assert.equal(fresheningSucceeds("fox", 0.39), true);
assert.equal(fresheningSucceeds("fox", 0.4), false);
assert.equal(fresheningSucceeds("wolf", 0.39), true);
assert.equal(fresheningSucceeds("wolf", 0.4), false);

assert.equal(cookingResultReplyOptions({ rawMeatRemaining: 0 }), undefined);
assert.equal(cookingResultReplyOptions({ rawMeatRemaining: null }), undefined);
const retryOptions = cookingResultReplyOptions({ rawMeatRemaining: 2 });
assert.equal(retryOptions.reply_markup.inline_keyboard[0][0].callback_data, "inventory:cook:meat");
assert.equal(retryOptions.reply_markup.inline_keyboard[0][0].text, "🔥 Підсмажити м’ясо");

console.log("Meat helpers OK");
