const assert = require("node:assert/strict");

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

console.log("Admin reset helpers OK");
