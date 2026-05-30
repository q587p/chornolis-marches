const assert = require("node:assert/strict");

require("ts-node/register");

const {
  PREDATOR_PREY_CLAIM_PREFIX,
  predatorClaimedCorpseAction,
  predatorClaimedCorpseDecayAction,
  predatorClaimedCorpseFoodValue,
  predatorClaimedCorpseMarker,
  predatorClaimedCorpseOwnerId,
} = require("../../src/services/predatorFeeding");
const { normalizeCreatureActionText } = require("../../src/utils/creatureActionText");

const action = predatorClaimedCorpseAction(42, "fox", 3);

assert.equal(predatorClaimedCorpseOwnerId(action), 42);
assert.equal(predatorClaimedCorpseFoodValue(action), 3);
assert.equal(PREDATOR_PREY_CLAIM_PREFIX, "predator_prey_claimed_by:");
assert.equal(predatorClaimedCorpseMarker(42), "predator_prey_claimed_by:42");
assert.equal(normalizeCreatureActionText(action), "убито хижаком: fox");

const decaying = predatorClaimedCorpseDecayAction(action, 17);
assert.equal(predatorClaimedCorpseOwnerId(decaying), 42);
assert.equal(predatorClaimedCorpseFoodValue(decaying), 3);
assert.equal(normalizeCreatureActionText(decaying), "розкладається; залишилось 17 тіків");
assert.equal(predatorClaimedCorpseDecayAction("розкладається; залишилось 17 тіків", 16), null);

console.log("Predator feeding helpers OK");
