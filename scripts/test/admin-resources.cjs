const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const {
  DEFAULT_ADMIN_GRASS_MAX_AMOUNT,
  grassRecoveryThreshold,
  nextGrassRestoreAmount,
  nextResourceAmount,
  parseAddResourceArgs,
  parseAdminInventoryItemArgs,
  parseAdminInventoryResourceArgs,
  parseRestoreGrassArgs,
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

assert.equal(DEFAULT_ADMIN_GRASS_MAX_AMOUNT, 80);
assert.deepEqual(parseRestoreGrassArgs(""), {
  locationArg: "",
  amount: "full",
});
assert.deepEqual(parseRestoreGrassArgs("meadow_15_05"), {
  locationArg: "meadow_15_05",
  amount: "full",
});
assert.deepEqual(parseRestoreGrassArgs("meadow_15_05 7"), {
  locationArg: "meadow_15_05",
  amount: 7,
});
assert.deepEqual(parseRestoreGrassArgs("10,12,0 full"), {
  locationArg: "10,12,0",
  amount: "full",
});
assert.deepEqual(parseRestoreGrassArgs("повністю"), {
  locationArg: "",
  amount: "full",
});
assert.equal(nextGrassRestoreAmount(3, 80, "full"), 80);
assert.equal(nextGrassRestoreAmount(3, 80, 10), 13);
assert.equal(nextGrassRestoreAmount(78, 80, 10), 80);
assert.equal(grassRecoveryThreshold(80), 20);

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
assert.deepEqual(parseAdminInventoryItemArgs("honey #5 2"), {
  resourceKey: "honey",
  playerArg: "#5",
  amount: 2,
});
assert.deepEqual(parseAdminInventoryItemArgs("#5 2", "lit_torch"), {
  resourceKey: "lit_torch",
  playerArg: "#5",
  amount: 2,
});
assert.deepEqual(parseAdminInventoryItemArgs("#5 3", "beeswax"), {
  resourceKey: "beeswax",
  playerArg: "#5",
  amount: 3,
});
assert.deepEqual(parseAdminInventoryItemArgs("Вербові 10", "twigs"), {
  resourceKey: "twigs",
  playerArg: "Вербові",
  amount: 10,
});

const adminHandlerSource = fs.readFileSync("src/handlers/admin.ts", "utf8");
assert.match(adminHandlerSource, /RESTORE_GRASS_TEXT_COMMAND/);
assert.match(adminHandlerSource, /restoreGrass/);
assert.match(adminHandlerSource, /Відновити траву/);
assert.match(adminHandlerSource, /DEPLETED_VEGETATION_FEATURE_PREFIX/);
assert.match(adminHandlerSource, /resourceAmountText\(playerDisplayName\(player\), parsed\.amount\)/);
assert.doesNotMatch(adminHandlerSource, /playerDisplayName\(player\)} ×\$\{parsed\.amount\}/);

console.log("Admin resource helpers OK");
