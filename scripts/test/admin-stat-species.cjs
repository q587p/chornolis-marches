const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const { ADMIN_HELP_TEXT } = require("../../src/handlers/admin");
const { formatSpeciesStatsBlock } = require("../../src/handlers/status");
const { buildAdminMenuReplyKeyboard } = require("../../src/ui/replyKeyboard");

const text = formatSpeciesStatsBlock([
  {
    key: "fox",
    name: "лисиця",
    alive: 3,
    corpses: 3,
    ages: { CHILD: 0, YOUNG: 1, ADULT: 2, OLD: 0 },
  },
  {
    key: "frog",
    name: "жаба",
    alive: 27,
    corpses: 2,
    ages: { CHILD: 1, YOUNG: 6, ADULT: 20, OLD: 0 },
  },
  {
    key: "new_species",
    name: "новий вид",
    alive: 0,
    corpses: 0,
    ages: { CHILD: 0, YOUNG: 0, ADULT: 0, OLD: 0 },
  },
]);

assert.equal(
  text,
  [
    "Види:",
    "лисиця [fox]: живі 3; вік 0/1/2/0; трупи 3",
    "жаба [frog]: живі 27; вік 1/6/20/0; трупи 2",
    "новий вид [new_species]: живі 0; вік 0/0/0/0; трупи 0",
  ].join("\n"),
);

assert.equal(formatSpeciesStatsBlock([]), "Види:\nпоки немає тварин");

const adminMenuButtons = buildAdminMenuReplyKeyboard().keyboard.flat().map((button) => button.text);
assert.equal(adminMenuButtons.includes("🐾 Види"), true, "Admin menu should expose the short species stat button");

assert.match(ADMIN_HELP_TEXT, /\/stat_species/, "Admin help should list the species stat command");

const statusSource = fs.readFileSync("src/handlers/status.ts", "utf8");
assert.match(statusSource, /bot\.command\(\["stat_species", "stats_species"\], replyStatSpeciesBrief\)/);
assert.match(statusSource, /bot\.hears\(STAT_SPECIES_TEXT_COMMAND, replyStatSpeciesBrief\)/);
assert.match(statusSource, /"🐾 Види", "Види"/);

const adminDocs = fs.readFileSync("docs/systems/admin_commands.md", "utf8");
assert.match(adminDocs, /\/stat_species/);
assert.match(adminDocs, /CreatureSpecies\.kind = ANIMAL/);

console.log("Admin species stats OK");
