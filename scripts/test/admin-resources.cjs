const assert = require("node:assert/strict");

require("ts-node/register");

const {
  nextResourceAmount,
  parseAddResourceArgs,
  parseAdminInventoryItemArgs,
  parseAdminInventoryResourceArgs,
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

assert.deepEqual(parseAdminInventoryResourceArgs(""), {
  playerArg: "",
  amount: 1,
});
assert.deepEqual(parseAdminInventoryResourceArgs("5"), {
  playerArg: "",
  amount: 5,
});
assert.deepEqual(parseAdminInventoryResourceArgs("#5"), {
  playerArg: "#5",
  amount: 1,
});
assert.deepEqual(parseAdminInventoryResourceArgs("#5 3"), {
  playerArg: "#5",
  amount: 3,
});
assert.deepEqual(parseAdminInventoryResourceArgs("Вербові 10"), {
  playerArg: "Вербові",
  amount: 10,
});

assert.deepEqual(parseAdminInventoryItemArgs("berries"), {
  resourceKey: "berries",
  playerArg: "",
  amount: 1,
});
assert.deepEqual(parseAdminInventoryItemArgs("raw_meat #5 3"), {
  resourceKey: "raw_meat",
  playerArg: "#5",
  amount: 3,
});
assert.deepEqual(parseAdminInventoryItemArgs("#5 2", "lit_torch"), {
  resourceKey: "lit_torch",
  playerArg: "#5",
  amount: 2,
});
assert.deepEqual(parseAdminInventoryItemArgs("Вербові 10", "twigs"), {
  resourceKey: "twigs",
  playerArg: "Вербові",
  amount: 10,
});

console.log("Admin resource helpers OK");
