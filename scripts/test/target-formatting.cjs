const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const { formatCreatureLifeState, formatCreatureStatusLine, inventoryResourceSummary } = require("../../src/services/targets");
const { PICK_UP_EVERYTHING_BUTTON_TEXT, animalAgeDescription, groundItemLine, groundItemPickupButtonRows, groundItemPickupIcon, hasMultiplePickableLyingObjects, hasPickableLyingObjects, joinVisibleActionLabels, pickableLyingObjectCount } = require("../../src/services/locations");
const { buildAnonymousTargetKeyboard, buildCorpseActionKeyboard, buildTargetActionKeyboard, buildTargetListKeyboard } = require("../../src/ui/keyboards");
const { visibleHeldTorchTextWithContext } = require("../../src/utils/torchText");

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

const maleFrog = {
  sex: "MALE",
  species: { key: "frog", name: "жаба", grammaticalGender: "FEMININE", animacy: "ANIMATE" },
};
assert.equal(animalAgeDescription({ ...maleFrog, age: "YOUNG" }), "молода жаба");
assert.equal(animalAgeDescription({ ...maleFrog, age: "ADULT" }), "доросла жаба");
assert.equal(animalAgeDescription({ ...maleFrog, age: "OLD" }), "стара жаба");

const maleSnake = {
  sex: "MALE",
  species: { key: "snake", name: "змія", grammaticalGender: "FEMININE", animacy: "ANIMATE" },
};
assert.equal(animalAgeDescription({ ...maleSnake, age: "ADULT" }), "доросла змія");

const femaleHawk = {
  sex: "FEMALE",
  species: { key: "hawk", name: "сокіл", grammaticalGender: "MASCULINE", animacy: "ANIMATE" },
};
assert.equal(animalAgeDescription({ ...femaleHawk, age: "ADULT" }), "дорослий сокіл");

assert.equal(joinVisibleActionLabels("йде на південь", "йде на південь"), "йде на південь");
assert.equal(joinVisibleActionLabels("йде на південь; йде на південь", "тримає запалений факел"), "йде на південь; тримає запалений факел");
assert.equal(joinVisibleActionLabels("простий ніж", undefined, "йде на південь"), "простий ніж; йде на південь");

assert.equal(visibleHeldTorchTextWithContext({ isLit: false }), "Руки порожні.");
assert.equal(visibleHeldTorchTextWithContext({ isLit: false }, { hasOtherHeldItem: true }), "");
assert.equal(visibleHeldTorchTextWithContext({ isLit: true, litAmount: 1 }, { hasOtherHeldItem: true }), "У руці горить запалений факел.");
assert.equal(visibleHeldTorchTextWithContext({ isLit: true, litAmount: 2 }, { hasOtherHeldItem: true }), "В обох руках горять запалені факели.");

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
  ["👁 Глянути", "🔎 Роздивитися", "👣 Слідувати"],
  ["⚔️ Атакувати", "💬 Привітати", "🗣 Сказати", "🤫 Прошепотіти"],
  ["✅ Кивнути", "👋 Помахати", "✨ Ще сигнали"],
  ["↩️ Назад"],
]);
assert.equal(
  buildTargetActionKeyboard({
    type: "player",
    id: 12,
    canGreet: true,
    canAttack: false,
    isAnimal: false,
  }).inline_keyboard[0][2].callback_data,
  "social:follow:player:12:known",
);

const multipleFreshCorpseRows = buildTargetListKeyboard([
  { type: "creature", id: 1, label: "труп миша", actionLabel: "розкладається; залишилось 92 тіків", canGreet: false, isAnimal: true, isCorpse: true, speciesKey: "mouse", speciesKind: "ANIMAL", canFreshen: true },
  { type: "creature", id: 2, label: "труп миша", actionLabel: "розкладається; залишилось 116 тіків", canGreet: false, isAnimal: true, isCorpse: true, speciesKey: "mouse", speciesKind: "ANIMAL", canFreshen: true },
]).inline_keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(multipleFreshCorpseRows, [
  ["☠️ 🐭 труп миша"],
  ["☠️ 🐭 труп миша"],
  ["🔪 Освіжувати всі"],
]);

