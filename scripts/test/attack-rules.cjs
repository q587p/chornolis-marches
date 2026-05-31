const assert = require("node:assert/strict");

require("ts-node/register");

const {
  attackHitsSpecies,
  attackMissChanceForSpecies,
} = require("../../src/services/attackRules");

assert.equal(attackMissChanceForSpecies("mouse"), 0.2);
assert.equal(attackMissChanceForSpecies("rabbit"), 0.4);
assert.equal(attackMissChanceForSpecies("fox"), 0);
assert.equal(attackMissChanceForSpecies(undefined), 0);

assert.equal(attackHitsSpecies("mouse", 0.19), false);
assert.equal(attackHitsSpecies("mouse", 0.2), true);
assert.equal(attackHitsSpecies("rabbit", 0.39), false);
assert.equal(attackHitsSpecies("rabbit", 0.4), true);
assert.equal(attackHitsSpecies("fox", 0), true);

console.log("Attack rules OK");
