const assert = require("node:assert/strict");

require("ts-node/register");

const { isPublicWhoCreature, isPublicWhoPlayer } = require("../../src/handlers/status");

assert.equal(isPublicWhoCreature({ species: { kind: "HUMAN", diet: "OMNIVORE" } }), true);
assert.equal(isPublicWhoCreature({ species: { kind: "MONSTER", diet: "CARNIVORE" } }), true);
assert.equal(isPublicWhoCreature({ species: { kind: "ANIMAL", diet: "HERBIVORE" } }), false);
assert.equal(isPublicWhoCreature({ species: { kind: "SPIRIT", diet: "SPIRITUAL" } }), false);
assert.equal(isPublicWhoCreature({ species: { kind: "HUMAN", diet: "SPIRITUAL" } }), false);
assert.equal(isPublicWhoCreature({ species: { kind: "SPIRIT", diet: "OMNIVORE" } }), false);
assert.equal(isPublicWhoCreature({ species: null }), false);

const since = new Date("2026-06-02T12:00:00.000Z");
const recent = new Date("2026-06-02T12:30:00.000Z");
const old = new Date("2026-06-02T11:30:00.000Z");

assert.equal(isPublicWhoPlayer({ sessionPresence: "ACTIVE", lastPlayerActionAt: recent, updatedAt: recent }, since), true);
assert.equal(isPublicWhoPlayer({ sessionPresence: "AFK", lastPlayerActionAt: recent, updatedAt: recent }, since), true);
assert.equal(isPublicWhoPlayer({ sessionPresence: "AFK", lastPlayerActionAt: old, updatedAt: recent }, since), false);
assert.equal(isPublicWhoPlayer({ sessionPresence: "ENDED", lastPlayerActionAt: recent, updatedAt: recent }, since), false);
assert.equal(isPublicWhoPlayer({ sessionPresence: "ACTIVE", lastPlayerActionAt: null, lastActionAt: recent, updatedAt: recent }, since), true);
assert.equal(isPublicWhoPlayer({ sessionPresence: "ACTIVE", lastPlayerActionAt: null, lastActionAt: null, updatedAt: recent }, since), false);

console.log("Public /who creature filter OK");
