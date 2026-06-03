const assert = require("node:assert/strict");

require("ts-node/register");

const {
  FOLLOW_TARGET_CREATURE,
  FOLLOW_TARGET_PLAYER,
  followIntentAttentionContext,
  followIntentDataForTarget,
  followIntentStatusLine,
  followTargetTypeForRef,
  isSelfFollowTarget,
} = require("../../src/services/following");

const playerTarget = { type: "player", id: 42, label: "Нестор Межовий" };
const creatureTarget = { type: "creature", id: 7, label: "знахарка" };

assert.equal(followTargetTypeForRef(playerTarget), FOLLOW_TARGET_PLAYER);
assert.equal(followTargetTypeForRef(creatureTarget), FOLLOW_TARGET_CREATURE);

assert.equal(isSelfFollowTarget(42, playerTarget), true);
assert.equal(isSelfFollowTarget(41, playerTarget), false);
assert.equal(isSelfFollowTarget(42, creatureTarget), false);

const playerData = followIntentDataForTarget(playerTarget, 3);
assert.equal(playerData.targetType, FOLLOW_TARGET_PLAYER);
assert.equal(playerData.targetPlayerId, 42);
assert.equal(playerData.targetCreatureId, null);
assert.equal(playerData.lastSeenLocationId, 3);
assert.equal(playerData.lastKnownTargetLabel, "Нестор Межовий");

const creatureData = followIntentDataForTarget(creatureTarget, 4);
assert.equal(creatureData.targetType, FOLLOW_TARGET_CREATURE);
assert.equal(creatureData.targetPlayerId, null);
assert.equal(creatureData.targetCreatureId, 7);
assert.equal(creatureData.lastSeenLocationId, 4);
assert.equal(creatureData.lastKnownTargetLabel, "знахарка");

assert.equal(followIntentStatusLine("знахарка"), "Чужий слід: знахарка.");
assert.equal(followIntentStatusLine("  "), null);
assert.deepEqual(followIntentAttentionContext(1, FOLLOW_TARGET_CREATURE, 7), {
  playerId: 1,
  targetType: FOLLOW_TARGET_CREATURE,
  targetId: 7,
  attention: "follow-intent",
});

console.log("Follow intent helpers OK");
