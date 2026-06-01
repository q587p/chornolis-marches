const assert = require("node:assert/strict");

require("ts-node/register");

const {
  fresheningSuccessChanceForSpecies,
  fresheningSucceeds,
  meatYieldForSpecies,
} = require("../../src/services/meat");
const { planCookAllRawMeat } = require("../../src/services/cookingQueue");
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
assert.equal(retryOptions.reply_markup.inline_keyboard[0][1].callback_data, "inventory:cook:all");
assert.equal(retryOptions.reply_markup.inline_keyboard[0][1].text, "🔥 Посмажити все");
const singleRetryOptions = cookingResultReplyOptions({ rawMeatRemaining: 1 });
assert.equal(singleRetryOptions.reply_markup.inline_keyboard[0].length, 1);

assert.deepEqual(
  planCookAllRawMeat({
    rawMeatAmount: 5,
    activeActionCount: 2,
    activeCookActionCount: 1,
    maxQueuedActions: 12,
  }),
  {
    count: 4,
    rawMeatAmount: 5,
    activeActionCount: 2,
    activeCookActionCount: 1,
    availableSlots: 10,
    alreadyPlanned: 1,
    unplannedRawMeat: 4,
    limitedByQueue: false,
  },
);

assert.deepEqual(
  planCookAllRawMeat({
    rawMeatAmount: 20,
    activeActionCount: 10,
    activeCookActionCount: 3,
    maxQueuedActions: 12,
  }),
  {
    count: 2,
    rawMeatAmount: 20,
    activeActionCount: 10,
    activeCookActionCount: 3,
    availableSlots: 2,
    alreadyPlanned: 3,
    unplannedRawMeat: 17,
    limitedByQueue: true,
  },
);

assert.equal(
  planCookAllRawMeat({
    rawMeatAmount: 12,
    activeActionCount: 12,
    activeCookActionCount: 12,
    maxQueuedActions: 12,
  }).unplannedRawMeat,
  0,
);

console.log("Meat helpers OK");
