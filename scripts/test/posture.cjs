const assert = require("node:assert/strict");

require("ts-node/register");

const { EMPTY_KEYBOARD_BUTTON, buildMainReplyKeyboard, buildTutorialSecondStepReplyKeyboard, buildTutorialStartReplyKeyboard, postureActionLabelsForState, shouldShowInventoryButton, shouldUseFocusedTutorialReplyKeyboard } = require("../../src/ui/replyKeyboard");
const { TUTORIAL_SECOND_STEP_LOCATION_KEY, TUTORIAL_START_LOCATION_KEY } = require("../../src/services/tutorial");
const { formatObservedPostureText, formatPostureText } = require("../../src/utils/playerText");
const { AUTO_DREAM_BLOCK_MESSAGE, isAutoBlockedInLocation, shouldAutoStandBeforeAction } = require("../../src/handlers/auto");

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
assert.equal(shouldAutoStandBeforeAction({ posture: "SITTING", isResting: false }, "move"), true);
assert.equal(shouldAutoStandBeforeAction({ posture: "SITTING", isResting: false }, "gather"), true);
assert.equal(shouldAutoStandBeforeAction({ posture: "SITTING", isResting: false }, "look"), false);
assert.equal(shouldAutoStandBeforeAction({ posture: "STANDING", isResting: false }, "move"), false);
assert.equal(isAutoBlockedInLocation({ key: TUTORIAL_START_LOCATION_KEY, z: -13, region: { key: "dream_tutorial" } }), true);
assert.equal(isAutoBlockedInLocation({ key: "future_dream", z: -1, region: { key: "dreams" } }), true);
assert.equal(isAutoBlockedInLocation({ key: "start_border_camp", z: 0, region: { key: "borderland" } }), false);
assert.match(AUTO_DREAM_BLOCK_MESSAGE, /Сон/);
assert.match(AUTO_DREAM_BLOCK_MESSAGE, /Авто/);

assert.equal(shouldShowInventoryButton({ inventoryCount: 0, isTutorialDream: true, tutorialInventoryAvailable: false }), false);
assert.equal(shouldShowInventoryButton({ inventoryCount: 1, isTutorialDream: true, tutorialInventoryAvailable: false }), true);
assert.equal(shouldShowInventoryButton({ inventoryCount: 0, isTutorialDream: true, tutorialInventoryAvailable: true }), true);
assert.equal(shouldShowInventoryButton({ inventoryCount: 0, isTutorialDream: false, tutorialInventoryAvailable: true }), false);

const tutorialStartButtons = buildTutorialStartReplyKeyboard().keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(tutorialStartButtons, [
  ["👀 Озирнутися", EMPTY_KEYBOARD_BUTTON, EMPTY_KEYBOARD_BUTTON],
  [EMPTY_KEYBOARD_BUTTON, EMPTY_KEYBOARD_BUTTON, EMPTY_KEYBOARD_BUTTON],
  [EMPTY_KEYBOARD_BUTTON, "⬇️ Південь", EMPTY_KEYBOARD_BUTTON],
]);
assert.equal(tutorialStartButtons.flat().includes("🌅 Прокинутися"), false);

const tutorialSecondStepButtons = buildTutorialSecondStepReplyKeyboard().keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(tutorialSecondStepButtons, [
  ["👀 Озирнутися", "⬆️ Північ", EMPTY_KEYBOARD_BUTTON],
  [EMPTY_KEYBOARD_BUTTON, EMPTY_KEYBOARD_BUTTON, EMPTY_KEYBOARD_BUTTON],
  [EMPTY_KEYBOARD_BUTTON, "⬇️ Південь", EMPTY_KEYBOARD_BUTTON],
]);
assert.equal(tutorialSecondStepButtons.flat().includes("🎒 Речі"), false);
assert.equal(tutorialSecondStepButtons.flat().includes("🔎 Роздивитися"), false);
assert.equal(tutorialSecondStepButtons.flat().includes("🧭 Допомога"), false);
assert.equal(tutorialSecondStepButtons.flat().includes("☰ Меню"), false);
assert.equal(tutorialSecondStepButtons.flat().includes("🌅 Прокинутися"), false);
assert.equal(shouldUseFocusedTutorialReplyKeyboard(TUTORIAL_START_LOCATION_KEY, 0), true);
assert.equal(shouldUseFocusedTutorialReplyKeyboard(TUTORIAL_START_LOCATION_KEY, 1), false);
assert.equal(shouldUseFocusedTutorialReplyKeyboard(TUTORIAL_SECOND_STEP_LOCATION_KEY, 1), true);
assert.equal(shouldUseFocusedTutorialReplyKeyboard(TUTORIAL_SECOND_STEP_LOCATION_KEY, 2), false);

