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

const addResource = slashlessCommandPattern(["addResource", "addresource", "addResourse", "addresourse"]);
assert.equal(addResource.test("addResource berries forest_01_01 3"), true);
assert.equal("addResource berries forest_01_01 3".match(addResource)?.[1], "berries forest_01_01 3");
assert.equal(addResource.test("/addResource berries"), false);

const addCreatureCorpse = slashlessCommandPattern(["addCreatureCorpse", "addcreaturecorpse"]);
assert.equal(addCreatureCorpse.test("addCreatureCorpse mouse forest_04_00 2 OLD"), true);
assert.equal("addCreatureCorpse mouse forest_04_00 2 OLD".match(addCreatureCorpse)?.[1], "mouse forest_04_00 2 OLD");

const serviceCommands = slashlessCommandPattern([
  "adminSet",
  "tutorialReset",
  "queue_clear",
  "queue_cancel",
  "restAdmin",
  "playerAdmin",
  "cleanupCreature",
  "forceOld",
  "tickSet",
]);
assert.equal("queue_clear".match(serviceCommands)?.[1], undefined);
assert.equal("queue_cancel".match(serviceCommands)?.[1], undefined);
assert.equal("restAdmin Вербові".match(serviceCommands)?.[1], "Вербові");
assert.equal("playerAdmin #12".match(serviceCommands)?.[1], "#12");
assert.equal("cleanupCreature mouse".match(serviceCommands)?.[1], "mouse");
assert.equal("forceOld rabbit 3".match(serviceCommands)?.[1], "rabbit 3");
assert.equal("tickSet 5000".match(serviceCommands)?.[1], "5000");
assert.equal(serviceCommands.test("/tickSet 5000"), false);

console.log("Slashless command helpers OK");