const singleFreshCorpseRows = buildTargetListKeyboard([
  { type: "creature", id: 1, label: "труп миша", actionLabel: "розкладається; залишилось 92 тіків", canGreet: false, isAnimal: true, isCorpse: true, speciesKey: "mouse", speciesKind: "ANIMAL", canFreshen: true },
]).inline_keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(singleFreshCorpseRows, [["☠️ 🐭 труп миша"]]);

const livingTargets = [
  { type: "creature", id: 31, label: "Орина", actionLabel: "шукає гризунів і зайців; тримає запалений факел", canGreet: true, sex: "FEMALE", speciesKind: "HUMAN" },
  { type: "creature", id: 32, label: "Лукан", actionLabel: "тримає слід", canGreet: true, sex: "MALE", speciesKind: "HUMAN" },
  { type: "player", id: 33, label: "Вербові", actionLabel: "Поклик духа веде", canGreet: true, grammaticalGender: "PLURAL" },
  { type: "player", id: 38, label: "Марена", actionLabel: "озирається", canGreet: true, sex: "FEMALE" },
  { type: "creature", id: 34, label: "миша", actionLabel: "шукає їжу", canGreet: false, isAnimal: true, speciesKey: "mouse", speciesKind: "ANIMAL" },
  { type: "creature", id: 35, label: "лисиця", actionLabel: "нюхає траву", canGreet: false, isAnimal: true, speciesKey: "fox", speciesKind: "ANIMAL" },
  { type: "creature", id: 36, label: "Кіт-бережник", actionLabel: "озирається", canGreet: false, isAnimal: false, speciesKey: "camp_spirit_cat", speciesKind: "SPIRIT" },
  { type: "creature", id: 37, label: "заєць", actionLabel: "причаївся", canGreet: false, isAnimal: true, speciesKey: "rabbit", speciesKind: "ANIMAL" },
  { type: "creature", id: 39, label: "вовк", actionLabel: "нюхає землю", canGreet: false, isAnimal: true, speciesKey: "wolf", speciesKind: "ANIMAL" },
  { type: "creature", id: 40, label: "сова", actionLabel: "сидить тихо", canGreet: false, isAnimal: true, speciesKey: "owl", speciesKind: "ANIMAL" },
  { type: "creature", id: 41, label: "сокіл", actionLabel: "тримається високо", canGreet: false, isAnimal: true, speciesKey: "hawk", speciesKind: "ANIMAL" },
  { type: "creature", id: 42, label: "жаба", actionLabel: "сидить у мокрій траві", canGreet: false, isAnimal: true, speciesKey: "frog", speciesKind: "ANIMAL" },
  { type: "creature", id: 43, label: "змія", actionLabel: "повзе повільно", canGreet: false, isAnimal: true, speciesKey: "snake", speciesKind: "ANIMAL" },
  { type: "creature", id: 44, label: "крук", actionLabel: "дивиться збоку", canGreet: false, isAnimal: true, speciesKey: "raven", speciesKind: "ANIMAL" },
  { type: "creature", id: 45, label: "ведмідь", actionLabel: "важко дихає", canGreet: false, isAnimal: true, speciesKey: "bear", speciesKind: "ANIMAL" },
  { type: "creature", id: 46, label: "невідомий звір", actionLabel: "ворушиться", canGreet: false, isAnimal: true, speciesKey: "unknown", speciesKind: "ANIMAL" },
];
const livingTargetRows = buildTargetListKeyboard(livingTargets).inline_keyboard.map((row) => row.map((button) => button.text));
const secondLivingTargetRows = buildTargetListKeyboard(livingTargets, { page: 1 }).inline_keyboard.map((row) => row.map((button) => button.text));
assert.deepEqual(livingTargetRows, [
  ["🧍‍♀️ Орина"],
  ["🧍‍♂️ Лукан"],
  ["🧍 Вербові"],
  ["🧍‍♀️ Марена"],
  ["🐭 миша"],
  ["🦊 лисиця"],
  ["🐈 Кіт-бережник"],
  ["🐇 заєць"],
]);
assert.deepEqual(secondLivingTargetRows, [
  ["🐺 вовк"],
  ["🦉 сова"],
  ["🦅 сокіл"],
  ["🐸 жаба"],
  ["🐍 змія"],
  ["🐦‍⬛ крук"],
  ["🐻 ведмідь"],
  ["🐿️ невідомий звір"],
]);
const allLivingTargetLabels = [...livingTargetRows.flat(), ...secondLivingTargetRows.flat()];
assert.equal(allLivingTargetLabels.some((label) => label.includes("шукає гризунів")), false);
assert.equal(allLivingTargetLabels.some((label) => label.startsWith("🐾 ")), false);

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

