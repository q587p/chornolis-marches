const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const {
  adminResetModeDescription,
  adminResetModeTitle,
  parseAdminResetMode,
} = require("../../src/services/adminReset");

assert.equal(parseAdminResetMode(""), null);
assert.equal(parseAdminResetMode("world"), "world");
assert.equal(parseAdminResetMode("світ"), "world");
assert.equal(parseAdminResetMode("stats"), "stats");
assert.equal(parseAdminResetMode("статистика"), "stats");
assert.equal(parseAdminResetMode("full"), "full");
assert.equal(parseAdminResetMode("все"), "full");
assert.equal(parseAdminResetMode("звірі"), null);

assert.equal(adminResetModeTitle("world"), "світ");
assert.equal(adminResetModeTitle("stats"), "статистику");
assert.equal(adminResetModeTitle("full"), "світ і статистику");

assert.match(adminResetModeDescription("world"), /статистика персонажів лишається/);
assert.match(adminResetModeDescription("stats"), /падального рову/);
assert.match(adminResetModeDescription("stats"), /\/stat/);
assert.match(adminResetModeDescription("full"), /очищає статистику/);

const statusHandlerSource = fs.readFileSync("src/handlers/status.ts", "utf8");
assert.match(statusHandlerSource, /bot\.command\("restart", requestRestartCommand\)/);
assert.match(statusHandlerSource, /bot\.hears\(RESTART_TEXT_COMMAND, requestRestartCommand\)/);
assert.match(statusHandlerSource, /restart:\(confirm\|cancel\):/);
assert.doesNotMatch(statusHandlerSource, /bot\.hears\(RESTART_TEXT_COMMAND, performRestartCommand\)/);

console.log("Admin reset helpers OK");
