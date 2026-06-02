const assert = require("node:assert/strict");

require("ts-node/register");

const { EMPTY_KEYBOARD_BUTTON, buildAdminCreaturesReplyKeyboard, buildAdminFireReplyKeyboard, buildAdminItemsReplyKeyboard, buildAdminMenuReplyKeyboard, buildAdminResourcesReplyKeyboard, buildMainReplyKeyboard, buildTutorialSecondStepReplyKeyboard, buildTutorialStartReplyKeyboard, mainStatusLabelForPlayer, postureActionLabelsForState, shouldShowInventoryButton, shouldUseFocusedTutorialReplyKeyboard } = require("../../src/ui/replyKeyboard");
const { buildCharacterAutoKeyboard } = require("../../src/handlers/player");
const { TUTORIAL_REST_LOCATION_KEY, TUTORIAL_SECOND_STEP_LOCATION_KEY, TUTORIAL_START_LOCATION_KEY } = require("../../src/services/tutorial");
const { formatFatigueText, formatObservedPostureText, formatPostureText, formatVitalsSentence } = require("../../src/utils/playerText");
const { AUTO_DREAM_BLOCK_MESSAGE, isAutoBlockedInLocation, shouldAutoStandBeforeAction } = require("../../src/handlers/auto");
const { playerLieObserverText, playerRestStartObserverText, playerRestStopObserverText, playerSitObserverText, playerSleepObserverText, playerStandObserverText, playerTutorialSleepObserverText, playerTutorialWakeObserverText, playerWakeObserverText } = require("../../src/services/playerVisibility");
const { activePlayerRestActionWhere } = require("../../src/services/posture");
const {
  assertCanPerformPhysicalAction,
  isPlayerMustStandError,
  lyingActionBlockMessage,
  sittingActionBlockMessage,
} = require("../../src/services/postureRules");

assert.equal(formatPostureText({ posture: "STANDING", isResting: false }), "Ви стоїте.");
assert.equal(formatPostureText({ posture: "SITTING", isResting: false }), "Ви сидите.");
assert.equal(formatPostureText({ posture: "LYING", isResting: false }), "Ви лежите.");
assert.equal(formatPostureText({ posture: "SITTING", isResting: true }), "Ви сидите й відпочиваєте.");
assert.equal(formatPostureText({ posture: "LYING", sleepState: "ORDINARY_SLEEP", isResting: false }), "Ви спите.");
assert.equal(formatPostureText({ posture: "SITTING", isResting: true, isSleeping: true }), "Ви спите. Уві сні ви сидите й відпочиваєте.");
assert.equal(formatPostureText({ posture: "LYING", isResting: false, isSleeping: true }), "Ви спите. Уві сні ви лежите.");
assert.equal(formatPostureText({ posture: "STANDING", isResting: false, isSleeping: true }), "Ви спите. Уві сні ви стоїте.");
assert.equal(formatVitalsSentence({ hp: 20, hpMax: 20, stamina: 193, staminaMax: 42 }, { hpFallback: 20, staminaFallback: 42 }), "Життя: повно. Снага: екстра.");
assert.equal(formatVitalsSentence({ hp: 20, hpMax: 20, stamina: 193, staminaMax: 42 }, { showTechnicalDetails: true, hpFallback: 20, staminaFallback: 42 }), "Життя: 20/20. Снага: 193/42.");
assert.equal(formatFatigueText({ stamina: 0, staminaMax: 42, fatigueState: "RESTED" }), "Втомлений");
assert.equal(formatFatigueText({ stamina: -126, staminaMax: 42, fatigueState: "RESTED" }), "Дуже втомлений");
assert.equal(formatFatigueText({ stamina: 10, staminaMax: 42, fatigueState: "RESTED" }), "Відпочивший");
assert.equal(formatFatigueText({ isResting: true, stamina: 0, staminaMax: 42, fatigueState: "RESTED" }), "Відпочиває");

assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: false }), "Сидить.");
assert.equal(formatObservedPostureText({ posture: "LYING", isResting: false }), "Лежить.");
assert.equal(formatObservedPostureText({ posture: "LYING", sleepState: "ORDINARY_SLEEP", isResting: false }), "Спить.");
assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: true }), "Сидить і відпочиває.");
assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: true, grammaticalGender: "PLURAL" }), "Сидять і відпочивають.");
assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: true, isSleeping: true }), "Спить. Уві сні сидить і відпочиває.");
assert.equal(mainStatusLabelForPlayer({ id: 1, currentLocation: { key: TUTORIAL_REST_LOCATION_KEY, z: -13, region: { key: "dream_tutorial" } }, hp: 42, hpMax: 42, stamina: 42, staminaMax: 42 }), "❤️ повно · ⚡ повно");
assert.equal(mainStatusLabelForPlayer({ id: 1, currentLocation: { key: TUTORIAL_REST_LOCATION_KEY, z: -13, region: { key: "dream_tutorial" } }, hp: 42, hpMax: 42, stamina: 10, staminaMax: 42 }), "❤️ повно · ⚡ мало");
assert.equal(mainStatusLabelForPlayer({ id: 1, currentLocation: { key: TUTORIAL_START_LOCATION_KEY, z: -13, region: { key: "dream_tutorial" } }, hp: 42, hpMax: 42, stamina: 42, staminaMax: 42 }), undefined);
assert.equal(mainStatusLabelForPlayer({ id: 1, currentLocation: { key: TUTORIAL_START_LOCATION_KEY, z: -13, region: { key: "dream_tutorial" } }, hp: 42, hpMax: 42, stamina: 20, staminaMax: 42 }, { hasRestLesson: true }), "❤️ повно · ⚡ середньо");
assert.equal(playerSitObserverText({ id: 1, nameNominative: "Орина", grammaticalGender: "FEMININE" }), "Орина сідає.");
assert.equal(playerLieObserverText({ id: 1, nameNominative: "Орина", grammaticalGender: "FEMININE" }), "Орина лягає.");
assert.equal(playerStandObserverText({ id: 1, nameNominative: "Вербові", grammaticalGender: "PLURAL" }), "Вербові встають.");
assert.equal(playerSleepObserverText({ id: 1, nameNominative: "Травник", grammaticalGender: "MASCULINE" }), "Травник лягає й засинає.");
assert.equal(playerWakeObserverText({ id: 1, nameNominative: "Вербові", grammaticalGender: "PLURAL" }), "Вербові прокидаються, але ще лежать.");
assert.equal(playerRestStartObserverText({ id: 1, nameNominative: "Травник", grammaticalGender: "MASCULINE" }), "Травник сідає й починає відпочивати.");
assert.equal(playerRestStopObserverText({ id: 1, nameNominative: "Вербові", grammaticalGender: "PLURAL" }), "Вербові закінчують відпочинок і лишаються сидіти.");
assert.equal(playerTutorialSleepObserverText({ id: 1, nameNominative: "Орина", grammaticalGender: "FEMININE" }), "Орина заплющує очі й провалюється в навчальний сон.");
assert.equal(playerTutorialWakeObserverText({ id: 1, nameNominative: "Вербові", grammaticalGender: "PLURAL" }), "Вербові повертаються зі сну й розплющують очі.");

assert.deepEqual(postureActionLabelsForState({ posture: "STANDING", isResting: false }), ["Сісти", "🧘 Відпочити"]);
assert.deepEqual(postureActionLabelsForState({ posture: "SITTING", isResting: false }), ["Встати", "🧘 Відпочити"]);
assert.deepEqual(postureActionLabelsForState({ posture: "LYING", isResting: false }), ["Сісти", "Встати"]);
assert.deepEqual(postureActionLabelsForState({ posture: "LYING", sleepState: "ORDINARY_SLEEP", isResting: false }), ["Прокинутися"]);
assert.deepEqual(postureActionLabelsForState({ posture: "SITTING", isResting: true }), ["Встати"]);

