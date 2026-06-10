const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";
process.env.DEFERRED_TELEGRAM_ENABLED = "true";
process.env.DEFERRED_TELEGRAM_MAX_PENDING = "2";
process.env.DEFERRED_TELEGRAM_MAX_PER_PASS = "5";
process.env.DEFERRED_TELEGRAM_MAX_AGE_MS = "300000";
process.env.TELEGRAM_SEND_SLOW_MS = "50";

require("ts-node/register");

const {
  getTelegramSendRuntimeSnapshot,
  resetTelegramSendRuntimeSnapshotForTests,
} = require("../../src/runtimeState");
const {
  deferTelegramFollowup,
  drainDeferredTelegramOnceForTests,
  getDeferredTelegramSnapshot,
  resetDeferredTelegramForTests,
} = require("../../src/services/deferredTelegram");
const {
  formatDeferredTelegramDebugSection,
  formatActionQueueDebugReport,
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

function recoverySnapshot() {
  return {
    running: false,
    runningSince: null,
    lastStartedAt: null,
    lastFinishedAt: null,
    lastError: null,
    lastPhaseDurations: null,
    lastPlayersScanned: 0,
    lastPlayersUpdated: 0,
    lastPlayersSkippedActive: 0,
    lastIdleRemindersSent: 0,
    lastSleepAutoWakes: 0,
    lastPlayerMessagesSent: 0,
    lastCreaturesScanned: 0,
    lastCreaturesUpdated: 0,
    lastActiveCreaturesRefreshed: 0,
  };
}

function dangerousTextPattern() {
  return /123456789|987654321|message text|private whisper|payload|token|secret|raw body/i;
}

(async () => {
  resetDeferredTelegramForTests();
  resetTelegramSendRuntimeSnapshotForTests();

  let sent = [];
  const okBot = {
    api: {
      sendMessage: async (chatId, text, options) => {
        sent.push({ chatId, text, options });
        return { message_id: sent.length, chatId, text, options };
      },
    },
  };

  assert.equal(deferTelegramFollowup({
    chatId: "123456789",
    text: "message text private whisper payload token secret",
    options: { parse_mode: "HTML" },
    context: "actionCompletion.tutorial.lookHint 123456789 token",
    reason: "tutorial",
    dedupeKey: "tutorial:123456789:look",
  }), true);

  let snapshot = getDeferredTelegramSnapshot();
  assert.equal(snapshot.pendingCount, 1);
  assert.equal(snapshot.totalQueuedSinceStart, 1);
  assert.equal(snapshot.totalDroppedSinceStart, 0);
  assert.doesNotMatch(JSON.stringify(snapshot), dangerousTextPattern());

  assert.equal(deferTelegramFollowup({
    chatId: "123456789",
    text: "duplicate message text",
    context: "actionCompletion.tutorial.lookHint",
    reason: "tutorial",
    dedupeKey: "tutorial:123456789:look",
  }), false);
  snapshot = getDeferredTelegramSnapshot();
  assert.equal(snapshot.pendingCount, 1);
  assert.equal(snapshot.totalDroppedSinceStart, 1);

  await drainDeferredTelegramOnceForTests(okBot);
  snapshot = getDeferredTelegramSnapshot();
  assert.equal(snapshot.pendingCount, 0);
  assert.equal(snapshot.totalSentSinceStart, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].chatId, "123456789", "delivery still uses the real chat id internally");
  assert.equal(sent[0].text, "message text private whisper payload token secret");

  const sendSnapshot = getTelegramSendRuntimeSnapshot();
  assert.equal(sendSnapshot.totalObservedSinceStart, 1, "deferred delivery should use observedSendMessage telemetry");
  assert.equal(sendSnapshot.recentErrors.length, 0);

  const debug = formatDeferredTelegramDebugSection(snapshot, new Date("2026-06-10T12:00:00.000Z"));
  assert.match(debug, /deferredTelegram: enabled=так; running=ні; pending=0; queued=1; sent=1; dropped=1; expired=0; errors=0/);
  assert.match(debug, /actionCompletion\.tutorial\.lookHint # \[redacted\] sent/);
  assert.doesNotMatch(debug, dangerousTextPattern());

  resetDeferredTelegramForTests();
  process.env.DEFERRED_TELEGRAM_MAX_PENDING = "1";
  assert.equal(deferTelegramFollowup({ chatId: "1", text: "one", context: "one", reason: "ambient" }), true);
  assert.equal(deferTelegramFollowup({ chatId: "2", text: "two", context: "two", reason: "ambient" }), false);
  snapshot = getDeferredTelegramSnapshot();
  assert.equal(snapshot.pendingCount, 1);
  assert.equal(snapshot.totalDroppedSinceStart, 1);
  assert.match(formatDeferredTelegramDebugSection(snapshot), /two dropped error=full/);

  resetDeferredTelegramForTests();
  assert.equal(deferTelegramFollowup({
    chatId: "123456789",
    text: "old message text",
    context: "old",
    reason: "guidance",
    expiresAt: new Date(Date.now() - 1),
  }), false);
  snapshot = getDeferredTelegramSnapshot();
  assert.equal(snapshot.totalExpiredSinceStart, 1);
  assert.equal(snapshot.pendingCount, 0);

  resetDeferredTelegramForTests();
  const errorBot = {
    api: {
      sendMessage: async () => {
        throw new Error("network failure chatId=987654321 message text payload token secret raw body");
      },
    },
  };
  assert.equal(deferTelegramFollowup({
    chatId: "987654321",
    text: "message text should stay private",
    context: "actionRecovery.idleReminder 987654321",
    reason: "recovery-extra",
  }), true);
  await drainDeferredTelegramOnceForTests(errorBot);
  snapshot = getDeferredTelegramSnapshot();
  assert.equal(snapshot.totalErrorsSinceStart, 1);
  assert.equal(snapshot.pendingCount, 0);
  assert.doesNotMatch(JSON.stringify(snapshot), dangerousTextPattern());

  const report = formatActionQueueDebugReport(
    baseStats(),
    queueSnapshot(),
    creatureSnapshot(),
    recoverySnapshot(),
    new Date("2026-06-10T12:01:00.000Z"),
    snapshot,
  );
  assert.match(report, /deferredTelegram: enabled=так; running=ні; pending=0/);
  assert.match(report, /deferredTelegramRecent:/);
  assert.doesNotMatch(report, dangerousTextPattern());

  const serviceSource = fs.readFileSync("src/services/deferredTelegram.ts", "utf8");
  assert.match(serviceSource, /observedSendMessage\(bot, item\.chatId, item\.text, item\.options, item\.context\)/);
  assert.equal((serviceSource.match(/console\.(warn|log|error)/g) ?? []).length, 0, "deferred service should not log chat ids or text");

  const completionSource = fs.readFileSync("src/services/actionCompletions.ts", "utf8");
  assert.match(completionSource, /deferActionCompletionFollowup[\s\S]{0,320}actionCompletion\.tutorial\.\$\{commandKey\}Hint/);
  assert.match(completionSource, /deferActionCompletionFollowup[\s\S]{0,320}actionCompletion\.tutorial\.firstNightGuidance/);
  assert.match(completionSource, /deferActionCompletionFollowup[\s\S]{0,320}actionCompletion\.mentorship\.reply/);
  assert.match(completionSource, /deferActionCompletionFollowup[\s\S]{0,320}actionCompletion\.mentorship\.brewingHint/);
  assert.match(completionSource, /sendActionCompletionMessage\(bot, action, chatId, observation\.mentorshipLessonText/);

  const recoverySource = fs.readFileSync("src/services/actionRecovery.ts", "utf8");
  assert.match(recoverySource, /deferRecoveryFollowup[\s\S]{0,240}actionRecovery\.idleReminder/);
  assert.match(recoverySource, /deferRecoveryFollowup[\s\S]{0,240}actionRecovery\.daypartHint/);
  assert.match(recoverySource, /deferRecoveryFollowup[\s\S]{0,240}actionRecovery\.tutorialRestNotice/);
  assert.match(recoverySource, /observedSendMessage\(bot, chatId, result\.message[\s\S]{0,120}actionRecovery\.sleepAutoWake/);
  assert.match(recoverySource, /observedSendMessage\(bot, chatId, fatigueGuidanceText/);
  assert.match(recoverySource, /observedSendMessage\(bot, chatId, hungerCueText/);

  const gameBotSource = fs.readFileSync("src/apps/gameBot.ts", "utf8");
  const heraldSource = fs.readFileSync("src/apps/heraldBot.ts", "utf8");
  assert.match(gameBotSource, /startDeferredTelegramLoop\(bot\)/);
  assert.doesNotMatch(heraldSource, /startDeferredTelegramLoop/);

  console.log("Deferred Telegram follow-ups OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
