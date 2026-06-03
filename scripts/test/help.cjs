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
assert.equal(tutorialHelpFollowupText(false), TUTORIAL_HELP_RETURN_TEXT);
assert.equal(tutorialHelpFollowupText(true), TUTORIAL_HELP_IN_DREAM_TEXT);
assert.ok(TUTORIAL_HELP_RETURN_TEXT.includes("повернутися туди"));
assert.equal(TUTORIAL_HELP_IN_DREAM_TEXT.includes("повернутися туди"), false);
assert.ok(TUTORIAL_HELP_IN_DREAM_TEXT.includes("ще триває"));

console.log("Help tutorial follow-up OK");
