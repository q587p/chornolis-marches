const assert = require("node:assert/strict");

require("ts-node/register");

const { playerStaminaCostConfig } = require("../../src/gameConfig");
const { playerHungerAfterStaminaSpend } = require("../../src/services/actionRecovery");
const { actionTitle } = require("../../src/services/actionRules");

assert.equal(playerStaminaCostConfig.FRESHEN, 3);
assert.equal(playerStaminaCostConfig.USE_ITEM, 1);
assert.equal(playerStaminaCostConfig.DROP_ITEM, 1);
assert.equal(playerStaminaCostConfig.LIGHT_TORCH, 2);
assert.equal(playerStaminaCostConfig.ADD_TWIGS, 2);
assert.equal(playerStaminaCostConfig.LIGHT_CAMPFIRE, 2);
assert.equal(playerStaminaCostConfig.BUILD_CAMPFIRE, 3);
assert.equal(playerStaminaCostConfig.DOUSE_CAMPFIRE, 1);
assert.equal(playerStaminaCostConfig.DISMANTLE_CAMPFIRE, 2);
assert.equal(playerStaminaCostConfig.COOK, 4);

assert.equal(actionTitle({ type: "USE_ITEM", payload: { resourceKey: "berries" } }), "їмо ягоди");
assert.equal(actionTitle({ type: "DROP_ITEM", payload: { allFilter: "corpse" } }), "викладаємо речі");
assert.equal(actionTitle({ type: "DROP_ITEM", payload: { cacheContribution: true, resourceKey: "twigs" } }), "лишаємо хмиз у скрині");
assert.equal(actionTitle({ type: "LIGHT_TORCH", payload: {} }), "запалюємо факел");
assert.equal(actionTitle({ type: "BUILD_CAMPFIRE", payload: {} }), "складаємо вогнище");
assert.equal(actionTitle({ type: "DOUSE_CAMPFIRE", payload: {} }), "гасимо вогнище");
assert.equal(actionTitle({ type: "DISMANTLE_CAMPFIRE", payload: {} }), "розбираємо вогнище");
assert.equal(actionTitle({ type: "COOK", payload: {} }), "підсмажуємо м'ясо");

assert.equal(playerHungerAfterStaminaSpend({ currentHunger: 0, staminaAfter: 39, cost: 3 }), 0);
assert.equal(playerHungerAfterStaminaSpend({ currentHunger: 0, staminaAfter: 37, cost: 5 }), 0);
assert.equal(playerHungerAfterStaminaSpend({ currentHunger: 0, staminaAfter: 35, cost: 7 }), 1);
assert.equal(playerHungerAfterStaminaSpend({ currentHunger: 4, staminaAfter: -1, cost: 3 }), 5);
assert.equal(playerHungerAfterStaminaSpend({ currentHunger: 13, staminaAfter: 20, cost: 7 }), 13);

console.log("Action costs OK");
