const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  PLAYER_OBSERVATION_ACTION_DEDUPE_MESSAGES,
  matchingPlayerActionDedupeMessage,
  playerActionDedupeKey,
  playerObservationActionDedupePolicy,
} = require("../../src/services/actionLifecycle");
const {
  getActionQueueRuntimeSnapshot,
  getCreatureQueueRuntimeSnapshot,
  markActionQueuePassError,
  markActionQueuePassFinished,
  markActionQueuePassStarted,
} = require("../../src/runtimeState");
const {
  formatActionQueueDebugReport,
  formatQueuePhaseDurations,
} = require("../../src/services/actionQueueDiagnostics");

const trackPayload = { target: "лисиця", detail: true };
const sameTrackPayloadDifferentOrder = { detail: true, target: "лисиця" };
const otherTrackPayload = { detail: true, target: "заєць" };

assert.equal(
  playerActionDedupeKey({ type: "TRACK", payload: trackPayload }),
  playerActionDedupeKey({ type: "TRACK", payload: sameTrackPayloadDifferentOrder }),
);
assert.notEqual(
  playerActionDedupeKey({ type: "TRACK", payload: trackPayload }),
  playerActionDedupeKey({ type: "TRACK", payload: otherTrackPayload }),
);

assert.deepEqual(playerObservationActionDedupePolicy("TRACK"), PLAYER_OBSERVATION_ACTION_DEDUPE_MESSAGES.TRACK);
assert.deepEqual(playerObservationActionDedupePolicy("LOOK"), PLAYER_OBSERVATION_ACTION_DEDUPE_MESSAGES.LOOK);
assert.equal(playerObservationActionDedupePolicy("MOVE"), undefined);

const trackInput = {
  type: "TRACK",
  payload: trackPayload,
  dedupe: playerObservationActionDedupePolicy("TRACK"),
};
assert.equal(
  matchingPlayerActionDedupeMessage(trackInput, { type: "TRACK", payload: sameTrackPayloadDifferentOrder, status: "RUNNING" }),
  "Вистежування вже триває.",
);
assert.equal(
  matchingPlayerActionDedupeMessage(trackInput, { type: "TRACK", payload: sameTrackPayloadDifferentOrder, status: "QUEUED" }),
  "Вистежування вже є в плані.",
);
assert.equal(
  matchingPlayerActionDedupeMessage(trackInput, { type: "TRACK", payload: otherTrackPayload, status: "RUNNING" }),
  null,
);

const lookInput = {
  type: "LOOK",
  payload: {},
  dedupe: playerObservationActionDedupePolicy("LOOK"),
};
assert.equal(
  matchingPlayerActionDedupeMessage(lookInput, { type: "LOOK", payload: {}, status: "RUNNING" }),
  "Огляд уже триває.",
);
assert.equal(
  matchingPlayerActionDedupeMessage(lookInput, { type: "LOOK", payload: {}, status: "QUEUED" }),
  "Огляд уже є в плані.",
);

const actionLifecycleSource = fs.readFileSync("src/services/actionLifecycle.ts", "utf8");
const actionQueueSource = fs.readFileSync("src/services/actionQueue.ts", "utf8");
const recoveryLoopSource = fs.readFileSync("src/services/recoveryLoop.ts", "utf8");
const gameBotSource = fs.readFileSync("src/apps/gameBot.ts", "utf8");

assert.equal(actionLifecycleSource.includes("await recoverStamina(bot)"), false);
assert.match(actionQueueSource, /slow:actionQueue\.process|actionQueue\.process/);
assert.match(actionQueueSource, /export function nudgeActionQueueLoop/);
assert.equal(/nudgeActionQueueLoop[\s\S]*setInterval/.test(actionQueueSource), false);
assert.match(recoveryLoopSource, /recoverStamina\(bot\)/);
assert.match(recoveryLoopSource, /recoveryLoop\.pass/);
assert.match(gameBotSource, /startRecoveryLoop\(bot\)/);

