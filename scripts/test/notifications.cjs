const assert = require("node:assert/strict");

require("ts-node/register");

const {
  combineMovementNotificationLines,
  createNonPlayerMovementNotificationBuffer,
  nonPlayerMovementNotificationOptions,
  runInlineReplacementForKey,
} = require("../../src/services/notifications");

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const events = [];
  await Promise.all([
    runInlineReplacementForKey("chat:tracks:1", async () => {
      events.push("first:start");
      await sleep(25);
      events.push("first:end");
    }),
    runInlineReplacementForKey("chat:tracks:1", async () => {
      events.push("second:start");
      events.push("second:end");
    }),
  ]);

  assert.deepEqual(events, ["first:start", "first:end", "second:start", "second:end"]);

  const flushed = [];
  const buffer = createNonPlayerMovementNotificationBuffer({
    delayMs: 1000,
    flush: (event) => flushed.push(event),
  });

  buffer.queue({ locationId: 42, line: "Кіт-бережник зайшов сюди знизу.", creatureId: 7 });
  buffer.queue({ locationId: 42, line: "Кіт-бережник пішов звідси.", creatureId: 7 });
  assert.equal(buffer.pendingCount(), 1);
  await buffer.flushLocation(42);

  assert.equal(flushed.length, 1);
  assert.deepEqual(flushed[0].lines, [
    "Кіт-бережник зайшов сюди знизу.",
    "Кіт-бережник пішов звідси.",
  ]);
  assert.deepEqual(flushed[0].creatureIds, [7]);
  assert.equal(combineMovementNotificationLines(flushed[0].lines), "Кіт-бережник зайшов сюди знизу.\nКіт-бережник пішов звідси.");

  const options = nonPlayerMovementNotificationOptions(42, [7, 7, 8]);
  assert.equal(options.replaceKey, "tracks:42");
  assert.deepEqual(options.clearKeys, ["target:creature:7", "target:creature:8"]);
  assert.equal(options.keyboard.inline_keyboard.length, 1);
  assert.equal(options.keyboard.inline_keyboard[0].length, 1);
  assert.equal(options.keyboard.inline_keyboard[0][0].text, "🐾 Сліди");

  console.log("Notification replacement locks OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
