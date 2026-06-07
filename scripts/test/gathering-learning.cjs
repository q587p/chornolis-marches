const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  GATHERING_OBSERVATION_GROWTH_MESSAGE,
  GATHERING_OBSERVATION_EVENT_TITLE,
  GATHERING_PRACTICE_GROWTH_MESSAGE,
  GATHERING_SOURCE_EVENT_TITLE,
  gatheringObservationDescription,
  gatheringSourceDescription,
  isGatheringObservationMilestone,
  isGatheringPracticeMilestone,
} = require("../../src/services/gatheringLearningRules");
const {
  MENTORSHIP_LESSON_FEEDBACK_EVENT_TITLE,
  MENTORSHIP_OBSERVATION_EVENT_TITLE,
} = require("../../src/services/mentorship");
const {
  gatheringLearningContextKeyForResource,
  gatheringSkillEffectForProgressRows,
  observableGatheringContextKey,
  recordGatheringObservation,
  recordGatheringSource,
} = require("../../src/services/gatheringLearning");

assert.equal(isGatheringPracticeMilestone(0), false);
assert.equal(isGatheringPracticeMilestone(12), false);
assert.equal(isGatheringPracticeMilestone(13), true);
assert.equal(isGatheringPracticeMilestone(26), true);
assert.equal(isGatheringPracticeMilestone(27), false);

assert.equal(isGatheringObservationMilestone(0), false);
assert.equal(isGatheringObservationMilestone(4), false);
assert.equal(isGatheringObservationMilestone(5), true);
assert.equal(isGatheringObservationMilestone(10), true);
assert.equal(isGatheringObservationMilestone(11), false);

assert.equal(GATHERING_PRACTICE_GROWTH_MESSAGE, "Навичка <b>збирання</b> підросла.");
assert.equal(GATHERING_OBSERVATION_GROWTH_MESSAGE, "Навичка <b>збирання</b> трохи підросла.");
assert.equal(gatheringSourceDescription({ actorPlayerId: 7, resourceKey: "berries", success: true }), "actorPlayer=7; success=true; resource=berries");
assert.equal(gatheringSourceDescription({ actorCreatureId: 9, success: false }), "actorCreature=9; success=false");
assert.equal(gatheringObservationDescription(42), "source=42");
assert.equal(observableGatheringContextKey("actorCreature=9; success=true; resource=berries"), "resource:berries");
assert.equal(observableGatheringContextKey("actorCreature=9; success=true; resource=mushrooms"), "resource:mushrooms");
assert.equal(observableGatheringContextKey("actorCreature=9; success=true; resource=herbs"), "resource:herbs");
assert.equal(observableGatheringContextKey("actorCreature=9; success=true; resource=honey"), null);
assert.equal(observableGatheringContextKey("actorCreature=9; success=true; resource=beeswax"), null);
assert.equal(observableGatheringContextKey("actorCreature=9; success=true"), null);
assert.equal(gatheringLearningContextKeyForResource("berries"), "resource:berries");
assert.equal(gatheringLearningContextKeyForResource("mushrooms"), "resource:mushrooms");
assert.equal(gatheringLearningContextKeyForResource("herbs"), "resource:herbs");
assert.equal(gatheringLearningContextKeyForResource("honey"), null);
assert.equal(gatheringLearningContextKeyForResource("beeswax"), null);
assert.equal(gatheringLearningContextKeyForResource(undefined), null);

