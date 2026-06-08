const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const {
  AUTO_START_COMMANDS,
  SPIRIT_CALL_START_COMMANDS,
  autoCommandModeFromText,
} = require("../../src/handlers/auto");
const {
  SPIRIT_CALL_LABEL,
  SPIRIT_CALL_SOURCE,
  isSpiritCallActionLike,
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
assert.equal(isSpiritCallActionLike({ payload: { source: SPIRIT_CALL_SOURCE } }), true);
assert.equal(isSpiritCallActionLike({ payload: { spiritCall: true } }), true);
assert.equal(isSpiritCallActionLike({ note: "auto:move:NORTH" }), true);
assert.equal(isSpiritCallActionLike({ note: "AUTO:look" }), true);
assert.equal(isSpiritCallActionLike({ payload: { text: "До води" }, note: "manual say" }), false);
assert.equal(spiritCallActionPrefix(payload), "дух веде: ");
assert.equal(spiritCallActionPrefix({ direction: "NORTH" }), "");
assert.equal(spiritGuidedTargetHint(true), "за кроком тягнеться тихий поклик");
assert.equal(spiritGuidedTargetHint(false), undefined);
assert.match(spiritGuidedInspectionLine(true), /поклик духа/);
assert.equal(spiritGuidedInspectionLine(false), undefined);

assert.deepEqual([...AUTO_START_COMMANDS], ["auto_on", "auto_start"]);
assert.deepEqual([...SPIRIT_CALL_START_COMMANDS], ["spirit", "dukh", "poklyk"]);
assert.equal(autoCommandModeFromText("", "show"), "show");
assert.equal(autoCommandModeFromText("", "start"), "start");
assert.equal(autoCommandModeFromText("stop", "start"), "stop");

const autoHandlerSource = fs.readFileSync(path.join(__dirname, "../../src/handlers/auto.ts"), "utf8");
assert.match(autoHandlerSource, /bot\.command\("auto", autoCommand\);/);
assert.match(autoHandlerSource, /bot\.command\(\["auto_on", "auto_start"\], startAutoCommand\);/);
assert.match(autoHandlerSource, /bot\.command\(\["spirit", "dukh", "poklyk"\], startAutoCommand\);/);
assert.match(autoHandlerSource, /bot\.hears\(SPIRIT_CALL_LABEL[\s\S]*?requestOrEnablePlayerAuto\(bot, ctx\)/);

console.log("Spirit call helpers OK");
