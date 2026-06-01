const assert = require("node:assert/strict");

require("ts-node/register");

const {
  parseRememberedReplyTargetDescription,
  rememberedReplyTargetDescription,
} = require("../../src/services/replyTargets");

assert.deepEqual(parseRememberedReplyTargetDescription(rememberedReplyTargetDescription("QQQ")), { speakerName: "QQQ" });
assert.deepEqual(
  parseRememberedReplyTargetDescription(rememberedReplyTargetDescription("  Прихований голос  ")),
  { speakerName: "Прихований голос" },
);
assert.deepEqual(
  parseRememberedReplyTargetDescription(rememberedReplyTargetDescription({ speakerName: "QQQ", speakerPlayerId: 42 })),
  { speakerName: "QQQ", speakerPlayerId: 42 },
);
assert.deepEqual(
  parseRememberedReplyTargetDescription(rememberedReplyTargetDescription({ speakerName: "Лукан", speakerCreatureId: 7, speakerDative: "Лукану" })),
  { speakerName: "Лукан", speakerCreatureId: 7, speakerDative: "Лукану" },
);
assert.equal(parseRememberedReplyTargetDescription(JSON.stringify({ kind: "other", speakerName: "QQQ" })), null);
assert.equal(parseRememberedReplyTargetDescription("not json"), null);
assert.equal(parseRememberedReplyTargetDescription(null), null);

console.log("Reply targets OK");
