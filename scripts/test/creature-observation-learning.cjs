const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  CREATURE_GATHERING_OBSERVATION_EVENT_TITLE,
  canCreatureLearnByObservation,
  creatureObservationDescription,
  creatureObservationLearningInput,
  recordCreatureGatheringObservation,
  sourceWasCreatedByCreature,
} = require("../../src/services/creatureObservationLearning");
const {
  GATHERING_SOURCE_EVENT_TITLE,
  gatheringSourceDescription,
} = require("../../src/services/gatheringLearningRules");
const {
  observableGatheringContextKey,
  recordGatheringSource,
} = require("../../src/services/gatheringLearning");
const {
  NPC_LEARNER_PROFESSION_KEY,
  npcLearnerPlan,
} = require("../../src/services/npcLearner");

assert.equal(
  canCreatureLearnByObservation({
    id: 1,
    isAlive: true,
    isGone: false,
    professionKey: "herbalist",
  }, "gathering", "resource:herbs"),
  true,
  "herbalists can learn supported gathering by observation",
);
assert.equal(
  canCreatureLearnByObservation({
    id: 1,
    isAlive: true,
    isGone: false,
    professionKey: "hunter",
  }, "cooking", "cooking"),
  false,
  "hunters should not broadly learn cooking in the first observation MVP",
);
assert.equal(
  canCreatureLearnByObservation({
    id: 1,
    isAlive: true,
    isGone: false,
    professionKey: "hunter",
  }, "gathering", "resource:berries"),
  true,
  "hunters may learn narrow supported gathering observation",
);
assert.equal(
  canCreatureLearnByObservation({
    id: 1,
    isAlive: false,
    isGone: false,
    professionKey: "herbalist",
  }, "gathering", "resource:herbs"),
  false,
  "dead creatures do not learn",
);
assert.equal(
  canCreatureLearnByObservation({
    id: 1,
    isAlive: true,
    isGone: true,
    professionKey: "herbalist",
  }, "gathering", "resource:herbs"),
  false,
  "gone creatures do not learn",
);
assert.equal(
  canCreatureLearnByObservation({
    id: 1,
    isAlive: true,
    isGone: false,
    isHidden: true,
    professionKey: "herbalist",
  }, "gathering", "resource:herbs"),
  false,
  "hidden creatures do not learn from ordinary observation",
);
assert.equal(
  canCreatureLearnByObservation({
    id: 1,
    isAlive: true,
    isGone: false,
    species: { key: "mouse" },
  }, "gathering", "resource:herbs"),
  false,
  "ordinary animals do not get broad profession learning",
);

assert.equal(sourceWasCreatedByCreature("actorCreature=7; success=true; resource=herbs", 7), true);
assert.equal(sourceWasCreatedByCreature("actorCreature=17; success=true; resource=herbs", 7), false);
assert.deepEqual(
  creatureObservationLearningInput({
    creatureId: 7,
    sourceEventId: 42,
    sourceDescription: "actorPlayer=3; success=true; resource=herbs",
  }),
  {
    skillKey: "gathering",
    sourceKey: "observation",
    contextKey: "resource:herbs",
    amount: 1,
    milestoneEvery: 5,
    lastSourceEventId: 42,
  },
);
assert.equal(
  creatureObservationLearningInput({
    creatureId: 7,
    sourceEventId: 42,
    sourceDescription: "actorPlayer=3; success=true; resource=honey",
  }),
  null,
  "honey is not part of the narrow gathering observation MVP",
);
assert.equal(
  creatureObservationLearningInput({
    creatureId: 7,
    sourceEventId: 42,
    sourceDescription: "actorCreature=7; success=true; resource=herbs",
  }),
  null,
  "creatures do not observe their own source event as observation learning",
);
assert.equal(
  creatureObservationDescription({
    creatureId: 7,
    sourceEventId: 42,
    skillKey: "gathering",
    contextKey: "resource:herbs",
  }),
  "creature=7; source=42; skillKey=gathering; contextKey=resource:herbs",
);

