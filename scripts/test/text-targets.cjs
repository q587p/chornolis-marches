const assert = require("node:assert/strict");

require("ts-node/register");

const { targetDisplayLabel, visibleTextTargetCreatureWhere } = require("../../src/services/textTargets");
const { isVisibleCorpse } = require("../../src/services/locations");
const { isFreshenedCorpse } = require("../../src/services/meat");

const where = visibleTextTargetCreatureWhere(42);
assert.equal(where.locationId, 42);
assert.deepEqual(where.OR, [
  { isAlive: true, isHidden: false },
  {
    isAlive: false,
    age: "CORPSE",
    isHidden: false,
    NOT: [
      { currentAction: { startsWith: "freshened_by_player:" } },
      { currentAction: { contains: "; freshened_by_player:" } },
      { currentAction: { startsWith: "freshened_by_hunter:" } },
      { currentAction: { contains: "; freshened_by_hunter:" } },
    ],
  },
]);

const visibleCorpse = { isAlive: false, isGone: false, isHidden: false, age: "CORPSE" };
const hiddenClaimedCorpse = {
  ...visibleCorpse,
  isHidden: true,
  currentAction: "claimed_by_hunter:7; freshened_by_hunter:7",
};

assert.equal(isVisibleCorpse(visibleCorpse), true);
assert.equal(isVisibleCorpse(hiddenClaimedCorpse), false);
assert.equal(isVisibleCorpse({ ...visibleCorpse, isGone: true }), false);
assert.equal(isFreshenedCorpse("freshened_by_player:1; м'ясо=1"), true);
assert.equal(isFreshenedCorpse("claimed_by_hunter:7; freshened_by_hunter:7"), true);
assert.equal(isVisibleCorpse({ ...visibleCorpse, currentAction: "freshened_by_player:1; м'ясо=1" }), false);
assert.equal(targetDisplayLabel({
  type: "creature",
  id: 1,
  label: "труп самиці миші",
  actionLabel: "розкладається; залишилось 92 тіків",
  canGreet: false,
  isCorpse: true,
  searchKeys: [],
}), "труп самиці миші");
assert.equal(targetDisplayLabel({
  type: "creature",
  id: 2,
  label: "миша",
  actionLabel: "ворушиться в траві",
  canGreet: false,
  searchKeys: [],
}), "миша — ворушиться в траві");

console.log("Text target visibility OK");
