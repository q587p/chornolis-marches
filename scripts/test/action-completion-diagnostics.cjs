const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";
process.env.ACTION_COMPLETION_SLOW_MS = "100";
process.env.ACTION_COMPLETION_SAMPLE_LIMIT = "2";

require("ts-node/register");

const {
  getActionCompletionRuntimeSnapshot,
  markActionCompletionObserved,
  resetActionCompletionRuntimeSnapshotForTests,
} = require("../../src/runtimeState");
const {
  formatActionCompletionDebugSection,
  formatActionCompletionObservation,
  formatActionQueueDebugReport,
} = require("../../src/services/actionQueueDiagnostics");

function observation(overrides = {}) {
  return {
    observedAt: new Date("2026-06-10T10:00:00.000Z"),
    actionId: 100,
    actorType: "PLAYER",
    playerId: 7,
    creatureId: null,
    type: "TRACK",
    durationMs: 40,
    overdueMs: 5,
    outcome: "ok",
    error: null,
    ...overrides,
  };
}

resetActionCompletionRuntimeSnapshotForTests();

markActionCompletionObserved(observation({ actionId: 1, durationMs: 40 }));
let snapshot = getActionCompletionRuntimeSnapshot();
assert.equal(snapshot.slowThresholdMs, 100);
assert.equal(snapshot.totalObservedSinceStart, 1);
assert.equal(snapshot.slowObservedSinceStart, 0);
assert.equal(snapshot.recentSlow.length, 0);
assert.equal(snapshot.recentErrors.length, 0);

markActionCompletionObserved(observation({ actionId: 2, durationMs: 100, overdueMs: 900 }));
snapshot = getActionCompletionRuntimeSnapshot();
assert.equal(snapshot.totalObservedSinceStart, 2);
assert.equal(snapshot.slowObservedSinceStart, 1);
assert.equal(snapshot.recentSlow.length, 1);
assert.equal(snapshot.recentSlow[0].actionId, 2);
assert.equal(snapshot.recentSlow[0].overdueMs, 900);

markActionCompletionObserved(observation({
  actionId: 3,
  durationMs: 20,
  outcome: "error",
  error: "database timeout sanitized",
}));
snapshot = getActionCompletionRuntimeSnapshot();
assert.equal(snapshot.totalObservedSinceStart, 3);
assert.equal(snapshot.slowObservedSinceStart, 1);
assert.equal(snapshot.recentErrors.length, 1);
assert.equal(snapshot.recentErrors[0].actionId, 3);

markActionCompletionObserved(observation({ actionId: 4, durationMs: 101 }));
markActionCompletionObserved(observation({ actionId: 5, durationMs: 102 }));
snapshot = getActionCompletionRuntimeSnapshot();
assert.equal(snapshot.recentSlow.length, 2);
assert.deepEqual(snapshot.recentSlow.map((item) => item.actionId), [5, 4]);

const cloned = getActionCompletionRuntimeSnapshot();
cloned.recentSlow[0].actionId = 999;
assert.equal(getActionCompletionRuntimeSnapshot().recentSlow[0].actionId, 5);

const formattedObservation = formatActionCompletionObservation(observation({
  actionId: 77,
  actorType: "CREATURE",
  playerId: null,
  creatureId: 12,
  type: "MOVE",
  durationMs: 1400,
  overdueMs: 6000,
  outcome: "error",
  error: "compact failure",
}));
assert.match(formattedObservation, /#77 CREATURE creature:12 MOVE duration=1\.4 s overdue=6 s outcome=error error=compact failure/);
assert.doesNotMatch(formattedObservation, /payload|chatId|messageId|private whisper|secret/i);

const debugSection = formatActionCompletionDebugSection(snapshot);
assert.match(debugSection, /completionSlow: threshold=100 ms; total=5; slow=3/);
assert.match(debugSection, /recentSlowCompletions:/);
assert.match(debugSection, /#5 PLAYER player:7 TRACK/);
assert.match(debugSection, /recentCompletionErrors:/);
assert.match(debugSection, /#3 PLAYER player:7 TRACK/);
assert.doesNotMatch(debugSection, /payload|chatId|messageId|private whisper|secret/i);

const report = formatActionQueueDebugReport({
  playerQueued: 0,
  playerRunning: 0,
  creatureQueued: 0,
  creatureRunning: 0,
  totalQueued: 0,
  totalRunning: 0,
  oldestQueuedAgeMs: 0,
  oldestQueuedPlayerAgeMs: 0,
  oldestQueuedCreatureAgeMs: 0,
  oldestRunningAgeMs: 0,
  overdueRunning: 0,
  maxOverdueMs: 0,
  playerOverdue: 0,
  playerMaxOverdueMs: 0,
  creatureOverdue: 0,
  creatureMaxOverdueMs: 0,
  topOverdueActions: [],
}, {
  running: false,
  runningSince: null,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastError: null,
  lastPhaseDurations: null,
  lastCompletedPlayerActions: 0,
  lastStartedPlayerActions: 0,
  lastTriggeredCreatureQueue: false,
}, {
  running: false,
  runningSince: null,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastError: null,
  lastMode: null,
  lastReason: null,
  lastCompletedCreatureActions: 0,
  lastStartedCreatureActions: 0,
  lastSkippedCreatureStarts: false,
  lastPhaseDurations: null,
}, new Date("2026-06-10T10:00:03.000Z"));
assert.match(report, /completionSlow: threshold=100 ms; total=5; slow=3/);
assert.match(report, /recentSlowCompletions:/);
assert.match(report, /recentCompletionErrors:/);

resetActionCompletionRuntimeSnapshotForTests();
assert.match(formatActionCompletionDebugSection(getActionCompletionRuntimeSnapshot()), /recentSlowCompletions:\nнемає\nrecentCompletionErrors:\nнемає/);

const actionLifecycleSource = fs.readFileSync("src/services/actionLifecycle.ts", "utf8");
const directCompleteCalls = actionLifecycleSource.match(/await completeAction\(bot, action\);/g) ?? [];
const observedCompleteCalls = actionLifecycleSource.match(/completeActionWithObservation\(bot, action, completeAction\)/g) ?? [];
assert.equal(directCompleteCalls.length, 1, "only the observation helper should call completeAction directly");
assert.equal(observedCompleteCalls.length, 2, "player and creature completion loops should use the observation helper");
assert.match(actionLifecycleSource, /slow:actionCompletion actor=/);
assert.match(actionLifecycleSource, /outcome=\$\{observation\.outcome\}/);
assert.doesNotMatch(actionLifecycleSource, /action\.payload[\s\S]{0,160}slow:actionCompletion|slow:actionCompletion[\s\S]{0,160}action\.payload/);

console.log("Action completion diagnostics OK");
