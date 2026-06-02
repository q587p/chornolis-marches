const assert = require("node:assert/strict");

require("ts-node/register");

const { ADMIN_HELP_TEXT } = require("../../src/handlers/admin");
const { scribeReturnRequestKeyboard } = require("../../src/services/scribeReturnHelp");

assert.match(ADMIN_HELP_TEXT, /\/call_scribes_audit/, "Admin help should list scribe return audit");
assert.match(ADMIN_HELP_TEXT, /\/call_scribes_approve <eventId>/, "Admin help should list scribe return approval");

const keyboard = scribeReturnRequestKeyboard(42);
const button = keyboard.inline_keyboard?.[0]?.[0];
assert.equal(button?.callback_data, "scribeReturn:42", "Direct scribe return notification should still approve by player id");

console.log("Scribe return help helpers OK");
