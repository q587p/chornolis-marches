const assert = require("node:assert/strict");

require("ts-node/register");

const {
  SOCIAL_DEFINITIONS,
  animalSignalFleeText,
  quickSocialsForTarget,
  socialDefinitionById,
} = require("../../src/services/socialSignals");

const expectedIds = ["smile", "laugh", "nod", "bow", "point", "glare", "sigh", "wave", "hush"];
const expectedLabels = [
  "🙂 Усміхнутися",
  "😄 Засміятися",
  "✅ Кивнути",
  "🙇 Вклонитися",
  "👉 Вказати",
  "😠 Насупитися",
  "😮‍💨 Зітхнути",
  "👋 Помахати",
  "🤫 Притишити",
];

assert.deepEqual(SOCIAL_DEFINITIONS.map((social) => social.id), expectedIds);
assert.equal(new Set(SOCIAL_DEFINITIONS.map((social) => social.id)).size, SOCIAL_DEFINITIONS.length);
assert.deepEqual(SOCIAL_DEFINITIONS.map((social) => social.label), expectedLabels);

const playerTargetContext = {
  actorName: "Олена",
  targetDative: "Здравомиру",
  targetAccusative: "Здравомира",
};
const creatureTargetContext = {
  actorName: "Олена",
  targetDative: "вовку",
  targetAccusative: "вовка",
};

const smile = socialDefinitionById("smile");
assert.ok(smile);
assert.equal(smile.actorMessage(playerTargetContext), "Ви усміхаєтеся Здравомиру.");
assert.equal(smile.targetMessage(playerTargetContext), "Олена усміхається вам.");
assert.equal(smile.roomMessage(playerTargetContext), "Олена усміхається Здравомиру.");

const point = socialDefinitionById("point");
assert.ok(point);
assert.equal(point.actorMessage(creatureTargetContext), "Ви вказуєте на вовка.");
assert.equal(point.targetMessage(creatureTargetContext), "Олена вказує на вас.");
assert.equal(point.roomMessage(creatureTargetContext), "Олена вказує на вовка.");

const hush = socialDefinitionById("hush");
assert.ok(hush);
assert.equal(hush.targetlessActorMessage(playerTargetContext), "Ви прикладаєте палець до вуст і просите тиші.");
assert.equal(hush.targetlessRoomMessage(playerTargetContext), "Олена прикладає палець до вуст і просить тиші.");

const escapedContext = {
  actorName: "&lt;Олена&gt;",
  targetDative: "&lt;Здравомиру&gt;",
  targetAccusative: "&lt;Здравомира&gt;",
};
assert.equal(smile.roomMessage(escapedContext), "&lt;Олена&gt; усміхається &lt;Здравомиру&gt;.");

assert.deepEqual(quickSocialsForTarget({ kind: "player", isAnimal: false, canGreet: true }), ["nod", "wave"]);
assert.deepEqual(quickSocialsForTarget({ kind: "creature", isAnimal: true, canGreet: false }), ["point", "glare"]);
assert.deepEqual(quickSocialsForTarget({ kind: "creature", isAnimal: false, canGreet: true }), ["nod", "wave"]);
assert.deepEqual(quickSocialsForTarget({ kind: "creature", isAnimal: false, canGreet: false }), ["bow", "glare"]);

assert.equal(animalSignalFleeText({ nominative: "жаба" }), "Жаба лякається жесту й кидається геть.");
assert.equal(animalSignalFleeText({ nominative: "миша" }), "Миша лякається жесту й кидається геть.");
assert.equal(animalSignalFleeText({ nominative: "Кіт-бережник" }), "Кіт-бережник лякається жесту й кидається геть.");

console.log("Social signal content helpers OK");
