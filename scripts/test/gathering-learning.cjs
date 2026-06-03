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
  gatheringObservationContextKey,
  recordGatheringObservation,
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
assert.equal(gatheringObservationContextKey("actorCreature=9; success=true; resource=berries"), "resource:berries");
assert.equal(gatheringObservationContextKey("actorCreature=9; success=true; resource=mushrooms"), "resource:mushrooms");
assert.equal(gatheringObservationContextKey("actorCreature=9; success=true; resource=herbs"), "resource:herbs");
assert.equal(gatheringObservationContextKey("actorCreature=9; success=true; resource=honey"), "foraging");

function fakeGatheringObservationDb() {
  let nextEventId = 2;
  let nextProgressId = 1;
  const events = [{
    id: 1,
    type: "SYSTEM",
    title: GATHERING_SOURCE_EVENT_TITLE,
    description: "actorCreature=9; success=true; resource=herbs",
    playerId: null,
    locationId: 13,
    createdAt: new Date("2026-06-03T09:00:00Z"),
  }];
  const progressRows = [];

  return {
    events,
    progressRows,
    worldEvent: {
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
  };
}

(async () => {
  const db = fakeGatheringObservationDb();
  const observed = await recordGatheringObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:01:00Z"),
  }, db);
  assert.equal(observed.observed, true);
  assert.equal(db.progressRows.length, 1);
  assert.equal(db.progressRows[0].skillKey, "gathering");
  assert.equal(db.progressRows[0].sourceKey, "observation");
  assert.equal(db.progressRows[0].contextKey, "resource:herbs");
  assert.equal(db.events.some((event) => event.title === GATHERING_OBSERVATION_EVENT_TITLE), true);

  const repeated = await recordGatheringObservation({
    playerId: 7,
    locationId: 13,
    now: new Date("2026-06-03T09:02:00Z"),
  }, db);
  assert.equal(repeated.observed, false, "same gathering source should not grant progress twice");
  assert.equal(db.progressRows[0].totalProgress, 1);

  console.log("Gathering learning helpers OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
