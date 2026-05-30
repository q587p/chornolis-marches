const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const {
  PREPARED_CHARACTER_NAMES,
  availablePreparedNames,
  characterNameApprovalStatusText,
  customNameWarningText,
  normalizeNameForRegistry,
  onboardingNameApprovalNote,
  onboardingNameChoiceTextIntent,
  preparedNameByKey,
  preparedNameByNominative,
  randomAvailablePreparedName,
  validateCustomCharacterName,
} = require("../../src/services/characterNames");
const { creatureForms, guessNameForms } = require("../../src/services/grammar");
const { creatureSpeciesNameFields, findLexiconEntry, formsByNominative } = require("../../src/content/lexicon/worldLexicon");

assert.equal(normalizeNameForRegistry("  Ведана  "), "ведана");
assert.equal(onboardingNameChoiceTextIntent("список"), "prepared");
assert.equal(onboardingNameChoiceTextIntent("Обрати ім'я зі списку"), "prepared");
assert.equal(onboardingNameChoiceTextIntent("Випадкове ім'я"), "random");
assert.equal(onboardingNameChoiceTextIntent("Ввести власне ім'я"), "customPrompt");
assert.equal(onboardingNameChoiceTextIntent("Вербові"), "customName");
assert.equal(onboardingNameChoiceTextIntent("/help"), null);

const vedana = preparedNameByKey("vedana");
assert.ok(vedana, "Expected prepared name Vedana");
assert.equal(vedana.forms.genitive, "Ведани");
assert.equal(vedana.forms.vocative, "Ведано");
assert.equal(vedana.reserved, true);

for (const key of ["zdravomyr", "lukan", "oryna"]) {
  const prepared = preparedNameByKey(key);
  assert.ok(prepared, `Expected reserved NPC prepared name: ${key}`);
  assert.equal(prepared.reserved, true, `Expected ${key} to be reserved`);
  assert.equal(availablePreparedNames([]).some((name) => name.key === key), false, `Expected ${key} not to be offered`);
  assert.equal(preparedNameByNominative(prepared.forms.nominative)?.key, key);
}
assert.equal(preparedNameByKey("zdravomyr").forms.vocative, "Здравомире");
assert.equal(preparedNameByKey("lukan").forms.dative, "Лукану");
assert.equal(preparedNameByKey("oryna").forms.accusative, "Орину");

assert.equal(availablePreparedNames(["Ведана"]).some((name) => name.key === "vedana"), false);
assert.equal(availablePreparedNames(["Хтось"]).some((name) => name.key === "vedana"), false);
assert.ok(preparedNameByKey("tamila"), "Expected reserved prepared name Tamila to remain in registry");
assert.equal(availablePreparedNames([]).some((name) => name.key === "tamila"), false);
assert.ok(preparedNameByKey("radomyr"), "Expected new prepared name Radomyr");
assert.ok(preparedNameByKey("aishe"), "Expected new prepared name Aishe");
assert.equal(preparedNameByKey("verbovi").forms.accusative, "Вербових");

const preparedKeys = new Set();
const preparedNominatives = new Set();
for (const name of PREPARED_CHARACTER_NAMES) {
  assert.ok(name.forms.nominative, `Prepared name ${name.key} must have nominative`);
  assert.ok(name.forms.genitive, `Prepared name ${name.key} must have genitive`);
  assert.ok(name.forms.dative, `Prepared name ${name.key} must have dative`);
  assert.ok(name.forms.accusative, `Prepared name ${name.key} must have accusative`);
  assert.ok(name.forms.instrumental, `Prepared name ${name.key} must have instrumental`);
  assert.ok(name.forms.locative, `Prepared name ${name.key} must have locative`);
  assert.ok(name.forms.vocative, `Prepared name ${name.key} must have vocative`);
  assert.equal(preparedKeys.has(name.key), false, `Duplicate prepared name key: ${name.key}`);
  preparedKeys.add(name.key);
  const normalized = normalizeNameForRegistry(name.forms.nominative);
  assert.equal(preparedNominatives.has(normalized), false, `Duplicate prepared nominative: ${name.forms.nominative}`);
  preparedNominatives.add(normalized);
}

