const assert = require("node:assert/strict");

require("ts-node/register");

const { playerStaminaCostConfig } = require("../../src/gameConfig");

assert.equal(playerStaminaCostConfig.FRESHEN, 3);

console.log("Action costs OK");
