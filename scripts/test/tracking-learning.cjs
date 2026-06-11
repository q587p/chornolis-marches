const assert = require("node:assert/strict");

require("ts-node/register");

const {
  TRACKING_PRACTICE_CONTEXT_DETAIL,
  TRACKING_PRACTICE_CONTEXT_SEARCH,
  TRACKING_PRACTICE_CONTEXT_TRACK_GATE,
  TRACKING_PRACTICE_EVENT_TITLE,
  TRACKING_ANIMAL_MOVEMENT_OBSERVATION_COOLDOWN_MS,
  TRACKING_ANIMAL_MOVEMENT_OBSERVATION_TEXT,
  TRACKING_OBSERVATION_CONTEXT_ANIMAL_MOVEMENT,
  TRACKING_OBSERVATION_EVENT_TITLE,
  recordTrackingAnimalMovementObservation,
  recordTrackingPractice,
  roughTrackAgeText,
  trackingAnimalMovementObservationDescription,
  trackingAnimalMovementObservationLearningInput,
  trackingDarkPresenceText,
  trackingPracticeDescription,
  trackingPracticeLearningInput,
  trackingSkillEffectForPlayer,
  trackingSkillEffectForProgressRows,
} = require("../../src/services/trackingLearning");
const {
  TRACKING_ANIMAL_MOVEMENT_OBSERVATION_SPECIES_KEY,
  canObserveAnimalMovementForTracking,
} = require("../../src/services/animalMovementObservation");
const { canLearnFromVisibleObservation, visibilityRulesFromLight } = require("../../src/services/visibility");
const { REAL_MS_PER_GAME_MINUTE } = require("../../src/data/worldClock");

assert.equal(TRACKING_PRACTICE_EVENT_TITLE, "Tracking practice");
assert.equal(TRACKING_PRACTICE_CONTEXT_SEARCH, "track_search");
assert.equal(TRACKING_PRACTICE_CONTEXT_DETAIL, "track_detail");
assert.equal(TRACKING_PRACTICE_CONTEXT_TRACK_GATE, "track_gate");
assert.equal(TRACKING_OBSERVATION_EVENT_TITLE, "Tracking observation");
assert.equal(TRACKING_OBSERVATION_CONTEXT_ANIMAL_MOVEMENT, "animal_movement_observation");
assert.equal(TRACKING_ANIMAL_MOVEMENT_OBSERVATION_SPECIES_KEY, "rabbit");
assert.ok(TRACKING_ANIMAL_MOVEMENT_OBSERVATION_COOLDOWN_MS >= 10 * 60_000);
assert.equal(TRACKING_ANIMAL_MOVEMENT_OBSERVATION_TEXT.includes("+"), false);
assert.doesNotMatch(TRACKING_ANIMAL_MOVEMENT_OBSERVATION_TEXT, /\b\d+\b/, "Observation text should not expose raw progress numbers");

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
assert.deepEqual(trackingAnimalMovementObservationLearningInput({ playerId: 7, sourceEventId: 42 }), {
  playerId: 7,
  skillKey: "tracking",
  sourceKey: "observation",
  contextKey: "animal_movement_observation",
  amount: 1,
  lastSourceEventId: 42,
});
assert.equal(trackingAnimalMovementObservationLearningInput({ playerId: null }), null);
assert.match(
  trackingAnimalMovementObservationDescription({ playerId: 7, locationId: 13, creatureId: 91, fromLocationId: 13, toLocationId: 14, direction: "EAST" }),
  /playerId=7; contextKey=animal_movement_observation; locationId=13; creatureId=91; fromLocationId=13; toLocationId=14; direction=EAST/,
);

