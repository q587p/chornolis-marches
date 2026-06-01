const assert = require("node:assert/strict");

require("ts-node/register");

const { canCreatureUseExit, creatureUsableExits, isAnimalFriendlyExit } = require("../../src/services/creatureMovement");

const animal = { species: { kind: "ANIMAL" } };
const npc = { species: { kind: "HUMAN" } };

const west = { direction: "WEST", isHidden: false };
const up = { direction: "UP", isHidden: false };
const upFriendly = { direction: "UP", isHidden: false, animalFriendly: true };
const upFriendlyData = { direction: "UP", isHidden: false, data: { animal_friendly: true } };
const down = { direction: "DOWN", isHidden: false };

assert.equal(canCreatureUseExit(animal, west), true);
assert.equal(canCreatureUseExit(animal, down), true, "Animals already above ground should be able to go down.");
assert.equal(canCreatureUseExit(animal, up), false, "Ordinary animals should not climb vertical UP exits.");
assert.equal(canCreatureUseExit(animal, upFriendly), true);
assert.equal(canCreatureUseExit(animal, upFriendlyData), true);
assert.equal(canCreatureUseExit(npc, up), true, "Non-animal NPCs can still use authored vertical routes.");

assert.equal(isAnimalFriendlyExit(upFriendly), true);
assert.equal(isAnimalFriendlyExit(upFriendlyData), true);
assert.deepEqual(creatureUsableExits(animal, [west, up, down, upFriendly]), [west, down, upFriendly]);

console.log("Creature movement boundaries OK");
