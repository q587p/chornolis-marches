const assert = require("node:assert/strict");

require("ts-node/register");

const { formatCreatureLifeState, formatCreatureStatusLine } = require("../../src/services/targets");
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

console.log("Target formatting OK");
