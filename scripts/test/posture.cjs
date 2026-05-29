const assert = require("node:assert/strict");

require("ts-node/register");

const { postureActionLabelsForState } = require("../../src/ui/replyKeyboard");
const { formatObservedPostureText, formatPostureText } = require("../../src/utils/playerText");

assert.equal(formatPostureText({ posture: "STANDING", isResting: false }), "Ви стоїте.");
assert.equal(formatPostureText({ posture: "SITTING", isResting: false }), "Ви сидите.");
assert.equal(formatPostureText({ posture: "SITTING", isResting: true }), "Ви сидите й відпочиваєте.");

assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: false }), "Сидить.");
assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: true }), "Сидить і відпочиває.");
assert.equal(formatObservedPostureText({ posture: "SITTING", isResting: true, grammaticalGender: "PLURAL" }), "Сидять і відпочивають.");

assert.deepEqual(postureActionLabelsForState({ posture: "STANDING", isResting: false }), ["Сісти", "🧘 Відпочити"]);
assert.deepEqual(postureActionLabelsForState({ posture: "SITTING", isResting: false }), ["Встати", "🧘 Відпочити"]);
assert.deepEqual(postureActionLabelsForState({ posture: "SITTING", isResting: true }), ["Встати"]);

// Rest completion and rest interruption both clear isResting but leave posture sitting.
assert.deepEqual(postureActionLabelsForState({ posture: "SITTING", isResting: false }), ["Встати", "🧘 Відпочити"]);

console.log("Posture helpers OK");
