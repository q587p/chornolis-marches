const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  createWorldEventMarker,
  deleteExpiredWorldEventMarkers,
  findRecentWorldEventMarker,
  hasRecentWorldEventMarker,
  markerScopeDescription,
  markerScopeType,
  recordWorldEventMarkerIfAbsent,
  worldEventMarkerMetadata,
} = require("../../src/services/worldEventMarkers");

function matchesWhere(row, where) {
  if (where.markerKey && row.markerKey !== where.markerKey) return false;
  for (const field of ["playerId", "creatureId", "locationId", "targetType", "targetId", "sourceEventId", "worldEventId", "contextKey"]) {
    if (Object.prototype.hasOwnProperty.call(where, field) && row[field] !== where[field]) return false;
  }
  if (where.createdAt?.gte && row.createdAt < where.createdAt.gte) return false;
  if (where.OR?.length) {
    const expiresMatch = where.OR.some((condition) => {
      if (Object.prototype.hasOwnProperty.call(condition, "expiresAt") && condition.expiresAt === null) return row.expiresAt == null;
      if (condition.expiresAt?.gt) return row.expiresAt != null && row.expiresAt > condition.expiresAt.gt;
      return false;
    });
    if (!expiresMatch) return false;
  }
  return true;
}

function fakeMarkerDb() {
  const markers = [];
  return {
    markers,
    worldEventMarker: {
      create: async ({ data }) => {
        const marker = {
          id: markers.length + 1,
          createdAt: data.createdAt ?? new Date("2026-06-07T10:00:00Z"),
          updatedAt: new Date("2026-06-07T10:00:00Z"),
          ...data,
        };
        markers.push(marker);
        return marker;
      },
      findFirst: async ({ where }) => markers
        .filter((marker) => matchesWhere(marker, where))
        .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id)[0] ?? null,
      deleteMany: async ({ where }) => {
        const before = markers.length;
        for (let index = markers.length - 1; index >= 0; index -= 1) {
          if (markers[index].expiresAt && markers[index].expiresAt < where.expiresAt.lt) markers.splice(index, 1);
        }
        return { count: before - markers.length };
      },
    },
  };
}

