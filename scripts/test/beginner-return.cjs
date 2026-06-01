const assert = require("node:assert/strict");

require("ts-node/register");

const {
  BEGINNER_RETURN_NEW_PLAYER_GRACE_MS,
  BEGINNER_RETURN_PROGRESS_LIMIT,
  beginnerReturnEligibility,
  beginnerReturnProgressScore,
  beginnerReturnRefusalText,
  beginnerReturnStaminaAfter,
  beginnerReturnSuccessText,
  withinBeginnerReturnNewPlayerGrace,
} = require("../../src/services/beginnerReturn");

const now = new Date("2026-05-31T10:00:00.000Z");
const basePlayer = {
  id: 1,
  currentLocationId: 10,
  hp: 20,
  hpMax: 20,
  stamina: 42,
  staminaMax: 42,
  steps: 10,
  looks: 5,
  says: 0,
  successfulGathers: 1,
  animalsKilled: 0,
  restStarts: 0,
  createdAt: new Date(now.getTime() - BEGINNER_RETURN_NEW_PLAYER_GRACE_MS - 60_000),
};

assert.equal(beginnerReturnProgressScore(basePlayer), 17);
assert.deepEqual(beginnerReturnEligibility(basePlayer, { startLocationId: 1 }), { ok: true, reason: "beginner" });
assert.deepEqual(beginnerReturnEligibility({ ...basePlayer, currentLocationId: 1 }, { startLocationId: 1 }), { ok: false, reason: "already-home" });
assert.deepEqual(beginnerReturnEligibility({ ...basePlayer, currentLocationId: null }, { startLocationId: 1 }), { ok: false, reason: "no-location" });

const established = {
  ...basePlayer,
  steps: BEGINNER_RETURN_PROGRESS_LIMIT + 1,
  looks: 10,
  successfulGathers: 20,
  animalsKilled: 5,
};
assert.deepEqual(beginnerReturnEligibility(established, { startLocationId: 1 }), { ok: false, reason: "established" });
assert.deepEqual(beginnerReturnEligibility({ ...established, stamina: 3 }, { startLocationId: 1 }), { ok: true, reason: "weak" });
assert.equal(withinBeginnerReturnNewPlayerGrace({ createdAt: new Date(now.getTime() - BEGINNER_RETURN_NEW_PLAYER_GRACE_MS + 60_000) }, now), true);
assert.equal(withinBeginnerReturnNewPlayerGrace({ createdAt: new Date(now.getTime() - BEGINNER_RETURN_NEW_PLAYER_GRACE_MS - 60_000) }, now), false);
assert.deepEqual(
  beginnerReturnEligibility({ ...established, createdAt: new Date(now.getTime() - BEGINNER_RETURN_NEW_PLAYER_GRACE_MS + 60_000) }, { startLocationId: 1, now }),
  { ok: true, reason: "beginner" }
);

const cooldown = beginnerReturnEligibility(basePlayer, {
  startLocationId: 1,
  now,
  lastUsedAt: new Date(now.getTime() - 5 * 60 * 1000),
});
assert.equal(cooldown.ok, false);
assert.equal(cooldown.reason, "cooldown");
assert.equal(cooldown.remainingMs > 0, true);

assert.equal(beginnerReturnStaminaAfter({ stamina: 42, staminaMax: 42 }), 14);
assert.equal(beginnerReturnStaminaAfter({ stamina: 5, staminaMax: 42 }), 5);
assert.equal(beginnerReturnStaminaAfter({ stamina: 0, staminaMax: 42 }), 1);
assert.match(beginnerReturnRefusalText({ ok: false, reason: "established" }), /Стежка назад/);
assert.match(beginnerReturnSuccessText("beginner"), /межовий табір/);

console.log("Beginner return helpers OK");
