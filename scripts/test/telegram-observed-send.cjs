const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.TELEGRAM_SEND_SLOW_MS = "50";
process.env.TELEGRAM_SEND_SAMPLE_LIMIT = "5";

require("ts-node/register");

const {
  getTelegramSendRuntimeSnapshot,
  resetTelegramSendRuntimeSnapshotForTests,
} = require("../../src/runtimeState");
const {
  formatTelegramSendDebugSection,
} = require("../../src/services/actionQueueDiagnostics");
const {
  observedSendMessage,
  safeSendMessage,
} = require("../../src/utils/telegram");

function dangerousTextPattern() {
  return /chatId|123456789|message text|payload|token|secret|private whisper|raw body/i;
}

(async () => {
  resetTelegramSendRuntimeSnapshotForTests();

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
          now += 25;
          return { message_id: 11, chatId, text, options };
        },
      },
    };
    const ok = await observedSendMessage(
      okBot,
      "123456789",
      "message text payload token secret private whisper",
      { reply_markup: { inline_keyboard: [] } },
      "actionCompletion.track.reply 123456789 token",
    );
    assert.equal(ok.message_id, 11);
    assert.equal(ok.chatId, "123456789", "observed direct sends should return the original Telegram message");
    assert.equal(ok.text, "message text payload token secret private whisper");

    let snapshot = getTelegramSendRuntimeSnapshot();
    assert.equal(snapshot.totalObservedSinceStart, 1);
    assert.equal(snapshot.blockedSinceStart, 0);
    assert.equal(snapshot.errorSinceStart, 0);
    assert.equal(snapshot.recentSlow.length, 0);

    const blockedError = {
      error_code: 403,
      description: "Forbidden: bot was blocked by the user chatId=123456789 payload token secret private whisper message text",
    };
    const blockedBot = {
      api: {
        sendMessage: async () => {
          now += 10;
          throw blockedError;
        },
      },
    };
    await assert.rejects(
      () => observedSendMessage(blockedBot, "123456789", "blocked message text", undefined, "actionRecovery.sleepAutoWake"),
      blockedError,
    );
    snapshot = getTelegramSendRuntimeSnapshot();
    assert.equal(snapshot.totalObservedSinceStart, 2);
    assert.equal(snapshot.blockedSinceStart, 1);

    const safeBlocked = await safeSendMessage(blockedBot, "123456789", "blocked message text", undefined, "notifyRegion");
    assert.equal(safeBlocked, null, "safeSendMessage should keep returning null for blocked-user errors");
    snapshot = getTelegramSendRuntimeSnapshot();
    assert.equal(snapshot.blockedSinceStart, 2);

    const unexpected = new Error("network failure chatId=123456789 payload token secret private whisper message text raw body");
    const failingBot = {
      api: {
        sendMessage: async () => {
          now += 70;
          throw unexpected;
        },
      },
    };
    await assert.rejects(
      () => observedSendMessage(failingBot, "123456789", "error message text", undefined, "actionCompletion.attack.reply 123456789"),
      unexpected,
    );
    snapshot = getTelegramSendRuntimeSnapshot();
    assert.equal(snapshot.totalObservedSinceStart, 4);
    assert.equal(snapshot.errorSinceStart, 1);
    assert.equal(snapshot.slowObservedSinceStart, 1);
    assert.equal(snapshot.recentErrors.length, 1);
    assert.equal(snapshot.recentErrors[0].context, "actionCompletion.attack.reply #");
    assert.doesNotMatch(snapshot.recentErrors[0].error, dangerousTextPattern());

    const debug = formatTelegramSendDebugSection(snapshot);
    assert.match(debug, /telegramSend: threshold=50 ms; total=4; slow=1; blocked=2; errors=1/);
    assert.match(debug, /actionCompletion\.attack\.reply # duration=70 ms outcome=error/);
    assert.doesNotMatch(debug, dangerousTextPattern());
    assert.doesNotMatch(warnings.join("\n"), dangerousTextPattern());
  } finally {
    Date.now = originalNow;
    console.warn = originalWarn;
  }

  const telegramSource = fs.readFileSync("src/utils/telegram.ts", "utf8");
  assert.match(telegramSource, /export async function observedSendMessage/);
  assert.match(telegramSource, /recordObservedTelegramSend\(context, startedAt, "blocked", error, options\);\s+throw error;/);
  assert.match(telegramSource, /return null;/, "safeSendMessage should keep its blocked-user null return");

  for (const file of [
    "src/services/actionCompletions.ts",
    "src/services/actionRecovery.ts",
    "src/services/fire.ts",
  ]) {
    const source = fs.readFileSync(file, "utf8");
    assert.equal((source.match(/bot\.api\.sendMessage/g) ?? []).length, 0, `${file} should route migrated direct sends through observedSendMessage`);
  }

  console.log("Telegram observed send OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
