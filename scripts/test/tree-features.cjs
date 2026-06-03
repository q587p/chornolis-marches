const assert = require("node:assert/strict");

require("ts-node/register");

const {
  TREE_SHAKE_DEFAULT_COOLDOWN_MS,
  darkFeatureInspectionText,
  featureBriefInspectionText,
  featureMoveButtonLabel,
  featureMoveButtonLabelForFeature,
  featureMoveDirection,
  featureYellPromptButtonLabel,
  featureYellPromptDirection,
  treeShakeAmount,
} = require("../../src/services/locations");

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

const cellarShelfFeature = {
  type: "LANDMARK",
  name: "Порожня полиця",
  description: "Полиця розказує, де знахарі лишать трави після майбутнього обходу.",
  data: {
    examine_summary: "полиця не дає припасів, але показує місце майбутнього знахарського внеску",
  },
  isActive: true,
};
assert.match(featureBriefInspectionText(cellarShelfFeature), /полиця не дає припасів/);
assert.doesNotMatch(featureBriefInspectionText(cellarShelfFeature, false, {}, false), /полиця не дає припасів/);
assert.match(featureBriefInspectionText(cellarShelfFeature, false, {}, false), /у темряві видно тільки обриси/);

const cellarMapFeature = {
  type: "LANDMARK",
  name: "Обірвана мапа на дошці",
  description: "Мапа не відкриває нової механіки, але натякає на чужі сліди.",
  data: {
    examine_summary: "мапа не відкриває проходів і не веде за руку",
  },
  isActive: true,
};
assert.match(featureBriefInspectionText(cellarMapFeature), /мапа не відкриває/);
assert.doesNotMatch(featureBriefInspectionText(cellarMapFeature, false, {}, false), /мапа не відкриває/);
assert.match(featureBriefInspectionText(cellarMapFeature, false, {}, false), /папір видно, написів — ні/);

const darkInspection = darkFeatureInspectionText(cellarMapFeature);
assert.match(darkInspection, /Без світла/);
assert.doesNotMatch(darkInspection, /Мапа не відкриває/);
assert.doesNotMatch(darkInspection, /мапа не відкриває/);
assert.equal(featureMoveDirection({ data: { vertical_hint: "UP" } }), "UP");
assert.equal(featureMoveButtonLabel("UP"), "⬆️ Вгору");
assert.equal(featureYellPromptDirection({ data: { vertical_hint: "UP" } }), "UP");
assert.equal(featureYellPromptDirection({ data: { vertical_hint: "DOWN" } }), "DOWN");
assert.equal(featureYellPromptButtonLabel("UP"), "🗣 Гукнути вгору");
assert.equal(featureYellPromptButtonLabel("DOWN"), "🗣 Гукнути вниз");
assert.equal(featureMoveButtonLabelForFeature({ data: { vertical_hint: "DOWN", move_label: "Спуститися вниз" } }, "DOWN"), "⬇️ Спуститися вниз");
assert.equal(featureMoveDirection({ data: { vertical_hint: "EAST" } }), null);

console.log("Tree features OK");
