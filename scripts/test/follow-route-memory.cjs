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
  evaluateFollowRouteMemoryForStep,
  followRouteMemoryEventDescription,
  followStepFailureText,
  followRouteMemoryKind,
  isWithinFollowRouteCooldown,
  parseFollowRouteMemoryEventDescription,
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
assert.equal(followRouteMemoryKind({ exitVisible: true, targetVisible: true, showTracks: false, playerHasLight: true }), "clear");
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

const parsedMemoryDescription = parseFollowRouteMemoryEventDescription(eventDescription);
assert.equal(parsedMemoryDescription.playerId, 1);
assert.equal(parsedMemoryDescription.targetType, FOLLOW_TARGET_CREATURE);
assert.equal(parsedMemoryDescription.targetId, 13);
assert.equal(parsedMemoryDescription.fromLocationId, 101);
assert.equal(parsedMemoryDescription.toLocationId, 102);
assert.equal(parsedMemoryDescription.direction, "UP");
assert.equal(parsedMemoryDescription.source, "visible_move");
assert.equal(parsedMemoryDescription.visibility, "clear");

const freshNow = Date.now();
const clearStepMemory = {
  title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
  description: eventDescription,
  createdAt: new Date(freshNow - 1_000),
};
assert.deepEqual(
  evaluateFollowRouteMemoryForStep({
    intent: creatureIntent,
    currentLocationId: 101,
    event: clearStepMemory,
    now: freshNow,
  }),
  { ok: true, direction: "UP", targetLabel: "знахарка" },
);
assert.deepEqual(
  evaluateFollowRouteMemoryForStep({ intent: null, currentLocationId: 101, event: clearStepMemory, now: freshNow }),
  { ok: false, reason: "no-intent" },
);
assert.deepEqual(
  evaluateFollowRouteMemoryForStep({ intent: creatureIntent, currentLocationId: 101, event: null, now: freshNow }),
  { ok: false, reason: "no-memory" },
);
assert.deepEqual(
  evaluateFollowRouteMemoryForStep({
    intent: creatureIntent,
    currentLocationId: 101,
    event: { ...clearStepMemory, createdAt: new Date(freshNow - 11 * 60_000) },
    now: freshNow,
  }),
  { ok: false, reason: "stale" },
);
assert.deepEqual(
  evaluateFollowRouteMemoryForStep({
    intent: creatureIntent,
    currentLocationId: 999,
    event: clearStepMemory,
    now: freshNow,
  }),
  { ok: false, reason: "wrong-location" },
);
assert.deepEqual(
  evaluateFollowRouteMemoryForStep({
    intent: playerIntent,
    currentLocationId: 101,
    event: clearStepMemory,
    now: freshNow,
  }),
  { ok: false, reason: "wrong-target" },
);
assert.deepEqual(
  evaluateFollowRouteMemoryForStep({
    intent: creatureIntent,
    currentLocationId: 101,
    event: {
      title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
      description: followRouteMemoryEventDescription({
        playerId: 1,
        targetType: FOLLOW_TARGET_CREATURE,
        targetId: 13,
        fromLocationId: 101,
        toLocationId: 102,
        direction: "NORTH",
        source: "visible_move",
        visibility: "dark",
      }),
      createdAt: new Date(freshNow - 1_000),
    },
    now: freshNow,
  }),
  { ok: false, reason: "dark" },
);
assert.deepEqual(
  evaluateFollowRouteMemoryForStep({
    intent: creatureIntent,
    currentLocationId: 101,
    event: {
      title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
      description: followRouteMemoryEventDescription({
        playerId: 1,
        targetType: FOLLOW_TARGET_CREATURE,
        targetId: 13,
        fromLocationId: 101,
        toLocationId: 102,
        direction: "NORTH",
        source: "visible_move",
        visibility: "dark",
      }),
      createdAt: new Date(freshNow - 1_000),
    },
    playerHasLight: true,
    now: freshNow,
  }),
  { ok: true, direction: "NORTH", targetLabel: "знахарка" },
);
assert.deepEqual(
  evaluateFollowRouteMemoryForStep({
    intent: creatureIntent,
    currentLocationId: 101,
    event: {
      title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
      description: followRouteMemoryEventDescription({
        playerId: 1,
        targetType: FOLLOW_TARGET_CREATURE,
        targetId: 13,
        fromLocationId: 101,
        toLocationId: 102,
        source: "visible_move",
        visibility: "dark",
      }),
      createdAt: new Date(freshNow - 1_000),
    },
    playerHasLight: true,
    now: freshNow,
  }),
  { ok: false, reason: "no-direction" },
);
assert.deepEqual(
  evaluateFollowRouteMemoryForStep({
    intent: creatureIntent,
    currentLocationId: 101,
    event: {
      title: FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE,
      description: followRouteMemoryEventDescription({
        playerId: 1,
        targetType: FOLLOW_TARGET_CREATURE,
        targetId: 13,
        fromLocationId: 101,
        toLocationId: 102,
        source: "hidden_route",
        visibility: "hidden",
      }),
      createdAt: new Date(freshNow - 1_000),
    },
    now: freshNow,
  }),
  { ok: false, reason: "hidden" },
);
assert.match(followStepFailureText("dark"), /\/track|шукати сліди|вистежити/i, "Dark follow-step refusal should point toward track search");
assert.match(
  followStepFailureText("dark"),
  /сам цей спогад уже не стане яснішим/i,
  "Dark follow-step refusal should not imply light retroactively clarifies the memory",
);
assert.doesNotMatch(
  followStepFailureText("dark"),
  /повторіть\s+\/follow_step|знову\s+\/follow_step|спробуйте\s+\/follow_step/i,
  "Dark follow-step refusal should not tell players to repeat follow_step after lighting a torch",
);
assert.doesNotMatch(followStepFailureText("hidden"), /До води|до води|under_bridge/i, "Follow step hidden-route refusal must not reveal the water-word passage");

const repoRoot = path.join(__dirname, "..", "..");
const followRouteMemorySource = fs.readFileSync(path.join(repoRoot, "src/services/followRouteMemory.ts"), "utf8");
assert.match(followRouteMemorySource, /mentorshipTrackingObservationLearningInput/);
assert.match(followRouteMemorySource, /contextKey: "followed_movement"[\s\S]*mentorshipTrackingObservationLearningInput/);
assert.match(followRouteMemorySource, /hasActiveLitTorchForPlayer/);
assert.match(followRouteMemorySource, /playerHasLight/);
const news = fs.readFileSync(path.join(repoRoot, "news.md"), "utf8");
const release031 = news.match(/## 0\.15\.31[\s\S]*?(?=\n## 0\.15\.30\b)/)?.[0] ?? "";
assert.match(release031, /не автоматична хода/, "0.15.31 public news should not imply auto-follow");
assert.match(release031, /власний крок лишається вашим/, "0.15.31 public news should keep manual movement explicit");
const release032 = news.match(/## 0\.15\.32[\s\S]*?(?=\n## 0\.15\.31\b)/)?.[0] ?? "";
assert.match(release032, /не автослідування/, "0.15.32 public news should not imply auto-follow");
assert.match(release032, /власний крок/, "0.15.32 public news should keep manual movement explicit");

console.log("Follow route-memory helpers OK");
