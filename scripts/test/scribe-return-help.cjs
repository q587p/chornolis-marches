const assert = require("node:assert/strict");

require("ts-node/register");

const {
  ADMIN_HELP_INDEX_TEXT,
  ADMIN_HELP_SECTIONS,
  ADMIN_HELP_TEXT,
  tutorialResetPlayerNoticeText,
  tutorialResetScribeReplyText,
} = require("../../src/handlers/admin");
const { scribeReturnRequestKeyboard } = require("../../src/services/scribeReturnHelp");

assert.match(ADMIN_HELP_TEXT, /\/call_scribes_audit/, "Admin help should list scribe return audit");
assert.match(ADMIN_HELP_TEXT, /\/call_scribes_approve <eventId>/, "Admin help should list scribe return approval");
assert.ok(ADMIN_HELP_INDEX_TEXT.length < 3900, "Admin help index should fit in one Telegram message");
assert.ok(ADMIN_HELP_SECTIONS.length >= 6, "Admin help should expose focused sections");
for (const section of ADMIN_HELP_SECTIONS) {
  assert.ok(section.text.length < 3900, `Admin help section should fit in one Telegram message: ${section.key}`);
}

const resetReply = tutorialResetScribeReplyText("Нестор Межовий", false);
assert.match(resetReply, /Наступний <i>навчальний сон<\/i> \(\/sleep_tutorial\) почнеться з початку\./);
assert.doesNotMatch(resetReply, /\/sleep tutorial/);
assert.match(tutorialResetPlayerNoticeText(false), /<i>навчальний сон<\/i> \(\/sleep_tutorial\)/);

const keyboard = scribeReturnRequestKeyboard(42);
const button = keyboard.inline_keyboard?.[0]?.[0];
assert.equal(button?.callback_data, "scribeReturn:42", "Direct scribe return notification should still approve by player id");

console.log("Scribe return help helpers OK");