const animalWithAccidentalGreetingRows = buildTargetActionKeyboard({
  type: "creature",
  id: 14,
  canGreet: true,
  canAttack: true,
  isAnimal: true,
}).inline_keyboard.map((row) => row.map((button) => button.callback_data));
assert.ok(!animalWithAccidentalGreetingRows.flat().some((callbackData) => String(callbackData).startsWith("social:greet:")), "Animal target keyboards should not expose greeting buttons.");
assert.ok(animalWithAccidentalGreetingRows.flat().includes("social:follow:creature:14:known"), "Animal target keyboards should expose follow intent.");

const anonymousAnimalWithAccidentalGreetingRows = buildAnonymousTargetKeyboard({
  type: "creature",
  id: 15,
  canGreet: true,
  canAttack: true,
  isAnimal: true,
}).inline_keyboard.map((row) => row.map((button) => button.text));
assert.ok(!anonymousAnimalWithAccidentalGreetingRows.flat().includes("💬 Привітати"), "Animal target keyboards should keep greeting off button text.");
assert.ok(anonymousAnimalWithAccidentalGreetingRows.flat().includes("👣 Слідувати"), "Anonymous living targets should expose follow intent.");

const spiritRows = buildTargetActionKeyboard({
  type: "creature",
  id: 16,
  canGreet: false,
  canAttack: false,
  isAnimal: false,
  canReceiveRawMeat: true,
}).inline_keyboard.map((row) => row.map((button) => button.text));
assert.ok(!spiritRows.flat().includes("⚔️ Атакувати"), "Spirit-like target keyboards should not expose attack buttons.");

const anonymousSpiritRows = buildAnonymousTargetKeyboard({
  type: "creature",
  id: 17,
  canGreet: false,
  canAttack: false,
  isAnimal: false,
}).inline_keyboard.map((row) => row.map((button) => button.text));
assert.ok(!anonymousSpiritRows.flat().includes("⚔️ Атакувати"), "Anonymous spirit-like target keyboards should not expose attack buttons.");

const returnAwareCorpseKeyboard = buildCorpseActionKeyboard({
  kind: "creature",
  id: 21,
  canFreshen: true,
}, "targetPage:details:1");
assert.equal(returnAwareCorpseKeyboard.inline_keyboard[1][0].callback_data, "social:pickup:creature:21:details:1");
assert.equal(returnAwareCorpseKeyboard.inline_keyboard.at(-1)[0].callback_data, "targetPage:details:1");
assert.ok(!returnAwareCorpseKeyboard.inline_keyboard.flat().some((button) => String(button.callback_data).includes("follow")), "Corpse keyboards should not expose follow intent.");

