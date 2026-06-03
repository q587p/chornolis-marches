const assert = require("node:assert/strict");

require("ts-node/register");

const {
  SPIRIT_CALL_LABEL,
  SPIRIT_CALL_SOURCE,
  isSpiritCallPayload,
  markSpiritCallPayload,
  spiritCallActionPrefix,
  spiritGuidedInspectionLine,
  spiritGuidedTargetHint,
} = require("../../src/services/spiritCall");

const payload = markSpiritCallPayload({ direction: "NORTH" });

assert.equal(SPIRIT_CALL_LABEL, "🌫️ Поклик духа");
assert.equal(payload.direction, "NORTH");
assert.equal(payload.source, SPIRIT_CALL_SOURCE);
assert.equal(payload.spiritCall, true);
assert.equal(isSpiritCallPayload(payload), true);
assert.equal(isSpiritCallPayload({ source: SPIRIT_CALL_SOURCE }), true);
assert.equal(isSpiritCallPayload({ direction: "NORTH" }), false);
assert.equal(spiritCallActionPrefix(payload), "дух веде: ");
assert.equal(spiritCallActionPrefix({ direction: "NORTH" }), "");
assert.equal(spiritGuidedTargetHint(true), "за кроком тягнеться тихий поклик");
assert.equal(spiritGuidedTargetHint(false), undefined);
assert.match(spiritGuidedInspectionLine(true), /поклик духа/);
assert.equal(spiritGuidedInspectionLine(false), undefined);

console.log("Spirit call helpers OK");
