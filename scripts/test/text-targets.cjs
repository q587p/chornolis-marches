const assert = require("node:assert/strict");

require("ts-node/register");

const {
  bestTargetActionMatch,
  isSelfTargetQuery,
  targetDisplayLabel,
  textTargetsForAction,
  visibleTextTargetCreatureWhere,
} = require("../../src/services/textTargets");
const { isVisibleCorpse } = require("../../src/services/locations");
const { isFreshenedCorpse } = require("../../src/services/meat");
const { resourceTypeDisplayName } = require("../../src/services/corpses");

const where = visibleTextTargetCreatureWhere(42);
assert.equal(where.locationId, 42);
assert.deepEqual(where.OR, [
  { isAlive: true, isHidden: false },
  {
    isAlive: false,
    age: "CORPSE",
    isHidden: false,
    NOT: [
      { currentAction: { startsWith: "freshened_by_player:" } },
      { currentAction: { contains: "; freshened_by_player:" } },
      { currentAction: { startsWith: "freshened_by_hunter:" } },
      { currentAction: { contains: "; freshened_by_hunter:" } },
    ],
  },
]);

const visibleCorpse = { isAlive: false, isGone: false, isHidden: false, age: "CORPSE" };
const hiddenClaimedCorpse = {
  ...visibleCorpse,
  isHidden: true,
  currentAction: "claimed_by_hunter:7; freshened_by_hunter:7",
};

assert.equal(isVisibleCorpse(visibleCorpse), true);
assert.equal(isVisibleCorpse(hiddenClaimedCorpse), false);
assert.equal(isVisibleCorpse({ ...visibleCorpse, isGone: true }), false);
assert.equal(isFreshenedCorpse("freshened_by_player:1; м'ясо=1"), true);
assert.equal(isFreshenedCorpse("claimed_by_hunter:7; freshened_by_hunter:7"), true);
assert.equal(isVisibleCorpse({ ...visibleCorpse, currentAction: "freshened_by_player:1; м'ясо=1" }), false);
assert.equal(targetDisplayLabel({
  type: "creature",
  id: 1,
  label: "труп миші",
  actionLabel: "розкладається; залишилось 92 тіків",
  canGreet: false,
  isCorpse: true,
  searchKeys: [],
}), "труп миші");
assert.equal(targetDisplayLabel({
  type: "creature",
  id: 2,
  label: "миша",
  actionLabel: "ворушиться в траві",
  canGreet: false,
  searchKeys: [],
}), "миша — ворушиться в траві");

const visibleTargets = [
  {
    type: "player",
    id: 1,
    label: "Антон",
    canGreet: true,
    canAttack: false,
    searchKeys: ["антон", "гравець"],
  },
  {
    type: "player",
    id: 2,
    label: "Берегові",
    canGreet: true,
    canAttack: false,
    searchKeys: ["берегові", "персонаж"],
  },
  {
    type: "creature",
    id: 3,
    label: "Кіт-бережник",
    actionLabel: "озирається",
    canGreet: false,
    canAttack: false,
    searchKeys: ["кіт", "кіт-бережник"],
  },
  {
    type: "creature",
    id: 4,
    label: "миша",
    actionLabel: "шукає їжу",
    canGreet: false,
    canAttack: true,
    searchKeys: ["миша", "мишу"],
  },
  {
    type: "creature",
    id: 5,
    label: "труп миші",
    canGreet: false,
    canAttack: false,
    isCorpse: true,
    searchKeys: ["миша", "труп", "труп миші"],
  },
  {
    type: "creature",
    id: 6,
    label: "труп миші",
    canGreet: false,
    canAttack: false,
    isCorpse: true,
    searchKeys: ["миша", "труп", "труп миші"],
  },
];

assert.deepEqual(textTargetsForAction("attack", visibleTargets).map((target) => target.id), [4]);
assert.equal(bestTargetActionMatch("attack", "миша", visibleTargets).target.id, 4);
assert.equal(bestTargetActionMatch("attack", "миша 4", visibleTargets).target.id, 4);
assert.equal(bestTargetActionMatch("attack", "труп миші", visibleTargets).kind, "none");
assert.deepEqual(textTargetsForAction("freshen", visibleTargets).map((target) => target.id), [5, 6]);

const duplicateMiceMatch = bestTargetActionMatch("attack", "миша", [
  visibleTargets[3],
  { ...visibleTargets[3], id: 7, actionLabel: "озирається" },
]);
assert.equal(duplicateMiceMatch.kind, "one");
assert.equal(duplicateMiceMatch.target.id, 4);

assert.equal(resourceTypeDisplayName({ key: "corpse_mouse_male", name: "труп самця миші" }), "труп миша");
assert.equal(resourceTypeDisplayName({ key: "corpse_mouse_female", name: "труп самиці миші" }), "труп миші");
assert.equal(isSelfTargetQuery("me"), true);
assert.equal(isSelfTargetQuery("at me"), true);
assert.equal(isSelfTargetQuery("я"), true);
assert.equal(isSelfTargetQuery("мене"), true);
assert.equal(isSelfTargetQuery("на мене"), true);
assert.equal(isSelfTargetQuery("себе"), true);
assert.equal(isSelfTargetQuery("мій персонаж"), true);
assert.equal(isSelfTargetQuery("лисиця"), false);

console.log("Text target visibility OK");
