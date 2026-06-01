const assert = require("node:assert/strict");

require("ts-node/register");

const { renderPredatorSpeciesRows } = require("../../src/server/statusServer");

const html = renderPredatorSpeciesRows([
  {
    speciesKey: "owl",
    speciesName: "сова",
    kills: 7,
    attackAttempts: 11,
    successfulAttacks: 8,
  },
  {
    speciesKey: "fox",
    speciesName: "лисиця",
    kills: 3,
    attackAttempts: 5,
    successfulAttacks: 4,
  },
  {
    speciesKey: "wolf",
    speciesName: "вовк",
    kills: 1,
    attackAttempts: 2,
    successfulAttacks: 1,
  },
]);

assert.match(html, /<code>owl<\/code>/);
assert.match(html, /сова/);
assert.match(html, /<code>fox<\/code>/);
assert.match(html, /лисиця/);
assert.match(html, /<code>wolf<\/code>/);
assert.match(html, /вовк/);
assert.match(html, /11 \/ 8/);
assert.match(renderPredatorSpeciesRows([]), /colspan="4"/);

console.log("Web stat predator species rendering OK");