const earlyDreamButtons = buildMainReplyKeyboard({
  exits: ["NORTH", "SOUTH"],
  isTutorialDream: true,
  canExamine: false,
  showUtilityActions: false,
}).keyboard.map((row) => row.map((button) => button.text));
assert.equal(earlyDreamButtons.flat().includes("🔎 Роздивитися"), false);
assert.equal(earlyDreamButtons.flat().includes("🧭 Допомога"), false);
assert.equal(earlyDreamButtons.flat().includes("☰ Меню"), false);
assert.equal(earlyDreamButtons[0][2], EMPTY_KEYBOARD_BUTTON);
assert.equal(earlyDreamButtons[2][0], EMPTY_KEYBOARD_BUTTON);
assert.equal(earlyDreamButtons[2][2], EMPTY_KEYBOARD_BUTTON);
assert.equal(earlyDreamButtons.some((row) => row.some((label) => label.includes("❤"))), false);

const lessonDreamButtons = buildMainReplyKeyboard({
  exits: ["NORTH", "SOUTH"],
  isTutorialDream: true,
  canExamine: true,
  showUtilityActions: false,
  statusLabel: "❤️ добре · ⚡ рівно",
  hasInventory: true,
}).keyboard.map((row) => row.map((button) => button.text));
assert.equal(lessonDreamButtons.flat().includes("🔎 Роздивитися"), true);
assert.equal(lessonDreamButtons.flat().includes("🎒 Речі"), true);
assert.equal(lessonDreamButtons.flat().includes("❤️ добре · ⚡ рівно"), true);
assert.equal(lessonDreamButtons.flat().includes("🧭 Допомога"), false);
assert.equal(lessonDreamButtons.flat().includes("☰ Меню"), false);
assert.equal(lessonDreamButtons.flat().includes("🌅 Прокинутися"), false);

const tutorialGateButtons = buildMainReplyKeyboard({
  exits: ["NORTH", "SOUTH"],
  lockedExits: ["SOUTH"],
  isTutorialDream: true,
  showUtilityActions: false,
}).keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(tutorialGateButtons, [
  ["👀 Озирнутися", "⬆️ Північ", "🔎 Роздивитися"],
  [EMPTY_KEYBOARD_BUTTON, EMPTY_KEYBOARD_BUTTON, EMPTY_KEYBOARD_BUTTON],
  [EMPTY_KEYBOARD_BUTTON, "(⬇️ Південь)", EMPTY_KEYBOARD_BUTTON],
]);
assert.equal(tutorialGateButtons.flat().includes("💬 Сказати «Відчинитися»"), false);
assert.equal(tutorialGateButtons.flat().includes("🧭 Допомога"), false);
assert.equal(tutorialGateButtons.flat().includes("☰ Меню"), false);
assert.equal(tutorialGateButtons.flat().includes("❤️ добре · ⚡ повна"), false);

const tutorialRestButtons = buildMainReplyKeyboard({
  exits: ["WEST", "EAST"],
  isTutorialDream: true,
  showUtilityActions: false,
  statusLabel: "❤️ добре · ⚡ повна",
}).keyboard.map((row) => row.map((button) => button.text));
assert.equal(tutorialRestButtons.flat().includes("❤️ добре · ⚡ повна"), true);

console.log("Posture helpers OK");
