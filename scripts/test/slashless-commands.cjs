const assert = require("node:assert/strict");

require("ts-node/register");

const { slashlessCommandPattern } = require("../../src/utils/slashlessCommands");

const teleport = slashlessCommandPattern(["teleport"]);

assert.equal(teleport.test("teleport"), true);
assert.equal(teleport.test("Teleport forest_07_00"), true);
assert.equal("teleport forest_07_00".match(teleport)?.[1], "forest_07_00");
assert.equal("teleport Вербові -> forest_07_00".match(teleport)?.[1], "Вербові -> forest_07_00");
assert.equal(teleport.test("/teleport forest_07_00"), false);
assert.equal(teleport.test("teleportation forest_07_00"), false);

console.log("Slashless command helpers OK");
