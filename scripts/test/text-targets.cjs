const assert = require("node:assert/strict");

require("ts-node/register");

const { visibleTextTargetCreatureWhere } = require("../../src/services/textTargets");
const { isVisibleCorpse } = require("../../src/services/locations");
const { isFreshenedCorpse } = require("../../src/services/meat");
const { normalizeCreatureActionText } = require("../../src/utils/creatureActionText");

const where = visibleTextTargetCreatureWhere(42);
assert.equal(where.locationId, 42);
assert.deepEqual(where.OR, [
  { isAlive: true, isHidden: false },
  { isAlive: false, age: "CORPSE", isHidden: false },
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
assert.equal(normalizeCreatureActionText("freshened_by_player:1; м'ясо=1"), "м’ясо вже знято");
assert.equal(normalizeCreatureActionText("claimed_by_hunter:7; freshened_by_hunter:7"), "м’ясо вже знято");

console.log("Text target visibility OK");
