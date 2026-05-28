const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const {
  availablePreparedNames,
  normalizeNameForRegistry,
  preparedNameByKey,
  randomAvailablePreparedName,
  validateCustomCharacterName,
} = require("../../src/services/characterNames");
const { guessNameForms } = require("../../src/services/grammar");

assert.equal(normalizeNameForRegistry("  Ведана  "), "ведана");

const vedana = preparedNameByKey("vedana");
assert.ok(vedana, "Expected prepared name Vedana");
assert.equal(vedana.forms.genitive, "Ведани");
assert.equal(vedana.forms.vocative, "Ведано");
assert.equal(vedana.reserved, true);

assert.equal(availablePreparedNames(["Ведана"]).some((name) => name.key === "vedana"), false);
assert.equal(availablePreparedNames(["Хтось"]).some((name) => name.key === "vedana"), false);
assert.ok(preparedNameByKey("tamila"), "Expected reserved prepared name Tamila to remain in registry");
assert.equal(availablePreparedNames([]).some((name) => name.key === "tamila"), false);

const masculineNames = availablePreparedNames([], { suggestedGender: "MASCULINE" });
const feminineNames = availablePreparedNames([], { suggestedGender: "FEMININE" });
const pluralNames = availablePreparedNames([], { suggestedGender: "PLURAL" });
assert.ok(masculineNames.length >= 5, `Expected at least 5 available masculine names, got ${masculineNames.length}`);
assert.ok(feminineNames.length >= 5, `Expected at least 5 available feminine names, got ${feminineNames.length}`);
assert.ok(pluralNames.length >= 3, `Expected at least 3 available plural names, got ${pluralNames.length}`);
assert.ok(masculineNames.every((name) => name.suggestedGender === "MASCULINE"));
assert.ok(feminineNames.every((name) => name.suggestedGender === "FEMININE"));
assert.ok(pluralNames.every((name) => name.suggestedGender === "PLURAL"));
assert.equal(randomAvailablePreparedName([], { suggestedGender: "MASCULINE" }).suggestedGender, "MASCULINE");
assert.equal(randomAvailablePreparedName([], { suggestedGender: "FEMININE" }).suggestedGender, "FEMININE");
assert.equal(randomAvailablePreparedName([], { suggestedGender: "PLURAL" }).suggestedGender, "PLURAL");
assert.equal(
  randomAvailablePreparedName(masculineNames.map((name) => name.forms.nominative), { suggestedGender: "MASCULINE" }),
  null
);

const uniqueCreatures = JSON.parse(fs.readFileSync(path.join(__dirname, "../../prisma/data/world/uniqueCreatures.json"), "utf8"));
const uniqueCreatureNames = uniqueCreatures.map((creature) => creature.name).filter(Boolean);
assert.ok(uniqueCreatureNames.includes("Ведана"), "Expected Vedana to remain a named NPC in world seed data");
assert.equal(availablePreparedNames(uniqueCreatureNames).some((name) => name.key === "vedana"), false);

assert.equal(validateCustomCharacterName("Вовк").ok, false);
assert.equal(validateCustomCharacterName("Vovk").ok, false);
assert.equal(validateCustomCharacterName("Лісовик").ok, false);
assert.equal(validateCustomCharacterName("Сварог").ok, false);
assert.equal(validateCustomCharacterName("Svarog").ok, false);
assert.equal(validateCustomCharacterName("Gandalf").ok, false);
assert.equal(validateCustomCharacterName("Здравко").ok, true);
assert.deepEqual(validateCustomCharacterName("Zdravko"), { ok: true, value: "Здравко", script: "latin-translit" });
assert.deepEqual(validateCustomCharacterName("Danylo"), { ok: true, value: "Данило", script: "latin-translit" });
assert.deepEqual(validateCustomCharacterName("Yuliia"), { ok: true, value: "Юлія", script: "latin-translit" });
assert.deepEqual(validateCustomCharacterName("Mar'yana"), { ok: true, value: "Мар'яна", script: "latin-translit" });
assert.equal(validateCustomCharacterName("Здравko").ok, false);
assert.equal(validateCustomCharacterName("Danylo7").ok, false);
assert.equal(validateCustomCharacterName("Мар'яна").ok, true);
assert.equal(validateCustomCharacterName("Лукʼян").ok, true);
assert.equal(validateCustomCharacterName("Анна-Марія").ok, true);
assert.equal(validateCustomCharacterName("Сава Тихий").ok, true);
assert.equal(validateCustomCharacterName("Данило-").ok, false);
assert.equal(validateCustomCharacterName("Данило7").ok, false);

const greatVova = guessNameForms("Великий Вова", "MASCULINE", "ANIMATE");
assert.equal(greatVova.genitive, "Великого Вови");
assert.equal(greatVova.dative, "Великому Вові");
assert.equal(greatVova.accusative, "Великого Вову");
assert.equal(greatVova.instrumental, "Великим Вовою");
assert.equal(greatVova.locative, "Великому Вові");
assert.equal(greatVova.vocative, "Великий Вово");

console.log("Character names OK");
