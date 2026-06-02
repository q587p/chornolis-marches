const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const {
  beginnerCacheContributeAllButtonLabel,
  beginnerCacheContributeButtonLabel,
  beginnerCacheDataAfterHiddenRestock,
  beginnerCacheMoneyStock,
  beginnerCacheMoneyStockLines,
  beginnerCacheStock,
  beginnerCacheTakeButtonLabel,
  beginnerCacheTakeKeys,
} = require("../../src/services/beginnerCache");
const { isPickableResourceKey, isVisibleGroundResource } = require("../../src/services/groundItems");
const {
  gatherShahBonusHits,
  gatherShahChancePermille,
  isWakingWorldLootLocation,
} = require("../../src/services/smallLoot");
const {
  grivnaText,
  playerMoneyText,
  shahText,
} = require("../../src/utils/moneyText");

assert.equal(shahText(1), "1 шаг");
assert.equal(shahText(2), "2 шаги");
assert.equal(shahText(5), "5 шагів");
assert.equal(shahText(21), "21 шаг");
assert.equal(grivnaText(1), "1 ґривня");
assert.equal(grivnaText(2), "2 ґривні");
assert.equal(grivnaText(5), "5 ґривень");
assert.equal(grivnaText(22), "22 ґривні");
assert.equal(playerMoneyText([]), "немає");
assert.equal(
  playerMoneyText([
    { amount: 12, resourceType: { key: "shah" } },
    { amount: 2, resourceType: { key: "grivna" } },
  ]),
  "2 ґривні, 12 шагів",
);

assert.equal(isPickableResourceKey("shah"), true);
assert.equal(isPickableResourceKey("grivna"), true);
assert.equal(isVisibleGroundResource({ amount: 1, resourceType: { key: "shah" } }), true);
assert.equal(isVisibleGroundResource({ amount: 1, resourceType: { key: "grivna" } }), true);
assert.equal(isVisibleGroundResource({ amount: 0, resourceType: { key: "shah" } }), false);

const cache = {
  beginner_cache: true,
  cache_stock: { berries: 1, herbs: 0, mushrooms: 0, raw_meat: 1, cooked_meat: 0, twigs: 1 },
  cache_max_stock: { berries: 10, herbs: 6, mushrooms: 6, raw_meat: 8, cooked_meat: 5, twigs: 14 },
  cache_restock_target: { berries: 4, herbs: 2, mushrooms: 2, raw_meat: 4, cooked_meat: 2, twigs: 8 },
  cache_money_stock: { shah: 2, grivna: 1 },
  cache_money_max_stock: { shah: 200, grivna: 20 },
  cache_money_restock_target: { shah: 0, grivna: 0 },
  cache_restock_after_ms: 1000,
  cache_last_observed_at: "2026-06-01T11:00:00.000Z",
  cache_last_restocked_at: "2026-06-01T11:00:00.000Z",
};
assert.deepEqual(beginnerCacheMoneyStock(cache), { shah: 2, grivna: 1 });
assert.deepEqual(beginnerCacheTakeKeys(cache), ["berries", "raw_meat", "twigs", "shah", "grivna"]);
assert.equal(beginnerCacheTakeButtonLabel("shah"), "🪙 Взяти шаг");
assert.equal(beginnerCacheTakeButtonLabel("grivna"), "🪙 Взяти ґривню");
assert.equal(beginnerCacheContributeButtonLabel("shah"), "🪙 Лишити шаг");
assert.equal(beginnerCacheContributeButtonLabel("grivna"), "🪙 Лишити ґривню");
assert.equal(beginnerCacheContributeAllButtonLabel("shah"), "🪙 Лишити всі шаги");
assert.equal(beginnerCacheContributeAllButtonLabel("grivna"), "🪙 Лишити всі ґривні");
assert.ok(beginnerCacheMoneyStockLines(cache).some((line) => line.includes("2 шаги")));
assert.ok(beginnerCacheMoneyStockLines(cache).some((line) => line.includes("1 ґривня")));
const restocked = beginnerCacheDataAfterHiddenRestock(cache, new Date("2026-06-01T12:00:00.000Z"));
assert.deepEqual(beginnerCacheStock(restocked), { berries: 4, herbs: 2, mushrooms: 2, raw_meat: 4, cooked_meat: 2, twigs: 8 });
assert.deepEqual(beginnerCacheMoneyStock(restocked), { shah: 2, grivna: 1 }, "Hidden restock must not create or change money");

assert.equal(gatherShahChancePermille("30"), 30);
assert.equal(gatherShahChancePermille("1001"), 1000);
assert.equal(gatherShahChancePermille("-4"), 0);
assert.equal(gatherShahBonusHits(0, 0), false);
assert.equal(gatherShahBonusHits(1000, 0.999), true);
assert.equal(gatherShahBonusHits(30, 0.029), true);
assert.equal(gatherShahBonusHits(30, 0.03), false);
assert.equal(isWakingWorldLootLocation({ key: "forest_01_01", z: 0 }), true);
assert.equal(isWakingWorldLootLocation({ key: "under_bridge_18_05", z: -1 }), true);
assert.equal(isWakingWorldLootLocation({ key: "dream_tutorial_foraging", z: -13 }), false);
assert.equal(isWakingWorldLootLocation({ key: "dream_gate", z: 0 }), false);

const resourceNodes = JSON.parse(fs.readFileSync(path.join(__dirname, "../../prisma/data/world/resourceNodes.json"), "utf8"));
const starterShahs = resourceNodes.filter((node) => node.resourceKey === "shah");
assert.equal(starterShahs.reduce((sum, node) => sum + node.amount, 0), 6);
assert.equal(starterShahs.some((node) => String(node.locationKey).startsWith("dream_")), false);
assert.equal(resourceNodes.some((node) => node.resourceKey === "grivna"), false, "Starter seed should not place grivna ground loot");

console.log("money-loot tests passed");
