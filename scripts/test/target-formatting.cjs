const assert = require("node:assert/strict");

require("ts-node/register");

const { formatCreatureLifeState, formatCreatureStatusLine, inventoryResourceSummary } = require("../../src/services/targets");
const { animalAgeDescription } = require("../../src/services/locations");
const { buildTargetActionKeyboard, buildTargetListKeyboard } = require("../../src/ui/keyboards");

const maleNpc = {
  isAlive: true,
  hp: 18,
  maxHp: 36,
  sex: "MALE",
  species: { baseHp: 42, grammaticalGender: "MASCULINE" },
};

const femaleAnimal = {
  isAlive: true,
  hp: 3,
  maxHp: 12,
  sex: "FEMALE",
  species: { baseHp: 12, grammaticalGender: "FEMININE" },
};

assert.equal(formatCreatureStatusLine(maleNpc, "йде на захід"), "Стан: живий, йде на захід.");
assert.equal(formatCreatureStatusLine(femaleAnimal, "їсть ягоди."), "Стан: жива, їсть ягоди.");
assert.equal(formatCreatureLifeState(maleNpc), "Життя: має рани, але тримається.");
assert.equal(formatCreatureLifeState(femaleAnimal), "Життя: тяжко поранена.");

const maleMouse = {
  sex: "MALE",
  species: { key: "mouse", name: "миша", grammaticalGender: "FEMININE", animacy: "ANIMATE" },
};
assert.equal(animalAgeDescription({ ...maleMouse, age: "YOUNG" }), "молодий миш");
assert.equal(animalAgeDescription({ ...maleMouse, age: "ADULT" }), "дорослий миш");
assert.equal(animalAgeDescription({ ...maleMouse, age: "OLD" }), "старий миш");
assert.equal(formatCreatureStatusLine({ ...maleMouse, isAlive: true }), "Стан: живий.");
assert.equal(formatCreatureLifeState({ ...maleMouse, hp: 1, maxHp: 12, species: { ...maleMouse.species, baseHp: 12 } }), "Життя: тяжко поранений.");

const femaleMouse = {
  sex: "FEMALE",
  species: { key: "mouse", name: "миша", grammaticalGender: "FEMININE", animacy: "ANIMATE" },
};
assert.equal(animalAgeDescription({ ...femaleMouse, age: "YOUNG" }), "молода миша");

const interactionRows = buildTargetActionKeyboard({
  type: "creature",
  id: 13,
  canGreet: true,
  canAttack: true,
  isAnimal: false,
}).inline_keyboard.map((row) => row.map((button) => button.text));

assert.deepEqual(interactionRows, [
  ["👁 Глянути", "🔎 Роздивитися", "⚔️ Атакувати"],
  ["💬 Привітати", "🗣 Сказати", "🤫 Прошепотіти"],
  ["✅ Кивнути", "👋 Помахати", "✨ Ще сигнали"],
  ["↩️ Назад"],
]);

const multipleFreshCorpseRows = buildTargetListKeyboard([
  { type: "creature", id: 1, label: "труп миша", actionLabel: "розкладається; залишилось 92 тіків", canGreet: false, isAnimal: true, isCorpse: true, canFreshen: true },
  { type: "creature", id: 2, label: "труп миша", actionLabel: "розкладається; залишилось 116 тіків", canGreet: false, isAnimal: true, isCorpse: true, canFreshen: true },
]).inline_keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(multipleFreshCorpseRows, [
  ["труп миша"],
  ["труп миша"],
  ["🔪 Освіжувати всі"],
]);

const singleFreshCorpseRows = buildTargetListKeyboard([
  { type: "creature", id: 1, label: "труп миша", actionLabel: "розкладається; залишилось 92 тіків", canGreet: false, isAnimal: true, isCorpse: true, canFreshen: true },
]).inline_keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(singleFreshCorpseRows, [["труп миша"]]);

assert.equal(inventoryResourceSummary([
  { amount: 1, resourceType: { key: "cooked_meat", name: "смажене м'ясо" } },
]), "- смажене м'ясо: лише одне");
assert.equal(inventoryResourceSummary([
  { amount: 1, resourceType: { key: "torch", name: "факел" } },
]), "- факел: лише один");

console.log("Target formatting OK");
