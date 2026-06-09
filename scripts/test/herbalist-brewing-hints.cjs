const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  HERBALIST_BREWING_HINT_CONTEXT_KEY,
  HERBALIST_BREWING_HINT_EVENT_TITLE,
  HERBALIST_BREWING_HINT_MARKER_KEY,
  herbalistBrewingHintText,
  isHerbalistBrewingHintEligible,
  isHerbalistLikeCreature,
  maybeHerbalistBrewingHintForPlayer,
} = require("../../src/services/herbalistBrewingHints");

assert.equal(HERBALIST_BREWING_HINT_MARKER_KEY, "herbalist_brewing_hint:v1");
assert.equal(HERBALIST_BREWING_HINT_EVENT_TITLE, "Herbalist brewing hint");
assert.equal(HERBALIST_BREWING_HINT_CONTEXT_KEY, "bottle_tincture_intro");

assert.equal(isHerbalistLikeCreature({
  professionKey: "herbalist",
  professionName: "знахар",
  isAlive: true,
  species: { kind: "HUMAN", key: "herbalist", name: "знахар" },
}), true);
assert.equal(isHerbalistLikeCreature({
  professionKey: "hunter",
  professionName: "мисливець",
  isAlive: true,
  species: { kind: "HUMAN", key: "hunter", name: "мисливець" },
}), false);
assert.equal(isHerbalistLikeCreature({
  professionKey: "herbalist",
  isAlive: true,
  species: { kind: "ANIMAL", key: "mouse", name: "миша" },
}), false);
assert.equal(isHerbalistLikeCreature({ professionKey: "herbalist", isAlive: false, species: { kind: "HUMAN" } }), false);

const eligibleBase = {
  hasBottleSourceImplemented: true,
  hasCraftedHerbalTincture: false,
  hasSeenHint: false,
  nearbyHerbalistCount: 1,
};
assert.equal(isHerbalistBrewingHintEligible({ ...eligibleBase, herbalismLevel: 1 }), true);
assert.equal(isHerbalistBrewingHintEligible({ ...eligibleBase, gatheringLevel: 2 }), true);
assert.equal(isHerbalistBrewingHintEligible({ ...eligibleBase, gatheringMilestoneCount: 2 }), true);
assert.equal(isHerbalistBrewingHintEligible({
  ...eligibleBase,
  nearbyHerbalistCount: 0,
  hasActiveHerbalistMentor: true,
  hasRelevantLearningProgress: true,
}), true);
assert.equal(isHerbalistBrewingHintEligible({ ...eligibleBase, hasSeenHint: true, herbalismLevel: 2 }), false);
assert.equal(isHerbalistBrewingHintEligible({ ...eligibleBase, hasCraftedHerbalTincture: true, herbalismLevel: 2 }), false);
assert.equal(isHerbalistBrewingHintEligible({ ...eligibleBase, hasBottleSourceImplemented: false, herbalismLevel: 2 }), false);
assert.equal(isHerbalistBrewingHintEligible({ ...eligibleBase, nearbyHerbalistCount: 0, herbalismLevel: 2 }), false);
assert.equal(isHerbalistBrewingHintEligible({ ...eligibleBase, gatheringLevel: 1, herbalismLevel: 0, gatheringMilestoneCount: 1 }), false);

for (const style of ["long", "short"]) {
  const text = herbalistBrewingHintText(style);
  assert.match(text, /погреб|коренева кишеня/u);
  assert.match(text, /пляшеч/u);
  assert.match(text, /<blockquote>.*<\/blockquote>/u);
  assert.doesNotMatch(text, /herbalism|gathering|brew:herbal_tincture|level|totalProgress|milestone|%/u);
  assert.doesNotMatch(text, /(?:рівень|поріг)\s*\d/u);
}

