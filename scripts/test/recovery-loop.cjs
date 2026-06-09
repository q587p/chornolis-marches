const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  getRecoveryRuntimeSnapshot,
  markRecoveryPassError,
  markRecoveryPassFinished,
  markRecoveryPassStarted,
} = require("../../src/runtimeState");
const {
  formatActionQueueDebugReport,
  formatRecoveryPhaseDurations,
} = require("../../src/services/actionQueueDiagnostics");

markRecoveryPassStarted(new Date("2026-06-09T10:00:00.000Z"));
let recoverySnapshot = getRecoveryRuntimeSnapshot();
assert.equal(recoverySnapshot.running, true);
assert.equal(recoverySnapshot.runningSince.toISOString(), "2026-06-09T10:00:00.000Z");

markRecoveryPassFinished({
  phaseDurations: {
    playersMs: 31,
    creaturesMs: 7,
    totalMs: 38,
  },
  playersScanned: 5,
  playersUpdated: 2,
  playersSkippedActive: 1,
  idleRemindersSent: 1,
  sleepAutoWakes: 1,
  playerMessagesSent: 3,
  creaturesScanned: 4,
  creaturesUpdated: 2,
  activeCreaturesRefreshed: 1,
}, new Date("2026-06-09T10:00:01.000Z"));
recoverySnapshot = getRecoveryRuntimeSnapshot();
assert.equal(recoverySnapshot.running, false);
assert.equal(recoverySnapshot.lastFinishedAt.toISOString(), "2026-06-09T10:00:01.000Z");
assert.equal(recoverySnapshot.lastPlayersScanned, 5);
assert.equal(recoverySnapshot.lastPlayersUpdated, 2);
assert.equal(recoverySnapshot.lastPlayersSkippedActive, 1);
assert.equal(recoverySnapshot.lastIdleRemindersSent, 1);
assert.equal(recoverySnapshot.lastSleepAutoWakes, 1);
assert.equal(recoverySnapshot.lastPlayerMessagesSent, 3);
assert.equal(recoverySnapshot.lastCreaturesScanned, 4);
assert.equal(recoverySnapshot.lastCreaturesUpdated, 2);
assert.equal(recoverySnapshot.lastActiveCreaturesRefreshed, 1);
assert.deepEqual(recoverySnapshot.lastPhaseDurations, {
  playersMs: 31,
  creaturesMs: 7,
  totalMs: 38,
});

const cloned = getRecoveryRuntimeSnapshot();
cloned.lastPhaseDurations.playersMs = 999;
assert.equal(getRecoveryRuntimeSnapshot().lastPhaseDurations.playersMs, 31);

assert.match(formatRecoveryPhaseDurations(recoverySnapshot.lastPhaseDurations), /players=31 ms/);

markRecoveryPassError(new Error("recovery failure sample"), new Date("2026-06-09T10:00:02.000Z"));
recoverySnapshot = getRecoveryRuntimeSnapshot();
assert.equal(recoverySnapshot.running, false);
assert.equal(recoverySnapshot.lastError, "recovery failure sample");

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
  lastMode: "normal",
  lastReason: "no player overdue backpressure",
  lastCompletedCreatureActions: 2,
  lastStartedCreatureActions: 3,
  lastSkippedCreatureStarts: false,
  lastPhaseDurations: {
    creatureCompleteMs: 9,
    creatureStartMs: 4,
    totalMs: 13,
  },
}, {
  ...recoverySnapshot,
  lastError: null,
}, new Date("2026-06-09T10:00:03.000Z"));
assert.match(report, /recovery: running=ні; lastFinished=1 s тому; lastError=немає/);
assert.match(report, /recoveryPhaseMs: players=31 ms; creatures=7 ms; total=38 ms/);
assert.match(report, /recoveryCounts: playersScanned=5; playersUpdated=2; playersSkippedActive=1/);
assert.match(report, /creaturesScanned=4; creaturesUpdated=2; activeCreaturesRefreshed=1/);

const actionLifecycleSource = fs.readFileSync("src/services/actionLifecycle.ts", "utf8");
const actionRecoverySource = fs.readFileSync("src/services/actionRecovery.ts", "utf8");
const recoveryLoopSource = fs.readFileSync("src/services/recoveryLoop.ts", "utf8");
const diagnosticsSource = fs.readFileSync("src/services/actionQueueDiagnostics.ts", "utf8");

assert.equal(actionLifecycleSource.includes("await recoverStamina(bot)"), false);
assert.match(recoveryLoopSource, /withSlowLog\("recoveryLoop\.pass"/);
assert.match(recoveryLoopSource, /markRecoveryPassStarted\(\)/);
assert.match(recoveryLoopSource, /markRecoveryPassFinished\(metrics\)/);
assert.match(recoveryLoopSource, /markRecoveryPassError\(error\)/);
assert.match(actionRecoverySource, /export async function recoverStamina\(bot: Bot\): Promise<RecoveryPassMetrics>/);
assert.equal(/prisma\.creature\.findMany\(\{\s*where:\s*\{\s*isGone:\s*false\s*\}\s*\}\)/s.test(actionRecoverySource), false);
assert.match(actionRecoverySource, /stamina:\s*\{\s*lt:\s*BASE_STAMINA\s*\}/);
assert.match(actionRecoverySource, /staminaMax:\s*\{\s*gt:\s*BASE_STAMINA\s*\}/);
assert.match(actionRecoverySource, /activeCreatureIdList/);
assert.match(diagnosticsSource, /recoveryCounts:/);

console.log("Recovery loop guards OK");
