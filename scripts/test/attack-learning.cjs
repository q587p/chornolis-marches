const assert = require("node:assert/strict");

require("ts-node/register");

const {
  ATTACK_CANONICAL_OBSERVATION_EVENT_TITLE,
  ATTACK_CANONICAL_PRACTICE_EVENT_TITLE,
  ATTACK_OBSERVATION_GROWTH_MESSAGE,
  ATTACK_PRACTICE_GROWTH_MESSAGE,
  attackCanonicalObservationDescription,
  attackKillSourceDescription,
  attackObservationDescription,
  attackPracticeSourceDescription,
  isAttackObservationMilestone,
  isAttackPracticeMilestone,
} = require("../../src/services/attackLearningRules");
const {
  attackSourceAttackerCreatureId,
  attackObservationLearningInput,
  attackPracticeLearningInput,
  canCreatureLearnAttackByObservation,
  creatureStillShowsAttackSource,
  recordAttackObservation,
  recordAttackPracticeLearning,
  recordCreatureAttackObservation,
  sourceWasCreatedByAttackCreature,
} = require("../../src/services/attackLearning");

assert.equal(isAttackPracticeMilestone(0), false);
assert.equal(isAttackPracticeMilestone(12), false);
assert.equal(isAttackPracticeMilestone(13), true);
assert.equal(isAttackPracticeMilestone(26), true);
assert.equal(isAttackPracticeMilestone(27), false);

assert.equal(isAttackObservationMilestone(0), false);
assert.equal(isAttackObservationMilestone(4), false);
assert.equal(isAttackObservationMilestone(5), true);
assert.equal(isAttackObservationMilestone(10), true);
assert.equal(isAttackObservationMilestone(11), false);

assert.equal(ATTACK_PRACTICE_GROWTH_MESSAGE, "Навичка <b>атаки</b> підросла.");
assert.equal(ATTACK_OBSERVATION_GROWTH_MESSAGE, "Навичка <b>атаки</b> трохи підросла.");
assert.equal(attackKillSourceDescription({ attackerPlayerId: 7, victimCreatureId: 12 }), "attackerPlayer=7; victimCreature=12");
assert.equal(attackKillSourceDescription({ attackerCreatureId: 9, victimCreatureId: 12 }), "attackerCreature=9; victimCreature=12");
assert.equal(attackObservationDescription(42), "source=42");
assert.equal(attackPracticeSourceDescription({ attackerPlayerId: 7, targetCreatureId: 12, outcome: "kill" }), "attackerPlayer=7; targetCreature=12; outcome=kill");
assert.equal(attackPracticeSourceDescription({ attackerCreatureId: 9, targetCreatureId: 12, outcome: "miss" }), "attackerCreature=9; targetCreature=12; outcome=miss");
assert.equal(attackCanonicalObservationDescription({ playerId: 7, sourceEventId: 42 }), "player=7; source=42; skillKey=attack; contextKey=attack");
assert.equal(attackCanonicalObservationDescription({ creatureId: 9, sourceEventId: 42 }), "creature=9; source=42; skillKey=attack; contextKey=attack");
assert.equal(sourceWasCreatedByAttackCreature("attackerCreature=9; targetCreature=12; outcome=wound", 9), true);
assert.equal(sourceWasCreatedByAttackCreature("attackerCreature=19; targetCreature=12; outcome=wound", 9), false);
assert.equal(attackSourceAttackerCreatureId("attackerCreature=9; targetCreature=12; outcome=wound"), 9);
assert.equal(attackSourceAttackerCreatureId("attackerPlayer=7; targetCreature=12; outcome=wound"), null);
assert.equal(creatureStillShowsAttackSource({ locationId: 13, isAlive: true, isGone: false, isHidden: false, activity: "FIGHTING", currentAction: "шукає гризунів і зайців" }, 13), true);
assert.equal(creatureStillShowsAttackSource({ locationId: 13, isAlive: true, isGone: false, isHidden: false, activity: "LOOKING", currentAction: "вполював мишу і несе здобич" }, 13), true);
assert.equal(creatureStillShowsAttackSource({ locationId: 13, isAlive: true, isGone: false, isHidden: false, activity: "LOOKING", currentAction: "шукає гризунів і зайців" }, 13), false);
assert.equal(creatureStillShowsAttackSource({ locationId: 14, isAlive: true, isGone: false, isHidden: false, activity: "FIGHTING", currentAction: "атакує мишу" }, 13), false);
assert.deepEqual(
  attackPracticeLearningInput({ attackerPlayerId: 7, sourceEventId: 42 }),
  {
    actor: { actorType: "PLAYER", playerId: 7 },
    progress: {
      skillKey: "attack",
      sourceKey: "practice",
      contextKey: "attack",
      amount: 1,
      lastSourceEventId: 42,
    },
  },
);
assert.deepEqual(attackPracticeLearningInput({ attackerCreatureId: 9, sourceEventId: 42 }).actor, { actorType: "CREATURE", creatureId: 9 });
assert.equal(attackPracticeLearningInput({ sourceEventId: 42 }), null);
assert.deepEqual(attackObservationLearningInput({ sourceEventId: 42 }), {
  skillKey: "attack",
  sourceKey: "observation",
  contextKey: "attack",
  amount: 1,
  lastSourceEventId: 42,
});
assert.equal("successChance" in attackObservationLearningInput({ sourceEventId: 42 }), false, "attack learning helper must not expose combat modifiers");
assert.equal("damageBonus" in attackObservationLearningInput({ sourceEventId: 42 }), false, "attack learning helper must not expose damage modifiers");

