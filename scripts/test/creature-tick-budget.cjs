const assert = require("node:assert/strict");

require("ts-node/register");

const { selectCreaturesForTick } = require("../../src/services/worldTick");

const animal = (id, locationId, diet = "HERBIVORE") => ({
  id,
  locationId,
  species: { kind: "ANIMAL", key: `animal_${id}`, diet },
});

const candidates = [
  animal(1, 10),
  animal(2, 20),
  animal(3, 30, "CARNIVORE"),
  { id: 4, locationId: 40, species: { kind: "NPC", key: "hunter", diet: null } },
  animal(5, 50),
];

const withPlayerNearby = new Map([[20, 1]]);
const strict = selectCreaturesForTick(candidates, withPlayerNearby, 7, 2);

assert.deepEqual(new Set(strict.selectedIds), new Set([2, 3, 4]));
assert.equal(strict.protectedCount, 3);
assert.equal(strict.deferred, 2);

const looser = selectCreaturesForTick(candidates, withPlayerNearby, 7, 4);
assert.equal(looser.selectedIds.length, 4);
assert.ok(looser.selectedIds.includes(2));
assert.ok(looser.selectedIds.includes(3));
assert.ok(looser.selectedIds.includes(4));
assert.equal(looser.deferred, 1);

const disabled = selectCreaturesForTick(candidates, withPlayerNearby, 7, 0);
assert.equal(disabled.selectedIds.length, candidates.length);
assert.equal(disabled.deferred, 0);

console.log("Creature tick budget helpers OK");