// Rest completion and rest interruption both clear isResting but leave posture sitting.
assert.deepEqual(postureActionLabelsForState({ posture: "SITTING", isResting: false }), ["Встати", "🧘 Відпочити"]);
assert.equal(shouldAutoStandBeforeAction({ posture: "SITTING", isResting: false }, "move"), true);
assert.equal(shouldAutoStandBeforeAction({ posture: "LYING", isResting: false }, "move"), true);
assert.equal(shouldAutoStandBeforeAction({ posture: "LYING", sleepState: "ORDINARY_SLEEP", isResting: false }, "move"), false);
assert.equal(shouldAutoStandBeforeAction({ posture: "SITTING", isResting: false }, "gather"), true);
assert.equal(shouldAutoStandBeforeAction({ posture: "SITTING", isResting: false }, "look"), false);
assert.equal(shouldAutoStandBeforeAction({ posture: "STANDING", isResting: false }, "move"), false);
assert.doesNotThrow(() => assertCanPerformPhysicalAction({ posture: "STANDING", isResting: false }, "MOVE"));
assert.throws(
  () => assertCanPerformPhysicalAction({ posture: "LYING", isResting: false }, "MOVE"),
  (error) => isPlayerMustStandError(error) && error.recoveryAction === "stand" && /лежите/.test(error.message),
);
assert.throws(
  () => assertCanPerformPhysicalAction({ posture: "LYING", sleepState: "ORDINARY_SLEEP", isResting: false }, "MOVE"),
  (error) => isPlayerMustStandError(error) && error.recoveryAction === "wake" && /прокинутися/.test(error.message),
);
assert.equal(sittingActionBlockMessage("BUILD_CAMPFIRE"), "Ви не можете поратися з вогнем, поки сидите. Вам треба встати.");
assert.equal(lyingActionBlockMessage("BUILD_CAMPFIRE"), "Ви не можете поратися з вогнем, поки лежите. Вам треба встати.");
assert.equal(sittingActionBlockMessage("PICK_UP"), "Ви не можете взяти це, поки сидите. Вам треба встати.");
assert.equal(lyingActionBlockMessage("PICK_UP"), "Ви не можете взяти це, поки лежите. Вам треба встати.");
assert.deepEqual(activePlayerRestActionWhere(42), {
  actorType: "PLAYER",
  playerId: 42,
  type: "REST",
  status: { in: ["QUEUED", "RUNNING"] },
});
assert.equal(isAutoBlockedInLocation({ key: TUTORIAL_START_LOCATION_KEY, z: -13, region: { key: "dream_tutorial" } }), true);
assert.equal(isAutoBlockedInLocation({ key: "shallow_cave", z: -1, region: { key: "borderland" } }), false);
assert.equal(isAutoBlockedInLocation({ key: "deep_dream", z: -10, region: { key: "dreams" } }), true);
assert.equal(isAutoBlockedInLocation({ key: "start_border_camp", z: 0, region: { key: "borderland" } }), false);
assert.match(AUTO_DREAM_BLOCK_MESSAGE, /Сон/);
assert.match(AUTO_DREAM_BLOCK_MESSAGE, /Авто/);
assert.match(AUTO_DREAM_BLOCK_MESSAGE, /<blockquote>/);
assert.equal(AUTO_DREAM_BLOCK_MESSAGE.includes("«"), false);

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

const verticalButtons = buildMainReplyKeyboard({
  exits: ["UP", "DOWN"],
  showUtilityActions: false,
}).keyboard.map((row) => row.map((button) => button.text));
assert.equal(verticalButtons[0][1], "⬆️ Вгору");
assert.equal(verticalButtons[2][1], "⬇️ Вниз");

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

const adminMainButtons = buildMainReplyKeyboard({ showAdminMenu: true }).keyboard.map((row) => row.map((button) => button.text));
assert.equal(adminMainButtons.flat().includes("🛠 Адмін меню"), true);
assert.equal(adminMainButtons.flat().includes("🧭 Допомога"), false);

const adminMenuButtons = buildAdminMenuReplyKeyboard().keyboard.map((row) => row.map((button) => button.text));
assert.equal(adminMenuButtons.flat().includes("📊 Статистика"), true);
assert.equal(adminMenuButtons.flat().includes("🌲 Світ"), true);
assert.equal(adminMenuButtons.flat().includes("🌒 Час світу"), true);
assert.equal(adminMenuButtons.flat().includes("👥 Усі"), true);
assert.equal(adminMenuButtons.flat().includes("🧭 Телепорт"), true);
assert.equal(adminMenuButtons.flat().includes("✨ Відновити снагу"), true);
assert.equal(adminMenuButtons.flat().includes("🌿 Ресурси"), true);
assert.equal(adminMenuButtons.flat().includes("🎒 Речі"), true);
assert.equal(adminMenuButtons.flat().includes("🐾 Істоти"), true);
assert.equal(adminMenuButtons.flat().includes("🔥 Вогонь"), true);
assert.equal(adminMenuButtons.flat().includes("🔧 Технічні деталі"), true);

