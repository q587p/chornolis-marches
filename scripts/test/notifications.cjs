const assert = require("node:assert/strict");

require("ts-node/register");

const { runInlineReplacementForKey } = require("../../src/services/notifications");

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
  console.log("Notification replacement locks OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
