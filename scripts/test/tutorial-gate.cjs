const assert = require("node:assert/strict");

require("ts-node/register");

const {
  DREAM_GATE_ALREADY_OPEN_TEXT,
  dreamGateAlreadyOpenText,
  dreamGateStatusText,
  isDreamGateOpeningPhrase,
} = require("../../src/services/tutorial");

const futureOpen = {
  data: {
    locked: true,
    open_until: new Date(Date.now() + 60_000).toISOString(),
  },
};

const expiredOpen = {
  data: {
    locked: true,
    open_until: new Date(Date.now() - 1_000).toISOString(),
  },
};

assert.equal(dreamGateAlreadyOpenText(futureOpen), DREAM_GATE_ALREADY_OPEN_TEXT);
assert.equal(dreamGateAlreadyOpenText(expiredOpen), null);
assert.match(dreamGateStatusText(futureOpen), /прочинена/);
assert.match(dreamGateStatusText(expiredOpen), /зімкнена/);

assert.equal(isDreamGateOpeningPhrase("Відчинитися"), true);
assert.equal(isDreamGateOpeningPhrase("Відчинись будь ласка"), true);
assert.equal(isDreamGateOpeningPhrase("Закрийся"), false);

console.log("Tutorial gate helpers OK");
