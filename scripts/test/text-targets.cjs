const assert = require("node:assert/strict");

require("ts-node/register");

const {
  bestTargetActionMatch,
  assertBulkAttackQueueCapacity,
  isSelfTargetQuery,
  isSelfTargetQueryForPlayer,
  selfTargetSearchKeysForPlayer,
  targetDisplayLabel,
  textTargetsForAction,
  textTargetsMatchingActionQuery,
  visibleTextTargetCreatureWhere,
} = require("../../src/services/textTargets");
const { MAX_QUEUED_ACTIONS_PER_ACTOR } = require("../../src/gameConfig");
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

const bulkAttackTargets = [
  { ...visibleTargets[3], id: 7, searchKeys: ["mouse", "mice", "миші", "мишей"] },
  { ...visibleTargets[3], id: 8, label: "rabbit", searchKeys: ["rabbit", "rabbits", "зайці", "зайців"] },
  { ...visibleTargets[4], searchKeys: ["mouse"] },
];
assert.deepEqual(textTargetsMatchingActionQuery("attack", "", bulkAttackTargets).map((target) => target.id), [7, 8]);
assert.deepEqual(textTargetsMatchingActionQuery("attack", "mouse", bulkAttackTargets).map((target) => target.id), [7]);
assert.deepEqual(textTargetsMatchingActionQuery("attack", "mice", bulkAttackTargets).map((target) => target.id), [7]);
assert.deepEqual(textTargetsMatchingActionQuery("attack", "мишей", bulkAttackTargets).map((target) => target.id), [7]);
assert.deepEqual(textTargetsMatchingActionQuery("attack", "rabbits", bulkAttackTargets).map((target) => target.id), [8]);
assert.deepEqual(textTargetsMatchingActionQuery("attack", "зайців", bulkAttackTargets).map((target) => target.id), [8]);
assert.deepEqual(textTargetsMatchingActionQuery("freshen", "mouse", bulkAttackTargets).map((target) => target.id), [5]);
assert.doesNotThrow(() => assertBulkAttackQueueCapacity(MAX_QUEUED_ACTIONS_PER_ACTOR));
assert.throws(
  () => assertBulkAttackQueueCapacity(MAX_QUEUED_ACTIONS_PER_ACTOR + 1),
  /Масова атака знайшла 18 цілей/,
);

assert.equal(resourceTypeDisplayName({ key: "corpse_mouse_male", name: "труп самця миші" }), "труп миша");
assert.equal(resourceTypeDisplayName({ key: "corpse_mouse_female", name: "труп самиці миші" }), "труп миші");
assert.equal(resourceTypeDisplayName({ key: "corpse_owl", name: "труп сови" }), "труп сови");
assert.equal(resourceTypeDisplayName({ key: "corpse_owl_male", name: "труп сови" }), "труп сови");
assert.equal(isSelfTargetQuery("me"), true);
assert.equal(isSelfTargetQuery("at me"), true);
assert.equal(isSelfTargetQuery("я"), true);
assert.equal(isSelfTargetQuery("мене"), true);
assert.equal(isSelfTargetQuery("на мене"), true);
assert.equal(isSelfTargetQuery("себе"), true);
assert.equal(isSelfTargetQuery("мій персонаж"), true);
assert.equal(isSelfTargetQuery("лисиця"), false);

const selfPlayer = {
  id: 9,
  firstName: "Нестор",
  lastName: "Межовий",
  username: "nestor_user",
  grammaticalGender: "MASCULINE",
  animacy: "ANIMATE",
  nameNominative: "Нестор Межовий",
  nameGenitive: "Нестора Межового",
  nameDative: "Нестору Межовому",
  nameAccusative: "Нестора Межового",
  nameInstrumental: "Нестором Межовим",
  nameLocative: "Несторі Межовому",
  nameVocative: "Несторе Межовий",
};
assert.equal(selfTargetSearchKeysForPlayer(selfPlayer).includes("нестор"), true);
assert.equal(isSelfTargetQueryForPlayer("Нестор", selfPlayer), true);
assert.equal(isSelfTargetQueryForPlayer("нестор", selfPlayer), true);
assert.equal(isSelfTargetQueryForPlayer("на Нестора Межового", selfPlayer), true);
assert.equal(isSelfTargetQueryForPlayer("Несторе Межовий", selfPlayer), true);
assert.equal(isSelfTargetQueryForPlayer("заєць", selfPlayer), false);

console.log("Text target visibility OK");
