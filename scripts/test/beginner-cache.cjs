const assert = require("node:assert/strict");

require("ts-node/register");

const {
  beginnerCacheDataAfterHiddenRestock,
  beginnerCacheDataAfterObservation,
  beginnerCacheResourceKeyFromText,
  beginnerCacheStock,
  beginnerCacheStockLines,
  beginnerCacheTakeKeys,
  isBeginnerCacheData,
} = require("../../src/services/beginnerCache");

const base = {
  beginner_cache: true,
  cache_stock: { torch: 0, berries: 1, herbs: 0, mushrooms: 0, raw_meat: 1, cooked_meat: 0, twigs: 1 },
  cache_max_stock: { torch: 3, berries: 6, herbs: 4, mushrooms: 4, raw_meat: 3, cooked_meat: 3, twigs: 10 },
  cache_restock_target: { torch: 2, berries: 3, herbs: 1, mushrooms: 1, raw_meat: 1, cooked_meat: 1, twigs: 5 },
  cache_restock_after_ms: 1000,
};

assert.equal(isBeginnerCacheData(base), true);
assert.equal(isBeginnerCacheData({}), false);
assert.equal(beginnerCacheResourceKeyFromText("torch"), "torch");
assert.equal(beginnerCacheResourceKeyFromText("berries"), "berries");
assert.equal(beginnerCacheResourceKeyFromText("raw meat"), "raw_meat");
assert.equal(beginnerCacheResourceKeyFromText("смажене м'ясо"), "cooked_meat");

assert.deepEqual(beginnerCacheTakeKeys(base), ["berries", "raw_meat", "twigs"]);
assert.ok(beginnerCacheStockLines(base).some((line) => line.includes("berries") || line.includes("ягоди")));
assert.ok(beginnerCacheStockLines(base).some((line) => line.includes("сире м'ясо")));

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
assert.deepEqual(beginnerCacheStock(restocked), { torch: 2, berries: 3, herbs: 1, mushrooms: 1, raw_meat: 1, cooked_meat: 1, twigs: 5 });
assert.equal(restocked.cache_last_restocked_at, now.toISOString());

const observed = beginnerCacheDataAfterObservation(base, now);
assert.equal(observed.cache_last_observed_at, now.toISOString());

console.log("beginner-cache tests passed");