function matchesMarkerWhere(marker, where) {
  for (const field of ["markerKey", "scopeType", "playerId", "creatureId", "locationId", "targetType", "targetId", "sourceEventId", "worldEventId", "contextKey"]) {
    if (Object.prototype.hasOwnProperty.call(where, field) && marker[field] !== where[field]) return false;
  }
  if (where.createdAt?.gte && marker.createdAt < where.createdAt.gte) return false;
  if (where.OR?.length) {
    const expiresMatch = where.OR.some((condition) => {
      if (Object.prototype.hasOwnProperty.call(condition, "expiresAt") && condition.expiresAt === null) return marker.expiresAt == null;
      if (condition.expiresAt?.gt) return marker.expiresAt != null && marker.expiresAt > condition.expiresAt.gt;
      return false;
    });
    if (!expiresMatch) return false;
  }
  return true;
}

function fakeWorldEventMarkerStore(markers) {
  return {
    create: async ({ data }) => {
      const marker = {
        id: markers.length + 1,
        createdAt: data.createdAt ?? new Date(),
        updatedAt: new Date(),
        ...data,
      };
      markers.push(marker);
      return marker;
    },
    findFirst: async ({ where }) => markers
      .filter((marker) => matchesMarkerWhere(marker, where))
      .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id)[0] ?? null,
  };
}

function fakeHintDb({
  progressRows = [
    { skillKey: "gathering", level: 2, progress: 8, totalProgress: 8, milestoneCount: 0 },
  ],
  brewAttempt = false,
  herbalistNearby = true,
  activeMentorship = true,
  bottleSource = true,
  locationZ = 0,
  existingMarkers = [],
} = {}) {
  const markers = [...existingMarkers];
  const events = [];
  const mentorCreature = herbalistNearby
    ? {
      id: 9,
      locationId: 13,
      professionKey: "herbalist",
      professionName: "знахар",
      isAlive: true,
      isGone: false,
      isHidden: false,
      species: { kind: "HUMAN", key: "herbalist", name: "знахар" },
    }
    : {
      id: 9,
      locationId: 13,
      professionKey: "hunter",
      professionName: "мисливець",
      isAlive: true,
      isGone: false,
      isHidden: false,
      species: { kind: "HUMAN", key: "hunter", name: "мисливець" },
    };

  return {
    markers,
    events,
    cellLocation: {
      findUnique: async () => ({ z: locationZ }),
    },
    resourceType: {
      findUnique: async ({ where }) => (bottleSource && where.key === "empty_bottle" ? { id: 1 } : null),
    },
    locationFeature: {
      findFirst: async ({ where }) => (bottleSource && where.key === "start_root_pocket_bottle_niche" && where.isActive === true ? { id: 2 } : null),
    },
    worldEventMarker: fakeWorldEventMarkerStore(markers),
    worldEvent: {
      create: async ({ data }) => {
        const event = { id: events.length + 1, createdAt: data.createdAt ?? new Date(), ...data };
        events.push(event);
        return event;
      },
    },
    playerMentorship: {
      findFirst: async ({ where }) => {
        if (!activeMentorship) return null;
        if (where.playerId !== 7 || where.status !== "ACTIVE" || where.skillKey !== "gathering") return null;
        if (where.mentorCreatureId && where.mentorCreatureId !== mentorCreature.id) return null;
        return { id: 1, playerId: 7, mentorCreatureId: mentorCreature.id, skillKey: "gathering", status: "ACTIVE", mentorCreature };
      },
    },
    creature: {
      findUnique: async ({ where }) => (where.id === mentorCreature.id ? mentorCreature : null),
      findMany: async () => [mentorCreature],
    },
    characterLearningProgress: {
      findFirst: async ({ where }) => {
        if (
          brewAttempt &&
          where.playerId === 7 &&
          where.skillKey === "herbalism" &&
          where.sourceKey === "practice" &&
          where.contextKey === "brew:herbal_tincture"
        ) return { id: 99 };
        return null;
      },
      findMany: async ({ where }) => progressRows.filter((row) => row.skillKey && where.skillKey.in.includes(row.skillKey)),
    },
  };
}

