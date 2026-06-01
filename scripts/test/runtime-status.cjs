const assert = require("node:assert/strict");

require("ts-node/register");

const {
  actionQueueRuntimeStatus,
  databaseRuntimeStatus,
  heraldRuntimeStatus,
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

const recentHerald = heraldRuntimeStatus({
  heartbeat: {
    serviceKey: "herald",
    mode: "standalone",
    startedAt: new Date("2026-05-30T11:50:00.000Z"),
    lastSeenAt: new Date("2026-05-30T11:59:30.000Z"),
  },
  queuedCount: 2,
  publishedCount: 5,
  lastPublishedNewsAt: new Date("2026-05-30T11:40:00.000Z"),
}, now);
assert.equal(recentHerald.state, "ok");
assert.match(recentHerald.detail, /на зв’язку/);
assert.match(recentHerald.detail, /standalone/);
assert.match(recentHerald.detail, /очікує 2/);
assert.match(recentHerald.detail, /опубліковано 5/);

assert.equal(heraldRuntimeStatus({
  heartbeat: null,
  queuedCount: 0,
  publishedCount: 0,
  lastPublishedNewsAt: null,
}, now).state, "warning");

assert.equal(heraldRuntimeStatus({
  heartbeat: {
    serviceKey: "herald",
    mode: "standalone",
    startedAt: new Date("2026-05-30T11:00:00.000Z"),
    lastSeenAt: new Date("2026-05-30T11:50:00.000Z"),
  },
  queuedCount: 0,
  publishedCount: 1,
  lastPublishedNewsAt: null,
}, now).state, "warning");

console.log("Runtime status helpers OK");
