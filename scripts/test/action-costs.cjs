const assert = require("node:assert/strict");

require("ts-node/register");

const { playerStaminaCostConfig } = require("../../src/gameConfig");
const { actionTitle } = require("../../src/services/actionRules");

assert.equal(playerStaminaCostConfig.FRESHEN, 3);
assert.equal(playerStaminaCostConfig.USE_ITEM, 1);
assert.equal(playerStaminaCostConfig.DROP_ITEM, 1);
assert.equal(playerStaminaCostConfig.LIGHT_TORCH, 2);
assert.equal(playerStaminaCostConfig.ADD_TWIGS, 2);
assert.equal(playerStaminaCostConfig.LIGHT_CAMPFIRE, 2);
assert.equal(playerStaminaCostConfig.COOK, 4);

assert.equal(actionTitle({ type: "USE_ITEM", payload: { resourceKey: "berries" } }), "їмо ягоди");
assert.equal(actionTitle({ type: "DROP_ITEM", payload: { allFilter: "corpse" } }), "викладаємо речі");
assert.equal(actionTitle({ type: "LIGHT_TORCH", payload: {} }), "запалюємо факел");
assert.equal(actionTitle({ type: "COOK", payload: {} }), "підсмажуємо м'ясо");

console.log("Action costs OK");
