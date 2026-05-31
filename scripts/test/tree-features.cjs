const assert = require("node:assert/strict");

require("ts-node/register");

const { TREE_SHAKE_DEFAULT_COOLDOWN_MS, featureBriefInspectionText, treeShakeAmount } = require("../../src/services/locations");

assert.equal(treeShakeAmount(5, 8, () => 0), 5);
assert.equal(treeShakeAmount(5, 8, () => 0.24), 5);
assert.equal(treeShakeAmount(5, 8, () => 0.25), 6);
assert.equal(treeShakeAmount(5, 8, () => 0.999), 8);
assert.equal(treeShakeAmount(8, 5, () => 0), 8);
assert.ok(TREE_SHAKE_DEFAULT_COOLDOWN_MS >= 60 * 60 * 1000, "tree shake cooldown should be measured in real hours by default");
assert.match(featureBriefInspectionText({
  type: "GATE",
  name: "Зачинені ворота",
  data: {},
  isActive: true,
}), /позначає прохід/);
assert.doesNotMatch(featureBriefInspectionText({
  type: "GATE",
  name: "Зачинені ворота",
  description: "Довгий докладний текст для повного роздивляння.",
  data: {},
  isActive: true,
}), /Довгий докладний текст/);

console.log("Tree features OK");
