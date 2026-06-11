const assert = require("node:assert/strict");

require("ts-node/register");

const { formatRecoveryEstimateText } = require("../../src/handlers/player");
const {
  HEALTH_REGEN_PER_INTERVAL,
  PASSIVE_HEALTH_REGEN_INTERVAL_MS,
  REST_HEALTH_REGEN_INTERVAL_MS,
} = require("../../src/gameConfig");

function minutes(ms) {
  return Math.max(1, Math.ceil(ms / 60_000));
}

function recoveryMinutes(remaining, amount, intervalMs) {
  if (remaining <= 0) return 0;
  return minutes(Math.ceil(remaining / Math.max(1, amount)) * intervalMs);
}

const hpRemaining = 7;
const passiveHpMinutes = recoveryMinutes(hpRemaining, HEALTH_REGEN_PER_INTERVAL, PASSIVE_HEALTH_REGEN_INTERVAL_MS);
const restHpMinutes = recoveryMinutes(hpRemaining, HEALTH_REGEN_PER_INTERVAL, REST_HEALTH_REGEN_INTERVAL_MS);

const woundedText = formatRecoveryEstimateText({
  stamina: 42,
  hp: 13,
  staminaMax: 42,
  restStaminaCap: 42,
  hpMax: 20,
  restStaminaRegenMultiplier: 1,
});

assert.match(woundedText, /Відновлення життя:/);
assert.match(woundedText, new RegExp(`Без відпочинку: приблизно ${passiveHpMinutes} хв\\.`));
assert.match(woundedText, new RegExp(`З відпочинком: приблизно ${restHpMinutes} хв\\.`));
assert.match(woundedText, new RegExp(`Біля вогнища: приблизно ${restHpMinutes} хв\\.`));
assert.doesNotMatch(woundedText, /Життя з відпочинком/);
assert.ok(passiveHpMinutes > restHpMinutes, "passive HP recovery should remain slower than active rest");

const restingText = formatRecoveryEstimateText({
  isResting: true,
  stamina: 30,
  hp: 13,
  staminaMax: 42,
  restStaminaCap: 42,
  hpMax: 20,
  restStaminaRegenMultiplier: 1,
});

assert.match(restingText, /Відновлення снаги: приблизно 1 хв під час відпочинку\./);
assert.match(restingText, /Відновлення життя:/);
assert.match(restingText, new RegExp(`Без відпочинку: приблизно ${passiveHpMinutes} хв\\.`));
assert.match(restingText, new RegExp(`З відпочинком: приблизно ${restHpMinutes} хв\\.`));
assert.match(restingText, new RegExp(`Біля вогнища: приблизно ${restHpMinutes} хв\\.`));

assert.equal(formatRecoveryEstimateText({
  sleepState: "ORDINARY_SLEEP",
  stamina: 1,
  hp: 1,
}), "\nВідновлення: тіло відпочиває глибше, поки ви спите.");

console.log("Player recovery text OK");
