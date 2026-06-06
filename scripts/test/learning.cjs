const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  DEFAULT_LEARNING_CONTEXT_KEY,
  DEFAULT_LEARNING_SOURCE_KEY,
  LEARNING_LEVEL_THRESHOLDS,
  applyLearningProgress,
  getLearningProgress,
  actorLearningInput,
  formatLearningSummary,
  formatLearningTechnicalRows,
  learningQualitativeLevelLabel,
  learningLevelForTotalProgress,
  learningLevelLabel,
  observedActorSkillLevel,
  observedCreatureDefaultLearningRows,
  normalizeLearningAmount,
  recordActorLearningProgress,
  recordLearningProgress,
} = require("../../src/services/learning");
const {
  formatLearningCreatureDisambiguation,
  learningCreatureDisplayName,
  parseLearningCreatureTarget,
  resolveLearningCreatureCandidates,
} = require("../../src/services/adminLearningLookup");
const { slowLogThresholdMs } = require("../../src/utils/slowLog");

assert.equal(normalizeLearningAmount(2.9), 2);
assert.equal(normalizeLearningAmount(-3), 0);
assert.equal(normalizeLearningAmount(Number.NaN), 0);
assert.deepEqual(LEARNING_LEVEL_THRESHOLDS, [0, 3, 8, 18, 35, 60]);
assert.equal(learningLevelForTotalProgress(-1), 0);
assert.equal(learningLevelForTotalProgress(0), 0);
assert.equal(learningLevelForTotalProgress(2), 0);
assert.equal(learningLevelForTotalProgress(3), 1);
assert.equal(learningLevelForTotalProgress(7), 1);
assert.equal(learningLevelForTotalProgress(8), 2);
assert.equal(learningLevelForTotalProgress(17), 2);
assert.equal(learningLevelForTotalProgress(18), 3);
assert.equal(learningLevelForTotalProgress(34), 3);
assert.equal(learningLevelForTotalProgress(35), 4);
assert.equal(learningLevelForTotalProgress(59), 4);
assert.equal(learningLevelForTotalProgress(60), 5);
assert.equal(learningLevelForTotalProgress(999), 5);
assert.equal(learningLevelLabel(0), "unfamiliar");
assert.equal(learningLevelLabel(5), "masterful");
assert.equal(learningLevelLabel(99), "masterful");
assert.equal(learningQualitativeLevelLabel(0), "ледве знайоме");
assert.equal(learningQualitativeLevelLabel(3), "уміле");
assert.equal(learningQualitativeLevelLabel(99), "майстерне");
assert.deepEqual(actorLearningInput({ actorType: "PLAYER", playerId: 7 }, { skillKey: "tracking", amount: 1 }), {
  skillKey: "tracking",
  amount: 1,
  playerId: 7,
});
assert.deepEqual(actorLearningInput({ actorType: "CREATURE", creatureId: 9 }, { skillKey: "gathering", amount: 1 }), {
  skillKey: "gathering",
  amount: 1,
  creatureId: 9,
});
assert.equal(
  formatLearningSummary([
    { skillKey: "gathering", sourceKey: "practice", contextKey: "resource:herbs", level: 3, progress: 1, totalProgress: 18, milestoneCount: 0 },
    { skillKey: "cooking", sourceKey: "observation", contextKey: "cooking", level: 2, progress: 1, totalProgress: 8, milestoneCount: 0 },
  ]),
  "Навички: збирання — уміле; готування — призвичаєне.",
);
assert.equal(formatLearningSummary([]), "");
const ordinarySummary = formatLearningSummary([
  { skillKey: "tracking", sourceKey: "practice", contextKey: "track_search", level: 4, progress: 2, totalProgress: 35, milestoneCount: 0, playerId: 7 },
  { skillKey: "attack", sourceKey: "observation", contextKey: "attack", level: 3, progress: 1, totalProgress: 18, milestoneCount: 0, lastSourceEventId: 99 },
  { skillKey: "freshening", sourceKey: "practice", contextKey: "freshening", level: 2, progress: 1, totalProgress: 8, milestoneCount: 0 },
], { limit: 2 });
assert.equal(ordinarySummary.startsWith("Навички:"), true);
assert.equal((ordinarySummary.match(/;/g) ?? []).length, 1, "ordinary summary respects display limit");
assert.equal(/skillKey|sourceKey|contextKey|totalProgress|player:|creature:|lastSourceEventId|35|18|99/.test(ordinarySummary), false);
const targetStyleSummary = formatLearningSummary([
  { skillKey: "tracking", sourceKey: "profile", contextKey: "default", level: 1, progress: 0, totalProgress: 0, milestoneCount: 0 },
  { skillKey: "gathering", sourceKey: "practice", contextKey: "resource:herbs", level: 2, progress: 1, totalProgress: 8, milestoneCount: 0 },
], { limit: 3, minLevel: 2 });
assert.equal(targetStyleSummary.includes("атака"), false);
assert.equal(targetStyleSummary.includes("сліди"), false);
assert.equal(targetStyleSummary.includes("збирання"), true);
const technicalRows = formatLearningTechnicalRows({ actorType: "CREATURE", creatureId: 9 }, [
  {
    skillKey: "gathering",
    sourceKey: "practice",
    contextKey: "resource:herbs",
    level: 3,
    progress: 4,
    totalProgress: 18,
    milestoneCount: 1,
    lastSourceEventId: 42,
    updatedAt: new Date("2026-06-05T09:00:00Z"),
  },
]);
assert.equal(technicalRows[0].includes("actor=creature:9"), true);
assert.equal(technicalRows[0].includes("totalProgress=18"), true);
assert.equal(technicalRows[0].includes("sourceKey=practice"), true);
assert.deepEqual(formatLearningTechnicalRows({ actorType: "PLAYER", playerId: 7 }, []), ["Learning rows: none."]);
assert.deepEqual(parseLearningCreatureTarget("creature Орина"), { forcedCreature: true, query: "Орина" });
assert.deepEqual(parseLearningCreatureTarget("істота #17"), { forcedCreature: true, query: "#17" });
assert.deepEqual(parseLearningCreatureTarget("Орина"), { forcedCreature: false, query: "Орина" });
const learningLookupCreatures = [
  { id: 17, name: "Орина", nameGenitive: "Орини", species: { name: "людина" }, location: { name: "Межовий табір" } },
  { id: 18, name: "Орися", species: { name: "людина" }, location: { name: "Старий міст" } },
  { id: 19, name: "Лукан", species: { name: "людина" }, location: { name: "Суха лука" } },
];
assert.equal(resolveLearningCreatureCandidates(learningLookupCreatures, "Орина").kind, "single");
assert.equal(resolveLearningCreatureCandidates(learningLookupCreatures, "Лук").kind, "single");
assert.equal(resolveLearningCreatureCandidates(learningLookupCreatures, "Ори").kind, "ambiguous");
assert.equal(resolveLearningCreatureCandidates(learningLookupCreatures, "неіснує").kind, "none");
assert.equal(learningCreatureDisplayName({ id: 20, species: { name: "миша" } }), "миша");
assert.equal(formatLearningCreatureDisambiguation(learningLookupCreatures).includes("creature #17; Межовий табір"), true);
assert.equal(slowLogThresholdMs("250"), 250);
assert.equal(slowLogThresholdMs("bad"), 1000);
const prismaSchema = fs.readFileSync("prisma/schema.prisma", "utf8");
for (const index of [
  "@@index([title, createdAt])",
  "@@index([title, locationId, createdAt])",
  "@@index([title, playerId, createdAt])",
  "@@index([playerId, createdAt])",
  "@@index([locationId, createdAt])",
  "@@index([type, createdAt])",
]) {
  assert.equal(prismaSchema.includes(index), true, `WorldEvent schema keeps ${index}`);
}

