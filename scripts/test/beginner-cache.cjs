const assert = require("node:assert/strict");

require("ts-node/register");

const {
  beginnerCacheDataAfterHiddenRestock,
  beginnerCacheDataAfterObservation,
  beginnerCacheContributeAllButtonLabel,
  beginnerCacheResourceKeyFromText,
  beginnerCacheStock,
  beginnerCacheStockLines,
  beginnerCacheTakeKeys,
  isBeginnerCacheData,
} = require("../../src/services/beginnerCache");
const { planBeginnerCacheContributeAll } = require("../../src/services/beginnerCacheQueue");

const base = {
  beginner_cache: true,
  cache_stock: { berries: 1, herbs: 0, mushrooms: 0, raw_meat: 1, cooked_meat: 0, twigs: 1 },
  cache_max_stock: { berries: 10, herbs: 6, mushrooms: 6, raw_meat: 8, cooked_meat: 5, twigs: 14 },
  cache_restock_target: { berries: 4, herbs: 2, mushrooms: 2, raw_meat: 4, cooked_meat: 2, twigs: 8 },
  cache_restock_after_ms: 1000,
};

assert.equal(isBeginnerCacheData(base), true);
assert.equal(isBeginnerCacheData({}), false);
assert.equal(beginnerCacheResourceKeyFromText("torch"), null);
assert.equal(beginnerCacheResourceKeyFromText("berries"), "berries");
assert.equal(beginnerCacheResourceKeyFromText("raw meat"), "raw_meat");
assert.equal(beginnerCacheResourceKeyFromText("смажене м'ясо"), "cooked_meat");

assert.deepEqual(beginnerCacheTakeKeys(base), ["berries", "raw_meat", "twigs"]);
assert.equal(beginnerCacheContributeAllButtonLabel("herbs"), "🤲 Лишити всі лікарські трави");
assert.equal(beginnerCacheContributeAllButtonLabel("twigs"), "🤲 Лишити весь хмиз");
assert.equal(beginnerCacheContributeAllButtonLabel("raw_meat"), "🤲 Лишити все сире м'ясо");
assert.ok(beginnerCacheStockLines(base).some((line) => line.includes("berries") || line.includes("ягоди")));
assert.ok(beginnerCacheStockLines(base).some((line) => line.includes("сире м'ясо")));

assert.deepEqual(
  planBeginnerCacheContributeAll({
    carriedAmount: 8,
    requestedAmount: 2,
    stock: 0,
    maxStock: 10,
    activeActionCount: 0,
    activeContributionCount: 0,
    maxQueuedActions: 6,
  }),
  {
    count: 2,
    carriedAmount: 8,
    activeActionCount: 0,
    activeContributionCount: 0,
    availableSlots: 6,
    alreadyPlanned: 0,
    unplannedCarried: 2,
    freeCapacity: 10,
    limitedByQueue: false,
    limitedByCapacity: false,
  },
);

assert.deepEqual(
  planBeginnerCacheContributeAll({
    carriedAmount: 8,
    stock: 2,
    maxStock: 6,
    activeActionCount: 1,
    activeContributionCount: 1,
    maxQueuedActions: 6,
  }),
  {
    count: 3,
    carriedAmount: 8,
    activeActionCount: 1,
    activeContributionCount: 1,
    availableSlots: 5,
    alreadyPlanned: 1,
    unplannedCarried: 7,
    freeCapacity: 3,
    limitedByQueue: false,
    limitedByCapacity: true,
  },
);

const now = new Date("2026-06-01T12:00:00.000Z");
const recentlyObserved = beginnerCacheDataAfterHiddenRestock(
  { ...base, cache_last_observed_at: "2026-06-01T11:59:59.500Z" },
  now,
);
assert.deepEqual(beginnerCacheStock(recentlyObserved), beginnerCacheStock(base), "Recently observed cache should not restock");

const restocked = beginnerCacheDataAfterHiddenRestock(
  { ...base, cache_last_observed_at: "2026-06-01T11:00:00.000Z", cache_last_restocked_at: "2026-06-01T11:00:00.000Z" },
  now,
);
assert.deepEqual(beginnerCacheStock(restocked), { berries: 4, herbs: 2, mushrooms: 2, raw_meat: 4, cooked_meat: 2, twigs: 8 });
assert.equal(restocked.cache_last_restocked_at, now.toISOString());

const observed = beginnerCacheDataAfterObservation(base, now);
assert.equal(observed.cache_last_observed_at, now.toISOString());

console.log("beginner-cache tests passed");