(async () => {
  assert.equal(markerScopeType({ markerKey: "k", playerId: 1 }), "PLAYER");
  assert.equal(markerScopeType({ markerKey: "k", creatureId: 2 }), "CREATURE");
  assert.equal(markerScopeType({ markerKey: "k", locationId: 3 }), "LOCATION");
  assert.equal(markerScopeType({ markerKey: "k", playerId: 1, targetType: "CREATURE", targetId: 2 }), "PLAYER_TARGET");
  assert.equal(markerScopeType({ markerKey: "k", playerId: 1, creatureId: 2 }), "PLAYER_MENTOR");
  assert.equal(markerScopeType({ markerKey: "k" }), "GLOBAL");
  assert.equal(
    markerScopeDescription({
      markerKey: "follow_assist_failure",
      playerId: 7,
      targetType: "CREATURE",
      targetId: 42,
      locationId: 100,
      contextKey: "reason_hidden",
    }),
    "key=follow_assist_failure; scope=PLAYER_TARGET; player=7; location=100; target=CREATURE:42; context=reason_hidden",
  );

  const metadata = worldEventMarkerMetadata({
    skillKey: "gathering",
    resourceKey: "herbs",
    privateMessageText: "таємна репліка",
    nested: {
      contextKey: "resource:herbs",
      chatBody: "not stored",
    },
  });
  assert.deepEqual(metadata, {
    skillKey: "gathering",
    resourceKey: "herbs",
    nested: { contextKey: "resource:herbs" },
  });

  const db = fakeMarkerDb();
  await createWorldEventMarker({
    markerKey: "mentorship_practice_prompt",
    scopeType: "PLAYER_MENTOR",
    playerId: 7,
    creatureId: 9,
    locationId: 13,
    contextKey: "gathering:resource:herbs:gather:herbs",
    metadata: { skillKey: "gathering", resourceKey: "herbs" },
    now: new Date("2026-06-07T10:00:00Z"),
    ttlMs: 15 * 60_000,
  }, db);
  assert.equal(db.markers[0].scopeType, "PLAYER_MENTOR");
  assert.equal(db.markers[0].expiresAt.toISOString(), "2026-06-07T10:15:00.000Z");

  assert.equal(await hasRecentWorldEventMarker({
    markerKey: "mentorship_practice_prompt",
    playerId: 7,
    creatureId: 9,
    contextKey: "gathering:resource:herbs:gather:herbs",
    cooldownMs: 15 * 60_000,
    now: new Date("2026-06-07T10:01:00Z"),
  }, db), true);
  assert.equal(await findRecentWorldEventMarker({
    markerKey: "mentorship_practice_prompt",
    playerId: 7,
    creatureId: 9,
    contextKey: "gathering:resource:herbs:gather:herbs",
    cooldownMs: 15 * 60_000,
    now: new Date("2026-06-07T10:16:00Z"),
  }, db), null, "expired marker is ignored even if it is inside the createdAt cooldown window");
  assert.equal(await hasRecentWorldEventMarker({
    markerKey: "mentorship_practice_prompt",
    playerId: 8,
    creatureId: 9,
    contextKey: "gathering:resource:herbs:gather:herbs",
    cooldownMs: 15 * 60_000,
    now: new Date("2026-06-07T10:01:00Z"),
  }, db), false, "different player does not collide");
  assert.equal(await hasRecentWorldEventMarker({
    markerKey: "mentorship_practice_prompt",
    playerId: 7,
    creatureId: 10,
    contextKey: "gathering:resource:herbs:gather:herbs",
    cooldownMs: 15 * 60_000,
    now: new Date("2026-06-07T10:01:00Z"),
  }, db), false, "different target does not collide");
  assert.equal(await hasRecentWorldEventMarker({
    markerKey: "mentorship_practice_prompt",
    playerId: 7,
    creatureId: 9,
    contextKey: "gathering:resource:berries:gather:berries",
    cooldownMs: 15 * 60_000,
    now: new Date("2026-06-07T10:01:00Z"),
  }, db), false, "different context does not collide");

  await createWorldEventMarker({
    markerKey: "follow_assist_failure",
    playerId: 7,
    targetType: "CREATURE",
    targetId: 42,
    contextKey: "reason_hidden",
    metadata: { reason: "hidden" },
    now: new Date("2026-06-07T10:03:00Z"),
  }, db);
  assert.equal(await hasRecentWorldEventMarker({
    markerKey: "follow_assist_failure",
    playerId: 7,
    targetType: "CREATURE",
    targetId: 42,
    contextKey: "reason_hidden",
    cooldownMs: 90_000,
    now: new Date("2026-06-07T10:04:00Z"),
  }, db), true, "metadata is not needed for matching");
  assert.equal(await hasRecentWorldEventMarker({
    markerKey: "follow_assist_failure",
    playerId: 7,
    targetType: "CREATURE",
    targetId: 42,
    contextKey: "reason_hidden",
    cooldownMs: 90_000,
    now: new Date("2026-06-07T10:05:00Z"),
  }, db), false, "createdAt cooldown still applies when expiresAt is absent");

  const absent = await recordWorldEventMarkerIfAbsent({
    markerKey: "follow_assist_failure",
    playerId: 7,
    targetType: "CREATURE",
    targetId: 42,
    contextKey: "reason_busy",
    cooldownMs: 90_000,
    now: new Date("2026-06-07T10:04:00Z"),
  }, db);
  assert.equal(absent.created, true);
  const duplicate = await recordWorldEventMarkerIfAbsent({
    markerKey: "follow_assist_failure",
    playerId: 7,
    targetType: "CREATURE",
    targetId: 42,
    contextKey: "reason_busy",
    cooldownMs: 90_000,
    now: new Date("2026-06-07T10:04:30Z"),
  }, db);
  assert.equal(duplicate.created, false);

  const deleted = await deleteExpiredWorldEventMarkers(new Date("2026-06-07T10:16:00Z"), db);
  assert.equal(deleted.count, 1);

  console.log("WorldEventMarker helpers OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