assert.deepEqual(
  applyLearningProgress({ level: 0, progress: 12, totalProgress: 12, milestoneCount: 0 }, { amount: 1, milestoneEvery: 13 }),
  {
    level: 2,
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
  const creatureRows = [];
  const creatures = new Map([
    [9, {
      id: 9,
      professionKey: "herbalist",
      professionName: "знахар",
      species: { key: "human", diet: "OMNIVORE", kind: "HUMANOID" },
    }],
  ]);
  return {
    rows,
    creatureRows,
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
      findMany: async ({ where }) => rows.filter((row) => row.playerId === where.playerId),
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
    creatureLearningProgress: {
      findUnique: async ({ where }) => {
        if (where.id) return creatureRows.find((row) => row.id === where.id) ?? null;
        const key = where.creatureId_skillKey_sourceKey_contextKey;
        return creatureRows.find((row) =>
          row.creatureId === key.creatureId &&
          row.skillKey === key.skillKey &&
          row.sourceKey === key.sourceKey &&
          row.contextKey === key.contextKey
        ) ?? null;
      },
      findMany: async ({ where }) => creatureRows.filter((row) => row.creatureId === where.creatureId),
      create: async ({ data }) => {
        const row = {
          id: nextId++,
          ...data,
          discoveredAt: new Date("2026-06-03T09:00:00Z"),
          createdAt: new Date("2026-06-03T09:00:00Z"),
          updatedAt: new Date("2026-06-03T09:00:00Z"),
        };
        creatureRows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = creatureRows.find((entry) => entry.id === where.id);
        assert.ok(row, "fake creature row exists for update");
        Object.assign(row, data, { updatedAt: new Date("2026-06-03T09:01:00Z") });
        return row;
      },
    },
    creature: {
      findUnique: async ({ where }) => creatures.get(where.id) ?? null,
    },
  };
}

(async () => {
  const db = fakeLearningDb();
  const first = await recordLearningProgress({ playerId: 7, skillKey: "tracking", amount: 3, milestoneEvery: 5 }, db);
  assert.equal(first.created, true);
  assert.equal(first.changed, true);
  assert.equal(first.milestone, false);
  assert.equal(first.level, 1);
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
  assert.equal(third.level, 1);
  assert.equal(db.rows.find((row) => row.id === third.id).lastSourceEventId, 42);

  const fourth = await recordLearningProgress({ playerId: 7, skillKey: "tracking", amount: 3, milestoneEvery: 5, sourceKey: "observation", contextKey: "tracks" }, db);
  assert.equal(fourth.totalProgress, 8);
  assert.equal(fourth.level, 2, "recordLearningProgress updates level when crossing a threshold");

  const loaded = await getLearningProgress({ playerId: 7, skillKey: "tracking", sourceKey: "observation", contextKey: "tracks" }, db);
  assert.equal(loaded.totalProgress, 8);
  assert.equal(loaded.level, 2);

  const creatureFirst = await recordActorLearningProgress(
    { actorType: "CREATURE", creatureId: 9 },
    { skillKey: "gathering", sourceKey: "practice", contextKey: "resource:herbs", amount: 8 },
    db,
  );
  assert.equal(creatureFirst.created, true);
  assert.equal(creatureFirst.creatureId, 9);
  assert.equal(creatureFirst.level, 2);
  assert.equal(db.creatureRows.length, 1);

  const creatureSecond = await recordActorLearningProgress(
    { actorType: "CREATURE", creatureId: 9 },
    { skillKey: "gathering", sourceKey: "practice", contextKey: "resource:herbs", amount: 10 },
    db,
  );
  assert.equal(creatureSecond.created, false);
  assert.equal(creatureSecond.level, 3);
  assert.equal(db.creatureRows[0].totalProgress, 18);
  assert.equal(await observedActorSkillLevel({ actorType: "CREATURE", creatureId: 9 }, "gathering", db), 3);
  assert.equal(await observedActorSkillLevel({ actorType: "CREATURE", creatureId: 9 }, "cooking", db), 1);
  assert.equal(await observedActorSkillLevel({ actorType: "PLAYER", playerId: 7 }, "tracking", db), 2);
  assert.equal(observedCreatureDefaultLearningRows({
    professionKey: "hunter",
    species: { key: "human", diet: "OMNIVORE", kind: "HUMANOID" },
  }).some((row) => row.skillKey === "tracking" && row.level === 3), true);

  console.log("Learning progress helpers OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
