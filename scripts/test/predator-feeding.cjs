const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const {
  PREDATOR_PREY_CLAIM_PREFIX,
  isUnclaimedHerbivoreCorpseForScavenging,
  predatorClaimedCorpseAction,
  predatorClaimedCorpseDecayAction,
  predatorClaimedCorpseFoodValue,
  predatorClaimedCorpseMarker,
  predatorClaimedCorpseOwnerId,
  predatorFeedingObserverText,
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

assert.equal(predatorFeedingObserverText("claimed"), "Щось повертається до здобичі й тягне її в темнішу траву.");
assert.equal(predatorFeedingObserverText("claimed", "Лис"), "Лис повертається до здобичі й тягне її в темнішу траву.");
assert.equal(predatorFeedingObserverText("claimed", "сова"), "Сова повертається до здобичі й тягне її в темнішу траву.");
assert.equal(predatorFeedingObserverText("stolen", "Лис"), "Лис перехоплює чужу здобич і тягне її в темнішу траву.");
assert.equal(predatorFeedingObserverText("scavenged", "Лис"), "Лис знаходить покинуту здобич і тягне її в темнішу траву.");
assert.equal(predatorFeedingObserverText("scavenged", "сова"), "Сова знаходить покинуту здобич і тягне її в темнішу траву.");
assert.equal(predatorFeedingObserverText("lost", "Лис"), "Лис повертається до здобичі, але знаходить лише прим’ятий мох.");

const actionCompletionsSource = fs.readFileSync(path.join(__dirname, "..", "..", "src", "services", "actionCompletions.ts"), "utf8");
assert.match(actionCompletionsSource, /notifyPredatorFeeding[\s\S]{0,420}visibleCreatureActionLabelForObserver/u);
assert.doesNotMatch(actionCompletionsSource, /notifyLocation\(bot, creature\.locationId, -1, [`"']Щось (?:повертається|перехоплює|знаходить)/u);

console.log("Predator feeding helpers OK");
