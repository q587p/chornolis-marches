const assert = require("node:assert/strict");

require("ts-node/register");

const {
  nextResourceAmount,
  parseAddResourceArgs,
} = require("../../src/services/adminResources");

assert.deepEqual(parseAddResourceArgs("berries"), {
  resourceKey: "berries",
  locationArg: "",
  amount: 1,
});
assert.deepEqual(parseAddResourceArgs("berries forest_edge 3"), {
  resourceKey: "berries",
  locationArg: "forest_edge",
  amount: 3,
});
assert.deepEqual(parseAddResourceArgs("berries 10,12,0 2"), {
  resourceKey: "berries",
  locationArg: "10,12,0",
  amount: 2,
});
assert.deepEqual(parseAddResourceArgs("forest_edge 4", "berries"), {
  resourceKey: "berries",
  locationArg: "forest_edge",
  amount: 4,
});
assert.deepEqual(parseAddResourceArgs("", "herbs"), {
  resourceKey: "herbs",
  locationArg: "",
  amount: 1,
});

assert.equal(nextResourceAmount(0, 5, 1), 1);
assert.equal(nextResourceAmount(4, 5, 3), 5);
assert.equal(nextResourceAmount(-2, 0, 0), 1);

console.log("Admin resource helpers OK");
