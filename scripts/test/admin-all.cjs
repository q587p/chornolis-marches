const assert = require("node:assert/strict");

const fs = require("node:fs");

require("ts-node/register");

const { parseAllRequest } = require("../../src/handlers/status");
const { allWebFilterParam, allWebUrl } = require("../../src/server/statusServer");

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

assert.deepEqual(parseAllRequest("all players"), {
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

assert.deepEqual(parseAllRequest("all NPC"), {
  showDead: false,
  page: 0,
  filter: { kind: "npc" },
});

assert.deepEqual(parseAllRequest("all npcs dead"), {
  showDead: true,
  page: 0,
  filter: { kind: "npc" },
});

assert.deepEqual(parseAllRequest("тварини"), {
  showDead: false,
  page: 0,
  filter: { kind: "animal" },
});

assert.deepEqual(parseAllRequest("all animals"), {
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

assert.equal(allWebFilterParam({ kind: "all" }), "all");
assert.equal(allWebFilterParam({ kind: "player" }), "players");
assert.equal(allWebFilterParam({ kind: "npc" }), "npc");
assert.equal(allWebFilterParam({ kind: "animal" }), "animals");
assert.equal(allWebFilterParam({ kind: "animal", speciesKey: "mouse" }), "mouse");
assert.equal(allWebUrl({ mode: "live", filter: "players" }), "/all?mode=live&filter=players");
assert.equal(allWebUrl({ mode: "dead", filter: "animals", page: 2 }), "/all?mode=dead&filter=animals&page=2");

const statusServerSource = fs.readFileSync("src/server/statusServer.ts", "utf8");
assert.match(statusServerSource, /allWebFilterLinks\(mode, request\.filter\)/, "Web /all should render filter controls");
assert.match(statusServerSource, /filter:\s*"players"/, "Web /all should expose a players filter link");
assert.match(statusServerSource, /filter:\s*"npc"/, "Web /all should expose an NPC filter link");
assert.match(statusServerSource, /filter:\s*"animals"/, "Web /all should expose an animals filter link");

console.log("Admin /all parser OK");
