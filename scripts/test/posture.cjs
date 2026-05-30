const assert = require("node:assert/strict");

require("ts-node/register");

const { EMPTY_KEYBOARD_BUTTON, buildMainReplyKeyboard, buildTutorialSecondStepReplyKeyboard, postureActionLabelsForState, shouldShowInventoryButton } = require("../../src/ui/replyKeyboard");
const { formatObservedPostureText, formatPostureText } = require("../../src/utils/playerText");

assert.equal(formatPostureText({ posture: "STANDING", isResting: false }), "Ви стоїте.");
assert.equal(formatPostureText({ posture: "SITTING", isResting: false }), "Ви сидите.");
assert.equal(formatPostureText({ posture: "SITTING", isResting: true }), "Ви сидите й відпочиваєте.");
assert.equal(formatPostureText({ posture: "SITTING", isResting: true, isSleeping: true }), "Ви спите. Уві сні ви сидите й відпочиваєте.");
assert.equal(formatPostureText({ posture: "STANDING", isResting: false, isSleeping: true }), "Ви спите. Уві сні ви стоїте.");

assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: false }), "Сидить.");
assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: true }), "Сидить і відпочиває.");
assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: true, grammaticalGender: "PLURAL" }), "Сидять і відпочивають.");
assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: true, isSleeping: true }), "Спить. Уві сні сидить і відпочиває.");

assert.deepEqual(postureActionLabelsForState({ posture: "STANDING", isResting: false }), ["Сісти", "🧘 Відпочити"]);
assert.deepEqual(postureActionLabelsForState({ posture: "SITTING", isResting: false }), ["Встати", "🧘 Відпочити"]);
assert.deepEqual(postureActionLabelsForState({ posture: "SITTING", isResting: true }), ["Встати"]);

// Rest completion and rest interruption both clear isResting but leave posture sitting.
assert.deepEqual(postureActionLabelsForState({ posture: "SITTING", isResting: false }), ["Встати", "🧘 Відпочити"]);

assert.equal(shouldShowInventoryButton({ inventoryCount: 0, isTutorialDream: true, tutorialInventoryAvailable: false }), false);
assert.equal(shouldShowInventoryButton({ inventoryCount: 1, isTutorialDream: true, tutorialInventoryAvailable: false }), true);
assert.equal(shouldShowInventoryButton({ inventoryCount: 0, isTutorialDream: true, tutorialInventoryAvailable: true }), true);
assert.equal(shouldShowInventoryButton({ inventoryCount: 0, isTutorialDream: false, tutorialInventoryAvailable: true }), false);

const tutorialSecondStepButtons = buildTutorialSecondStepReplyKeyboard().keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(tutorialSecondStepButtons, [
  ["👀 Озирнутися"],
  ["⬆️ Північ", "⬇️ Південь"],
]);
assert.equal(tutorialSecondStepButtons.flat().includes("🎒 Речі"), false);
assert.equal(tutorialSecondStepButtons.flat().includes("🔎 Роздивитися"), false);
assert.equal(tutorialSecondStepButtons.flat().includes("🧭 Допомога"), false);
assert.equal(tutorialSecondStepButtons.flat().includes("☰ Меню"), false);

const tutorialGateButtons = buildMainReplyKeyboard({
  exits: ["NORTH", "SOUTH"],
  lockedExits: ["SOUTH"],
  isTutorialDream: true,
  canOpenDreamGate: true,
  statusLabel: "❤️ добре · ⚡ повна",
}).keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(tutorialGateButtons, [
  ["👀 Озирнутися", "⬆️ Північ", "🔎 Роздивитися"],
  [EMPTY_KEYBOARD_BUTTON, EMPTY_KEYBOARD_BUTTON, EMPTY_KEYBOARD_BUTTON],
  [EMPTY_KEYBOARD_BUTTON, "(⬇️ Південь)", EMPTY_KEYBOARD_BUTTON],
  ["💬 Сказати «Відчинитися»"],
]);
assert.equal(tutorialGateButtons.flat().includes("🧭 Допомога"), false);
assert.equal(tutorialGateButtons.flat().includes("☰ Меню"), false);
assert.equal(tutorialGateButtons.flat().includes("❤️ добре · ⚡ повна"), false);

const tutorialRestButtons = buildMainReplyKeyboard({
  exits: ["WEST", "EAST"],
  isTutorialDream: true,
  showTutorialStatus: true,
  statusLabel: "❤️ добре · ⚡ повна",
}).keyboard.map((row) => row.map((button) => button.text));
assert.equal(tutorialRestButtons.flat().includes("❤️ добре · ⚡ повна"), true);

console.log("Posture helpers OK");
