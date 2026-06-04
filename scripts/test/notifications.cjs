const assert = require("node:assert/strict");

require("ts-node/register");

const {
  canReceiveLocationNotification,
  combineMovementNotificationLines,
  createNonPlayerMovementNotificationBuffer,
  movementNotificationTargetsStillPresent,
  nonPlayerMovementNotificationOptions,
  runInlineReplacementForKey,
} = require("../../src/services/notifications");
const { movementLabelFromVisibility } = require("../../src/services/actionCompletions");
const { actorLabelFromVisibility } = require("../../src/services/visibilityLabels");

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const events = [];
  await Promise.all([
    runInlineReplacementForKey("chat:tracks:1", async () => {
      events.push("first:start");
      await sleep(25);
      events.push("first:end");
    }),
    runInlineReplacementForKey("chat:tracks:1", async () => {
      events.push("second:start");
      events.push("second:end");
    }),
  ]);

  assert.deepEqual(events, ["first:start", "first:end", "second:start", "second:end"]);

  const flushed = [];
  const buffer = createNonPlayerMovementNotificationBuffer({
    delayMs: 1000,
    flush: (event) => flushed.push(event),
  });

  buffer.queue({ locationId: 42, line: "Кіт-бережник зайшов сюди знизу.", creatureId: 7 });
  buffer.queue({ locationId: 42, line: "Кіт-бережник пішов звідси.", creatureId: 7 });
  assert.equal(buffer.pendingCount(), 1);
  await buffer.flushLocation(42);

  assert.equal(flushed.length, 1);
  assert.deepEqual(flushed[0].lines, [
    "Кіт-бережник зайшов сюди знизу.",
    "Кіт-бережник пішов звідси.",
  ]);
  assert.deepEqual(flushed[0].creatureIds, [7]);
  assert.equal(combineMovementNotificationLines(flushed[0].lines), "Кіт-бережник зайшов сюди знизу.\nКіт-бережник пішов звідси.");

  const targets = movementNotificationTargetsStillPresent(42, [7, 8, 9, 10, 11, 12], [
    { id: 7, locationId: 42, isAlive: true, isGone: false, isHidden: false, label: "Кіт-бережник", species: { kind: "SPIRIT" } },
    { id: 8, locationId: 43, isAlive: true, isGone: false, isHidden: false, label: "Дід лісовик", species: { kind: "SPIRIT" } },
    { id: 9, locationId: 42, isAlive: true, isGone: false, isHidden: false, label: "миша", species: { kind: "ANIMAL" } },
    { id: 10, locationId: 42, isAlive: false, isGone: false, isHidden: false, label: "мертва тінь", species: { kind: "SPIRIT" } },
    { id: 11, locationId: 42, isAlive: true, isGone: true, isHidden: false, label: "зникла тінь", species: { kind: "SPIRIT" } },
    { id: 12, locationId: 42, isAlive: true, isGone: false, isHidden: true, label: "схована тінь", species: { kind: "SPIRIT" } },
  ]);
  assert.deepEqual(targets, [{ id: 7, label: "Кіт-бережник" }]);
  assert.deepEqual(movementNotificationTargetsStillPresent(42, [7], [
    { id: 7, locationId: 42, isAlive: true, isGone: false, isHidden: false, label: "Кіт-бережник", species: { kind: "SPIRIT" } },
  ], { showNearbyDetails: false }), []);
  assert.deepEqual(movementNotificationTargetsStillPresent(42, [7], [
    { id: 7, locationId: 42, isAlive: true, isGone: false, isHidden: false, label: "Кіт-бережник", species: { kind: "SPIRIT" } },
  ], { showNearbyDetails: true, lines: ["Хтось зайшов сюди знизу."] }), []);
  assert.deepEqual(movementNotificationTargetsStillPresent(42, [7], [
    { id: 7, locationId: 42, isAlive: true, isGone: false, isHidden: false, label: "Кіт-бережник", species: { kind: "SPIRIT" } },
  ], { showNearbyDetails: true, lines: ["Кіт-бережник зайшов сюди знизу."] }), [{ id: 7, label: "Кіт-бережник" }]);

  const options = nonPlayerMovementNotificationOptions(42, [7, 7, 8], targets);
  assert.equal(options.replaceKey, "tracks:42");
  assert.deepEqual(options.clearKeys, ["target:creature:7", "target:creature:8"]);
  assert.equal(options.keyboard.inline_keyboard.length, 2);
  assert.equal(options.keyboard.inline_keyboard[0].length, 1);
  assert.equal(options.keyboard.inline_keyboard[0][0].text, "Кіт-бережник");
  assert.equal(options.keyboard.inline_keyboard[0][0].callback_data, "target:creature:7");
  assert.equal(options.keyboard.inline_keyboard[1][0].text, "🐾 Сліди");

  assert.equal(canReceiveLocationNotification({ sleepState: "AWAKE" }), true);
  assert.equal(canReceiveLocationNotification({ sleepState: "ORDINARY_SLEEP" }), false);
  assert.equal(canReceiveLocationNotification({ sleepState: "ORDINARY_SLEEP" }, { includeSleeping: true }), true);
  assert.equal(movementLabelFromVisibility({ showNearbyDetails: false }, false, "Хтось", "Орина"), "Хтось");
  assert.equal(movementLabelFromVisibility({ showNearbyDetails: false }, true, "Хтось", "Орина"), "Орина");
  assert.equal(movementLabelFromVisibility({ showNearbyDetails: true }, false, "Хтось", "Орина"), "Орина");
  assert.equal(actorLabelFromVisibility({ showNearbyDetails: true }, false, "Хтось", "Лукан"), "Лукан");
  assert.equal(actorLabelFromVisibility({ showNearbyDetails: false }, true, "Хтось", "Лукан"), "Лукан");
  assert.equal(actorLabelFromVisibility({ showNearbyDetails: false }, false, "Хтось", "Лукан"), "Хтось");

  console.log("Notification replacement locks OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
