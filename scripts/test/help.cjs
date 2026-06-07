const assert = require("node:assert/strict");

require("ts-node/register");

const {
  HELP_TEXT,
  TUTORIAL_HELP_IN_DREAM_TEXT,
  TUTORIAL_HELP_RETURN_TEXT,
  tutorialHelpFollowupText,
} = require("../../src/handlers/help");

assert.equal(HELP_TEXT.includes("/commands"), false);
assert.ok(HELP_TEXT.includes("Поклик духа"));
assert.ok(HELP_TEXT.includes("/spirit"));
assert.equal(HELP_TEXT.includes("Провід"), false);
assert.ok(HELP_TEXT.includes("AFK / відійти"));
assert.ok(HELP_TEXT.includes("13 хвилин"));
assert.equal(HELP_TEXT.includes("🌙 AFK"), false);
assert.equal(HELP_TEXT.includes("🚪 Завершити сесію"), false);
assert.equal(HELP_TEXT.includes("/give"), false);
assert.equal(HELP_TEXT.includes("/sit"), false);
assert.equal(HELP_TEXT.includes("/stand"), false);
assert.equal(HELP_TEXT.includes("/call_scribes"), false);
assert.equal(HELP_TEXT.includes("/search_honey"), false);
assert.equal(HELP_TEXT.includes("/dismantle_totem"), false);
assert.equal(tutorialHelpFollowupText(false), TUTORIAL_HELP_RETURN_TEXT);
assert.equal(tutorialHelpFollowupText(true), TUTORIAL_HELP_IN_DREAM_TEXT);
assert.ok(TUTORIAL_HELP_RETURN_TEXT.includes("повернутися туди"));
assert.equal(TUTORIAL_HELP_IN_DREAM_TEXT.includes("повернутися туди"), false);
assert.ok(TUTORIAL_HELP_IN_DREAM_TEXT.includes("ще триває"));

console.log("Help tutorial follow-up OK");
