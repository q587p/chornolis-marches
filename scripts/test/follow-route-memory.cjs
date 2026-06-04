const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const {
  FOLLOW_TARGET_CREATURE,
  FOLLOW_TARGET_PLAYER,
} = require("../../src/services/following");
const {
  FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE,
  FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
  followedHiddenRouteMemoryText,
  followedRouteMemoryText,
  followedTrackDisplayLabel,
  followIntentMatchesMoveTarget,
  followRouteLearningCooldownKey,
  followRouteMemoryCooldownKey,
  followIntentTrackMatches,
  followRouteMemoryEventDescription,
  followRouteMemoryKind,
  isWithinFollowRouteCooldown,
  prioritizeFollowIntentTracks,
} = require("../../src/services/followRouteMemory");

const playerIntent = {
  playerId: 1,
  targetType: FOLLOW_TARGET_PLAYER,
  targetPlayerId: 7,
  targetCreatureId: null,
  lastKnownTargetLabel: "Нестор Межовий",
};
const creatureIntent = {
  playerId: 1,
  targetType: FOLLOW_TARGET_CREATURE,
  targetPlayerId: null,
  targetCreatureId: 13,
  lastKnownTargetLabel: "знахарка",
};

assert.equal(followIntentMatchesMoveTarget(playerIntent, { type: FOLLOW_TARGET_PLAYER, id: 7 }), true);
assert.equal(followIntentMatchesMoveTarget(playerIntent, { type: FOLLOW_TARGET_PLAYER, id: 8 }), false);
assert.equal(followIntentMatchesMoveTarget(playerIntent, { type: FOLLOW_TARGET_CREATURE, id: 7 }), false);
assert.equal(followIntentMatchesMoveTarget(creatureIntent, { type: FOLLOW_TARGET_CREATURE, id: 13 }), true);
assert.equal(followIntentMatchesMoveTarget(creatureIntent, { type: FOLLOW_TARGET_CREATURE, id: 12 }), false);

assert.equal(followRouteMemoryKind({ exitVisible: true, targetVisible: true, showTracks: true }), "clear");
assert.equal(followRouteMemoryKind({ exitVisible: true, targetVisible: true, showTracks: false }), "dark");
assert.equal(followRouteMemoryKind({ exitVisible: false, targetVisible: true, showTracks: true }), "none");
assert.equal(followRouteMemoryKind({ exitVisible: true, targetVisible: false, showTracks: true }), "none");

const visibleCooldownKey = followRouteMemoryCooldownKey({
  playerId: 1,
  targetType: FOLLOW_TARGET_CREATURE,
  targetId: 13,
  fromLocationId: 101,
  direction: "NORTH",
  source: "visible_move",
});
assert.equal(visibleCooldownKey, "follow_route:player_1:target_CREATURE_13:from_101:direction_NORTH:source_visible_move");
assert.equal(
  followRouteMemoryCooldownKey({
    playerId: 1,
    targetType: FOLLOW_TARGET_CREATURE,
    targetId: 13,
    fromLocationId: 101,
    source: "hidden_route",
  }),
  "follow_route:player_1:target_CREATURE_13:from_101:source_hidden_route",
);
assert.equal(
  followRouteLearningCooldownKey({ playerId: 1, targetType: FOLLOW_TARGET_CREATURE, targetId: 13 }),
  "follow_learning:player_1:target_CREATURE_13",
);
assert.equal(isWithinFollowRouteCooldown(new Date(1_000), 2_000, 1_500), true);
assert.equal(isWithinFollowRouteCooldown(new Date(1_000), 3_000, 1_500), false);
assert.equal(isWithinFollowRouteCooldown(null, 3_000, 1_500), false);

assert.equal(
  followedRouteMemoryText({ label: "знахарка", direction: "NORTH", kind: "clear" }),
  "Ви трималися чужого сліду: знахарка рушає на північ.",
);
assert.doesNotMatch(
  followedRouteMemoryText({ label: "знахарка", direction: "NORTH", kind: "dark" }),
  /північ/i,
  "Dark route-memory text should not reveal the direction",
);
assert.match(followedHiddenRouteMemoryText(), /не напрям/);
assert.doesNotMatch(followedHiddenRouteMemoryText(), /північ|південь|вгору|вниз/i);

const tracks = [
  { id: 1, playerId: 2, creatureId: null, label: "людський слід" },
  { id: 2, playerId: 7, creatureId: null, label: "людський слід" },
  { id: 3, playerId: null, creatureId: 13, label: "слід: знахарка" },
];
assert.equal(followIntentTrackMatches(playerIntent, tracks[1]), true);
assert.equal(followIntentTrackMatches(playerIntent, tracks[0]), false);
assert.equal(followIntentTrackMatches(creatureIntent, tracks[2]), true);
assert.equal(prioritizeFollowIntentTracks(tracks, playerIntent)[0].id, 2);
assert.equal(followedTrackDisplayLabel(playerIntent, tracks[1], "людський слід"), "чужий слід: Нестор Межовий");
assert.equal(followedTrackDisplayLabel(playerIntent, tracks[0], "людський слід"), "людський слід");

assert.equal(FOLLOW_ROUTE_MEMORY_EVENT_TITLE, "Follow intent route memory");
assert.equal(FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE, "Follow intent hidden route memory");
const eventDescription = followRouteMemoryEventDescription({
  playerId: 1,
  targetType: FOLLOW_TARGET_CREATURE,
  targetId: 13,
  fromLocationId: 101,
  toLocationId: 102,
  direction: "UP",
  source: "visible_move",
  visibility: "clear",
  cooldownKey: visibleCooldownKey,
  learningKey: followRouteLearningCooldownKey({ playerId: 1, targetType: FOLLOW_TARGET_CREATURE, targetId: 13 }),
});
assert.match(eventDescription, /playerId=1/);
assert.match(eventDescription, /targetType=CREATURE/);
assert.match(eventDescription, /targetId=13/);
assert.match(eventDescription, /from=101/);
assert.match(eventDescription, /to=102/);
assert.match(eventDescription, /direction=UP/);
assert.match(eventDescription, /source=visible_move/);
assert.match(eventDescription, /cooldownKey=follow_route:player_1:target_CREATURE_13:from_101:direction_NORTH:source_visible_move/);
assert.match(eventDescription, /learningKey=follow_learning:player_1:target_CREATURE_13/);

const repoRoot = path.join(__dirname, "..", "..");
const news = fs.readFileSync(path.join(repoRoot, "news.md"), "utf8");
const release031 = news.match(/## 0\.15\.31[\s\S]*?(?=\n## 0\.15\.30\b)/)?.[0] ?? "";
assert.match(release031, /не автоматична хода/, "0.15.31 public news should not imply auto-follow");
assert.match(release031, /власний крок лишається вашим/, "0.15.31 public news should keep manual movement explicit");

console.log("Follow route-memory helpers OK");