assert.equal(canCreatureLearnAttackByObservation({ isAlive: true, isGone: false, professionKey: "hunter" }), true);
assert.equal(canCreatureLearnAttackByObservation({ isAlive: true, isGone: false, professionName: "мисливець" }), true);
assert.equal(canCreatureLearnAttackByObservation({ isAlive: true, isGone: false, professionKey: "herbalist" }), false);
assert.equal(canCreatureLearnAttackByObservation({ isAlive: false, isGone: false, professionKey: "hunter" }), false);
assert.equal(canCreatureLearnAttackByObservation({ isAlive: true, isGone: true, professionKey: "hunter" }), false);
assert.equal(canCreatureLearnAttackByObservation({ isAlive: true, isGone: false, isHidden: true, professionKey: "hunter" }), false);

function fakeAttackLearningDb({
  sourceDescriptions = ["attackerCreature=9; targetCreature=12; outcome=kill"],
  sourceTitle = ATTACK_CANONICAL_PRACTICE_EVENT_TITLE,
  creatureOverrides = {},
} = {}) {
  let nextEventId = sourceDescriptions.length + 1;
  let nextProgressId = 1;
  const events = sourceDescriptions.map((description, index) => ({
    id: index + 1,
    type: "SYSTEM",
    title: sourceTitle,
    description,
    playerId: description.includes("attackerPlayer=7") ? 7 : null,
    locationId: 13,
    createdAt: new Date(Date.UTC(2026, 5, 3, 9, 0, index)),
  }));
  const playerProgressRows = [];
  const creatureProgressRows = [];
  const creatures = new Map([
    [9, {
      id: 9,
      locationId: 13,
      isAlive: true,
      isGone: false,
      isHidden: false,
      age: "ADULT",
      professionKey: "hunter",
      professionName: "мисливець",
      species: { kind: "HUMANOID", diet: "OMNIVORE" },
      activity: "FIGHTING",
      currentAction: "атакує мишу",
      ...creatureOverrides,
    }],
    [10, {
      id: 10,
      locationId: 13,
      isAlive: true,
      isGone: false,
      isHidden: false,
      age: "ADULT",
      professionKey: "herbalist",
      professionName: "знахар",
      species: { kind: "HUMANOID", diet: "OMNIVORE" },
    }],
  ]);

  const progressTable = (rows, idKey, uniqueKey) => ({
    findUnique: async ({ where }) => {
      const key = where[uniqueKey];
      return rows.find((row) =>
        row[idKey] === key[idKey] &&
        row.skillKey === key.skillKey &&
        row.sourceKey === key.sourceKey &&
        row.contextKey === key.contextKey
      ) ?? null;
    },
    create: async ({ data }) => {
      const row = {
        id: nextProgressId++,
        ...data,
        discoveredAt: new Date("2026-06-03T09:01:00Z"),
        createdAt: new Date("2026-06-03T09:01:00Z"),
        updatedAt: new Date("2026-06-03T09:01:00Z"),
      };
      rows.push(row);
      return row;
    },
    update: async ({ where, data }) => {
      const row = rows.find((entry) => entry.id === where.id);
      assert.ok(row, "fake progress row exists");
      Object.assign(row, data, { updatedAt: new Date("2026-06-03T09:02:00Z") });
      return row;
    },
  });

  return {
    events,
    playerProgressRows,
    creatureProgressRows,
    worldEvent: {
      findMany: async ({ where, take }) => events
        .filter((event) => {
          const titles = where.title?.in ?? [where.title];
          const playerOk = !where.OR || event.playerId === null || event.playerId !== where.OR[1]?.playerId?.not;
          return titles.includes(event.title) &&
            event.locationId === where.locationId &&
            event.createdAt >= where.createdAt.gte &&
            playerOk;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, take ?? events.length),
      findFirst: async ({ where }) => events.find((event) =>
        event.title === where.title &&
        event.playerId === where.playerId &&
        event.description === where.description
      ) ?? events.find((event) =>
        event.title === where.title &&
        where.playerId === undefined &&
        event.description === where.description
      ) ?? null,
      create: async ({ data, select }) => {
        const row = {
          id: nextEventId++,
          createdAt: new Date("2026-06-03T09:01:00Z"),
          ...data,
        };
        events.push(row);
        return select?.id ? { id: row.id } : row;
      },
      count: async ({ where }) => events.filter((event) => event.title === where.title && event.playerId === where.playerId).length,
    },
    characterLearningProgress: progressTable(playerProgressRows, "playerId", "playerId_skillKey_sourceKey_contextKey"),
    creatureLearningProgress: progressTable(creatureProgressRows, "creatureId", "creatureId_skillKey_sourceKey_contextKey"),
    creature: {
      findUnique: async ({ where }) => creatures.get(where.id) ?? null,
    },
  };
}

(async () => {
  const playerPracticeDb = fakeAttackLearningDb({ sourceDescriptions: [] });
  const playerPractice = await recordAttackPracticeLearning({
    locationId: 13,
    attackerPlayerId: 7,
    targetCreatureId: 12,
    outcome: "miss",
  }, playerPracticeDb);
  assert.equal(playerPractice.sourceRecorded, true);
  assert.equal(playerPractice.canonicalProgressRecorded, true);
  assert.equal(playerPracticeDb.playerProgressRows.length, 1);
  assert.equal(playerPracticeDb.playerProgressRows[0].skillKey, "attack");
  assert.equal(playerPracticeDb.playerProgressRows[0].sourceKey, "practice");
  assert.equal(playerPracticeDb.playerProgressRows[0].contextKey, "attack");
  assert.equal(playerPracticeDb.playerProgressRows[0].totalProgress, 1);
  assert.equal(playerPracticeDb.events.some((event) => event.title === ATTACK_CANONICAL_PRACTICE_EVENT_TITLE), true);

  const creaturePracticeDb = fakeAttackLearningDb({ sourceDescriptions: [] });
  await recordAttackPracticeLearning({
    locationId: 13,
    attackerCreatureId: 9,
    targetCreatureId: 12,
    outcome: "wound",
  }, creaturePracticeDb);
  assert.equal(creaturePracticeDb.playerProgressRows.length, 0);
  assert.equal(creaturePracticeDb.creatureProgressRows.length, 1);
  assert.equal(creaturePracticeDb.creatureProgressRows[0].creatureId, 9);
  assert.equal(creaturePracticeDb.creatureProgressRows[0].skillKey, "attack");
  assert.equal(creaturePracticeDb.creatureProgressRows[0].sourceKey, "practice");
  assert.equal(creaturePracticeDb.creatureProgressRows[0].contextKey, "attack");

  const invalidPracticeDb = fakeAttackLearningDb({ sourceDescriptions: [] });
  const invalidPractice = await recordAttackPracticeLearning({ locationId: 13 }, invalidPracticeDb);
  assert.equal(invalidPractice.canonicalProgressRecorded, false);
  assert.equal(invalidPracticeDb.playerProgressRows.length, 0);
  assert.equal(invalidPracticeDb.creatureProgressRows.length, 0);

  const observationDb = fakeAttackLearningDb();
  const observed = await recordAttackObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:01:00Z"),
  }, observationDb);
  assert.equal(observed.observed, true);
  assert.equal(observed.canonicalProgressRecorded, true);
  assert.equal(observationDb.playerProgressRows.length, 1);
  assert.equal(observationDb.playerProgressRows[0].skillKey, "attack");
  assert.equal(observationDb.playerProgressRows[0].sourceKey, "observation");
  assert.equal(observationDb.playerProgressRows[0].contextKey, "attack");

  const repeatedObservation = await recordAttackObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:02:00Z"),
  }, observationDb);
  assert.equal(repeatedObservation.observed, false, "same attack source should not grant player observation twice");
  assert.equal(observationDb.playerProgressRows[0].totalProgress, 1);

  const legacyKillDb = fakeAttackLearningDb({
    sourceTitle: "Attack kill observable",
    sourceDescriptions: ["attackerCreature=9; victimCreature=12"],
  });
  const legacyObserved = await recordAttackObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:01:00Z"),
  }, legacyKillDb);
  assert.equal(legacyObserved.observed, true, "legacy kill source remains observable");
  assert.equal(legacyObserved.canonicalProgressRecorded, true);

  const staleCreatureSourceDb = fakeAttackLearningDb({
    sourceDescriptions: ["attackerCreature=9; targetCreature=12; outcome=kill"],
    creatureOverrides: { activity: "LOOKING", currentAction: "шукає гризунів і зайців" },
  });
  const staleObserved = await recordAttackObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:01:00Z"),
  }, staleCreatureSourceDb);
  assert.equal(staleObserved.observed, false, "stale creature attack source should not grant player observation after the attacker moved on");
  assert.equal(staleCreatureSourceDb.playerProgressRows.length, 0);

  const hunterObservationDb = fakeAttackLearningDb({
    sourceDescriptions: ["attackerPlayer=7; targetCreature=12; outcome=kill"],
  });
  const hunterObserved = await recordCreatureAttackObservation({
    creatureId: 9,
    now: new Date("2026-06-03T09:01:00Z"),
  }, hunterObservationDb);
  assert.equal(hunterObserved.observed, true);
  assert.equal(hunterObserved.canonicalProgressRecorded, true);
  assert.equal(hunterObservationDb.creatureProgressRows.length, 1);
  assert.equal(hunterObservationDb.creatureProgressRows[0].skillKey, "attack");
  assert.equal(hunterObservationDb.creatureProgressRows[0].sourceKey, "observation");
  assert.equal(hunterObservationDb.events.some((event) => event.title === ATTACK_CANONICAL_OBSERVATION_EVENT_TITLE), true);

  const repeatedHunter = await recordCreatureAttackObservation({
    creatureId: 9,
    now: new Date("2026-06-03T09:02:00Z"),
  }, hunterObservationDb);
  assert.equal(repeatedHunter.observed, false, "same attack source should not grant creature observation twice");
  assert.equal(hunterObservationDb.creatureProgressRows[0].totalProgress, 1);

  const herbalistAttackDb = fakeAttackLearningDb();
  const herbalistObserved = await recordCreatureAttackObservation({
    creatureId: 10,
    now: new Date("2026-06-03T09:01:00Z"),
  }, herbalistAttackDb);
  assert.equal(herbalistObserved.observed, false, "herbalists do not learn attack observation by default");
  assert.equal(herbalistAttackDb.creatureProgressRows.length, 0);

  const selfSourceDb = fakeAttackLearningDb({
    sourceDescriptions: ["attackerCreature=9; targetCreature=12; outcome=kill"],
  });
  const selfObserved = await recordCreatureAttackObservation({
    creatureId: 9,
    now: new Date("2026-06-03T09:01:00Z"),
  }, selfSourceDb);
  assert.equal(selfObserved.observed, false, "creature should not observe its own attack source as observation");
  assert.equal(selfSourceDb.creatureProgressRows.length, 0);

  console.log("Attack learning helpers OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
