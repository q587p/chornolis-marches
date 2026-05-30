const assert = require("node:assert/strict");

require("ts-node/register");

const { DEFAULT_BOT_COMMANDS, SCRIBE_BOT_COMMANDS } = require("../../src/services/telegramCommands");

function commandNames(commands) {
  return commands.map((command) => command.command);
}

const defaultCommands = commandNames(DEFAULT_BOT_COMMANDS);
const scribeCommands = commandNames(SCRIBE_BOT_COMMANDS);

assert.deepEqual(defaultCommands.slice(0, 2), ["start", "afk"], "/afk stays near the top of the side command menu");
assert.deepEqual(scribeCommands.slice(0, 2), ["start", "afk"], "scribe side command menu inherits the /afk quick-exit slot");

assert.equal(defaultCommands.includes("adminmenu"), false, "public command menu must not expose /adminmenu");
assert.equal(defaultCommands.includes("carcassquest"), false, "public command menu must not expose /carcassquest");

assert.equal(scribeCommands.includes("adminmenu"), false, "scribe side command menu stays short: /adminmenu is opened from keyboard/help/direct text");
assert.equal(scribeCommands.includes("carcassquest"), false, "scribe side command menu must not expose operational carcass quest toggles");
assert.equal(scribeCommands.includes("adminhelp"), true, "scribe side command menu keeps /adminhelp");
assert.equal(scribeCommands.includes("stat"), true, "scribe side command menu keeps /stat");

console.log("Telegram command menu coverage OK");