const characterButtons = buildCharacterAutoKeyboard(false, {
  posture: "STANDING",
  isResting: false,
  showSleep: true,
}).inline_keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(characterButtons, [
  ["🎒 Речі"],
  ["✨ Сигнали"],
  ["Сісти", "🧘 Відпочити"],
  ["Лягти", "🌙 Сон"],
  ["🤖 Увімкнути авто"],
]);
assert.equal(characterButtons.flat().includes("🔧 Технічні деталі"), false);

const sittingCharacterButtons = buildCharacterAutoKeyboard(false, {
  posture: "SITTING",
  isResting: false,
  showSleep: true,
}).inline_keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(sittingCharacterButtons, [
  ["🎒 Речі"],
  ["✨ Сигнали"],
  ["Встати", "🧘 Відпочити"],
  ["Лягти", "🌙 Сон"],
  ["🤖 Увімкнути авто"],
]);

const lyingCharacterButtons = buildCharacterAutoKeyboard(false, {
  posture: "LYING",
  isResting: false,
  showSleep: true,
}).inline_keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(lyingCharacterButtons, [
  ["🎒 Речі"],
  ["✨ Сигнали"],
  ["Встати", "🧘 Відпочити"],
  ["Сісти", "🌙 Сон"],
  ["🤖 Увімкнути авто"],
]);

const sleepingCharacterButtons = buildCharacterAutoKeyboard(false, {
  posture: "LYING",
  sleepState: "ORDINARY_SLEEP",
  isResting: false,
  showSleep: true,
}).inline_keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(sleepingCharacterButtons, [
  ["🎒 Речі"],
  ["Прокинутися"],
]);

const adminResourceButtons = buildAdminResourcesReplyKeyboard().keyboard.flat().map((button) => button.text);
assert.equal(adminResourceButtons.includes("🍓 Додати ягоди"), true);
assert.equal(adminResourceButtons.includes("🌿 Ключі ресурсів"), true);

const adminCreaturesButtons = buildAdminCreaturesReplyKeyboard().keyboard.flat().map((button) => button.text);
assert.equal(adminCreaturesButtons.includes("🐾 Ключі істот"), true);
assert.equal(adminCreaturesButtons.includes("🦴 Додати трупи"), true);

const adminFireButtons = buildAdminFireReplyKeyboard().keyboard.flat().map((button) => button.text);
assert.equal(adminFireButtons.includes("🔥 Додати вогнище"), true);
assert.equal(adminFireButtons.includes("🔥 Debug-вогнище"), true);
assert.equal(adminFireButtons.includes("🕯 Додати факел"), true);
assert.equal(adminFireButtons.includes("🔥🕯 Додати запалений факел"), true);
assert.equal(adminFireButtons.includes("🪵 Додати хмиз"), true);

const adminItemsButtons = buildAdminItemsReplyKeyboard().keyboard.flat().map((button) => button.text);
assert.equal(adminItemsButtons.includes("🍓 Додати ягоди в речі"), true);
assert.equal(adminItemsButtons.includes("🔥🕯 Додати запалений факел"), true);
assert.equal(adminItemsButtons.includes("🕯 Додати притушений факел"), true);
assert.equal(adminItemsButtons.includes("🥩 Додати сире м'ясо"), true);
assert.equal(adminItemsButtons.includes("🪓 Додати сокиру"), true);
assert.equal(adminItemsButtons.includes("🗡 Додати меч"), true);
assert.equal(adminItemsButtons.includes("➕ Додати річ"), true);

const replyKeyboardLabels = [
  ...adminMainButtons.flat(),
  ...adminMenuButtons.flat(),
  ...adminResourceButtons,
  ...adminCreaturesButtons,
  ...adminFireButtons,
  ...adminItemsButtons,
];
for (const label of replyKeyboardLabels) {
  assert.doesNotMatch(label, /\(\/[A-Za-z]/, `Reply keyboard labels should not include slash-command hints: ${label}`);
}

console.log("Posture helpers OK");
