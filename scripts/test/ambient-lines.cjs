const assert = require("node:assert/strict");

require("ts-node/register");

const { HUNTER_FIELD_LINES } = require("../../src/services/carcassDropoff");
const { AUTO_LINES, orderAutoActionKeys } = require("../../src/handlers/auto");
const { HERBALIST_LINES } = require("../../src/services/worldTick");
const { HUNTER_CONVERSATION_REPLY_LINES } = require("../../src/services/npcHunter");

function assertLineBank(name, lines, minimum) {
  assert.ok(Array.isArray(lines), `${name} should be an array`);
  assert.ok(lines.length >= minimum, `${name} should contain at least ${minimum} lines`);
  assert.equal(new Set(lines).size, lines.length, `${name} should not contain duplicate lines`);
  for (const line of lines) {
    assert.equal(typeof line, "string", `${name} line should be text`);
    assert.ok(line.trim().length >= 12, `${name} line is too short: ${line}`);
  }
}

assertLineBank("HERBALIST_LINES", HERBALIST_LINES, 65);
assertLineBank("AUTO_LINES", AUTO_LINES, 50);
assertLineBank("HUNTER_CONVERSATION_REPLY_LINES", HUNTER_CONVERSATION_REPLY_LINES, 24);

for (const [kind, lines] of Object.entries(HUNTER_FIELD_LINES)) {
  assertLineBank(`HUNTER_FIELD_LINES.${kind}`, lines, 8);
}

assert.deepEqual(orderAutoActionKeys(0.2), ["say", "gather", "look", "move"]);
assert.deepEqual(orderAutoActionKeys(0.2, "gather"), ["say", "look", "move", "gather"]);
assert.deepEqual(orderAutoActionKeys(0.5, "look"), ["say", "move", "look"]);
assert.deepEqual(orderAutoActionKeys(0.9, "move"), ["say", "look", "move"]);
assert.deepEqual(orderAutoActionKeys(0.9, "say"), ["move", "look", "say"]);

console.log("Ambient line banks OK");
