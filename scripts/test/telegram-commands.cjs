const assert = require("node:assert/strict");

require("ts-node/register");

const { DEFAULT_BOT_COMMANDS, SCRIBE_BOT_COMMANDS } = require("../../src/services/telegramCommands");

function commandNames(commands) {
  return commands.map((command) => command.command);
}

const defaultCommands = commandNames(DEFAULT_BOT_COMMANDS);
const scribeCommands = commandNames(SCRIBE_BOT_COMMANDS);

assert.deepEqual(defaultCommands.slice(0, 4), ["start", "afk", "help", "respawn"], "/help sits right after /afk, with /respawn below help");
assert.deepEqual(scribeCommands.slice(0, 4), ["start", "afk", "help", "respawn"], "scribe side command menu inherits the /afk, /help and /respawn quick slots");
assert.equal(defaultCommands.includes("refresh"), false, "public command menu must not expose /refresh");
assert.equal(defaultCommands.at(-1), "end_session", "/end_session stays at the bottom of the public side command menu");
assert.equal(scribeCommands.indexOf("end_session"), DEFAULT_BOT_COMMANDS.length - 1, "/end_session stays at the bottom of the shared command block");

assert.equal(defaultCommands.includes("adminmenu"), false, "public command menu must not expose /adminmenu");
assert.equal(defaultCommands.includes("carcassquest"), false, "public command menu must not expose /carcassquest");

assert.equal(scribeCommands.includes("adminmenu"), false, "scribe side command menu stays short: /adminmenu is opened from keyboard/help/direct text");
assert.equal(scribeCommands.includes("carcassquest"), false, "scribe side command menu must not expose operational carcass quest toggles");
assert.equal(scribeCommands.includes("adminhelp"), true, "scribe side command menu keeps /adminhelp");
assert.equal(scribeCommands.includes("stat"), true, "scribe side command menu keeps /stat");

console.log("Telegram command menu coverage OK");