const clearVisibility = { showNearbyDetails: true, showTracks: true };
const darkVisibility = visibilityRulesFromLight({
  level: "dark",
  score: 0,
  hasLocalLight: false,
  label: "темрява",
}, "details");
const litDarkVisibility = visibilityRulesFromLight({
  level: "dark",
  score: 0,
  hasLocalLight: true,
  label: "світло в темряві",
}, "details");
assert.equal(canLearnFromVisibleObservation(darkVisibility, "tracks"), false);
assert.equal(canLearnFromVisibleObservation(darkVisibility, "animal_movement"), false);
assert.equal(canLearnFromVisibleObservation(darkVisibility, "local_action"), false);
assert.equal(canLearnFromVisibleObservation(litDarkVisibility, "tracks"), true);
assert.equal(canLearnFromVisibleObservation(litDarkVisibility, "animal_movement"), true);
assert.equal(canLearnFromVisibleObservation(litDarkVisibility, "local_action"), true);
assert.equal(canObserveAnimalMovementForTracking({ speciesKey: "rabbit", sourceLocationId: 1, destinationLocationId: 2, visibility: clearVisibility }), true);
assert.equal(canObserveAnimalMovementForTracking({ speciesKey: "mouse", sourceLocationId: 1, destinationLocationId: 2, visibility: clearVisibility }), false);
assert.equal(canObserveAnimalMovementForTracking({ speciesKey: "rabbit", isHidden: true, sourceLocationId: 1, destinationLocationId: 2, visibility: clearVisibility }), false);
assert.equal(canObserveAnimalMovementForTracking({ speciesKey: "rabbit", sourceLocationId: 1, destinationLocationId: 1, visibility: clearVisibility }), false);
assert.equal(canObserveAnimalMovementForTracking({ speciesKey: "rabbit", sourceLocationId: 1, destinationLocationId: 2, visibility: { showNearbyDetails: false, showTracks: true } }), false);
assert.equal(canObserveAnimalMovementForTracking({ speciesKey: "rabbit", sourceLocationId: 1, destinationLocationId: 2, visibility: { showNearbyDetails: true, showTracks: false } }), false);
assert.equal(canObserveAnimalMovementForTracking({ speciesKey: "rabbit", sourceLocationId: 1, destinationLocationId: 2, visibility: darkVisibility }), false);
assert.equal(canObserveAnimalMovementForTracking({ speciesKey: "rabbit", sourceLocationId: 1, destinationLocationId: 2, visibility: litDarkVisibility }), true);

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
const trackDateGameMinutesAgo = (minutes) => new Date(now.getTime() - minutes * REAL_MS_PER_GAME_MINUTE);
assert.equal(roughTrackAgeText(trackDateGameMinutesAgo(14), now), "свіжий слід");
assert.equal(roughTrackAgeText(trackDateGameMinutesAgo(15), now), "недавній слід");
assert.equal(roughTrackAgeText(trackDateGameMinutesAgo(119), now), "недавній слід");
assert.equal(roughTrackAgeText(trackDateGameMinutesAgo(120), now), "старіший слід");

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
      findFirst: async ({ where }) => worldEvents.find((event) => {
        if (where.type && event.type !== where.type) return false;
        if (where.title && event.title !== where.title) return false;
        if (where.playerId && event.playerId !== where.playerId) return false;
        if (where.description) {
          if (typeof where.description === "string" && event.description !== where.description) return false;
          if (where.description.contains && !String(event.description ?? "").includes(where.description.contains)) return false;
        }
        if (where.createdAt?.gte && event.createdAt < where.createdAt.gte) return false;
        return true;
      }) ?? null,
      create: async ({ data }) => {
        const event = { id: nextId++, createdAt: data.createdAt ?? new Date("2026-06-05T12:00:00Z"), ...data };
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

  const observationDb = fakeTrackingDb();
  const observedAt = new Date("2026-06-05T12:00:00Z");
  const observation = await recordTrackingAnimalMovementObservation({
    playerId: 7,
    locationId: 11,
    creatureId: 91,
    fromLocationId: 11,
    toLocationId: 12,
    direction: "EAST",
    now: observedAt,
  }, observationDb);
  assert.equal(observation.recorded, true);
  assert.equal(observation.text, TRACKING_ANIMAL_MOVEMENT_OBSERVATION_TEXT);
  assert.equal(observationDb.worldEvents.length, 1);
  assert.equal(observationDb.worldEvents[0].title, TRACKING_OBSERVATION_EVENT_TITLE);
  assert.equal(observationDb.worldEvents[0].type, "SYSTEM");
  assert.equal(observationDb.progressRows.length, 1);
  assert.equal(observationDb.progressRows[0].skillKey, "tracking");
  assert.equal(observationDb.progressRows[0].sourceKey, "observation");
  assert.equal(observationDb.progressRows[0].contextKey, TRACKING_OBSERVATION_CONTEXT_ANIMAL_MOVEMENT);
  assert.equal(observationDb.progressRows[0].totalProgress, 1);
  assert.equal(observationDb.progressRows[0].lastSourceEventId, observation.sourceEventId);

  const duplicate = await recordTrackingAnimalMovementObservation({
    playerId: 7,
    locationId: 11,
    creatureId: 91,
    fromLocationId: 11,
    toLocationId: 12,
    direction: "EAST",
    now: new Date("2026-06-05T12:01:00Z"),
  }, observationDb);
  assert.equal(duplicate.recorded, false);
  assert.equal(duplicate.reason, "duplicate");
  assert.equal(observationDb.worldEvents.length, 1);
  assert.equal(observationDb.progressRows[0].totalProgress, 1);

  const cooldown = await recordTrackingAnimalMovementObservation({
    playerId: 7,
    locationId: 12,
    creatureId: 92,
    fromLocationId: 12,
    toLocationId: 13,
    direction: "EAST",
    now: new Date("2026-06-05T12:05:00Z"),
  }, observationDb);
  assert.equal(cooldown.recorded, false);
  assert.equal(cooldown.reason, "cooldown");
  assert.equal(observationDb.worldEvents.length, 1);

  const afterCooldown = await recordTrackingAnimalMovementObservation({
    playerId: 7,
    locationId: 12,
    creatureId: 92,
    fromLocationId: 12,
    toLocationId: 13,
    direction: "EAST",
    now: new Date("2026-06-05T12:16:00Z"),
  }, observationDb);
  assert.equal(afterCooldown.recorded, true);
  assert.equal(observationDb.worldEvents.length, 2);
  assert.equal(observationDb.progressRows[0].totalProgress, 2);

  const completionSource = require("node:fs").readFileSync(require("node:path").join(__dirname, "../../src/services/actionCompletions.ts"), "utf8");
  assert.match(completionSource, /notifyAnimalMovementTrackingObservation/);
  assert.match(completionSource, /if \(isAnimal\) \{\s*await notifyAnimalMovementTrackingObservation/s);
  assert.match(
    completionSource,
    /if \(canLearnFromVisibleObservation\(visibility, "tracks"\)\) \{\s*await recordTrackingPractice/s,
    "Track practice learning should be guarded by track visibility",
  );

  console.log("Tracking learning helpers OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
