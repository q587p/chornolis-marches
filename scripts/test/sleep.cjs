const assert = require("node:assert/strict");

require("ts-node/register");

const {
  ORDINARY_SLEEP_FORCE_AUTO_WAKE_MINUTES,
  ORDINARY_SLEEP_FULL_AUTO_WAKE_MINUTES,
  ordinarySleepDurationMinutes,
  shouldAllowOrdinarySleepCallback,
  shouldAllowOrdinarySleepText,
  shouldAutoWakeOrdinarySleep,
  sleepRecoveryProfileFromSignals,
} = {
  ...require("../../src/services/sleep"),
  ...require("../../src/services/sleepCommandGate"),
};

assert.equal(ordinarySleepDurationMinutes(null, 1000), 0);
assert.equal(ordinarySleepDurationMinutes(1000, 999), 0);
assert.equal(ordinarySleepDurationMinutes(1000.9, 1480.1), 480);

assert.equal(
  shouldAutoWakeOrdinarySleep({
    startedAtMinute: 1000,
    currentMinute: 1000 + ORDINARY_SLEEP_FULL_AUTO_WAKE_MINUTES - 1,
    stamina: 42,
    staminaCap: 42,
    hp: 20,
    hpMax: 20,
  }),
  false,
);

assert.equal(
  shouldAutoWakeOrdinarySleep({
    startedAtMinute: 1000,
    currentMinute: 1000 + ORDINARY_SLEEP_FULL_AUTO_WAKE_MINUTES,
    stamina: 42,
    staminaCap: 42,
    hp: 20,
    hpMax: 20,
  }),
  true,
);

assert.equal(
  shouldAutoWakeOrdinarySleep({
    startedAtMinute: 1000,
    currentMinute: 1000 + ORDINARY_SLEEP_FULL_AUTO_WAKE_MINUTES,
    stamina: 20,
    staminaCap: 42,
    hp: 20,
    hpMax: 20,
  }),
  false,
);

assert.equal(
  shouldAutoWakeOrdinarySleep({
    startedAtMinute: 1000,
    currentMinute: 1000 + ORDINARY_SLEEP_FORCE_AUTO_WAKE_MINUTES,
    stamina: 20,
    staminaCap: 42,
    hp: 5,
    hpMax: 20,
  }),
  true,
);

const bareProfile = sleepRecoveryProfileFromSignals({
  baseStaminaMax: 42,
  restStaminaCap: 42,
  restRegenMultiplier: 1,
  hasActiveCampfire: false,
});
const campfireProfile = sleepRecoveryProfileFromSignals({
  baseStaminaMax: 42,
  restStaminaCap: 42,
  restRegenMultiplier: 1,
  hasActiveCampfire: true,
});

assert.equal(bareProfile.staminaCap, 42);
assert.equal(bareProfile.comfort, "bare");
assert.equal(campfireProfile.staminaCap, 52);
assert.equal(campfireProfile.comfort, "campfire");
assert.ok(campfireProfile.staminaRate > bareProfile.staminaRate);
assert.ok(campfireProfile.hpRate > bareProfile.hpRate);

assert.equal(shouldAllowOrdinarySleepText("/wake"), true);
assert.equal(shouldAllowOrdinarySleepText("прокинутися"), true);
assert.equal(shouldAllowOrdinarySleepText("/time"), true);
assert.equal(shouldAllowOrdinarySleepText("commands"), true);
assert.equal(shouldAllowOrdinarySleepText("хроніки"), true);
assert.equal(shouldAllowOrdinarySleepText("/south"), false);
assert.equal(shouldAllowOrdinarySleepText("озирнутися"), false);
assert.equal(shouldAllowOrdinarySleepText("сказати привіт"), false);
assert.equal(shouldAllowOrdinarySleepText("/sleep tutorial"), false);
assert.equal(shouldAllowOrdinarySleepCallback("sleep:wake"), true);
assert.equal(shouldAllowOrdinarySleepCallback("commands:page:1"), true);
assert.equal(shouldAllowOrdinarySleepCallback("cmd:south"), false);
assert.equal(shouldAllowOrdinarySleepCallback("inventory:use:berries"), false);

