const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";
process.env.DATABASE_QUERY_OBSERVABILITY_ENABLED = "true";
process.env.DATABASE_QUERY_SLOW_MS = "100";
process.env.DATABASE_QUERY_SAMPLE_LIMIT = "2";

require("ts-node/register");

const {
  compactDatabaseQueryError,
  databaseQueryObservabilityEnabled,
  databaseQuerySampleLimit,
  databaseQuerySlowThresholdMs,
  getDatabaseQueryRuntimeSnapshot,
  markDatabaseQueryObserved,
  resetDatabaseQueryRuntimeSnapshotForTests,
} = require("../../src/runtimeState");
const {
  formatActionQueueDebugReport,
  formatDatabaseQueryDebugSection,
  formatDatabaseQueryObservation,
} = require("../../src/services/actionQueueDiagnostics");

function baseStats() {
  return {
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
  };
}

function queueSnapshot() {
  return {
    running: false,
    runningSince: null,
    lastStartedAt: null,
    lastFinishedAt: null,
    lastError: null,
    lastPhaseDurations: null,
    lastCompletedPlayerActions: 0,
    lastStartedPlayerActions: 0,
    lastTriggeredCreatureQueue: false,
  };
}

function creatureSnapshot() {
  return {
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
  };
}

function observation(overrides = {}) {
  return {
    observedAt: new Date("2026-06-10T12:00:00.000Z"),
    model: "WorldAction",
    action: "findMany",
    durationMs: 40,
    outcome: "ok",
    error: null,
    ...overrides,
  };
}

function dangerousTextPattern() {
  return /chatId|123456789|message text|payload|token|secret|private whisper|whisper|sql|params|parameters|query args/i;
}

resetDatabaseQueryRuntimeSnapshotForTests();

assert.equal(databaseQueryObservabilityEnabled(), true);
assert.equal(databaseQuerySlowThresholdMs(), 100);
assert.equal(databaseQuerySampleLimit(), 2);

let originalWarn = console.warn;
const warnings = [];
console.warn = (...args) => warnings.push(args.join(" "));

try {
  markDatabaseQueryObserved(observation({ durationMs: 40 }));
  let snapshot = getDatabaseQueryRuntimeSnapshot();
  assert.equal(snapshot.enabled, true);
  assert.equal(snapshot.slowThresholdMs, 100);
  assert.equal(snapshot.sampleLimit, 2);
  assert.equal(snapshot.totalObservedSinceStart, 1);
  assert.equal(snapshot.slowObservedSinceStart, 0);
  assert.equal(snapshot.errorSinceStart, 0);
  assert.equal(snapshot.recentSlow.length, 0);
  assert.equal(snapshot.recentErrors.length, 0);

  markDatabaseQueryObserved(observation({ model: "Player", action: "findFirst", durationMs: 120 }));
  snapshot = getDatabaseQueryRuntimeSnapshot();
  assert.equal(snapshot.totalObservedSinceStart, 2);
  assert.equal(snapshot.slowObservedSinceStart, 1);
  assert.equal(snapshot.recentSlow.length, 1);
  assert.equal(snapshot.recentSlow[0].model, "Player");
  assert.equal(snapshot.recentSlow[0].action, "findFirst");

  const rawError = new Error("database failed chatId=123456789 payload token secret private whisper message text SQL params query args");
  markDatabaseQueryObserved(observation({
    model: "Creature",
    action: "updateMany",
    durationMs: 20,
    outcome: "error",
    error: rawError.message,
  }));
  snapshot = getDatabaseQueryRuntimeSnapshot();
  assert.equal(snapshot.totalObservedSinceStart, 3);
  assert.equal(snapshot.slowObservedSinceStart, 1);
  assert.equal(snapshot.errorSinceStart, 1);
  assert.equal(snapshot.recentErrors.length, 1);
  assert.equal(snapshot.recentErrors[0].model, "Creature");
  assert.doesNotMatch(snapshot.recentErrors[0].error, dangerousTextPattern());

  markDatabaseQueryObserved(observation({ model: "Location", action: "findMany", durationMs: 121 }));
  markDatabaseQueryObserved(observation({ model: "WorldEvent", action: "create", durationMs: 122 }));
  snapshot = getDatabaseQueryRuntimeSnapshot();
  assert.equal(snapshot.recentSlow.length, 2);
  assert.deepEqual(snapshot.recentSlow.map((item) => `${item.model}.${item.action}`), ["WorldEvent.create", "Location.findMany"]);

  const cloned = getDatabaseQueryRuntimeSnapshot();
  cloned.recentSlow[0].model = "mutated";
  cloned.recentSlow[0].observedAt.setFullYear(1999);
  assert.equal(getDatabaseQueryRuntimeSnapshot().recentSlow[0].model, "WorldEvent");
  assert.equal(getDatabaseQueryRuntimeSnapshot().recentSlow[0].observedAt.getFullYear(), 2026);

  const compactError = compactDatabaseQueryError(rawError);
  assert.doesNotMatch(compactError, dangerousTextPattern());

  const formattedObservation = formatDatabaseQueryObservation(observation({
    model: "Player",
    action: "findMany",
    durationMs: 1400,
    outcome: "error",
    error: compactError,
  }));
  assert.match(formattedObservation, /Player\.findMany duration=1\.4 s outcome=error error=/);
  assert.doesNotMatch(formattedObservation, dangerousTextPattern());

  const debugSection = formatDatabaseQueryDebugSection(snapshot);
  assert.match(debugSection, /databaseQuery: enabled=так; threshold=100 ms; sampleLimit=2; total=5; slow=3; errors=1/);
  assert.match(debugSection, /recentSlowDatabaseQueries:/);
  assert.match(debugSection, /WorldEvent\.create duration=122 ms outcome=ok/);
  assert.match(debugSection, /recentDatabaseQueryErrors:/);
  assert.match(debugSection, /Creature\.updateMany duration=20 ms outcome=error/);
  assert.doesNotMatch(debugSection, dangerousTextPattern());

  const report = formatActionQueueDebugReport(baseStats(), queueSnapshot(), creatureSnapshot(), new Date("2026-06-10T12:01:00.000Z"));
  assert.match(report, /databaseQuery: enabled=так; threshold=100 ms; sampleLimit=2; total=5; slow=3; errors=1/);
  assert.match(report, /recentSlowDatabaseQueries:/);
  assert.match(report, /recentDatabaseQueryErrors:/);
  assert.doesNotMatch(report, dangerousTextPattern());

  assert.ok(warnings.some((line) => /slow:databaseQuery model=Player action=findFirst durationMs=120 outcome=ok/.test(line)));
  assert.ok(warnings.some((line) => /slow:databaseQuery model=Creature action=updateMany durationMs=20 outcome=error/.test(line)));
  assert.doesNotMatch(warnings.join("\n"), dangerousTextPattern());
} finally {
  console.warn = originalWarn;
}

