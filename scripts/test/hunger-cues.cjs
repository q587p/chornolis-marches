const assert = require("node:assert/strict");

require("ts-node/register");

const { hungerCueLevel, hungerCueText } = require("../../src/services/hungerCues");
const { isTutorialWellbeingFoodResource, TUTORIAL_WELLBEING_ASIDE_TEXT } = require("../../src/services/tutorial");

assert.equal(hungerCueLevel(0, 1, 13), null);
assert.equal(hungerCueLevel(7, 8, 13), "notice");
assert.equal(hungerCueLevel(8, 9, 13), null);
assert.equal(hungerCueLevel(11, 12, 13), "serious");
assert.equal(hungerCueLevel(12, 13, 13), null);

assert.match(hungerCueText("notice", { hasEdibleInventory: true }), /Речах є щось їстівне \(\/inventory\)/);
assert.match(hungerCueText("serious", { canCookRawMeat: true }), /сире м'ясо/);
assert.match(hungerCueText("notice", { hasLocalFood: true }), /дрібна пожива/);
assert.match(hungerCueText("serious"), /Варто поїсти/);

assert.equal(isTutorialWellbeingFoodResource("berries"), true);
assert.equal(isTutorialWellbeingFoodResource("mushrooms"), true);
assert.equal(isTutorialWellbeingFoodResource("cooked_meat"), true);
assert.equal(isTutorialWellbeingFoodResource("herbs"), false);
assert.match(TUTORIAL_WELLBEING_ASIDE_TEXT, /по той бік/);
assert.match(TUTORIAL_WELLBEING_ASIDE_TEXT, /Чорноліс почекає/);
assert.equal(TUTORIAL_WELLBEING_ASIDE_TEXT.includes("«"), false);

console.log("Hunger cues OK");