function fakeCreatureObservationDb({ creatureOverrides = {}, sourceDescriptions = ["actorPlayer=3; success=true; resource=herbs"] } = {}) {
  let nextEventId = sourceDescriptions.length + 1;
  let nextProgressId = 1;
  const creatures = new Map([
    [7, {
      id: 7,
      locationId: 13,
      isAlive: true,
      isGone: false,
      isHidden: false,
      age: "ADULT",
      professionKey: "herbalist",
      professionName: "знахар",
      species: { key: "human", kind: "HUMANOID", diet: "OMNIVORE" },
      ...creatureOverrides,
    }],
    [8, {
      id: 8,
      locationId: 13,
      isAlive: true,
      isGone: false,
      isHidden: false,
      age: "ADULT",
      professionKey: "hunter",
      professionName: "мисливець",
      species: { key: "human", kind: "HUMANOID", diet: "OMNIVORE" },
    }],
  ]);
  const events = sourceDescriptions.map((description, index) => ({
    id: index + 1,
    type: "SYSTEM",
    title: GATHERING_SOURCE_EVENT_TITLE,
    description,
    locationId: 13,
    createdAt: new Date(Date.UTC(2026, 5, 3, 9, 0, index)),
  }));
  const creatureProgressRows = [];

  return {
    events,
    creatureProgressRows,
    creature: {
      findUnique: async ({ where }) => creatures.get(where.id) ?? null,
    },
    worldEvent: {
      findMany: async ({ where, take }) => events
        .filter((event) =>
          event.title === where.title &&
          event.locationId === where.locationId &&
          event.createdAt >= where.createdAt.gte
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, take ?? events.length),
      findFirst: async ({ where }) => events.find((event) =>
        event.title === where.title &&
        event.description === where.description
      ) ?? null,
      create: async ({ data }) => {
        const row = {
          id: nextEventId++,
          createdAt: new Date("2026-06-03T09:01:00Z"),
          ...data,
        };
        events.push(row);
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
        assert.ok(row, "fake creature progress row exists");
        Object.assign(row, data, { updatedAt: new Date("2026-06-03T09:02:00Z") });
        return row;
      },
    },
  };
}

function fakeGatheringSourceDb() {
  const events = [];
  const creatureProgressRows = [];
  return {
    events,
    creatureProgressRows,
    worldEvent: {
      create: async ({ data }) => {
        const row = { id: events.length + 1, createdAt: new Date("2026-06-08T09:00:00Z"), ...data };
        events.push(row);
        return row;
      },
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
    },
    characterLearningProgress: {
      findUnique: async () => null,
      create: async () => {
        throw new Error("creature observation source should not create player progress directly");
      },
      update: async () => {
        throw new Error("creature observation source should not update player progress directly");
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
        const row = { id: creatureProgressRows.length + 1, ...data };
        creatureProgressRows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = creatureProgressRows.find((entry) => entry.id === where.id);
        assert.ok(row, "fake creature practice row exists");
        Object.assign(row, data);
        return row;
      },
    },
  };
}

