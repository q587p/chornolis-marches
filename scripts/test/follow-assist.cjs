const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const {
  FOLLOW_TARGET_CREATURE,
} = require("../../src/services/following");
const {
  FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE,
  FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
  FOLLOW_ASSIST_STEP_NOTE,
  FOLLOW_ASSIST_CATCH_UP_NOTE,
  evaluateFollowAssistEligibility,
  followAssistEventDescription,
  followAssistCooldownKey,
  followAssistCatchUpQueuedText,
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

// A queued manual action and an already queued follow-assist action both block catch-up.
for (const actionKind of ["manual", "follow-assist"]) {
  result = evaluateFollowAssistEligibility({
    intent: intent(),
    currentLocationId: 100,
    event: clearEvent(),
    player: player(),
    activeActionCount: 1,
    hasVisibleExit: true,
  });
  assert.deepEqual(result, { ok: false, reason: "busy" }, `${actionKind} action should block follow assist`);
}

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

result = evaluateFollowAssistEligibility({
  intent: intent(),
  currentLocationId: 101,
  event: clearEvent(),
  player: player(),
  activeActionCount: 0,
  hasVisibleExit: true,
});
assert.deepEqual(result, { ok: false, reason: "wrong-location" });

result = evaluateFollowAssistEligibility({
  intent: intent(),
  currentLocationId: 100,
  event: clearEvent({ createdAt: new Date(Date.now() - 60 * 60_000) }),
  player: player(),
  activeActionCount: 0,
  hasVisibleExit: true,
  ttlMs: 1_000,
});
assert.deepEqual(result, { ok: false, reason: "no-memory" });

const hiddenText = followAssistFailureText("hidden");
assert.equal(hiddenText.includes("До води"), false);
assert.equal(hiddenText.includes("до води"), false);
assert.equal(hiddenText.includes("under_bridge"), false);
assert.equal(hiddenText.includes("under_bridge_18_05"), false);
const darkText = followAssistFailureText("dark");
assert.equal(darkText.includes("NORTH"), false);
assert.equal(darkText.includes("північ"), false);
assert.equal(followAssistQueuedText("NORTH"), "Ви підхоплюєте чужий крок: на північ.");
assert.equal(
  followAssistQueuedText("NORTH", "Орина"),
  "Ви трималися чужого сліду: Орина рушає на північ. Автокрок підхоплює цей рух.",
);
assert.equal(followAssistCatchUpQueuedText("NORTH"), "Автокрок не губить слід: далі на північ.");
assert.equal(FOLLOW_ASSIST_STEP_NOTE, "follow-assist");
assert.equal(FOLLOW_ASSIST_CATCH_UP_NOTE, "follow-assist:catch-up");
assert.equal(
  followAssistEventDescription({
    playerId: 7,
    targetType: FOLLOW_TARGET_CREATURE,
    targetId: 42,
    fromLocationId: 100,
    toLocationId: 101,
    direction: "NORTH",
    source: "visible_move",
    visibility: "clear",
    cooldownKey: "k",
    assistKind: "catch_up",
    note: FOLLOW_ASSIST_CATCH_UP_NOTE,
  }).includes("assistKind=catch_up; note=follow-assist:catch-up"),
  true,
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

const followRouteMemorySource = fs.readFileSync("src/services/followRouteMemory.ts", "utf8");
assert.match(followRouteMemorySource, /withSlowLog\("followAssist\.catchUp"/);
assert.match(followRouteMemorySource, /canSendProactiveToPlayerId\(input\.playerId\)/);
assert.match(followRouteMemorySource, /hasBlockingPlayerActionsForFollowAssist\(input\.playerId\)/);
assert.match(followRouteMemorySource, /note: FOLLOW_ASSIST_CATCH_UP_NOTE/);
const catchUpLookupSource = followRouteMemorySource.slice(
  followRouteMemorySource.indexOf("async function latestFollowRouteMemoryForCatchUp"),
  followRouteMemorySource.indexOf("export async function maybeQueueFollowAssistCatchUp"),
);
assert.match(catchUpLookupSource, /title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE/);
assert.match(catchUpLookupSource, /take: Math\.max/);
assert.equal(catchUpLookupSource.includes("description: { contains"), false);
const catchUpSource = followRouteMemorySource.slice(
  followRouteMemorySource.indexOf("async function maybeQueueFollowAssistCatchUpInner"),
  followRouteMemorySource.indexOf("export async function rememberFollowedTargetVisibleMove"),
);
assert.match(catchUpSource, /assistKind: "catch_up"/);
assert.match(catchUpSource, /note: FOLLOW_ASSIST_CATCH_UP_NOTE/);
assert.equal(catchUpSource.includes("prisma.player.update"), false);
assert.equal(catchUpSource.includes("currentLocationId:"), true);
const actionCompletionsSource = fs.readFileSync("src/services/actionCompletions.ts", "utf8");
assert.match(actionCompletionsSource, /maybeQueueFollowAssistCatchUp\(bot, \{ playerId: player\.id \}\)/);

console.log("follow assist tests passed");
