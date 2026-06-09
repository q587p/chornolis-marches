const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  creatureQueueBackpressureConfig,
  planCreatureQueueBackpressure,
} = require("../../src/services/actionQueueBackpressure");
const {
  getCreatureQueueRuntimeSnapshot,
  markCreatureQueuePassError,
  markCreatureQueuePassFinished,
  markCreatureQueuePassStarted,
} = require("../../src/runtimeState");
const {
  formatActionQueueDebugReport,
  formatCreatureQueuePhaseDurations,
} = require("../../src/services/actionQueueDiagnostics");

const baseConfig = {
  enabled: true,
  playerOverdueMs: 1000,
  pauseStartsMs: 5000,
  normalRunningBatch: 1000,
  normalCompletionConcurrency: 25,
  normalStartBatch: 1000,
  runningBatch: 50,
  completionConcurrency: 5,
  startBatch: 0,
};

function plan(input) {
  return planCreatureQueueBackpressure({
    playerQueued: 0,
    playerRunning: 0,
    creatureQueued: 10,
    creatureRunning: 20,
    ...input,
    config: { ...baseConfig, ...(input.config ?? {}) },
  });
}

assert.deepEqual(
  plan({ playerOverdue: 0, playerMaxOverdueMs: 0 }),
  {
    mode: "normal",
    reason: "no player overdue backpressure",
    runningBatch: 1000,
    completionConcurrency: 25,
    startBatch: 1000,
    playerOverdue: 0,
    playerMaxOverdueMs: 0,
  },
);

assert.equal(plan({ playerOverdue: 1, playerMaxOverdueMs: 999 }).mode, "normal");

const limited = plan({ playerOverdue: 2, playerMaxOverdueMs: 1200 });
assert.equal(limited.mode, "limited");
assert.equal(limited.runningBatch, 50);
assert.equal(limited.completionConcurrency, 5);
assert.equal(limited.startBatch, 0);
assert.match(limited.reason, /player overdue 1200 ms/);

const pauseStarts = plan({ playerOverdue: 3, playerMaxOverdueMs: 6000, config: { startBatch: 2 } });
assert.equal(pauseStarts.mode, "pause-starts");
assert.equal(pauseStarts.startBatch, 0);
assert.equal(pauseStarts.runningBatch, 50);

const disabled = plan({ playerOverdue: 3, playerMaxOverdueMs: 6000, config: { enabled: false } });
assert.equal(disabled.mode, "normal");
assert.equal(disabled.reason, "backpressure disabled");
assert.equal(disabled.startBatch, 1000);

const clamped = creatureQueueBackpressureConfig({
  normalRunningBatch: -1,
  normalCompletionConcurrency: -5,
  normalStartBatch: -2,
  runningBatch: -10,
  completionConcurrency: -3,
  startBatch: -4,
});
assert.equal(clamped.normalRunningBatch, 1000);
assert.equal(clamped.normalCompletionConcurrency, 25);
assert.equal(clamped.normalStartBatch, 1000);
assert.equal(clamped.runningBatch, 50);
assert.equal(clamped.completionConcurrency, 5);
assert.equal(clamped.startBatch, 0);

markCreatureQueuePassStarted(new Date("2026-06-09T10:00:00.000Z"));
let snapshot = getCreatureQueueRuntimeSnapshot();
assert.equal(snapshot.running, true);
assert.equal(snapshot.runningSince.toISOString(), "2026-06-09T10:00:00.000Z");

markCreatureQueuePassFinished({
  mode: "pause-starts",
  reason: "player overdue 6200 ms",
  completedCreatureActions: 12,
  startedCreatureActions: 0,
  skippedCreatureStarts: true,
  phaseDurations: {
    creatureCompleteMs: 84,
    creatureStartMs: 0,
    totalMs: 86,
  },
}, new Date("2026-06-09T10:00:01.000Z"));
snapshot = getCreatureQueueRuntimeSnapshot();
assert.equal(snapshot.running, false);
assert.equal(snapshot.lastMode, "pause-starts");
assert.equal(snapshot.lastReason, "player overdue 6200 ms");
assert.equal(snapshot.lastCompletedCreatureActions, 12);
assert.equal(snapshot.lastStartedCreatureActions, 0);
assert.equal(snapshot.lastSkippedCreatureStarts, true);
assert.deepEqual(snapshot.lastPhaseDurations, {
  creatureCompleteMs: 84,
  creatureStartMs: 0,
  totalMs: 86,
});

const cloned = getCreatureQueueRuntimeSnapshot();
cloned.lastPhaseDurations.creatureCompleteMs = 1;
assert.equal(getCreatureQueueRuntimeSnapshot().lastPhaseDurations.creatureCompleteMs, 84);

markCreatureQueuePassError(new Error("creature failure sample"), new Date("2026-06-09T10:00:02.000Z"));
snapshot = getCreatureQueueRuntimeSnapshot();
assert.equal(snapshot.running, false);
assert.equal(snapshot.lastError, "creature failure sample");

assert.match(formatCreatureQueuePhaseDurations(snapshot.lastPhaseDurations), /complete=84 ms/);

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
  topOverdueActions: [],
}, {
  running: false,
  runningSince: null,
  lastStartedAt: new Date("2026-06-09T10:00:00.000Z"),
  lastFinishedAt: new Date("2026-06-09T10:00:01.000Z"),
  lastError: null,
  lastPhaseDurations: {
    playerCompleteMs: 12,
    playerStartMs: 8,
    playerRefreshMs: 3,
    creatureKickMs: 1,
    totalMs: 24,
  },
  lastCompletedPlayerActions: 2,
  lastStartedPlayerActions: 1,
  lastTriggeredCreatureQueue: true,
}, {
  running: false,
  runningSince: null,
  lastStartedAt: new Date("2026-06-09T10:00:00.000Z"),
  lastFinishedAt: new Date("2026-06-09T10:00:01.000Z"),
  lastError: null,
  lastMode: "pause-starts",
  lastReason: "player overdue 6200 ms",
  lastCompletedCreatureActions: 12,
  lastStartedCreatureActions: 0,
  lastSkippedCreatureStarts: true,
  lastPhaseDurations: {
    creatureCompleteMs: 84,
    creatureStartMs: 0,
    totalMs: 86,
  },
}, new Date("2026-06-09T10:00:03.000Z"));
assert.match(report, /Службова черга: debug/);
assert.match(report, /creatureQueue: running=ні; mode=pause-starts; reason=player overdue 6200 ms/);
assert.match(report, /creaturePhaseMs: complete=84 ms; start=0 ms; total=86 ms/);
assert.match(report, /creatureCounts: completed=12; started=0; skippedStarts=yes/);

const actionLifecycleSource = fs.readFileSync("src/services/actionLifecycle.ts", "utf8");
const actionQueueSource = fs.readFileSync("src/services/actionQueue.ts", "utf8");
const adminSource = fs.readFileSync("src/handlers/admin.ts", "utf8");
const replyKeyboardSource = fs.readFileSync("src/ui/replyKeyboard.ts", "utf8");

assert.equal(actionLifecycleSource.includes("await recoverStamina(bot)"), false);
assert.equal(/nudgeActionQueueLoop[\s\S]*setInterval/.test(actionQueueSource), false);
assert.match(adminSource, /bot\.hears\(\["🧵 Службова черга", "Службова черга"\]/);
assert.equal(adminSource.includes('bot.hears(["🧵 Черга дій", "Черга дій"]'), false);
assert.match(replyKeyboardSource, /"🧵 Службова черга"/);

console.log("Action queue backpressure guards OK");
