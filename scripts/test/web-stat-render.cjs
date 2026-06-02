const assert = require("node:assert/strict");

require("ts-node/register");

const {
  renderPredatorSpeciesRows,
  renderSpecialCreatureRows,
  renderStatTableRows,
} = require("../../src/server/statusServer");

const speciesHtml = renderStatTableRows([
  {
    key: "owl",
    name: "сова",
    total: 3,
    alive: 3,
    corpses: 0,
    gone: 0,
    ages: { CHILD: 0, YOUNG: 0, ADULT: 3, OLD: 0, CORPSE: 0 },
  },
]);

assert.match(speciesHtml, /<code>owl<\/code>/);
assert.match(speciesHtml, /сова/);

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

const specialHtml = renderSpecialCreatureRows([
  {
    key: "camp_spirit_cat",
    name: "Кіт-бережник",
    kind: "SPIRIT",
    diet: "SPIRITUAL",
    total: 1,
    alive: 1,
    hidden: 0,
    inactive: 0,
    gone: 0,
  },
]);

assert.match(specialHtml, /<code>camp_spirit_cat<\/code>/);
assert.match(specialHtml, /Кіт-бережник/);
assert.match(specialHtml, /SPIRIT/);
assert.match(specialHtml, /SPIRITUAL/);
assert.match(renderSpecialCreatureRows([]), /colspan="7"/);

console.log("Web stat predator species rendering OK");
