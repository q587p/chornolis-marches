const assert = require("node:assert/strict");

require("ts-node/register");

const { formatCreatureLifeState, formatCreatureStatusLine, inventoryResourceSummary } = require("../../src/services/targets");
const { animalAgeDescription, groundItemLine, groundItemPickupButtonRows } = require("../../src/services/locations");
const { buildCorpseActionKeyboard, buildTargetActionKeyboard, buildTargetListKeyboard } = require("../../src/ui/keyboards");

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

const pagedTargets = Array.from({ length: 10 }, (_, index) => ({
  type: "creature",
  id: index + 1,
  label: `ціль ${index + 1}`,
  canGreet: false,
}));
const pagedTargetKeyboard = buildTargetListKeyboard(pagedTargets, { page: 1, pageCallbackPrefix: "targetPage:details" });
assert.equal(pagedTargetKeyboard.inline_keyboard[0][0].callback_data, "target:creature:9:details:1");

const returnAwareTargetKeyboard = buildTargetActionKeyboard({
  type: "creature",
  id: 13,
  canGreet: false,
  canAttack: true,
  isAnimal: true,
}, false, "targetPage:details:1");
assert.equal(returnAwareTargetKeyboard.inline_keyboard.at(-1)[0].callback_data, "targetPage:details:1");
assert.equal(returnAwareTargetKeyboard.inline_keyboard[0][0].callback_data, "social:look:creature:13:known:details:1");

const returnAwareCorpseKeyboard = buildCorpseActionKeyboard({
  kind: "creature",
  id: 21,
  canFreshen: true,
}, "targetPage:details:1");
assert.equal(returnAwareCorpseKeyboard.inline_keyboard[1][0].callback_data, "social:pickup:creature:21:details:1");
assert.equal(returnAwareCorpseKeyboard.inline_keyboard.at(-1)[0].callback_data, "targetPage:details:1");

assert.equal(inventoryResourceSummary([
  { amount: 1, resourceType: { key: "cooked_meat", name: "смажене м'ясо" } },
]), "- смажене м'ясо: лише одне");
assert.equal(inventoryResourceSummary([
  { amount: 1, resourceType: { key: "torch", name: "факел" } },
]), "- факел: лише один");

const litTorchLine = groundItemLine({
  amount: 1,
  updatedAt: new Date(),
  resourceType: { key: "lit_torch", name: "запалений факел" },
});
assert.match(litTorchLine, /^запалений факел; дає світло; горітиме ще приблизно \d+ хв$/);
assert.deepEqual(groundItemPickupButtonRows([
  { id: 41, amount: 1, resourceType: { key: "twigs", name: "хмиз" } },
]), [[{ text: "🤲 Підібрати: хмиз", callbackData: "item:pickup:41" }]]);
assert.deepEqual(groundItemPickupButtonRows([
  { id: 41, amount: 1, resourceType: { key: "twigs", name: "хмиз" } },
  { id: 42, amount: 2, resourceType: { key: "twigs", name: "хмиз" } },
]), [
  [
    { text: "🤲 Підібрати: хмиз", callbackData: "item:pickup:41" },
    { text: "всі", callbackData: "item:pickupAll:twigs" },
  ],
  [
    { text: "🤲 Підібрати: хмиз", callbackData: "item:pickup:42" },
    { text: "всі", callbackData: "item:pickupAll:twigs" },
  ],
]);

console.log("Target formatting OK");
