const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";

require("ts-node/register");

const { buildHealthPayload } = require("../../src/server/statusServer");
const {
  markTelegramBotReady,
  setLastRuntimeError,
} = require("../../src/runtimeState");
const pkg = require("../../package.json");

markTelegramBotReady("Chornolis_bot");
setLastRuntimeError(new Error("render startup probe"));

const payload = buildHealthPayload();
assert.equal(payload.ok, true);
assert.equal(payload.version, pkg.version);
assert.equal(payload.lastRuntimeError, "Error: render startup probe");
assert.deepEqual(Object.keys(payload).sort(), ["lastRuntimeError", "ok", "telegramBot", "version"].sort());
assert.equal(payload.telegramBot.state, "ready");
assert.equal(payload.telegramBot.username, "Chornolis_bot");
assert.equal(payload.telegramBot.error, null);
assert.equal(typeof payload.telegramBot.checkedAt, "string");
assert.equal(Object.hasOwn(payload, "services"), false);
assert.equal(Object.hasOwn(payload, "actionQueue"), false);
assert.equal(Object.hasOwn(payload, "databaseError"), false);

setLastRuntimeError("token 123456 secret DATABASE_URL");
assert.equal(buildHealthPayload().lastRuntimeError, "[redacted] # [redacted] [redacted]");

const statusServerPath = path.join(process.cwd(), "src", "server", "statusServer.ts");
const source = fs.readFileSync(statusServerPath, "utf8");
const startIndex = source.indexOf("export function startHttpServer()");
const pathIndex = source.indexOf("const path = req.url?.split", startIndex);
const healthIndex = source.indexOf('if (path === "/health")', startIndex);
const firstStatusDataIndex = source.indexOf("await getStatusData()", startIndex);
assert.ok(pathIndex > startIndex, "startHttpServer should parse route path before dispatch");
assert.ok(healthIndex > pathIndex, "/health should be dispatched after route path parsing");
assert.ok(firstStatusDataIndex > healthIndex, "/health must be checked before any getStatusData call");

const healthReturnIndex = source.indexOf("return;", healthIndex);
assert.ok(healthReturnIndex > healthIndex, "/health route should return after responding");
const healthBlock = source.slice(healthIndex, healthReturnIndex);
for (const forbidden of [
  "getStatusData",
  "getEcologyStats",
  "getActionQueueStats",
  "prisma",
  "buildWhoData",
  "getChatLog",
]) {
  assert.equal(healthBlock.includes(forbidden), false, `/health block must not call ${forbidden}`);
}

const gameBotPath = path.join(process.cwd(), "src", "apps", "gameBot.ts");
const gameBotSource = fs.readFileSync(gameBotPath, "utf8");
const startPollingIndex = gameBotSource.indexOf("async function startTelegramPolling()");
const botStartIndex = gameBotSource.indexOf("await bot.start();", startPollingIndex);
const pollingLogIndex = gameBotSource.indexOf('console.log("Telegram polling started");', botStartIndex);
assert.ok(botStartIndex > startPollingIndex, "startTelegramPolling should still call bot.start()");
assert.ok(pollingLogIndex > botStartIndex, "successful polling start should log after bot.start()");

console.log("Status health readiness OK");
