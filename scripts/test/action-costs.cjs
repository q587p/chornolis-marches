const assert = require("node:assert/strict");

require("ts-node/register");

const { playerStaminaCostConfig, REST_STAMINA_REGEN_PER_INTERVAL } = require("../../src/gameConfig");
const { buildFatigueGuidanceKeyboard, fatigueGuidanceText, playerHungerAfterStaminaSpend, shouldRefreshMainKeyboardAfterVitalsChange } = require("../../src/services/actionRecovery");
const { actionTitle } = require("../../src/services/actionRules");
const { CAMPFIRE_REST_STAMINA_REGEN_MULTIPLIER, isLitRestCampfireFeature, restStaminaRegenMultiplierForFeatures } = require("../../src/services/locationFeatures");

assert.equal(playerStaminaCostConfig.FRESHEN, 2);
assert.equal(playerStaminaCostConfig.USE_ITEM, 1);
assert.equal(playerStaminaCostConfig.DROP_ITEM, 1);
assert.equal(playerStaminaCostConfig.LIGHT_TORCH, 2);
assert.equal(playerStaminaCostConfig.ADD_TWIGS, 2);
assert.equal(playerStaminaCostConfig.LIGHT_CAMPFIRE, 2);
assert.equal(playerStaminaCostConfig.BUILD_CAMPFIRE, 3);
assert.equal(playerStaminaCostConfig.DOUSE_CAMPFIRE, 1);
assert.equal(playerStaminaCostConfig.DISMANTLE_CAMPFIRE, 2);
assert.equal(playerStaminaCostConfig.DISMANTLE_TOTEM, 2);
assert.equal(playerStaminaCostConfig.COOK, 3);
assert.equal(playerStaminaCostConfig.ATTACK, 5);
assert.equal(REST_STAMINA_REGEN_PER_INTERVAL, 26);
assert.equal(CAMPFIRE_REST_STAMINA_REGEN_MULTIPLIER, 3);

assert.equal(actionTitle({ type: "USE_ITEM", payload: { resourceKey: "berries" } }), "їмо ягоди");
assert.equal(actionTitle({ type: "DROP_ITEM", payload: { allFilter: "corpse" } }), "викладаємо речі");
assert.equal(actionTitle({ type: "DROP_ITEM", payload: { cacheContribution: true, resourceKey: "twigs" } }), "лишаємо хмиз у скрині");
assert.equal(actionTitle({ type: "LIGHT_TORCH", payload: {} }), "запалюємо факел");
assert.equal(actionTitle({ type: "BUILD_CAMPFIRE", payload: {} }), "складаємо вогнище");
assert.equal(actionTitle({ type: "DOUSE_CAMPFIRE", payload: {} }), "гасимо вогнище");
assert.equal(actionTitle({ type: "DISMANTLE_CAMPFIRE", payload: {} }), "розбираємо вогнище");
assert.equal(actionTitle({ type: "DISMANTLE_TOTEM", payload: {} }), "розбираємо підозрілий тотем");
assert.equal(actionTitle({ type: "COOK", payload: {} }), "підсмажуємо м'ясо");

assert.equal(playerHungerAfterStaminaSpend({ currentHunger: 0, staminaAfter: 39, cost: 3 }), 0);
assert.equal(playerHungerAfterStaminaSpend({ currentHunger: 0, staminaAfter: 37, cost: 5 }), 0);
assert.equal(playerHungerAfterStaminaSpend({ currentHunger: 0, staminaAfter: 35, cost: 7 }), 1);
assert.equal(playerHungerAfterStaminaSpend({ currentHunger: 0, staminaAfter: 37, cost: playerStaminaCostConfig.ATTACK }), 0);
assert.equal(playerHungerAfterStaminaSpend({ currentHunger: 4, staminaAfter: -1, cost: 3 }), 5);
assert.equal(playerHungerAfterStaminaSpend({ currentHunger: 13, staminaAfter: 20, cost: 7 }), 13);

assert.match(fatigueGuidanceText({ hasBerries: true, canBuildCampfire: true }), /ягоди/);
assert.match(fatigueGuidanceText({ hasBerries: true, canBuildCampfire: true }), /вогнище/);
const fatigueKeyboard = buildFatigueGuidanceKeyboard({ hasBerries: true, hasEdibleInventory: true, canBuildCampfire: true });
assert.deepEqual(
  fatigueKeyboard.inline_keyboard.flat().map((button) => button.callback_data),
  ["rest:start", "character:sleep", "inventory:use:berries", "character:inventory", "fire:build"],
);

assert.equal(shouldRefreshMainKeyboardAfterVitalsChange({
  beforeHp: 20,
  afterHp: 20,
  hpMax: 20,
  beforeStamina: 39,
  afterStamina: 30,
  staminaMax: 42,
  showTechnicalDetails: true,
}), true);
assert.equal(shouldRefreshMainKeyboardAfterVitalsChange({
  beforeHp: 20,
  afterHp: 20,
  hpMax: 20,
  beforeStamina: 39,
  afterStamina: 38,
  staminaMax: 42,
  showTechnicalDetails: false,
}), false);
assert.equal(shouldRefreshMainKeyboardAfterVitalsChange({
  beforeHp: 20,
  afterHp: 20,
  hpMax: 20,
  beforeStamina: 34,
  afterStamina: 30,
  staminaMax: 42,
  showTechnicalDetails: false,
}), true);

const litCampfire = { type: "CAMPFIRE", providesLight: true, data: { is_campfire: true, handmade: true } };
const litMagicCampfire = { type: "MAGIC_CAMPFIRE", providesLight: true, data: { magical: true } };
const preparedCampfire = { type: "CAMPFIRE", providesLight: false, data: { is_campfire: true, handmade: true, prepared: true, unlit: true } };
const extinguishedCampfire = { type: "CAMPFIRE", providesLight: false, data: { is_campfire: true, handmade: true, extinguished: true } };
const strongerRestFeature = { type: "LANDMARK", providesLight: false, data: { rest_stamina_regen_multiplier: 10 } };

assert.equal(isLitRestCampfireFeature(litCampfire), true);
assert.equal(isLitRestCampfireFeature(litMagicCampfire), true);
assert.equal(isLitRestCampfireFeature(preparedCampfire), false);
assert.equal(isLitRestCampfireFeature(extinguishedCampfire), false);
assert.equal(restStaminaRegenMultiplierForFeatures([litCampfire]), 3);
assert.equal(restStaminaRegenMultiplierForFeatures([litMagicCampfire]), 3);
assert.equal(restStaminaRegenMultiplierForFeatures([preparedCampfire, extinguishedCampfire]), 1);
assert.equal(restStaminaRegenMultiplierForFeatures([litCampfire, strongerRestFeature]), 10);

console.log("Action costs OK");
