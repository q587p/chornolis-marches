const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const {
  TUTORIAL_FORAGING_LOCATION_KEY,
  TUTORIAL_FORAGING_RESOURCE_AMOUNTS,
  tutorialForagingResourceAmount,
} = require("../../src/services/tutorial");

const resourceNodes = JSON.parse(fs.readFileSync(path.join(__dirname, "../../prisma/data/world/resourceNodes.json"), "utf8"));
const dreamForagingNodes = resourceNodes.filter((node) => node.locationKey === TUTORIAL_FORAGING_LOCATION_KEY);
const dreamForagingByKey = new Map(dreamForagingNodes.map((node) => [node.resourceKey, node]));

for (const [resourceKey, amount] of Object.entries(TUTORIAL_FORAGING_RESOURCE_AMOUNTS)) {
  const node = dreamForagingByKey.get(resourceKey);
  assert.ok(node, `Expected tutorial foraging seed node for ${resourceKey}`);
  assert.equal(node.amount, amount, `Expected tutorial foraging ${resourceKey} seed amount to match runtime refill amount`);
  assert.equal(node.maxAmount, amount, `Expected tutorial foraging ${resourceKey} max amount to match runtime refill amount`);
  assert.equal(tutorialForagingResourceAmount(resourceKey), amount);
}

assert.equal(tutorialForagingResourceAmount("mushrooms"), null);
assert.equal(dreamForagingByKey.has("mushrooms"), false, "Tutorial foraging lesson should only guarantee berries and herbs for now");

console.log("Tutorial foraging helpers OK");
