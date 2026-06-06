const assert = require("node:assert/strict");

require("ts-node/register");

const {
  FOLLOW_TARGET_CREATURE,
  FOLLOW_TARGET_PLAYER,
  followAssistStateText,
  followIntentAttentionContext,
  followIntentDataForTarget,
  followIntentHelpText,
  followIntentSetText,
  followIntentStatusLine,
  followIntentTargetInstrumental,
  followIntentUsageText,
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
assert.equal(followIntentStatusLine("знахарка", { stale: true }), "Чужий слід: знахарка (останній помічений).");
assert.equal(followIntentStatusLine("  "), null);
assert.equal(followAssistStateText(true), "Автоспроба слідом: увімкнено.");
assert.equal(followAssistStateText(false), "Автоспроба слідом: вимкнено.");
assert.equal(followIntentHelpText(), followIntentUsageText());
assert.equal(followIntentTargetInstrumental({ label: "Орина", forms: { instrumental: "Ориною" } }), "Ориною");
assert.equal(followIntentSetText({ label: "Орина", forms: { instrumental: "Ориною" } }), "Ви тримаєтеся сліду за Ориною. Це ще не крок за кроком — радше уважність до чужого руху.");
assert.equal(followIntentTargetInstrumental({ label: "Орина" }), "Ориною");
const visibleHelp = followIntentHelpText({ label: "знахарка", targetVisible: true });
assert.match(visibleHelp, /Ви тримаєтеся чужого сліду: знахарка\./);
assert.match(visibleHelp, /не автоматична хода/);
assert.match(visibleHelp, /\/follow <ім'я>/);
assert.match(visibleHelp, /\/unfollow/);
assert.match(visibleHelp, /\/follow_step/);
const staleHelp = followIntentHelpText({ label: "знахарка", targetVisible: false });
assert.match(staleHelp, /знахарка \(останній помічений\)/);
assert.match(staleHelp, /Ціль зараз не видно поруч/);
assert.match(staleHelp, /\/follow <ім'я>/);
assert.match(staleHelp, /\/unfollow/);
assert.doesNotMatch(staleHelp, /\/follow_step/);
assert.doesNotMatch(staleHelp, /автоматична хода/);
assert.deepEqual(followIntentAttentionContext(1, FOLLOW_TARGET_CREATURE, 7), {
  playerId: 1,
  targetType: FOLLOW_TARGET_CREATURE,
  targetId: 7,
  attention: "follow-intent",
});

console.log("Follow intent helpers OK");
