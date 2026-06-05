const assert = require("node:assert/strict");

require("ts-node/register");

const {
  TRACKING_PRACTICE_CONTEXT_DETAIL,
  TRACKING_PRACTICE_CONTEXT_SEARCH,
  TRACKING_PRACTICE_CONTEXT_TRACK_GATE,
  TRACKING_PRACTICE_EVENT_TITLE,
  recordTrackingPractice,
  roughTrackAgeText,
  trackingDarkPresenceText,
  trackingPracticeDescription,
  trackingPracticeLearningInput,
  trackingSkillEffectForPlayer,
  trackingSkillEffectForProgressRows,
} = require("../../src/services/trackingLearning");

assert.equal(TRACKING_PRACTICE_EVENT_TITLE, "Tracking practice");
assert.equal(TRACKING_PRACTICE_CONTEXT_SEARCH, "track_search");
assert.equal(TRACKING_PRACTICE_CONTEXT_DETAIL, "track_detail");
assert.equal(TRACKING_PRACTICE_CONTEXT_TRACK_GATE, "track_gate");

assert.deepEqual(trackingPracticeLearningInput({ playerId: 7 }), {
  playerId: 7,
  skillKey: "tracking",
  sourceKey: "practice",
  contextKey: "track_search",
  amount: 1,
});
assert.deepEqual(trackingPracticeLearningInput({ playerId: 7, detail: true }), {
  playerId: 7,
  skillKey: "tracking",
  sourceKey: "practice",
  contextKey: "track_detail",
  amount: 1,
});
assert.deepEqual(trackingPracticeLearningInput({ playerId: 7, contextKey: "track_gate", sourceEventId: 42 }), {
  playerId: 7,
  skillKey: "tracking",
  sourceKey: "practice",
  contextKey: "track_gate",
  amount: 1,
  lastSourceEventId: 42,
});
assert.equal(trackingPracticeLearningInput({ playerId: null }), null);
assert.match(trackingPracticeDescription({ playerId: 7, locationId: 13, contextKey: "track_search" }), /playerId=7; contextKey=track_search; locationId=13/);

const level0 = trackingSkillEffectForProgressRows([]);
assert.equal(level0.level, 0);
assert.equal(level0.maxTrackResults, 8);
assert.equal(level0.canShowRoughAgeInBrief, false);
assert.equal(level0.canReadWeakTrackHint, false);

const level2 = trackingSkillEffectForProgressRows([{ totalProgress: 8 }]);
assert.equal(level2.level, 2);
assert.equal(level2.maxTrackResults, 8);
assert.equal(level2.canShowRoughAgeInBrief, true);
assert.equal(level2.canReadWeakTrackHint, false);

const level3 = trackingSkillEffectForProgressRows([{ totalProgress: 18 }]);
assert.equal(level3.level, 3);
assert.equal(level3.maxTrackResults, 12);
assert.equal(level3.canShowRoughAgeInBrief, true);
assert.equal(level3.canReadWeakTrackHint, false);

const level4 = trackingSkillEffectForProgressRows([{ totalProgress: 35 }]);
assert.equal(level4.level, 4);
assert.equal(level4.maxTrackResults, 12);
assert.equal(level4.canReadWeakTrackHint, true);

const capped = trackingSkillEffectForProgressRows([{ totalProgress: 999 }]);
assert.equal(capped.level, 5);
assert.equal(capped.maxTrackResults, 12);

const now = new Date("2026-06-05T12:00:00Z");
assert.equal(roughTrackAgeText(new Date("2026-06-05T11:59:30Z"), now), "свіжий слід");
assert.equal(roughTrackAgeText(new Date("2026-06-05T11:54:00Z"), now), "недавній слід");
assert.equal(roughTrackAgeText(new Date("2026-06-05T11:20:00Z"), now), "старіший слід");

assert.equal(trackingDarkPresenceText({ visibilityText: "Темрява ховає сліди." }), "Темрява ховає сліди.");
const highDark = trackingDarkPresenceText({ visibilityText: "Темрява ховає сліди.", canReadWeakTrackHint: true });
assert.match(highDark, /сліди тут є/);
assert.match(highDark, /без світла/);
assert.doesNotMatch(highDark, /північ|південь|схід|захід|вгору|вниз/i, "Dark tracking hint must not reveal direction");

