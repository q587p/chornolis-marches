const assert = require("node:assert/strict");

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
  followIntentTrackMatches,
  followRouteMemoryEventDescription,
  followRouteMemoryKind,
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
});
assert.match(eventDescription, /playerId=1/);
assert.match(eventDescription, /targetType=CREATURE/);
assert.match(eventDescription, /targetId=13/);
assert.match(eventDescription, /from=101/);
assert.match(eventDescription, /to=102/);
assert.match(eventDescription, /direction=UP/);
assert.match(eventDescription, /source=visible_move/);

console.log("Follow route-memory helpers OK");
