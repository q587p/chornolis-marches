const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";
process.env.TELEGRAM_SEND_SLOW_MS = "50";
process.env.TELEGRAM_SEND_SAMPLE_LIMIT = "2";

require("ts-node/register");

const {
  getTelegramSendRuntimeSnapshot,
  markTelegramSendObserved,
  resetTelegramSendRuntimeSnapshotForTests,
} = require("../../src/runtimeState");
const {
  formatActionQueueDebugReport,
  formatTelegramSendDebugSection,
  formatTelegramSendObservation,
} = require("../../src/services/actionQueueDiagnostics");
const {
  safeSendMessage,
  sanitizeTelegramSendContext,
} = require("../../src/utils/telegram");

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

function dangerousTextPattern() {
  return /chatId|123456789|message text|payload|token|secret|private whisper/i;
}

(async () => {
  resetTelegramSendRuntimeSnapshotForTests();

  assert.equal(sanitizeTelegramSendContext(" notifyRegion   123456789   token "), "notifyRegion # [redacted]");

  let now = 1000;
  const originalNow = Date.now;
  const originalWarn = console.warn;
  const warnings = [];
  Date.now = () => now;
  console.warn = (...args) => warnings.push(args.join(" "));

  try {
    const okBot = {
      api: {
        sendMessage: async (chatId, text, options) => {
          now += 20;
          return { message_id: 1, chatId, text, options };
        },
      },
    };
    const okMessage = await safeSendMessage(
      okBot,
      "123456789",
      "private whisper message text payload token secret",
      { reply_markup: { inline_keyboard: [] } },
      "notifyRegion 123456789",
    );
    assert.equal(okMessage.message_id, 1);

    let snapshot = getTelegramSendRuntimeSnapshot();
    assert.equal(snapshot.slowThresholdMs, 50);
    assert.equal(snapshot.totalObservedSinceStart, 1);
    assert.equal(snapshot.slowObservedSinceStart, 0);
    assert.equal(snapshot.blockedSinceStart, 0);
    assert.equal(snapshot.errorSinceStart, 0);
    assert.equal(snapshot.recentSlow.length, 0);

    const slowBot = {
      api: {
        sendMessage: async () => {
          now += 75;
          return { message_id: 2 };
        },
      },
    };
    await safeSendMessage(slowBot, "123456789", "message text should never be observed", undefined, "notifyAllCurrentPlayers");
    snapshot = getTelegramSendRuntimeSnapshot();
    assert.equal(snapshot.totalObservedSinceStart, 2);
    assert.equal(snapshot.slowObservedSinceStart, 1);
    assert.equal(snapshot.recentSlow.length, 1);
    assert.equal(snapshot.recentSlow[0].context, "notifyAllCurrentPlayers");
    assert.equal(snapshot.recentSlow[0].outcome, "ok");
    assert.equal(snapshot.recentSlow[0].hasReplyMarkup, false);

    const blockedError = {
      error_code: 403,
      description: "Forbidden: bot was blocked by the user",
    };
    const blockedBot = {
      api: {
        sendMessage: async () => {
          now += 10;
          throw blockedError;
        },
      },
    };
    assert.equal(await safeSendMessage(blockedBot, "123456789", "blocked text", undefined, "notifyRegionExcept"), null);
    snapshot = getTelegramSendRuntimeSnapshot();
    assert.equal(snapshot.blockedSinceStart, 1);
    assert.equal(snapshot.totalObservedSinceStart, 3);

    const unexpected = new Error("network failure chatId=123456789 payload token secret private whisper message text");
    const failingBot = {
      api: {
        sendMessage: async () => {
          now += 5;
          throw unexpected;
        },
      },
    };
    await assert.rejects(
      () => safeSendMessage(failingBot, "123456789", "error text", undefined, "notifyRegionScribeAdmins"),
      unexpected,
    );
    snapshot = getTelegramSendRuntimeSnapshot();
    assert.equal(snapshot.errorSinceStart, 1);
    assert.equal(snapshot.recentErrors.length, 1);
    assert.equal(snapshot.recentErrors[0].context, "notifyRegionScribeAdmins");
    assert.doesNotMatch(snapshot.recentErrors[0].error, dangerousTextPattern());

    markTelegramSendObserved({
      observedAt: new Date("2026-06-10T11:00:00.000Z"),
      context: "slow-one",
      durationMs: 80,
      outcome: "ok",
      error: null,
    });
    markTelegramSendObserved({
      observedAt: new Date("2026-06-10T11:01:00.000Z"),
      context: "slow-two",
      durationMs: 90,
      outcome: "ok",
      error: null,
    });
    snapshot = getTelegramSendRuntimeSnapshot();
    assert.equal(snapshot.recentSlow.length, 2);
    assert.deepEqual(snapshot.recentSlow.map((item) => item.context), ["slow-two", "slow-one"]);

    const cloned = getTelegramSendRuntimeSnapshot();
    cloned.recentSlow[0].context = "mutated";
    cloned.recentSlow[0].observedAt.setFullYear(1999);
    assert.equal(getTelegramSendRuntimeSnapshot().recentSlow[0].context, "slow-two");
    assert.equal(getTelegramSendRuntimeSnapshot().recentSlow[0].observedAt.getFullYear(), 2026);

    const formattedObservation = formatTelegramSendObservation({
      observedAt: new Date("2026-06-10T11:02:00.000Z"),
      context: "notifyLocation",
      durationMs: 1400,
      outcome: "error",
      error: "network failure",
      hasReplyMarkup: true,
    });
    assert.match(formattedObservation, /notifyLocation duration=1\.4 s outcome=error replyMarkup=yes error=network failure/);
    assert.doesNotMatch(formattedObservation, dangerousTextPattern());

    const debugSection = formatTelegramSendDebugSection(snapshot);
    assert.match(debugSection, /telegramSend: threshold=50 ms; total=6; slow=3; blocked=1; errors=1/);
    assert.match(debugSection, /recentSlowTelegramSends:/);
    assert.match(debugSection, /slow-two duration=90 ms outcome=ok/);
    assert.match(debugSection, /recentTelegramSendErrors:/);
    assert.match(debugSection, /notifyRegionScribeAdmins duration=5 ms outcome=error/);
    assert.doesNotMatch(debugSection, dangerousTextPattern());

    const report = formatActionQueueDebugReport(baseStats(), queueSnapshot(), creatureSnapshot(), new Date("2026-06-10T11:03:00.000Z"));
    assert.match(report, /telegramSend: threshold=50 ms; total=6; slow=3; blocked=1; errors=1/);
    assert.match(report, /recentSlowTelegramSends:/);
    assert.match(report, /recentTelegramSendErrors:/);
    assert.doesNotMatch(report, dangerousTextPattern());

    assert.ok(warnings.some((line) => /slow:telegramSend context=notifyAllCurrentPlayers durationMs=75 outcome=ok/.test(line)));
    assert.ok(warnings.some((line) => /slow:telegramSend context=notifyRegionScribeAdmins durationMs=5 outcome=error/.test(line)));
    assert.doesNotMatch(warnings.join("\n"), dangerousTextPattern());
  } finally {
    Date.now = originalNow;
    console.warn = originalWarn;
  }

  const notificationsSource = fs.readFileSync("src/services/notifications.ts", "utf8");
  assert.equal((notificationsSource.match(/bot\.api\.sendMessage/g) ?? []).length, 0, "notifications fan-out should route through safeSendMessage");
  for (const label of [
    "notifyLocation",
    "notifyRegion",
    "notifyAllCurrentPlayers",
    "notifyAllWakingCurrentPlayers",
    "notifyAllDaypartNoticePlayers",
    "notifyRegionExcept",
    "notifyRegionScribeAdmins",
    "notifyRegionTechnicalScribes",
  ]) {
    assert.match(notificationsSource, new RegExp(`safeSendMessage[\\s\\S]{0,240}"${label}"`), `${label} should be a stable Telegram send context`);
  }

  const telegramSource = fs.readFileSync("src/utils/telegram.ts", "utf8");
  assert.match(telegramSource, /markTelegramSendObserved\(observation\)/, "safeSendMessage should record Telegram send telemetry");
  assert.doesNotMatch(telegramSource, /chatId[\s\S]{0,120}console\.warn|console\.warn[\s\S]{0,120}chatId/, "Telegram send warnings should not include chat IDs");

  resetTelegramSendRuntimeSnapshotForTests();
  assert.match(formatTelegramSendDebugSection(getTelegramSendRuntimeSnapshot()), /recentSlowTelegramSends:\nнемає\nrecentTelegramSendErrors:\nнемає/);

  console.log("Telegram send diagnostics OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
