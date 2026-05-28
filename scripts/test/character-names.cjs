const assert = require("node:assert/strict");

require("ts-node/register");

const {
  availablePreparedNames,
  normalizeNameForRegistry,
  preparedNameByKey,
  validateCustomCharacterName,
} = require("../../src/services/characterNames");

assert.equal(normalizeNameForRegistry("  Ведана  "), "ведана");

const vedana = preparedNameByKey("vedana");
assert.ok(vedana, "Expected prepared name Vedana");
assert.equal(vedana.forms.genitive, "Ведани");
assert.equal(vedana.forms.vocative, "Ведано");

assert.equal(availablePreparedNames(["Ведана"]).some((name) => name.key === "vedana"), false);
assert.equal(availablePreparedNames(["Хтось"]).some((name) => name.key === "vedana"), true);

assert.equal(validateCustomCharacterName("Вовк").ok, false);
assert.equal(validateCustomCharacterName("Лісовик").ok, false);
assert.equal(validateCustomCharacterName("Сварог").ok, false);
assert.equal(validateCustomCharacterName("Здравко").ok, true);

console.log("Character names OK");