const socialHandlerSource = fs.readFileSync(path.join(process.cwd(), "src", "handlers", "social.ts"), "utf8");
assert.match(socialHandlerSource, /bot\.callbackQuery\(\s*\/\^social:follow:/, "Follow target keyboard callback should be registered as social:follow.");
assert.match(socialHandlerSource, /submitTargetFollowIntent\(ctx,\s*ctx\.match\[1\]/, "social:follow callback should route through the target follow-intent helper.");
assert.match(socialHandlerSource, /setPlayerFollowIntent\(/, "Target follow-intent helper should reuse the shared follow-intent service.");

const locationsSource = fs.readFileSync(path.join(process.cwd(), "src", "services", "locations.ts"), "utf8");
assert.match(locationsSource, /speciesKey:\s*c\.species\.key/, "Location target buttons should receive creature species keys for species-specific icons.");
assert.match(locationsSource, /speciesKind:\s*c\.species\.kind/, "Location target buttons should receive creature species kind for animal fallback icons.");
const briefRendererSource = locationsSource.slice(
  locationsSource.indexOf("export async function renderLocationBrief"),
  locationsSource.indexOf("export async function renderLocationGlance"),
);
const detailsRendererSource = locationsSource.slice(
  locationsSource.indexOf("export async function renderLocationDetails"),
  locationsSource.indexOf("export async function renderLocationFeatureInteraction"),
);
assert.ok(
  briefRendererSource.indexOf("buildTargetListKeyboard") < briefRendererSource.indexOf("addGroundItemPickupButtons"),
  "Brief location keyboards should list visible targets before loose ground pickup buttons.",
);
assert.ok(
  briefRendererSource.indexOf("buildTargetListKeyboard") < briefRendererSource.indexOf("addPickUpEverythingButton"),
  "Brief location keyboards should list visible targets before pick-up-everything.",
);
assert.ok(
  detailsRendererSource.indexOf("buildTargetListKeyboard") < detailsRendererSource.indexOf("addGroundItemPickupButtons"),
  "Detailed location keyboards should list visible targets before loose ground pickup buttons.",
);
assert.ok(
  detailsRendererSource.indexOf("buildTargetListKeyboard") < detailsRendererSource.indexOf("addPickUpEverythingButton"),
  "Detailed location keyboards should list visible targets before pick-up-everything.",
);

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
assert.match(litTorchLine, /^запалений факел; дає світло; горітиме ще приблизно \d+ годин/);
assert.deepEqual(groundItemPickupButtonRows([
  { id: 41, amount: 1, resourceType: { key: "twigs", name: "хмиз" } },
]), [[{ text: "🤲🪵 Підібрати: хмиз", callbackData: "item:pickup:41" }]]);
assert.deepEqual(groundItemPickupButtonRows([
  { id: 43, amount: 1, resourceType: { key: "torch", name: "факел" } },
]), [[{ text: "🤲🕯 Підібрати: факел", callbackData: "item:pickup:43" }]]);
assert.deepEqual(groundItemPickupButtonRows([
  { id: 41, amount: 1, resourceType: { key: "twigs", name: "хмиз" } },
  { id: 42, amount: 2, resourceType: { key: "twigs", name: "хмиз" } },
]), [
  [
    { text: "🤲🪵 Підібрати: хмиз", callbackData: "item:pickup:41" },
    { text: "🤲🪵 всі", callbackData: "item:pickupAll:twigs" },
  ],
  [
    { text: "🤲🪵 Підібрати: хмиз", callbackData: "item:pickup:42" },
    { text: "🤲🪵 всі", callbackData: "item:pickupAll:twigs" },
  ],
]);
assert.equal(groundItemPickupIcon("unknown_loot"), "🤲📦");
assert.equal(PICK_UP_EVERYTHING_BUTTON_TEXT, "🤲🎒 Підібрати все");

assert.equal(hasPickableLyingObjects([], []), false);
assert.equal(hasPickableLyingObjects([{ id: 41, amount: 1 }], []), true);
assert.equal(hasPickableLyingObjects([], [{ id: 1, currentAction: null }]), true);
assert.equal(hasPickableLyingObjects([], [{ id: 2, currentAction: "freshened_by_player:1; meat=1" }]), false);
assert.equal(pickableLyingObjectCount([{ id: 41, amount: 1 }], []), 1);
assert.equal(hasMultiplePickableLyingObjects([{ id: 41, amount: 1 }], []), false);
assert.equal(hasMultiplePickableLyingObjects([{ id: 41, amount: 2 }], []), true);
assert.equal(hasMultiplePickableLyingObjects([{ id: 41, amount: 1 }], [{ id: 1, currentAction: null }]), true);
assert.equal(hasMultiplePickableLyingObjects([{ id: 41, amount: 1 }], [{ id: 2, currentAction: "freshened_by_player:1; meat=1" }]), false);

console.log("Target formatting OK");
