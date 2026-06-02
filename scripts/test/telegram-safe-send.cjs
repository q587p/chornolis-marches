const assert = require("node:assert/strict");

require("ts-node/register");

const {
  isTelegramBlockedByUserError,
  safeSendMessage,
} = require("../../src/utils/telegram");

(async () => {
  const blockedError = {
    error_code: 403,
    description: "Forbidden: bot was blocked by the user",
  };

  assert.equal(isTelegramBlockedByUserError(blockedError), true);
  assert.equal(isTelegramBlockedByUserError({ error_code: 403, description: "Forbidden: bot is not a member" }), false);
  assert.equal(isTelegramBlockedByUserError({ error_code: 400, description: "Bad Request: chat not found" }), false);
  assert.equal(isTelegramBlockedByUserError(new Error("Forbidden: bot was blocked by the user")), false);

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    const blockedBot = {
      api: {
        sendMessage: async () => {
          throw blockedError;
        },
      },
    };
    assert.equal(await safeSendMessage(blockedBot, "123", "hello", undefined, "test blocked"), null);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0][0], "test blocked skipped: bot was blocked by the user");
  } finally {
    console.warn = originalWarn;
  }

  const unexpected = new Error("network fell over");
  const failingBot = {
    api: {
      sendMessage: async () => {
        throw unexpected;
      },
    },
  };
  await assert.rejects(() => safeSendMessage(failingBot, "123", "hello"), unexpected);

  const okBot = {
    api: {
      sendMessage: async (chatId, text, options) => ({ message_id: 7, chatId, text, options }),
    },
  };
  assert.deepEqual(await safeSendMessage(okBot, "123", "hello", { parse_mode: "HTML" }), {
    message_id: 7,
    chatId: "123",
    text: "hello",
    options: { parse_mode: "HTML" },
  });

  console.log("Telegram safe send OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