assert.deepEqual(
  gatheringSkillEffectForProgressRows({
    resourceKey: "herbs",
    baseSuccessChance: 0.2,
    baseStaminaCost: 5,
    progressRows: [],
  }),
  {
    supported: true,
    level: 0,
    successChanceBonus: 0,
    successChance: 0.2,
    staminaCostReduction: 0,
    staminaCost: 5,
  },
);
const practicedBerriesEffect = gatheringSkillEffectForProgressRows({
  resourceKey: "berries",
  baseSuccessChance: 0.25,
  baseStaminaCost: 5,
  progressRows: [{ level: 4, totalProgress: 35 }],
});
assert.equal(practicedBerriesEffect.supported, true);
assert.equal(practicedBerriesEffect.level, 4);
assert.ok(Math.abs(practicedBerriesEffect.successChanceBonus - 0.12) < 0.000001);
assert.ok(Math.abs(practicedBerriesEffect.successChance - 0.37) < 0.000001);
assert.equal(practicedBerriesEffect.staminaCostReduction, 2);
assert.equal(practicedBerriesEffect.staminaCost, 3);
assert.equal(
  gatheringSkillEffectForProgressRows({
    resourceKey: "mushrooms",
    baseSuccessChance: 0.9,
    baseStaminaCost: 4,
    progressRows: [{ level: 5, totalProgress: 60 }],
  }).successChance,
  0.95,
  "gathering skill chance bonus is capped below certainty",
);
assert.equal(
  gatheringSkillEffectForProgressRows({
    resourceKey: "herbs",
    baseSuccessChance: 0.2,
    baseStaminaCost: 3,
    progressRows: [{ level: 5, totalProgress: 60 }],
  }).staminaCost,
  3,
  "gathering skill stamina reduction respects the hard floor",
);
for (const resourceKey of ["honey", "beeswax", "twigs", "shah", undefined]) {
  const effect = gatheringSkillEffectForProgressRows({
    resourceKey,
    baseSuccessChance: 0.5,
    baseStaminaCost: 5,
    progressRows: [{ level: 5, totalProgress: 99 }],
  });
  assert.equal(effect.supported, false, `${resourceKey} should not receive gathering skill effects`);
  assert.equal(effect.successChance, 0.5);
  assert.equal(effect.staminaCost, 5);
}

