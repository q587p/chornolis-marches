const assert = require("node:assert/strict");

require("ts-node/register");

const {
  FOLLOW_TARGET_CREATURE,
} = require("../../src/services/following");
const {
  FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE,
  FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
  evaluateFollowAssistEligibility,
  followAssistCooldownKey,
  followAssistFailureCooldownKey,
  followAssistFailureText,
  followAssistQueuedText,
  followRouteMemoryEventDescription,
} = require("../../src/services/followRouteMemory");

function clearEvent(overrides = {}) {
  return {
    title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
    createdAt: new Date(),
    description: followRouteMemoryEventDescription({
      playerId: 7,
      targetType: FOLLOW_TARGET_CREATURE,
      targetId: 42,
      fromLocationId: 100,
      toLocationId: 101,
      direction: "NORTH",
      source: "visible_move",
      visibility: "clear",
    }),
    ...overrides,
  };
}

function intent(overrides = {}) {
  return {
    playerId: 7,
    targetType: FOLLOW_TARGET_CREATURE,
    targetCreatureId: 42,
    targetPlayerId: null,
    assistEnabled: true,
    ...overrides,
  };
}

function player(overrides = {}) {
  return {
    hp: 10,
    stamina: 10,
    posture: "STANDING",
    sleepState: "AWAKE",
    isResting: false,
    ...overrides,
  };
}

let result = evaluateFollowAssistEligibility({
  intent: intent(),
  currentLocationId: 100,
  event: clearEvent(),
  player: player(),
  activeActionCount: 0,
  hasVisibleExit: true,
});
assert.equal(result.ok, true);
assert.equal(result.direction, "NORTH");
assert.equal(result.cooldownKey, followAssistCooldownKey({
  playerId: 7,
  targetType: FOLLOW_TARGET_CREATURE,
  targetId: 42,
  fromLocationId: 100,
  direction: "NORTH",
}));

result = evaluateFollowAssistEligibility({
  intent: intent({ assistEnabled: false }),
  currentLocationId: 100,
  event: clearEvent(),
  player: player(),
  activeActionCount: 0,
  hasVisibleExit: true,
});
assert.deepEqual(result, { ok: false, reason: "assist-disabled" });

result = evaluateFollowAssistEligibility({
  intent: intent(),
  currentLocationId: 100,
  event: clearEvent(),
  player: player(),
  activeActionCount: 1,
  hasVisibleExit: true,
});
assert.deepEqual(result, { ok: false, reason: "busy" });

result = evaluateFollowAssistEligibility({
  intent: intent(),
  currentLocationId: 100,
  event: clearEvent(),
  player: player({ posture: "SITTING" }),
  activeActionCount: 0,
  hasVisibleExit: true,
});
assert.deepEqual(result, { ok: false, reason: "resting" });

result = evaluateFollowAssistEligibility({
  intent: intent(),
  currentLocationId: 100,
  event: clearEvent(),
  player: player({ sleepState: "ASLEEP" }),
  activeActionCount: 0,
  hasVisibleExit: true,
});
assert.deepEqual(result, { ok: false, reason: "incapacitated" });

result = evaluateFollowAssistEligibility({
  intent: intent(),
  currentLocationId: 100,
  event: clearEvent(),
  player: player({ stamina: 0 }),
  activeActionCount: 0,
  hasVisibleExit: true,
});
assert.deepEqual(result, { ok: false, reason: "no-stamina" });

result = evaluateFollowAssistEligibility({
  intent: intent(),
  currentLocationId: 100,
  event: clearEvent(),
  player: player(),
  activeActionCount: 0,
  hasVisibleExit: false,
});
assert.deepEqual(result, { ok: false, reason: "no-visible-exit" });

result = evaluateFollowAssistEligibility({
  intent: intent(),
  currentLocationId: 100,
  event: clearEvent({ description: clearEvent().description.replace("visibility=clear", "visibility=dark") }),
  player: player(),
  activeActionCount: 0,
  hasVisibleExit: true,
});
assert.deepEqual(result, { ok: false, reason: "dark" });

result = evaluateFollowAssistEligibility({
  intent: intent(),
  currentLocationId: 100,
  event: clearEvent({
    title: FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE,
    description: "playerId=7; targetType=CREATURE; targetId=42; from=100; to=18; source=hidden_route; visibility=hidden",
  }),
  player: player(),
  activeActionCount: 0,
  hasVisibleExit: true,
});
assert.deepEqual(result, { ok: false, reason: "hidden" });

result = evaluateFollowAssistEligibility({
  intent: intent({ targetCreatureId: 99 }),
  currentLocationId: 100,
  event: clearEvent(),
  player: player(),
  activeActionCount: 0,
  hasVisibleExit: true,
});
assert.deepEqual(result, { ok: false, reason: "wrong-target" });

const hiddenText = followAssistFailureText("hidden");
assert.equal(hiddenText.includes("До води"), false);
assert.equal(hiddenText.includes("до води"), false);
assert.equal(hiddenText.includes("under_bridge"), false);
assert.equal(followAssistQueuedText("NORTH"), "Ви підхоплюєте чужий крок: на північ.");
assert.equal(
  followAssistQueuedText("NORTH", "Орина"),
  "Ви трималися чужого сліду: Орина рушає на північ. Автокрок підхоплює цей рух.",
);
assert.equal(
  followAssistFailureCooldownKey({
    playerId: 7,
    targetType: FOLLOW_TARGET_CREATURE,
    targetId: 42,
    fromLocationId: 100,
    reason: "hidden",
  }),
  "follow_assist_failure:player_7:target_CREATURE_42:from_100:reason_hidden",
);

console.log("follow assist tests passed");