markActionQueuePassStarted(new Date("2026-06-09T10:00:00.000Z"));
let snapshot = getActionQueueRuntimeSnapshot();
assert.equal(snapshot.running, true);
assert.equal(snapshot.runningSince.toISOString(), "2026-06-09T10:00:00.000Z");

markActionQueuePassFinished({
  phaseDurations: {
    playerCompleteMs: 12,
    playerStartMs: 8,
    playerRefreshMs: 3,
    creatureKickMs: 1,
    totalMs: 24,
  },
  completedPlayerActions: 2,
  startedPlayerActions: 1,
  triggeredCreatureQueue: true,
}, new Date("2026-06-09T10:00:01.000Z"));
snapshot = getActionQueueRuntimeSnapshot();
assert.equal(snapshot.running, false);
assert.equal(snapshot.lastFinishedAt.toISOString(), "2026-06-09T10:00:01.000Z");
assert.equal(snapshot.lastCompletedPlayerActions, 2);
assert.equal(snapshot.lastStartedPlayerActions, 1);
assert.equal(snapshot.lastTriggeredCreatureQueue, true);
assert.deepEqual(snapshot.lastPhaseDurations, {
  playerCompleteMs: 12,
  playerStartMs: 8,
  playerRefreshMs: 3,
  creatureKickMs: 1,
  totalMs: 24,
});

markActionQueuePassError(new Error("queue failure sample"), new Date("2026-06-09T10:00:02.000Z"));
snapshot = getActionQueueRuntimeSnapshot();
assert.equal(snapshot.running, false);
assert.equal(snapshot.lastError, "queue failure sample");

assert.match(formatQueuePhaseDurations(snapshot.lastPhaseDurations), /playerComplete=12 ms/);

const report = formatActionQueueDebugReport({
  playerQueued: 1,
  playerRunning: 2,
  creatureQueued: 3,
  creatureRunning: 4,
  totalQueued: 4,
  totalRunning: 6,
  oldestQueuedAgeMs: 9000,
  oldestQueuedPlayerAgeMs: 1000,
  oldestQueuedCreatureAgeMs: 9000,
  oldestRunningAgeMs: 8000,
  overdueRunning: 2,
  maxOverdueMs: 7000,
  playerOverdue: 1,
  playerMaxOverdueMs: 6000,
  creatureOverdue: 1,
  creatureMaxOverdueMs: 7000,
  topOverdueActions: [{
    id: 42,
    actorType: "CREATURE",
    playerId: null,
    creatureId: 9,
    type: "MOVE",
    executeAt: new Date("2026-06-09T09:59:54.000Z"),
    overdueMs: 6000,
  }],
}, snapshot, getCreatureQueueRuntimeSnapshot(), new Date("2026-06-09T10:00:03.000Z"));
assert.match(report, /Службова черга: debug/);
assert.match(report, /queued: player=1; creature=3; total=4/);
assert.match(report, /#42 creature:9 MOVE overdue=6 s/);

const adminSource = fs.readFileSync("src/handlers/admin.ts", "utf8");
assert.match(adminSource, /QUEUE_DEBUG_TEXT_COMMAND/);
assert.match(adminSource, /QUEUE_NUDGE_TEXT_COMMAND/);
assert.match(adminSource, /runQueueDebugCommand[\s\S]{0,160}requireScribeAdmin/);
assert.match(adminSource, /runQueueNudgeCommand[\s\S]{0,160}requireScribeAdmin/);
assert.match(adminSource, /bot\.command\(\["queueDebug", "queuedebug"\]/);
assert.match(adminSource, /bot\.command\(\["queueNudge", "queuenudge"\]/);
assert.match(adminSource, /bot\.hears\(\["🧵 Службова черга", "Службова черга"\]/);
assert.equal(adminSource.includes('bot.hears(["🧵 Черга дій", "Черга дій"]'), false);

console.log("Action queue performance guards OK");
