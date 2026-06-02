const assert = require("node:assert/strict");

require("ts-node/register");

const { parseAllRequest } = require("../../src/handlers/status");

assert.deepEqual(parseAllRequest(""), {
  showDead: false,
  page: 0,
  filter: { kind: "all" },
});

assert.deepEqual(parseAllRequest("dead"), {
  showDead: true,
  page: 0,
  filter: { kind: "all" },
});

assert.deepEqual(parseAllRequest("/all"), {
  showDead: false,
  page: 0,
  filter: { kind: "all" },
});

assert.deepEqual(parseAllRequest("player"), {
  showDead: false,
  page: 0,
  filter: { kind: "player" },
});

assert.deepEqual(parseAllRequest("гравці"), {
  showDead: false,
  page: 0,
  filter: { kind: "player" },
});

assert.deepEqual(parseAllRequest("npc dead"), {
  showDead: true,
  page: 0,
  filter: { kind: "npc" },
});

assert.deepEqual(parseAllRequest("тварини"), {
  showDead: false,
  page: 0,
  filter: { kind: "animal" },
});

assert.deepEqual(parseAllRequest("animal mouse"), {
  showDead: false,
  page: 0,
  filter: { kind: "animal", speciesKey: "mouse" },
});

assert.deepEqual(parseAllRequest("mouse"), {
  showDead: false,
  page: 0,
  filter: { kind: "animal", speciesKey: "mouse" },
});

assert.deepEqual(parseAllRequest("/all mouse"), {
  showDead: false,
  page: 0,
  filter: { kind: "animal", speciesKey: "mouse" },
});

console.log("Admin /all parser OK");