function fakeGatheringObservationDb(sourceDescription = "actorCreature=9; success=true; resource=herbs", mentorshipRows = []) {
  let nextEventId = 2;
  let nextProgressId = 1;
  const sourceDescriptions = Array.isArray(sourceDescription) ? sourceDescription : [sourceDescription];
  const events = sourceDescriptions.map((description, index) => ({
    id: index + 1,
    type: "SYSTEM",
    title: GATHERING_SOURCE_EVENT_TITLE,
    description,
    playerId: null,
    locationId: 13,
    createdAt: new Date(Date.UTC(2026, 5, 3, 9, 0, index)),
  }));
  nextEventId = events.length + 1;
  const progressRows = [];
  const creatureProgressRows = [];

  return {
    events,
    progressRows,
    creatureProgressRows,
    worldEvent: {
      findMany: async ({ where, take }) => events
        .filter((event) =>
          event.title === where.title &&
          event.locationId === where.locationId &&
          event.createdAt >= where.createdAt.gte &&
          (event.playerId === null || event.playerId !== where.OR?.[1]?.playerId?.not)
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, take ?? events.length),
      findFirst: async ({ where }) => {
        if (where.title === GATHERING_SOURCE_EVENT_TITLE) {
          return events.find((event) =>
            event.title === where.title &&
            event.locationId === where.locationId &&
            event.createdAt >= where.createdAt.gte &&
            (event.playerId === null || event.playerId !== where.OR?.[1]?.playerId?.not)
          ) ?? null;
        }
        return events.find((event) =>
          event.title === where.title &&
          event.playerId === where.playerId &&
          event.description === where.description
        ) ?? null;
      },
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
    playerMentorship: {
      findFirst: async ({ where }) => mentorshipRows.find((row) =>
        row.playerId === where.playerId &&
        row.mentorCreatureId === where.mentorCreatureId &&
        row.status === where.status &&
        (!where.skillKey || row.skillKey === where.skillKey)
      ) ?? null,
    },
    characterLearningProgress: {
      findUnique: async ({ where }) => {
        const key = where.playerId_skillKey_sourceKey_contextKey;
        return progressRows.find((row) =>
          row.playerId === key.playerId &&
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
        progressRows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = progressRows.find((entry) => entry.id === where.id);
        assert.ok(row, "fake learning progress row exists");
        Object.assign(row, data, { updatedAt: new Date("2026-06-03T09:02:00Z") });
        return row;
      },
    },
    creatureLearningProgress: {
      findUnique: async ({ where }) => {
        const key = where.creatureId_skillKey_sourceKey_contextKey;
        return creatureProgressRows.find((row) =>
          row.creatureId === key.creatureId &&
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
        creatureProgressRows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = creatureProgressRows.find((entry) => entry.id === where.id);
        assert.ok(row, "fake creature learning progress row exists");
        Object.assign(row, data, { updatedAt: new Date("2026-06-03T09:02:00Z") });
        return row;
      },
    },
  };
}

(async () => {
  for (const resourceKey of ["herbs", "berries", "mushrooms"]) {
    const practiceDb = fakeGatheringObservationDb([]);
    const failedPractice = await recordGatheringSource({
      locationId: 13,
      actorPlayerId: 7,
      resourceKey,
      success: false,
    }, practiceDb);
    assert.equal(failedPractice.sourceRecorded, true);
    assert.equal(failedPractice.canonicalProgressRecorded, true);
    assert.equal(failedPractice.canonicalMilestone, false);
    assert.equal(practiceDb.progressRows.length, 1);
    assert.equal(practiceDb.progressRows[0].skillKey, "gathering");
    assert.equal(practiceDb.progressRows[0].sourceKey, "practice");
    assert.equal(practiceDb.progressRows[0].contextKey, `resource:${resourceKey}`);
    assert.equal(practiceDb.progressRows[0].totalProgress, 1);

    const successfulPractice = await recordGatheringSource({
      locationId: 13,
      actorPlayerId: 7,
      resourceKey,
      success: true,
    }, practiceDb);
    assert.equal(successfulPractice.canonicalProgressRecorded, true);
    assert.equal(practiceDb.progressRows.length, 1);
    assert.equal(practiceDb.progressRows[0].totalProgress, 2);
  }

  for (const resourceKey of ["honey", "beeswax", "twigs", "shah", undefined]) {
    const unsupportedPracticeDb = fakeGatheringObservationDb([]);
    const unsupportedPractice = await recordGatheringSource({
      locationId: 13,
      actorPlayerId: 7,
      resourceKey,
      success: true,
    }, unsupportedPracticeDb);
    assert.equal(unsupportedPractice.sourceRecorded, true);
    assert.equal(unsupportedPractice.canonicalProgressRecorded, false);
    assert.equal(unsupportedPractice.canonicalMilestone, false);
    assert.equal(unsupportedPracticeDb.progressRows.length, 0, `${resourceKey} should not create practice progress`);
  }

  const creaturePracticeDb = fakeGatheringObservationDb([]);
  await recordGatheringSource({
    locationId: 13,
    actorCreatureId: 11,
    resourceKey: "herbs",
    success: true,
  }, creaturePracticeDb);
  assert.equal(creaturePracticeDb.progressRows.length, 0, "creature source events should not create player practice progress");
  assert.equal(creaturePracticeDb.creatureProgressRows.length, 1, "supported creature gathering should create creature practice progress");
  assert.equal(creaturePracticeDb.creatureProgressRows[0].creatureId, 11);
  assert.equal(creaturePracticeDb.creatureProgressRows[0].skillKey, "gathering");
  assert.equal(creaturePracticeDb.creatureProgressRows[0].sourceKey, "practice");
  assert.equal(creaturePracticeDb.creatureProgressRows[0].contextKey, "resource:herbs");
  assert.equal(creaturePracticeDb.creatureProgressRows[0].totalProgress, 1);

  const unsupportedCreaturePracticeDb = fakeGatheringObservationDb([]);
  await recordGatheringSource({
    locationId: 13,
    actorCreatureId: 11,
    resourceKey: "honey",
    success: true,
  }, unsupportedCreaturePracticeDb);
  assert.equal(unsupportedCreaturePracticeDb.creatureProgressRows.length, 0, "unsupported creature gathering should not create creature practice progress");

  const tutorialPracticeDb = fakeGatheringObservationDb([]);
  const tutorialPractice = await recordGatheringSource({
    locationId: 13,
    actorPlayerId: 7,
    resourceKey: "berries",
    success: true,
    skipCanonicalPractice: true,
  }, tutorialPracticeDb);
  assert.equal(tutorialPractice.sourceRecorded, true);
  assert.equal(tutorialPractice.canonicalProgressRecorded, false);
  assert.equal(tutorialPracticeDb.progressRows.length, 0, "tutorial foraging should not grind persistent practice progress");

  const db = fakeGatheringObservationDb();
  const observed = await recordGatheringObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:01:00Z"),
  }, db);
  assert.equal(observed.observed, true);
  assert.equal(observed.canonicalProgressRecorded, true);
  assert.equal(observed.canonicalMilestone, false);
  assert.equal(observed.milestone, false);
  assert.equal(db.progressRows.length, 1);
  assert.equal(db.progressRows[0].skillKey, "gathering");
  assert.equal(db.progressRows[0].sourceKey, "observation");
  assert.equal(db.progressRows[0].contextKey, "resource:herbs");
  assert.equal(db.progressRows[0].totalProgress, 1);
  assert.equal(db.events.some((event) => event.title === GATHERING_OBSERVATION_EVENT_TITLE), true);

  const repeated = await recordGatheringObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:02:00Z"),
  }, db);
  assert.equal(repeated.observed, false, "same gathering source should not grant progress twice");
  assert.equal(db.progressRows[0].totalProgress, 1);

  const mentoredDb = fakeGatheringObservationDb("actorCreature=9; success=true; resource=herbs", [
    { playerId: 7, mentorCreatureId: 9, skillKey: "gathering", status: "ACTIVE" },
  ]);
  const mentored = await recordGatheringObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:01:00Z"),
  }, mentoredDb);
  assert.equal(mentored.observed, true);
  assert.equal(mentored.mentorshipBonus, true);
  assert.equal(mentored.learningAmount, 2);
  assert.equal(mentoredDb.progressRows.length, 1);
  assert.equal(mentoredDb.progressRows[0].sourceKey, "observation");
  assert.equal(mentoredDb.progressRows[0].contextKey, "resource:herbs");
  assert.equal(mentoredDb.progressRows[0].totalProgress, 2);
  assert.equal(mentoredDb.events.some((event) => event.title === MENTORSHIP_OBSERVATION_EVENT_TITLE), true);
  assert.equal(mentoredDb.events.some((event) => event.title === MENTORSHIP_LESSON_FEEDBACK_EVENT_TITLE), true);
  assert.match(mentored.mentorshipLessonText, /стебло|рука|землю/u);
  assert.doesNotMatch(mentored.mentorshipLessonText, /\b(?:XP|level|bonus|amount)\b|\+\d|\d/u);
  assert.deepEqual(mentored.mentorshipLessonContext, {
    playerId: 7,
    mentorCreatureId: 9,
    skillKey: "gathering",
    contextKey: "resource:herbs",
    locationId: 13,
  });

  const nonMentorDb = fakeGatheringObservationDb("actorCreature=10; success=true; resource=herbs", [
    { playerId: 7, mentorCreatureId: 9, skillKey: "gathering", status: "ACTIVE" },
  ]);
  const nonMentor = await recordGatheringObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:01:00Z"),
  }, nonMentorDb);
  assert.equal(nonMentor.mentorshipBonus, false);
  assert.equal(nonMentor.mentorshipLessonText, null);
  assert.equal(nonMentor.mentorshipLessonContext, null);
  assert.equal(nonMentor.learningAmount, 1);
  assert.equal(nonMentorDb.progressRows[0].totalProgress, 1);
  assert.equal(nonMentorDb.events.some((event) => event.title === MENTORSHIP_OBSERVATION_EVENT_TITLE), false);

  const inactiveMentorshipDb = fakeGatheringObservationDb("actorCreature=9; success=true; resource=herbs", [
    { playerId: 7, mentorCreatureId: 9, skillKey: "gathering", status: "OFFERED" },
  ]);
  const inactiveMentorship = await recordGatheringObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:01:00Z"),
  }, inactiveMentorshipDb);
  assert.equal(inactiveMentorship.mentorshipBonus, false);
  assert.equal(inactiveMentorship.mentorshipLessonText, null);
  assert.equal(inactiveMentorship.mentorshipLessonContext, null);
  assert.equal(inactiveMentorship.learningAmount, 1);
  assert.equal(inactiveMentorshipDb.progressRows[0].totalProgress, 1);

  for (const unsupportedDescription of [
    "actorCreature=9; success=true; resource=honey",
    "actorCreature=9; success=true; resource=beeswax",
    "actorCreature=9; success=true",
  ]) {
    const unsupportedDb = fakeGatheringObservationDb(unsupportedDescription);
    const unsupported = await recordGatheringObservation({
      playerId: 7,
      locationId: 13,
      now: new Date("2026-06-03T09:01:00Z"),
    }, unsupportedDb);
    assert.equal(unsupported.observed, true, "unsupported source still records legacy observation marker");
    assert.equal(unsupported.canonicalProgressRecorded, false);
    assert.equal(unsupported.canonicalMilestone, false);
    assert.equal(unsupported.milestone, false);
    assert.equal(unsupportedDb.events.some((event) => event.title === GATHERING_OBSERVATION_EVENT_TITLE), true);
    assert.equal(unsupportedDb.progressRows.length, 0, `${unsupportedDescription} should not create canonical progress`);
  }

  const unsupportedMilestoneDb = fakeGatheringObservationDb([
    "actorCreature=9; success=true; resource=honey",
    "actorCreature=9; success=true; resource=beeswax",
    "actorCreature=9; success=true",
    "actorCreature=9; success=true; resource=honey",
    "actorCreature=9; success=true; resource=beeswax",
  ]);
  for (let index = 0; index < 5; index += 1) {
    const unsupported = await recordGatheringObservation({
      playerId: 7,
      locationId: 13,
      now: new Date(`2026-06-03T09:01:0${index}Z`),
    }, unsupportedMilestoneDb);
    assert.equal(unsupported.observed, true, `unsupported source ${index + 1} should still record a legacy marker`);
    assert.equal(unsupported.canonicalProgressRecorded, false);
    assert.equal(unsupported.canonicalMilestone, false);
    assert.equal(unsupported.milestone, false, "unsupported-only observations must not produce visible learning milestones");
  }
  assert.equal(unsupportedMilestoneDb.progressRows.length, 0, "unsupported-only observations should not create canonical progress");

  const mixedDb = fakeGatheringObservationDb([
    "actorCreature=9; success=true; resource=herbs",
    "actorCreature=9; success=true; resource=honey",
  ]);
  const noisyFirst = await recordGatheringObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:01:00Z"),
  }, mixedDb);
  assert.equal(noisyFirst.observed, true);
  assert.equal(noisyFirst.canonicalProgressRecorded, false);
  assert.equal(noisyFirst.milestone, false);
  assert.equal(mixedDb.progressRows.length, 0, "unsupported latest source should not create canonical progress");

  const supportedSecond = await recordGatheringObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:01:30Z"),
  }, mixedDb);
  assert.equal(supportedSecond.observed, true, "already observed unsupported source should not block older supported source");
  assert.equal(supportedSecond.canonicalProgressRecorded, true);
  assert.equal(supportedSecond.milestone, false);
  assert.equal(mixedDb.progressRows.length, 1);
  assert.equal(mixedDb.progressRows[0].contextKey, "resource:herbs");

  console.log("Gathering learning helpers OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
