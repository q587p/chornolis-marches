const assert = require("node:assert/strict");

require("ts-node/register");

const {
  PREDATOR_PREY_CLAIM_PREFIX,
  isUnclaimedHerbivoreCorpseForScavenging,
  predatorClaimedCorpseAction,
  predatorClaimedCorpseDecayAction,
  predatorClaimedCorpseFoodValue,
  predatorClaimedCorpseMarker,
  predatorClaimedCorpseOwnerId,
  predatorPreyFoodValue,
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
assert.equal(
  normalizeCreatureActionText(decaying),
  "розкладається; залишилось 17 тіків"
);
assert.equal(
  predatorClaimedCorpseDecayAction("розкладається; залишилось 17 тіків", 16),
  null
);

const ordinaryMouseCorpse = {
  isAlive: false,
  isGone: false,
  isHidden: false,
  age: "CORPSE",
  currentAction: "розкладається; залишилось 12 тіків",
  species: { key: "mouse", diet: "HERBIVORE", baseHp: 4 },
};

assert.equal(isUnclaimedHerbivoreCorpseForScavenging(ordinaryMouseCorpse), true);
assert.equal(predatorPreyFoodValue(ordinaryMouseCorpse), 1);
assert.equal(isUnclaimedHerbivoreCorpseForScavenging({ ...ordinaryMouseCorpse, isHidden: true }), false);
assert.equal(isUnclaimedHerbivoreCorpseForScavenging({ ...ordinaryMouseCorpse, currentAction: "claimed_by_hunter:7; мисливець несе здобич" }), false);
assert.equal(isUnclaimedHerbivoreCorpseForScavenging({ ...ordinaryMouseCorpse, currentAction: "carried_corpse_by_player:1; розкладається" }), false);
assert.equal(isUnclaimedHerbivoreCorpseForScavenging({ ...ordinaryMouseCorpse, currentAction: "freshened_by_player:1; м'ясо=1" }), false);
assert.equal(isUnclaimedHerbivoreCorpseForScavenging({ ...ordinaryMouseCorpse, currentAction: `${PREDATOR_PREY_CLAIM_PREFIX}2; prey_food:1` }), false);
assert.equal(isUnclaimedHerbivoreCorpseForScavenging({ ...ordinaryMouseCorpse, species: { key: "fox", diet: "CARNIVORE", baseHp: 14 } }), false);

console.log("Predator feeding helpers OK");
