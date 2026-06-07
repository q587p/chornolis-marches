const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const {
  clearPendingReplyMode,
  consumePendingReplyMode,
  isPendingReplyCancelText,
  parseRememberedReplyTargetDescription,
  pendingReplyButton,
  pendingReplyModePrompt,
  rememberedReplyTargetDescription,
  setPendingReplyMode,
} = require("../../src/services/replyTargets");

assert.deepEqual(parseRememberedReplyTargetDescription(rememberedReplyTargetDescription("QQQ")), { speakerName: "QQQ" });
assert.deepEqual(
  parseRememberedReplyTargetDescription(rememberedReplyTargetDescription("  Прихований голос  ")),
  { speakerName: "Прихований голос" },
);
assert.deepEqual(
  parseRememberedReplyTargetDescription(rememberedReplyTargetDescription({ speakerName: "QQQ", speakerPlayerId: 42 })),
  { speakerName: "QQQ", speakerPlayerId: 42 },
);
assert.deepEqual(
  parseRememberedReplyTargetDescription(rememberedReplyTargetDescription({ speakerName: "Лукан", speakerCreatureId: 7, speakerDative: "Лукану" })),
  { speakerName: "Лукан", speakerCreatureId: 7, speakerDative: "Лукану" },
);
assert.equal(parseRememberedReplyTargetDescription(JSON.stringify({ kind: "other", speakerName: "QQQ" })), null);
assert.equal(parseRememberedReplyTargetDescription("not json"), null);
assert.equal(parseRememberedReplyTargetDescription(null), null);

const replyButton = pendingReplyButton();
assert.equal(replyButton.inline_keyboard[0][0].text, "Відповісти");
assert.equal(replyButton.inline_keyboard[0][0].callback_data, "replyTarget:pending");
assert.equal(pendingReplyModePrompt({ speakerName: "Лукан", speakerDative: "Лукану" }), "Наступне повідомлення піде як відповідь Лукану.");

setPendingReplyMode(77, { speakerName: "Лукан", speakerCreatureId: 7 }, 1_000);
assert.deepEqual(consumePendingReplyMode(77, 1_500), { speakerName: "Лукан", speakerCreatureId: 7 });
assert.equal(consumePendingReplyMode(77, 1_600), null);
setPendingReplyMode(78, { speakerName: "Орина" }, 1_000);
assert.equal(consumePendingReplyMode(78, 3 * 60_000 + 1_001), null);
setPendingReplyMode(79, { speakerName: "Орина" }, 1_000);
assert.equal(clearPendingReplyMode(79), true);
assert.equal(consumePendingReplyMode(79, 1_500), null);
assert.equal(isPendingReplyCancelText("/cancel"), true);
assert.equal(isPendingReplyCancelText("скасувати відповідь"), true);
assert.equal(isPendingReplyCancelText("гурт"), false);

const repoRoot = path.join(__dirname, "..", "..");
const actionCompletions = fs.readFileSync(path.join(repoRoot, "src/services/actionCompletions.ts"), "utf8");
assert.match(actionCompletions, /pendingReplyButton/);
assert.match(actionCompletions, /replyTarget \? pendingReplyButton\(\)/);
const aliases = fs.readFileSync(path.join(repoRoot, "src/handlers/aliases.ts"), "utf8");
assert.ok(
  aliases.indexOf("const parsed = parseAlias(ctx.message.text);") <
  aliases.indexOf("consumePendingReplyMode(player.id)"),
  "known aliases should be parsed before pending reply text is consumed",
);
assert.match(aliases, /replyTarget:pending/);
assert.match(aliases, /submitReply\(bot, ctx, ctx\.message\.text, pendingReply\)/);

console.log("Reply targets OK");
