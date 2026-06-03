const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  DEFAULT_LEARNING_CONTEXT_KEY,
  DEFAULT_LEARNING_SOURCE_KEY,
  applyLearningProgress,
  getLearningProgress,
  normalizeLearningAmount,
  recordLearningProgress,
} = require("../../src/services/learning");

assert.equal(normalizeLearningAmount(2.9), 2);
assert.equal(normalizeLearningAmount(-3), 0);
assert.equal(normalizeLearningAmount(Number.NaN), 0);

assert.deepEqual(
  applyLearningProgress({ level: 0, progress: 12, totalProgress: 12, milestoneCount: 0 }, { amount: 1, milestoneEvery: 13 }),
  {
    level: 0,
    progress: 13,
    totalProgress: 13,
    milestoneCount: 1,
    amount: 1,
    changed: true,
    milestone: true,
    previousTotalProgress: 12,
    previousMilestoneCount: 0,
  },
);

assert.equal(
  applyLearningProgress({ level: 0, progress: 13, totalProgress: 13, milestoneCount: 1 }, { amount: 0, milestoneEvery: 13 }).milestone,
  false,
);

function fakeLearningDb() {
  let nextId = 1;
  const rows = [];
  return {
    rows,
    characterLearningProgress: {
      findUnique: async ({ where }) => {
        if (where.id) return rows.find((row) => row.id === where.id) ?? null;
        const key = where.playerId_skillKey_sourceKey_contextKey;
        return rows.find((row) =>
          row.playerId === key.playerId &&
          row.skillKey === key.skillKey &&
          row.sourceKey === key.sourceKey &&
          row.contextKey === key.contextKey
        ) ?? null;
      },
      create: async ({ data }) => {
        const row = {
          id: nextId++,
          ...data,
          discoveredAt: new Date("2026-06-03T09:00:00Z"),
          createdAt: new Date("2026-06-03T09:00:00Z"),
          updatedAt: new Date("2026-06-03T09:00:00Z"),
        };
        rows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = rows.find((entry) => entry.id === where.id);
        assert.ok(row, "fake row exists for update");
        Object.assign(row, data, { updatedAt: new Date("2026-06-03T09:01:00Z") });
        return row;
      },
    },
  };
}

(async () => {
  const db = fakeLearningDb();
  const first = await recordLearningProgress({ playerId: 7, skillKey: "tracking", amount: 3, milestoneEvery: 5 }, db);
  assert.equal(first.created, true);
  assert.equal(first.changed, true);
  assert.equal(first.milestone, false);
  assert.equal(first.sourceKey, DEFAULT_LEARNING_SOURCE_KEY);
  assert.equal(first.contextKey, DEFAULT_LEARNING_CONTEXT_KEY);

  const second = await recordLearningProgress({ playerId: 7, skillKey: "tracking", amount: 2, milestoneEvery: 5, sourceKey: "observation", contextKey: "tracks" }, db);
  assert.equal(second.created, true, "different source/context gets its own row");
  assert.equal(second.milestone, false);
  assert.equal(second.totalProgress, 2);

  const third = await recordLearningProgress({ playerId: 7, skillKey: "tracking", amount: 3, milestoneEvery: 5, sourceKey: "observation", contextKey: "tracks", lastSourceEventId: 42 }, db);
  assert.equal(third.created, false);
  assert.equal(third.milestone, true);
  assert.equal(third.totalProgress, 5);
  assert.equal(db.rows.find((row) => row.id === third.id).lastSourceEventId, 42);

  const loaded = await getLearningProgress({ playerId: 7, skillKey: "tracking", sourceKey: "observation", contextKey: "tracks" }, db);
  assert.equal(loaded.totalProgress, 5);

  console.log("Learning progress helpers OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
