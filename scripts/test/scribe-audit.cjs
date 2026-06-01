const assert = require("node:assert/strict");

require("ts-node/register");

const {
  formatScribeActionAuditDescription,
} = require("../../src/services/scribeAudit");

const description = formatScribeActionAuditDescription({
  actionKey: "reset",
  scribePlayerId: 7,
  scribeTelegramId: 12345,
  scribeName: "Писар",
  target: "world",
  mode: "full",
  outcome: "confirmed",
  details: "players=3; creatures=5",
});

assert.equal(
  description,
  "scribePlayer=7; scribeTelegram=12345; scribeName=Писар; target=world; mode=full; outcome=confirmed; players=3; creatures=5",
);

assert.equal(
  formatScribeActionAuditDescription({
    actionKey: "reset",
    mode: "world",
    outcome: "confirmed",
  }),
  "mode=world; outcome=confirmed",
);

console.log("Scribe audit helpers OK");
