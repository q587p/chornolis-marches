const assert = require("node:assert/strict");
const fs = require("node:fs");

require("ts-node/register");

const {
  CAMP_SPIRIT_CAT_NAME,
  CAMP_SPIRIT_CAT_SPECIES_KEY,
  CAMP_SPIRIT_CAT_START_LOCATION_KEY,
  campSpiritCatInspectionText,
  isCampSpiritCatCreature,
} = require("../../src/services/campSpiritCat");
const { creatureSpeciesNameFields } = require("../../src/content/lexicon/worldLexicon");

const uniqueCreatures = JSON.parse(fs.readFileSync("prisma/data/world/uniqueCreatures.json", "utf8"));

const cat = uniqueCreatures.find((creature) => creature.speciesKey === CAMP_SPIRIT_CAT_SPECIES_KEY);

assert.ok(cat, "Camp spirit cat should be seeded as a unique creature");
assert.equal(cat.name, CAMP_SPIRIT_CAT_NAME);
assert.equal(cat.locationKey, CAMP_SPIRIT_CAT_START_LOCATION_KEY);
assert.equal(cat.isAlive, true);
assert.equal(cat.isHidden, false);
assert.match(cat.action, /вогню|табір/u);

assert.deepEqual(
  creatureSpeciesNameFields(CAMP_SPIRIT_CAT_SPECIES_KEY),
  {
    name: "кіт-бережник",
    nameGenitive: "кота-бережника",
    nameDative: "коту-бережнику",
    nameAccusative: "кота-бережника",
    nameInstrumental: "котом-бережником",
    nameLocative: "коті-бережнику",
    nameVocative: "коте-бережнику",
    grammaticalGender: "MASCULINE",
    animacy: "ANIMATE",
  },
  "Camp spirit cat species should have full lexicon-backed Ukrainian forms",
);

assert.equal(isCampSpiritCatCreature({ species: { key: CAMP_SPIRIT_CAT_SPECIES_KEY } }), true);
assert.equal(isCampSpiritCatCreature({ species: { key: "cat" } }), false);

const inspection = campSpiritCatInspectionText("лежить біля межового вогню");
assert.match(inspection, /Кіт-бережник/u);
assert.match(inspection, /не відповідає словами/u);
assert.doesNotMatch(inspection, /HP|NPC|debug|companion|pet/u);

console.log("Camp spirit cat foundation OK");
