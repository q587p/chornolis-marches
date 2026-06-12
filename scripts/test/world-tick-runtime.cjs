require("ts-node/register");

const assert = require("node:assert/strict");

const {
  getWorldTickRuntimeSnapshot,
  markWorldTickError,
  markWorldTickFinished,
  markWorldTickPhaseFinished,
  markWorldTickPhaseStarted,
  markWorldTickSkippedBecauseRunning,
  markWorldTickStarted,
  resetWorldTickRuntimeSnapshotForTests,
} = require("../../src/runtimeState");
const {
  formatWorldTickAlreadyRunningText,
  formatWorldTickPhaseDurations,
  formatWorldTickRuntimeStatus,
} = require("../../src/services/worldTick");

const startedAt = new Date("2026-06-12T10:00:00.000Z");
const phaseAt = new Date("2026-06-12T10:00:00.010Z");
const finishedAt = new Date("2026-06-12T10:00:00.200Z");

resetWorldTickRuntimeSnapshotForTests();

let snapshot = getWorldTickRuntimeSnapshot();
assert.equal(snapshot.running, false);
assert.equal(snapshot.lastTickNumber, 0);
assert.equal(snapshot.lastPhaseDurations, null);

markWorldTickStarted(41, startedAt);
snapshot = getWorldTickRuntimeSnapshot();
assert.equal(snapshot.running, true);
assert.equal(snapshot.runningSince.toISOString(), startedAt.toISOString());
assert.equal(snapshot.lastStartedAt.toISOString(), startedAt.toISOString());
assert.equal(snapshot.lastTickNumber, 41);
assert.deepEqual(snapshot.lastPhaseDurations, {});

markWorldTickPhaseStarted("clock/daypart", phaseAt);
markWorldTickPhaseFinished("clock/daypart", 73);
snapshot = getWorldTickRuntimeSnapshot();
assert.equal(snapshot.lastPhase, "clock/daypart");
assert.equal(snapshot.lastPhaseStartedAt.toISOString(), phaseAt.toISOString());
assert.equal(snapshot.lastPhaseDurations["clock/daypart"], 73);
assert.match(formatWorldTickPhaseDurations(snapshot.lastPhaseDurations), /clock\/daypart=/);

const cloned = getWorldTickRuntimeSnapshot();
cloned.lastPhaseDurations["clock/daypart"] = 999;
assert.equal(getWorldTickRuntimeSnapshot().lastPhaseDurations["clock/daypart"], 73);

snapshot = markWorldTickFinished(41, finishedAt);
assert.equal(snapshot.running, false);
assert.equal(snapshot.runningSince, null);
assert.equal(snapshot.lastFinishedAt.toISOString(), finishedAt.toISOString());
assert.equal(snapshot.lastRunDurationMs, 200);

resetWorldTickRuntimeSnapshotForTests();
markWorldTickStarted(42, startedAt);
markWorldTickPhaseStarted("creature-ai-loop", phaseAt);
snapshot = markWorldTickSkippedBecauseRunning();
assert.equal(snapshot.running, true);
assert.equal(snapshot.skippedBecauseRunning, 1);
assert.equal(snapshot.lastTickNumber, 42);

const staleNow = new Date("2026-06-12T10:03:01.000Z");
const runtimeText = formatWorldTickRuntimeStatus(snapshot, staleNow, 120_000);
assert.match(runtimeText, /World tick runtime:/);
assert.match(runtimeText, /running: так/);
assert.match(runtimeText, /current\/last phase: creature-ai-loop/);
assert.match(runtimeText, /понад поріг/);

const manualText = formatWorldTickAlreadyRunningText(snapshot, staleNow, 120_000);
assert.match(manualText, /уже триває/);
assert.match(manualText, /новий ручний тік не запущено/);
assert.match(manualText, /Поточна фаза: creature-ai-loop/);
assert.match(manualText, /понад поріг/);

snapshot = markWorldTickError(new Error("world tick failure sample"), new Date("2026-06-12T10:03:02.000Z"));
assert.equal(snapshot.running, false);
assert.equal(snapshot.lastError, "world tick failure sample");
assert.equal(snapshot.lastRunDurationMs, 182000);

resetWorldTickRuntimeSnapshotForTests();

console.log("World tick runtime diagnostics OK");