(async () => {
  assert.equal(
    gatheringSourceDescription({ actorCreatureId: 9, resourceKey: "herbs", success: true }),
    "actorCreature=9; success=true; resource=herbs",
  );
  assert.equal(observableGatheringContextKey("actorCreature=9; success=true; resource=herbs"), "resource:herbs");

  const sourceDb = fakeGatheringSourceDb();
  const source = await recordGatheringSource({
    locationId: 13,
    actorCreatureId: 9,
    resourceKey: "herbs",
    success: true,
  }, sourceDb);
  assert.equal(source.sourceRecorded, true);
  assert.equal(source.canonicalProgressRecorded, true, "creature source events may record creature practice without rewarding players");
  assert.equal(sourceDb.creatureProgressRows.length, 1);
  assert.equal(sourceDb.creatureProgressRows[0].creatureId, 9);
  assert.equal(sourceDb.creatureProgressRows[0].sourceKey, "practice");
  assert.equal(sourceDb.events[0].title, GATHERING_SOURCE_EVENT_TITLE);
  assert.equal(sourceDb.events[0].playerId, undefined);

  const db = fakeCreatureObservationDb();
  const observed = await recordCreatureGatheringObservation({
    creatureId: 7,
    now: new Date("2026-06-03T09:01:00Z"),
  }, db);
  assert.equal(observed.observed, true);
  assert.equal(observed.canonicalProgressRecorded, true);
  assert.equal(observed.canonicalMilestone, false);
  assert.equal(db.creatureProgressRows.length, 1);
  assert.equal(db.creatureProgressRows[0].creatureId, 7);
  assert.equal(db.creatureProgressRows[0].skillKey, "gathering");
  assert.equal(db.creatureProgressRows[0].sourceKey, "observation");
  assert.equal(db.creatureProgressRows[0].contextKey, "resource:herbs");
  assert.equal(db.creatureProgressRows[0].lastSourceEventId, 1);
  assert.equal(db.events.some((event) => event.title === CREATURE_GATHERING_OBSERVATION_EVENT_TITLE), true);

  const repeated = await recordCreatureGatheringObservation({
    creatureId: 7,
    now: new Date("2026-06-03T09:01:30Z"),
  }, db);
  assert.equal(repeated.observed, false, "same creature/source event should dedupe");
  assert.equal(db.creatureProgressRows[0].totalProgress, 1);

  const differentCreature = await recordCreatureGatheringObservation({
    creatureId: 8,
    now: new Date("2026-06-03T09:01:30Z"),
  }, db);
  assert.equal(differentCreature.observed, true, "different creature may learn from the same source");
  assert.equal(db.creatureProgressRows.length, 2);
  assert.equal(db.creatureProgressRows[1].creatureId, 8);

  const laterDb = fakeCreatureObservationDb({
    sourceDescriptions: [
      "actorPlayer=3; success=true; resource=herbs",
      "actorPlayer=3; success=true; resource=mushrooms",
    ],
  });
  await recordCreatureGatheringObservation({
    creatureId: 7,
    now: new Date("2026-06-03T09:01:00Z"),
  }, laterDb);
  await recordCreatureGatheringObservation({
    creatureId: 7,
    now: new Date("2026-06-03T09:01:30Z"),
  }, laterDb);
  assert.equal(laterDb.creatureProgressRows.length, 2, "later source with a different context can create another observation row");
  assert.equal(laterDb.creatureProgressRows.some((row) => row.contextKey === "resource:mushrooms"), true);

  for (const unsupportedDescription of [
    "actorPlayer=3; success=true; resource=honey",
    "actorPlayer=3; success=true; resource=beeswax",
    "actorPlayer=3; success=true; resource=twigs",
    "actorPlayer=3; success=true",
  ]) {
    const unsupportedDb = fakeCreatureObservationDb({ sourceDescriptions: [unsupportedDescription] });
    const unsupported = await recordCreatureGatheringObservation({
      creatureId: 7,
      now: new Date("2026-06-03T09:01:00Z"),
    }, unsupportedDb);
    assert.equal(unsupported.observed, false, `${unsupportedDescription} should not create observation learning`);
    assert.equal(unsupportedDb.creatureProgressRows.length, 0);
  }

  const goneDb = fakeCreatureObservationDb({ creatureOverrides: { isGone: true } });
  const gone = await recordCreatureGatheringObservation({
    creatureId: 7,
    now: new Date("2026-06-03T09:01:00Z"),
  }, goneDb);
  assert.equal(gone.observed, false, "gone creature should not learn");
  assert.equal(goneDb.creatureProgressRows.length, 0);

  const animalDb = fakeCreatureObservationDb({
    creatureOverrides: { professionKey: null, professionName: null, species: { key: "mouse", kind: "ANIMAL", diet: "HERBIVORE" } },
  });
  const animal = await recordCreatureGatheringObservation({
    creatureId: 7,
    now: new Date("2026-06-03T09:01:00Z"),
  }, animalDb);
  assert.equal(animal.observed, false, "ordinary animals should not learn broad gathering observation in this MVP");
  assert.equal(animalDb.creatureProgressRows.length, 0);

  const learnerPlan = npcLearnerPlan({
    learner: {
      id: 11,
      locationId: 13,
      professionKey: NPC_LEARNER_PROFESSION_KEY,
      currentAction: "npc_learner:profession:v1;profile=any;teacher=none;progress=0;rest=0; придивляється",
    },
    teacher: {
      id: 9,
      locationId: 13,
      name: "Ведана",
      professionKey: "travnytsia",
      professionName: "травниця",
      activity: "GATHERING",
      currentAction: "збирає кору й шепоче над травами",
      species: { key: "herbalist" },
    },
  });
  assert.equal(learnerPlan.kind, "observeTeacher");
  assert.equal(learnerPlan.state.profileKey, "herbalist");
  assert.equal(learnerPlan.state.progress, 2);
  assert.equal(JSON.stringify(learnerPlan).includes("playerId"), false);

  console.log("Creature observation learning helpers OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