const masculineNames = availablePreparedNames([], { suggestedGender: "MASCULINE" });
const feminineNames = availablePreparedNames([], { suggestedGender: "FEMININE" });
const pluralNames = availablePreparedNames([], { suggestedGender: "PLURAL" });
assert.ok(masculineNames.length >= 8, `Expected at least 8 available masculine names, got ${masculineNames.length}`);
assert.ok(feminineNames.length >= 8, `Expected at least 8 available feminine names, got ${feminineNames.length}`);
assert.ok(pluralNames.length >= 6, `Expected at least 6 available plural names, got ${pluralNames.length}`);
assert.ok(masculineNames.every((name) => name.suggestedGender === "MASCULINE"));
assert.ok(feminineNames.every((name) => name.suggestedGender === "FEMININE"));
assert.ok(pluralNames.every((name) => name.suggestedGender === "PLURAL"));
assert.ok(masculineNames.some((name) => name.forms.nominative === "Северин"), "Expected Severyn to be available as a prepared masculine name");
assert.ok(customNameWarningText({ examples: ["Северин", "Богдан", "Олесь"] }).includes("<b>Северин</b>"), "Expected custom-name prompt to bold prepared examples");
assert.match(customNameWarningText(), /Підготовлені імена вже перевірені/);
assert.match(customNameWarningText(), /Власне ім'я можна носити одразу/);
assert.match(characterNameApprovalStatusText(true), /схвалене Писарями/);
assert.match(characterNameApprovalStatusText(false), /чекає на перегляд/);
assert.match(onboardingNameApprovalNote(true), /підготовлене ім’я вже перевірене/);
assert.match(onboardingNameApprovalNote(false), /власне ім’я вже відкриває шлях/);
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
for (const npcName of ["Здравомир", "Ведана", "Лукан", "Орина"]) {
  const creature = uniqueCreatures.find((item) => item.name === npcName);
  assert.ok(creature, `Expected named NPC in seed: ${npcName}`);
  assert.equal(creature.nameOverrides, undefined, `Expected ${npcName} to use prepared-name forms from registry`);
  assert.ok(preparedNameByNominative(npcName)?.reserved, `Expected ${npcName} to be reserved in prepared-name registry`);
}

assert.equal(validateCustomCharacterName("Вовк").ok, false);
assert.equal(validateCustomCharacterName("Vovk").ok, false);
assert.equal(validateCustomCharacterName("Лісовик").ok, false);
assert.equal(validateCustomCharacterName("Сварог").ok, false);
assert.equal(validateCustomCharacterName("Svarog").ok, false);
assert.equal(validateCustomCharacterName("Gandalf").ok, false);
assert.equal(validateCustomCharacterName("  В О В К  ").ok, false);
assert.equal(validateCustomCharacterName("Лі совик").ok, false);
assert.equal(validateCustomCharacterName("Дід-Лісовик").ok, false);
assert.equal(validateCustomCharacterName("S o k i l").ok, false);
assert.equal(validateCustomCharacterName("Гер мес Трисмегіст").ok, false);
assert.equal(validateCustomCharacterName("Стеж ка").ok, false);
assert.equal(validateCustomCharacterName("Сон").ok, false);
for (const name of PREPARED_CHARACTER_NAMES) {
  assert.equal(validateCustomCharacterName(name.forms.nominative).ok, true, `Prepared name should stay valid: ${name.forms.nominative}`);
}
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

const maleMouse = creatureForms({ sex: "MALE", species: { key: "mouse", name: "миша", grammaticalGender: "FEMININE", animacy: "ANIMATE" } });
assert.equal(maleMouse.nominative, "самець миші");
assert.equal(maleMouse.genitive, "самця миші");
const femaleMouse = creatureForms({ sex: "FEMALE", species: { key: "mouse", name: "миша", grammaticalGender: "FEMININE", animacy: "ANIMATE" } });
assert.equal(femaleMouse.nominative, "самиця миші");
assert.equal(femaleMouse.genitive, "самиці миші");
assert.equal(findLexiconEntry("animal.rabbit").forms.accusative, "зайця");
assert.equal(formsByNominative()["вогнище"].locative, "вогнищі");
assert.equal(guessNameForms("крук", "MASCULINE", "ANIMATE").vocative, "круче");
assert.equal(creatureSpeciesNameFields("hunter").nameGenitive, "мисливця");
assert.equal(creatureSpeciesNameFields("stezhnyk").nameAccusative, "стежника");

console.log("Character names OK");
