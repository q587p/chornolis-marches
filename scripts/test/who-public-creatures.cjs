const assert = require("node:assert/strict");

require("ts-node/register");

const { isPublicWhoCreature } = require("../../src/handlers/status");

assert.equal(isPublicWhoCreature({ species: { kind: "HUMAN", diet: "OMNIVORE" } }), true);
assert.equal(isPublicWhoCreature({ species: { kind: "MONSTER", diet: "CARNIVORE" } }), true);
assert.equal(isPublicWhoCreature({ species: { kind: "ANIMAL", diet: "HERBIVORE" } }), false);
assert.equal(isPublicWhoCreature({ species: { kind: "SPIRIT", diet: "SPIRITUAL" } }), false);
assert.equal(isPublicWhoCreature({ species: { kind: "HUMAN", diet: "SPIRITUAL" } }), false);
assert.equal(isPublicWhoCreature({ species: { kind: "SPIRIT", diet: "OMNIVORE" } }), false);
assert.equal(isPublicWhoCreature({ species: null }), false);

console.log("Public /who creature filter OK");
