const assert = require("node:assert/strict");

require("ts-node/register");

const { canCreatureUseExit, canSpeciesUseVerticalUpExit, creatureUsableExits, isAnimalFriendlyExit, isVerticalUpExit } = require("../../src/services/creatureMovement");

const animal = { species: { kind: "ANIMAL" } };
const npc = { species: { kind: "HUMAN" } };
const fox = { species: { key: "fox", kind: "ANIMAL" } };
const hawk = { species: { key: "hawk", kind: "ANIMAL" } };
const owl = { species: { key: "owl", kind: "ANIMAL" } };
const snake = { species: { key: "snake", kind: "ANIMAL" } };

const west = { direction: "WEST", isHidden: false };
const up = { direction: "UP", isHidden: false };
const upFriendly = { direction: "UP", isHidden: false, animalFriendly: true };
const upFriendlyData = { direction: "UP", isHidden: false, data: { animal_friendly: true } };
const treeCrownUp = { direction: "UP", isHidden: false, toLocation: { key: "meadow_10_07_crooked_pine_crown" } };
const watchtowerUp = { direction: "UP", isHidden: false, toLocation: { key: "start_border_watchtower" } };
const down = { direction: "DOWN", isHidden: false };

assert.equal(canCreatureUseExit(animal, west), true);
assert.equal(canCreatureUseExit(animal, down), true, "Animals already above ground should be able to go down.");
assert.equal(canCreatureUseExit(animal, up), false, "Ordinary animals should not climb vertical UP exits.");
assert.equal(canCreatureUseExit(animal, upFriendly), true);
assert.equal(canCreatureUseExit(animal, upFriendlyData), true);
assert.equal(canCreatureUseExit(animal, treeCrownUp), false, "Ordinary animals still need animal-friendly metadata for tree climbs.");
assert.equal(canCreatureUseExit(fox, up), true, "Foxes can use authored vertical UP exits as a species movement rule.");
assert.equal(canCreatureUseExit(fox, treeCrownUp), true, "Foxes can use tree-crown climb exits.");
assert.equal(canCreatureUseExit(fox, watchtowerUp), true, "Foxes can climb human-authored watchtower routes for now.");
assert.equal(canCreatureUseExit(hawk, up), true, "Hawks can fly through authored vertical UP exits.");
assert.equal(canCreatureUseExit(owl, up), true, "Owls can fly through authored vertical UP exits.");
assert.equal(canCreatureUseExit(snake, up), true, "Snakes can crawl through authored vertical UP exits.");
assert.equal(canCreatureUseExit(npc, up), true, "Non-animal NPCs can still use authored vertical routes.");

assert.equal(isAnimalFriendlyExit(upFriendly), true);
assert.equal(isAnimalFriendlyExit(upFriendlyData), true);
assert.equal(isVerticalUpExit(treeCrownUp), true);
assert.equal(isVerticalUpExit(watchtowerUp), true);
assert.equal(canSpeciesUseVerticalUpExit("fox"), true);
assert.equal(canSpeciesUseVerticalUpExit("hawk"), true);
assert.equal(canSpeciesUseVerticalUpExit("owl"), true);
assert.equal(canSpeciesUseVerticalUpExit("snake"), true);
assert.equal(canSpeciesUseVerticalUpExit("rabbit"), false);
assert.deepEqual(creatureUsableExits(animal, [west, up, down, upFriendly]), [west, down, upFriendly]);
assert.deepEqual(creatureUsableExits(fox, [west, up, down, treeCrownUp, watchtowerUp]), [west, up, down, treeCrownUp, watchtowerUp]);
assert.deepEqual(creatureUsableExits(hawk, [west, up, down]), [west, up, down]);
assert.deepEqual(creatureUsableExits(owl, [west, up, down]), [west, up, down]);
assert.deepEqual(creatureUsableExits(snake, [west, up, down]), [west, up, down]);

console.log("Creature movement boundaries OK");