process.env.DATABASE_QUERY_OBSERVABILITY_ENABLED = "false";
resetDatabaseQueryRuntimeSnapshotForTests();
markDatabaseQueryObserved(observation({ durationMs: 200 }));
let disabledSnapshot = getDatabaseQueryRuntimeSnapshot();
assert.equal(disabledSnapshot.enabled, false);
assert.equal(disabledSnapshot.totalObservedSinceStart, 0);
assert.match(formatDatabaseQueryDebugSection(disabledSnapshot), /databaseQuery: enabled=ні; threshold=100 ms; sampleLimit=2; total=0; slow=0; errors=0/);

process.env.DATABASE_QUERY_OBSERVABILITY_ENABLED = "true";
resetDatabaseQueryRuntimeSnapshotForTests();
assert.match(formatDatabaseQueryDebugSection(getDatabaseQueryRuntimeSnapshot()), /recentSlowDatabaseQueries:\nнемає\nrecentDatabaseQueryErrors:\nнемає/);

process.env.DATABASE_QUERY_SAMPLE_LIMIT = "99";
assert.equal(databaseQuerySampleLimit(), 50);
process.env.DATABASE_QUERY_SAMPLE_LIMIT = "0";
assert.equal(databaseQuerySampleLimit(), 1);
process.env.DATABASE_QUERY_SAMPLE_LIMIT = "2";

const dbSource = fs.readFileSync("src/db.ts", "utf8");
assert.match(dbSource, /markDatabaseQueryObserved/, "shared Prisma client should record database query observations");
assert.match(dbSource, /\$extends/, "shared Prisma client should use a central extension for query observation");
assert.match(dbSource, /\$allOperations/, "shared Prisma client should instrument model operations centrally");
assert.doesNotMatch(dbSource, /console\.warn/, "Prisma client instrumentation should delegate sanitized logging to runtimeState");

const diagnosticsSource = fs.readFileSync("src/services/actionQueueDiagnostics.ts", "utf8");
assert.match(diagnosticsSource, /formatDatabaseQueryDebugSection/, "queue debug should include a database query diagnostics formatter");
assert.match(diagnosticsSource, /databaseQuery:/, "queue debug should include the databaseQuery section");
assert.doesNotMatch(diagnosticsSource, /\b(sql|params|parameters|args)\b/i, "database query debug formatting should not print raw query details");

console.log("Database query diagnostics OK");
