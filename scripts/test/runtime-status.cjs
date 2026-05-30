const assert = require("node:assert/strict");

require("ts-node/register");

const {
  actionQueueRuntimeStatus,
  databaseRuntimeStatus,
  worldTickRuntimeStatus,
} = require("../../src/services/status");

const now = new Date("2026-05-30T12:00:00.000Z");

assert.equal(databaseRuntimeStatus(null, now).state, "ok");
assert.equal(databaseRuntimeStatus(new Error("db down"), now).state, "down");

assert.equal(worldTickRuntimeStatus(null, now, 1500).state, "warning");
assert.equal(worldTickRuntimeStatus({ createdAt: new Date("2026-05-30T11:59:55.000Z") }, now, 1500).state, "ok");
assert.equal(worldTickRuntimeStatus({ createdAt: new Date("2026-05-30T11:58:00.000Z") }, now, 1500).state, "warning");

assert.equal(actionQueueRuntimeStatus(null, now).state, "warning");
assert.equal(actionQueueRuntimeStatus({
  totalQueued: 2,
  totalRunning: 1,
  overdueRunning: 0,
  maxOverdueMs: 0,
}, now).state, "ok");
assert.equal(actionQueueRuntimeStatus({
  totalQueued: 2,
  totalRunning: 1,
  overdueRunning: 1,
  maxOverdueMs: 32000,
}, now).state, "warning");

console.log("Runtime status helpers OK");
