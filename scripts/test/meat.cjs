const assert = require("node:assert/strict");

require("ts-node/register");

const {
  adjustedFresheningSuccessChance,
  fresheningSkillEffectForProgressRows,
  fresheningSuccessChanceForSpecies,
  fresheningSucceeds,
  meatYieldForSpecies,
} = require("../../src/services/meat");
const { resourceAmountText } = require("../../src/utils/resourceText");
const { MAX_QUEUED_ACTIONS_PER_ACTOR } = require("../../src/gameConfig");
const { planCookAllRawMeat } = require("../../src/services/cookingQueue");
const { cookingResultReplyOptions } = require("../../src/ui/inventoryItemKeyboard");

function assertApprox(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 0.000001, message ?? `${actual} ~= ${expected}`);
}

assert.equal(MAX_QUEUED_ACTIONS_PER_ACTOR, 17);

assert.equal(meatYieldForSpecies("mouse"), 1);
assert.equal(meatYieldForSpecies("owl"), 2);
assert.equal(meatYieldForSpecies("rabbit"), 3);
assert.equal(meatYieldForSpecies("fox"), 5);
assert.equal(meatYieldForSpecies("wolf"), 7);
assert.equal(meatYieldForSpecies("unknown"), 2);
assert.equal(resourceAmountText("сире м'ясо", 1), "сире м'ясо");
assert.equal(resourceAmountText("сире м'ясо", 3), "сире м'ясо ×3");

assert.equal(fresheningSuccessChanceForSpecies("mouse"), 0.8);
assert.equal(fresheningSuccessChanceForSpecies("owl"), 0.5);
assert.equal(fresheningSuccessChanceForSpecies("rabbit"), 0.6);
assert.equal(fresheningSuccessChanceForSpecies("fox"), 0.4);
assert.equal(fresheningSuccessChanceForSpecies("wolf"), 0.4);
assert.equal(fresheningSuccessChanceForSpecies("unknown"), 0.5);
assert.equal(adjustedFresheningSuccessChance("rabbit", 0), 0.6);
assertApprox(adjustedFresheningSuccessChance("rabbit", 0.06), 0.66);
assert.equal(adjustedFresheningSuccessChance("mouse", 0.15), 0.9);
assert.equal(adjustedFresheningSuccessChance("mouse", 99), 0.9);
assert.equal(fresheningSkillEffectForProgressRows([]).level, 0);
assert.equal(fresheningSkillEffectForProgressRows([]).bonus, 0);
assert.deepEqual(fresheningSkillEffectForProgressRows([{ totalProgress: 8 }]), {
  totalProgress: 8,
  level: 2,
  bonus: 0.06,
});
assert.deepEqual(fresheningSkillEffectForProgressRows([{ totalProgress: 60 }, { totalProgress: 20 }]), {
  totalProgress: 80,
  level: 5,
  bonus: 0.15,
});

assert.equal(fresheningSucceeds("mouse", 0.79), true);
assert.equal(fresheningSucceeds("mouse", 0.8), false);
assert.equal(fresheningSucceeds("rabbit", 0.65, 0.06), true);
assert.equal(fresheningSucceeds("rabbit", 0.66, 0.06), false);
assert.equal(fresheningSucceeds("mouse", 0.89, 0.15), true);
assert.equal(fresheningSucceeds("mouse", 0.9, 0.15), false);
assert.equal(fresheningSucceeds("owl", 0.49), true);
assert.equal(fresheningSucceeds("owl", 0.5), false);
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
assert.equal(retryOptions.reply_markup.inline_keyboard[0][0].text, "🔥🥩 Підсмажити м’ясо");
assert.equal(retryOptions.reply_markup.inline_keyboard[0][1].callback_data, "inventory:cook:all");
assert.equal(retryOptions.reply_markup.inline_keyboard[0][1].text, "🔥🥩 Посмажити все");
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
    maxQueuedActions: MAX_QUEUED_ACTIONS_PER_ACTOR,
  }),
  {
    count: 7,
    rawMeatAmount: 20,
    activeActionCount: 10,
    activeCookActionCount: 3,
    availableSlots: 7,
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