async function runAsyncAssertions() {
  const db = fakeHintDb();
  const result = await maybeHerbalistBrewingHintForPlayer(7, {
    locationId: 13,
    mentorCreatureId: 9,
    chance: 1,
    now: new Date("2026-06-09T10:00:00Z"),
  }, db);
  assert.equal(result.ok, true);
  assert.match(result.text, /коренева кишеня/u);
  assert.equal(db.events.length, 1);
  assert.equal(db.events[0].title, HERBALIST_BREWING_HINT_EVENT_TITLE);
  assert.equal(db.markers.length, 1);
  assert.equal(db.markers[0].markerKey, HERBALIST_BREWING_HINT_MARKER_KEY);
  assert.equal(db.markers[0].playerId, 7);
  assert.equal(db.markers[0].contextKey, HERBALIST_BREWING_HINT_CONTEXT_KEY);
  assert.equal(db.markers[0].worldEventId, db.events[0].id);

  const duplicate = await maybeHerbalistBrewingHintForPlayer(7, {
    locationId: 13,
    mentorCreatureId: 9,
    chance: 1,
    now: new Date("2026-06-09T10:01:00Z"),
  }, db);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "already-seen");
  assert.equal(db.markers.length, 1);

  const brewDb = fakeHintDb({ brewAttempt: true });
  const alreadyBrewed = await maybeHerbalistBrewingHintForPlayer(7, {
    locationId: 13,
    mentorCreatureId: 9,
    chance: 1,
  }, brewDb);
  assert.equal(alreadyBrewed.ok, false);
  assert.equal(alreadyBrewed.reason, "already-tried-brewing");
  assert.equal(brewDb.markers.length, 0);

  const noHerbalistDb = fakeHintDb({ herbalistNearby: false, activeMentorship: false });
  const noHerbalist = await maybeHerbalistBrewingHintForPlayer(7, {
    locationId: 13,
    mentorCreatureId: 9,
    chance: 1,
  }, noHerbalistDb);
  assert.equal(noHerbalist.ok, false);
  assert.equal(noHerbalist.reason, "ineligible");
  assert.equal(noHerbalistDb.markers.length, 0);

  const noProgressDb = fakeHintDb({ progressRows: [] });
  const noProgress = await maybeHerbalistBrewingHintForPlayer(7, {
    locationId: 13,
    mentorCreatureId: 9,
    chance: 1,
  }, noProgressDb);
  assert.equal(noProgress.ok, false);
  assert.equal(noProgress.reason, "ineligible");
  assert.equal(noProgressDb.markers.length, 0);

  const dreamDb = fakeHintDb({ locationZ: -13 });
  const dream = await maybeHerbalistBrewingHintForPlayer(7, {
    locationId: 13,
    mentorCreatureId: 9,
    chance: 1,
  }, dreamDb);
  assert.equal(dream.ok, false);
  assert.equal(dream.reason, "dream-location");
  assert.equal(dreamDb.markers.length, 0);

  const chanceDb = fakeHintDb();
  const chance = await maybeHerbalistBrewingHintForPlayer(7, {
    locationId: 13,
    mentorCreatureId: 9,
    chance: 0,
  }, chanceDb);
  assert.equal(chance.ok, false);
  assert.equal(chance.reason, "chance");
  assert.equal(chanceDb.markers.length, 0);
}

const actionCompletions = fs.readFileSync("src/services/actionCompletions.ts", "utf8");
assert.match(actionCompletions, /maybeHerbalistBrewingHintForPlayer/);
assert.match(actionCompletions, /sendMentorshipLessonFollowups/);
assert.match(actionCompletions, /parse_mode: "HTML"/);

const manifest = fs.readFileSync("scripts/test/test-manifest.cjs", "utf8");
assert.match(manifest, /scripts\/test\/herbalist-brewing-hints\.cjs/);

runAsyncAssertions()
  .then(() => console.log("Herbalist brewing hint helpers OK"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
