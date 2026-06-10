const assert = require("node:assert/strict");

require("ts-node/register");

const { summarizeQueueDebugText } = require("../../src/utils/queueDebugAnalysis");

const activeSnapshot = [
  "🧵 Службова черга: debug",
  "phaseMs: playerComplete=180 ms; playerStart=12 ms; playerRefresh=20 ms; creatureKick=3 ms; total=225 ms",
  "creatureQueue: running=ні; mode=limited; reason=player-overdue",
  "creaturePhaseMs: complete=240 ms; start=0 ms; total=240 ms",
  "recoveryPhaseMs: players=130 ms; creatures=40 ms; total=170 ms",
  "completionSlow: threshold=100 ms; total=20; slow=4",
  "telegramSend: threshold=100 ms; total=15; slow=3; blocked=0; errors=1",
  "deferredTelegram: enabled=так; running=ні; pending=7; queued=20; sent=10; dropped=2; expired=1; errors=1",
  "databaseQuery: enabled=так; threshold=100 ms; sampleLimit=10; total=60; slow=5; errors=1",
  "overdue: player=2 (1.4 s); creature=6 (4.2 s); total=8 (4.2 s)",
].join("\n");

const summary = summarizeQueueDebugText(activeSnapshot);
assert.equal(summary.playerOverdue, 2);
assert.equal(summary.creatureOverdue, 6);
assert.equal(summary.databaseSlow, 5);
assert.equal(summary.telegramSlow, 3);
assert.equal(summary.actionCompletionSlow, 4);
assert.equal(summary.deferredPending, 7);
assert.ok(summary.recommendations.some((line) => /action-specific/.test(line)));
assert.ok(summary.recommendations.some((line) => /creature queue/.test(line)));
assert.ok(summary.recommendations.some((line) => /recovery/.test(line)));
assert.ok(summary.recommendations.some((line) => /Telegram/.test(line)));
assert.ok(summary.recommendations.some((line) => /database model\/action/.test(line)));
assert.ok(summary.recommendations.some((line) => /deferred follow-up/.test(line)));

const quietSummary = summarizeQueueDebugText("queued: player=0; creature=0; total=0\nsome older report without newer sections");
assert.equal(quietSummary.playerOverdue, undefined);
assert.equal(quietSummary.databaseSlow, undefined);
assert.deepEqual(quietSummary.recommendations, [
  "No single bottleneck stands out; collect another idle/active/after-drain snapshot set before tuning.",
]);

const databaseOnly = summarizeQueueDebugText("databaseQuery: enabled=так; threshold=100 ms; sampleLimit=10; total=12; slow=2; errors=0");
assert.equal(databaseOnly.databaseSlow, 2);
assert.deepEqual(databaseOnly.recommendations, [
  "Inspect database model/action samples before proposing query rewrites or indexes.",
]);

console.log("Queue debug analysis helper OK");
