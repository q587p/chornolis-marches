const assert = require("node:assert/strict");

require("ts-node/register");

const { TREE_SHAKE_DEFAULT_COOLDOWN_MS, treeShakeAmount } = require("../../src/services/locations");

assert.equal(treeShakeAmount(5, 8, () => 0), 5);
assert.equal(treeShakeAmount(5, 8, () => 0.24), 5);
assert.equal(treeShakeAmount(5, 8, () => 0.25), 6);
assert.equal(treeShakeAmount(5, 8, () => 0.999), 8);
assert.equal(treeShakeAmount(8, 5, () => 0), 8);
assert.ok(TREE_SHAKE_DEFAULT_COOLDOWN_MS >= 60 * 60 * 1000, "tree shake cooldown should be measured in real hours by default");

console.log("Tree features OK");
