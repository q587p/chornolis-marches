const assert = require("node:assert/strict");

require("ts-node/register");

const { formatAdminLearningSummary } = require("../../src/handlers/status");

assert.equal(formatAdminLearningSummary([], { playerId: 42 }), "- немає збереженого прогресу");

const rows = Array.from({ length: 10 }, (_, index) => ({
  skillKey: index === 0 ? "gathering" : `skill-${index}`,
  sourceKey: "practice",
  contextKey: index === 0 ? "resource:herbs" : "general",
  level: Math.min(5, index),
  progress: index + 1,
  totalProgress: (index + 1) * 3,
  milestoneCount: index,
}));

const summary = formatAdminLearningSummary(rows, { playerId: 42, limit: 3 });

assert.match(summary, /gathering\/practice\/resource:herbs/);
assert.match(summary, /level=0 \(unfamiliar\)/);
assert.match(summary, /skill-2\/practice\/general/);
assert.doesNotMatch(summary, /skill-3\/practice\/general/);
assert.match(summary, /повністю: \/learning #42/);

console.log("Admin learning summary OK");
