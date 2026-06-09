const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  PLAYER_OBSERVATION_ACTION_DEDUPE_MESSAGES,
  matchingPlayerActionDedupeMessage,
  playerActionDedupeKey,
  playerObservationActionDedupePolicy,
} = require("../../src/services/actionLifecycle");

const trackPayload = { target: "лисиця", detail: true };
const sameTrackPayloadDifferentOrder = { detail: true, target: "лисиця" };
const otherTrackPayload = { detail: true, target: "заєць" };

assert.equal(
  playerActionDedupeKey({ type: "TRACK", payload: trackPayload }),
  playerActionDedupeKey({ type: "TRACK", payload: sameTrackPayloadDifferentOrder }),
);
assert.notEqual(
  playerActionDedupeKey({ type: "TRACK", payload: trackPayload }),
  playerActionDedupeKey({ type: "TRACK", payload: otherTrackPayload }),
);

assert.deepEqual(playerObservationActionDedupePolicy("TRACK"), PLAYER_OBSERVATION_ACTION_DEDUPE_MESSAGES.TRACK);
assert.deepEqual(playerObservationActionDedupePolicy("LOOK"), PLAYER_OBSERVATION_ACTION_DEDUPE_MESSAGES.LOOK);
assert.equal(playerObservationActionDedupePolicy("MOVE"), undefined);

const trackInput = {
  type: "TRACK",
  payload: trackPayload,
  dedupe: playerObservationActionDedupePolicy("TRACK"),
};
assert.equal(
  matchingPlayerActionDedupeMessage(trackInput, { type: "TRACK", payload: sameTrackPayloadDifferentOrder, status: "RUNNING" }),
  "Вистежування вже триває.",
);
assert.equal(
  matchingPlayerActionDedupeMessage(trackInput, { type: "TRACK", payload: sameTrackPayloadDifferentOrder, status: "QUEUED" }),
  "Вистежування вже є в плані.",
);
assert.equal(
  matchingPlayerActionDedupeMessage(trackInput, { type: "TRACK", payload: otherTrackPayload, status: "RUNNING" }),
  null,
);

const lookInput = {
  type: "LOOK",
  payload: {},
  dedupe: playerObservationActionDedupePolicy("LOOK"),
};
assert.equal(
  matchingPlayerActionDedupeMessage(lookInput, { type: "LOOK", payload: {}, status: "RUNNING" }),
  "Огляд уже триває.",
);
assert.equal(
  matchingPlayerActionDedupeMessage(lookInput, { type: "LOOK", payload: {}, status: "QUEUED" }),
  "Огляд уже є в плані.",
);

const actionLifecycleSource = fs.readFileSync("src/services/actionLifecycle.ts", "utf8");
const actionQueueSource = fs.readFileSync("src/services/actionQueue.ts", "utf8");
const recoveryLoopSource = fs.readFileSync("src/services/recoveryLoop.ts", "utf8");
const gameBotSource = fs.readFileSync("src/apps/gameBot.ts", "utf8");

assert.equal(actionLifecycleSource.includes("await recoverStamina(bot)"), false);
assert.match(actionQueueSource, /slow:actionQueue\.process|actionQueue\.process/);
assert.match(recoveryLoopSource, /recoverStamina\(bot\)/);
assert.match(recoveryLoopSource, /recoveryLoop\.pass/);
assert.match(gameBotSource, /startRecoveryLoop\(bot\)/);

console.log("Action queue performance guards OK");