function fakeTrackingDb() {
  let nextId = 1;
  const worldEvents = [];
  const progressRows = [];
  return {
    worldEvents,
    progressRows,
    worldEvent: {
      create: async ({ data }) => {
        const event = { id: nextId++, createdAt: new Date("2026-06-05T12:00:00Z"), ...data };
        worldEvents.push(event);
        return event;
      },
    },
    characterLearningProgress: {
      findUnique: async ({ where }) => {
        const key = where.playerId_skillKey_sourceKey_contextKey;
        return progressRows.find((row) =>
          row.playerId === key.playerId
          && row.skillKey === key.skillKey
          && row.sourceKey === key.sourceKey
          && row.contextKey === key.contextKey
        ) ?? null;
      },
      create: async ({ data }) => {
        const row = {
          id: nextId++,
          level: 0,
          progress: 0,
          totalProgress: 0,
          milestoneCount: 0,
          discoveredAt: new Date("2026-06-05T12:00:00Z"),
          createdAt: new Date("2026-06-05T12:00:00Z"),
          updatedAt: new Date("2026-06-05T12:00:00Z"),
          ...data,
        };
        progressRows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = progressRows.find((entry) => entry.id === where.id);
        assert.ok(row, "fake progress row exists for update");
        Object.assign(row, data, { updatedAt: new Date("2026-06-05T12:01:00Z") });
        return row;
      },
      findMany: async ({ where }) => progressRows.filter((row) => row.playerId === where.playerId && row.skillKey === where.skillKey),
    },
  };
}

(async () => {
  const searchDb = fakeTrackingDb();
  const search = await recordTrackingPractice({ playerId: 7, locationId: 11 }, searchDb);
  assert.equal(search.recorded, true);
  assert.equal(searchDb.worldEvents.length, 1);
  assert.equal(searchDb.worldEvents[0].title, TRACKING_PRACTICE_EVENT_TITLE);
  assert.equal(searchDb.progressRows.length, 1);
  assert.equal(searchDb.progressRows[0].skillKey, "tracking");
  assert.equal(searchDb.progressRows[0].sourceKey, "practice");
  assert.equal(searchDb.progressRows[0].contextKey, "track_search");
  assert.equal(searchDb.progressRows[0].totalProgress, 1);
  assert.equal(searchDb.progressRows[0].lastSourceEventId, search.sourceEventId);

  const detailDb = fakeTrackingDb();
  await recordTrackingPractice({ playerId: 7, locationId: 11, detail: true }, detailDb);
  assert.equal(detailDb.progressRows[0].contextKey, "track_detail");

  const gateDb = fakeTrackingDb();
  await recordTrackingPractice({ playerId: 7, locationId: 11, contextKey: "track_gate" }, gateDb);
  assert.equal(gateDb.progressRows[0].contextKey, "track_gate");

  const nextSearchDb = fakeTrackingDb();
  nextSearchDb.progressRows.push({
    id: 100,
    playerId: 7,
    skillKey: "tracking",
    sourceKey: "practice",
    contextKey: "track_search",
    level: 1,
    progress: 7,
    totalProgress: 7,
    milestoneCount: 0,
  });
  const beforeCurrentSearch = await trackingSkillEffectForPlayer(7, nextSearchDb);
  assert.equal(beforeCurrentSearch.level, 1);
  assert.equal(beforeCurrentSearch.canShowRoughAgeInBrief, false);
  await recordTrackingPractice({ playerId: 7, locationId: 11 }, nextSearchDb);
  const afterCurrentSearch = await trackingSkillEffectForPlayer(7, nextSearchDb);
  assert.equal(afterCurrentSearch.level, 2, "The current search should train future track reads after it is recorded");
  assert.equal(afterCurrentSearch.canShowRoughAgeInBrief, true);

  const invalidDb = fakeTrackingDb();
  const invalid = await recordTrackingPractice({ playerId: null, locationId: 11 }, invalidDb);
  assert.equal(invalid.recorded, false);
  assert.equal(invalidDb.worldEvents.length, 0);
  assert.equal(invalidDb.progressRows.length, 0);

  console.log("Tracking learning helpers OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
