const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(process.cwd(), "src", "services", "actionCompletions.ts");
const source = fs.readFileSync(sourcePath, "utf8");

const helperStart = source.indexOf("async function sendPrivateSpeechMessage(");
assert.notEqual(helperStart, -1, "private speech delivery should go through a dedicated helper");

const helperEnd = source.indexOf("\nasync function", helperStart + 1);
const helperBody = source.slice(helperStart, helperEnd);
assert.match(helperBody, /canSendProactiveToTelegramId\(targetPlayer\.telegramId\)/, "private speech helper should check AFK/end-session proactive guard at send time");
assert.match(helperBody, /safeSendMessage\(/, "private speech helper should still use safe Telegram send");

const directSafeSends = [...source.matchAll(/\bsafeSendMessage\(/g)].map((match) => match.index);
assert.deepEqual(
  directSafeSends,
  [helperBody.indexOf("safeSendMessage(") + helperStart],
  "actionCompletions should not bypass the guarded private speech helper with direct safeSendMessage calls",
);

for (const context of [
  "greet target sendMessage",
  "whisper target sendMessage",
  "player reply target sendMessage",
  "creature reply target sendMessage",
]) {
  const contextIndex = source.indexOf(context);
  assert.notEqual(contextIndex, -1, `${context} context should still be present`);
  const callStart = source.lastIndexOf("sendPrivateSpeechMessage(", contextIndex);
  assert.notEqual(callStart, -1, `${context} should use sendPrivateSpeechMessage`);
  const directSendStart = source.lastIndexOf("bot.api.sendMessage(", contextIndex);
  assert.ok(callStart > directSendStart, `${context} should not be sent through an unguarded bot.api.sendMessage call`);
}

console.log("Private speech presence guard OK");
