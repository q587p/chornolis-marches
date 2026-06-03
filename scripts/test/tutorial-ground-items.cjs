const assert = require("node:assert/strict");

require("ts-node/register");

const {
  isTutorialLooseResourceKey,
  isVisibleGroundResource,
} = require("../../src/services/groundItems");

const tutorialLocation = {
  key: "dream_tutorial_foraging",
  z: -13,
  region: { key: "dream_tutorial" },
};

const wakingLocation = {
  key: "forest_03_02",
  z: 0,
  region: { key: "forest" },
};

function resource(key, amount = 1) {
  return { amount, resourceType: { key } };
}

assert.equal(isTutorialLooseResourceKey("berries"), true);
assert.equal(isTutorialLooseResourceKey("herbs"), true);
assert.equal(isTutorialLooseResourceKey("mushrooms"), false);

assert.equal(isVisibleGroundResource(resource("berries"), tutorialLocation), true);
assert.equal(isVisibleGroundResource(resource("herbs"), tutorialLocation), true);
assert.equal(isVisibleGroundResource(resource("berries", 0), tutorialLocation), false);

for (const key of ["mushrooms", "torch", "lit_torch", "twigs", "raw_meat", "cooked_meat", "shah", "grivna"]) {
  assert.equal(isVisibleGroundResource(resource(key), tutorialLocation), false, `${key} should stay hidden in tutorial dreams`);
}

assert.equal(isVisibleGroundResource(resource("twigs"), wakingLocation), true);
assert.equal(isVisibleGroundResource(resource("raw_meat"), wakingLocation), true);
assert.equal(isVisibleGroundResource(resource("shah"), wakingLocation), true);
assert.equal(isVisibleGroundResource(resource("berries"), wakingLocation), false);
assert.equal(isVisibleGroundResource(resource("herbs"), wakingLocation), false);

console.log("Tutorial ground item visibility OK");
