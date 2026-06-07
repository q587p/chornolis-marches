const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  MENTORSHIP_OBSERVATION_EVENT_TITLE,
  MENTORSHIP_LESSON_FEEDBACK_EVENT_TITLE,
  MENTORSHIP_LESSON_FEEDBACK_MARKER_KEY,
  MENTORSHIP_PRACTICE_PROMPT_EVENT_TITLE,
  MENTORSHIP_PRACTICE_PROMPT_MARKER_KEY,
  MENTORSHIP_STATUS_ACTIVE,
  MENTORSHIP_STATUS_DECLINED,
  MENTORSHIP_STATUS_ENDED,
  MENTORSHIP_STATUS_OFFERED,
  activeMentorshipForPlayer,
  activeMentorshipForPlayerAndMentor,
  canCreatureOfferMentorship,
  latestMentorshipLessonLine,
  mentorCanTeach,
  maybeCreateMentorshipPracticePrompt,
  maybeRecordMentorshipLessonFeedback,
  mentorshipLessonFeedbackDescription,
  mentorshipLessonFeedbackMarkerContext,
  mentorshipLessonRecentLine,
  mentorshipLessonText,
  mentorshipObservationBonusForSource,
  mentorshipObservationContext,
  mentorshipOfferKeyboard,
  mentorshipOfferText,
  mentorshipPracticePromptAction,
  mentorshipPracticePromptDescription,
  mentorshipPracticePromptMarkerContext,
  mentorshipPracticePromptKeyboard,
  mentorshipPracticePromptText,
  mentorshipSkillForCreature,
  mentorshipTrackingObservationLearningInput,
  mentorshipTrackingRouteMemoryContext,
  parseMentorshipAnswer,
  TRACKING_MENTORSHIP_FOLLOWED_MOVEMENT_CONTEXT,
} = require("../../src/services/mentorship");

assert.equal(MENTORSHIP_STATUS_OFFERED, "OFFERED");
assert.equal(MENTORSHIP_STATUS_ACTIVE, "ACTIVE");
assert.equal(MENTORSHIP_STATUS_DECLINED, "DECLINED");
assert.equal(MENTORSHIP_STATUS_ENDED, "ENDED");
assert.equal(MENTORSHIP_OBSERVATION_EVENT_TITLE, "Mentorship observation");
assert.equal(MENTORSHIP_LESSON_FEEDBACK_EVENT_TITLE, "Mentorship lesson feedback");
assert.equal(MENTORSHIP_PRACTICE_PROMPT_EVENT_TITLE, "Mentorship practice prompt");
assert.equal(MENTORSHIP_LESSON_FEEDBACK_MARKER_KEY, "mentorship_lesson_feedback");
assert.equal(MENTORSHIP_PRACTICE_PROMPT_MARKER_KEY, "mentorship_practice_prompt");
assert.equal(TRACKING_MENTORSHIP_FOLLOWED_MOVEMENT_CONTEXT, "mentorship_followed_movement");

assert.equal(mentorshipSkillForCreature({ professionKey: "herbalist", professionName: "Herbalist" }), "gathering");
assert.equal(mentorshipSkillForCreature({ professionKey: "znakhar", professionName: "знахар" }), "gathering");
assert.equal(mentorshipSkillForCreature({ professionKey: "hunter", professionName: "мисливець" }), "tracking");
assert.equal(mentorshipSkillForCreature({ professionKey: "mouse", professionName: "миша" }), null);

assert.equal(canCreatureOfferMentorship({ professionKey: "herbalist", isAlive: true, species: { kind: "HUMAN" } }), true);
assert.equal(canCreatureOfferMentorship({ professionKey: "herbalist", isAlive: false, species: { kind: "HUMAN" } }), false);
assert.equal(canCreatureOfferMentorship({ professionKey: "herbalist", isGone: true, species: { kind: "HUMAN" } }), false);
assert.equal(canCreatureOfferMentorship({ professionKey: "herbalist", isHidden: true, species: { kind: "HUMAN" } }), false);
assert.equal(canCreatureOfferMentorship({ professionKey: "herbalist", isAlive: true, species: { kind: "ANIMAL" } }), false);
assert.equal(canCreatureOfferMentorship({ professionKey: "hunter", isAlive: true, species: { kind: "HUMAN" } }), true);

assert.equal(mentorCanTeach(0, 1), true);
assert.equal(mentorCanTeach(2, 3), true);
assert.equal(mentorCanTeach(3, 3), false);
assert.equal(mentorCanTeach(4, 3), false);

assert.deepEqual(mentorshipTrackingRouteMemoryContext({
  targetType: "CREATURE",
  targetId: 9,
  source: "visible_move",
  visibility: "clear",
}), {
  mentorCreatureId: 9,
  skillKey: "tracking",
  contextKey: "mentorship_followed_movement",
});
assert.equal(mentorshipTrackingRouteMemoryContext({
  targetType: "CREATURE",
  targetId: 9,
  source: "visible_move",
  visibility: "dark",
}), null);
assert.equal(mentorshipTrackingRouteMemoryContext({
  targetType: "CREATURE",
  targetId: 9,
  source: "hidden_route",
  visibility: "hidden",
}), null);
assert.equal(mentorshipTrackingRouteMemoryContext({
  targetType: "PLAYER",
  targetId: 9,
  source: "visible_move",
  visibility: "clear",
}), null);

assert.deepEqual(mentorshipObservationContext({
  sourceDescription: "actorCreature=9; success=true; resource=herbs",
  skillKey: "gathering",
  contextKey: "resource:herbs",
}), {
  mentorCreatureId: 9,
  skillKey: "gathering",
  contextKey: "resource:herbs",
});
assert.equal(mentorshipObservationContext({
  sourceDescription: "actorPlayer=7; success=true; resource=herbs",
  skillKey: "gathering",
  contextKey: "resource:herbs",
}), null);
assert.equal(mentorshipObservationContext({
  sourceDescription: "actorCreature=9; success=true; resource=honey",
  skillKey: "gathering",
  contextKey: null,
}), null);

for (const text of ["так", "ага", "хочу", "звісно", "добре", "давай", "так, хочу", "я хочу", "навчи", "повчи мене", "yes"]) {
  assert.equal(parseMentorshipAnswer(text), "accept", `expected accept for ${text}`);
}
for (const text of ["ні", "не зараз", "потім", "ні дякую", "не хочу", "no", "later"]) {
  assert.equal(parseMentorshipAnswer(text), "decline", `expected decline for ${text}`);
}
assert.equal(parseMentorshipAnswer("може"), "unclear");

const herbOffer = mentorshipOfferText({ name: "Орина" }, "gathering");
assert.match(herbOffer, /Орина/);
assert.match(herbOffer, /Хочеш повчитися/);
assert.doesNotMatch(herbOffer, /TravelGroup|гуртова хода|\/skills/u);
const hunterOffer = mentorshipOfferText({ name: "Лукан" }, "tracking");
assert.match(hunterOffer, /Лукан/);
assert.match(hunterOffer, /Учитися хочеш/);

for (const text of [
  mentorshipLessonText({ skillKey: "gathering", mentorName: "Орина" }),
  mentorshipLessonText({ skillKey: "tracking", mentorName: "Лукан" }),
  mentorshipLessonRecentLine({ skillKey: "gathering", contextKey: "resource:herbs" }),
  mentorshipLessonRecentLine({ skillKey: "tracking", contextKey: "mentorship_followed_movement" }),
]) {
  assert.doesNotMatch(text, /\b(?:XP|level|bonus|amount)\b|\+\d|\d/u);
}
assert.match(mentorshipLessonText({ skillKey: "gathering", mentorName: "Орина" }), /Орина/);
assert.match(mentorshipLessonText({ skillKey: "tracking", mentorName: "Лукан" }), /Лукан/);
assert.equal(
  mentorshipLessonFeedbackDescription({ playerId: 7, mentorCreatureId: 11, skillKey: "tracking", contextKey: "mentorship_followed_movement" }),
  "player=7; mentorCreature=11; skillKey=tracking; contextKey=mentorship_followed_movement",
);
assert.equal(
  mentorshipLessonFeedbackMarkerContext({ skillKey: "tracking", contextKey: "mentorship_followed_movement" }),
  "tracking:mentorship_followed_movement",
);
assert.deepEqual(mentorshipPracticePromptAction({ skillKey: "gathering", contextKey: "resource:herbs" }), { action: "gather", resourceKey: "herbs" });
assert.equal(mentorshipPracticePromptAction({ skillKey: "gathering", contextKey: "resource:honey" }), null);
assert.equal(mentorshipPracticePromptAction({ skillKey: "tracking", contextKey: "mentorship_followed_movement" }), null);
assert.equal(
  mentorshipPracticePromptDescription({ playerId: 7, mentorCreatureId: 9, skillKey: "gathering", contextKey: "resource:herbs", action: "gather:herbs" }),
  "player=7; mentorCreature=9; skillKey=gathering; contextKey=resource:herbs; action=gather:herbs",
);
assert.equal(
  mentorshipPracticePromptMarkerContext({ skillKey: "gathering", contextKey: "resource:herbs", action: "gather:herbs" }),
  "gathering:resource:herbs:gather:herbs",
);
assert.match(mentorshipPracticePromptText({ mentorName: "Орина", skillKey: "gathering", contextKey: "resource:herbs" }), /Тепер ти/);
assert.match(mentorshipPracticePromptText({ mentorName: "Орина", skillKey: "gathering", contextKey: "resource:herbs", blocked: "no-resource" }), /нічого вчити рукою/);
assert.doesNotMatch(mentorshipPracticePromptText({ mentorName: "Орина", skillKey: "gathering", contextKey: "resource:herbs" }), /\b(?:XP|level|bonus|amount|quest|daily)\b|\+\d|\d/u);
const practiceKeyboard = mentorshipPracticePromptKeyboard({ action: "gather", resourceKey: "herbs" });
assert.equal(practiceKeyboard.inline_keyboard[0][0].text, "Спробувати зібрати");
assert.equal(practiceKeyboard.inline_keyboard[0][0].callback_data, "mentorship:practice:gather:herbs");

const keyboard = mentorshipOfferKeyboard(42);
assert.deepEqual(keyboard.inline_keyboard[0].map((button) => button.text), ["Так, хочу", "Не зараз"]);
assert.deepEqual(keyboard.inline_keyboard[0].map((button) => button.callback_data), ["mentorship:accept:42", "mentorship:decline:42"]);

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
assert.match(schema, /model PlayerMentorship/);
assert.match(schema, /playerId\s+Int/);
assert.match(schema, /mentorCreatureId\s+Int/);
assert.match(schema, /status\s+String\s+@default\("OFFERED"\)/);
assert.match(schema, /@@index\(\[playerId, status\]\)/);
assert.match(schema, /@@index\(\[mentorCreatureId, status\]\)/);
assert.match(schema, /@@index\(\[playerId, mentorCreatureId, skillKey, status\]\)/);
const travelGroupModel = schema.match(/model TravelGroup \{[\s\S]*?\n\}/)?.[0] ?? "";
assert.doesNotMatch(travelGroupModel, /mentorCreatureId|PlayerMentorship/);

const migration = fs.readFileSync("prisma/migrations/20260606190000_add_player_mentorships/migration.sql", "utf8");
assert.match(migration, /CREATE TABLE "PlayerMentorship"/);
assert.match(migration, /CREATE INDEX "PlayerMentorship_playerId_status_idx"/);

const service = fs.readFileSync("src/services/mentorship.ts", "utf8");
assert.match(service, /observedActorSkillLevel/);
assert.match(service, /setPlayerFollowIntent/);
assert.match(service, /withSlowLog\("mentorship\.offer"/);
assert.match(service, /MENTORSHIP_STATUS_ACTIVE/);
assert.match(service, /MENTORSHIP_LESSON_FEEDBACK_MARKER_KEY/);
assert.match(service, /MENTORSHIP_PRACTICE_PROMPT_MARKER_KEY/);
assert.match(service, /findRecentWorldEventMarker/);
assert.match(service, /createWorldEventMarker/);
assert.doesNotMatch(service, /createTravelGroup|TravelGroup|recordLearningProgress|recordActorLearningProgress/);
assert.doesNotMatch(service, /setFollowAssistEnabled/);

const aliases = fs.readFileSync("src/handlers/aliases.ts", "utf8");
assert.match(aliases, /maybeOfferMentorshipAfterFollow/);
assert.match(aliases, /respondToMentorshipOffer/);
assert.match(aliases, /mentorship:\(accept\|decline\):/);
assert.match(aliases, /bot\.command\(\["mentor", "mentorship"\]/);

const social = fs.readFileSync("src/handlers/social.ts", "utf8");
assert.match(social, /maybeOfferMentorshipAfterFollow/);
assert.match(social, /mentorshipOfferKeyboard/);

const travelGroups = fs.readFileSync("src/services/travelGroups.ts", "utf8");
assert.doesNotMatch(travelGroups, /PlayerMentorship|mentorCreatureId|mentorship:/);

function fakeMentorshipDb(rows) {
  return {
    playerMentorship: {
      findFirst: async ({ where }) => rows.find((row) =>
        row.playerId === where.playerId &&
        (!where.mentorCreatureId || row.mentorCreatureId === where.mentorCreatureId) &&
        row.status === where.status &&
        (!where.skillKey || row.skillKey === where.skillKey)
      ) ?? null,
    },
  };
}

function matchesMarkerWhere(marker, where) {
  for (const field of ["markerKey", "playerId", "creatureId", "locationId", "targetType", "targetId", "sourceEventId", "worldEventId", "contextKey"]) {
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

function fakeMentorshipLessonDb(existingEvents = []) {
  const events = existingEvents.map((event, index) => ({
    id: index + 1,
    createdAt: event.createdAt ?? new Date(),
    ...event,
  }));
  const markers = [];
  return {
    playerMentorship: {
      findFirst: async () => null,
    },
    worldEvent: {
      findMany: async ({ where, take }) => events
        .filter((event) =>
          (!where.type || event.type === where.type) &&
          (!where.title || event.title === where.title) &&
          (!where.playerId || event.playerId === where.playerId) &&
          (!where.createdAt?.gte || event.createdAt >= where.createdAt.gte)
        )
        .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id)
        .slice(0, take ?? events.length),
      create: async ({ data }) => {
        const event = {
          id: events.length + 1,
          createdAt: data.createdAt ?? new Date(),
          ...data,
        };
        events.push(event);
        return event;
      },
    },
    events,
    markers,
    worldEventMarker: fakeWorldEventMarkerStore(markers),
  };
}

function fakeMentorshipPracticePromptDb({ rows = [], resources = [{ locationId: 13, resourceKey: "herbs" }], existingEvents = [] } = {}) {
  const events = existingEvents.map((event, index) => ({
    id: index + 1,
    createdAt: event.createdAt ?? new Date(),
    ...event,
  }));
  const markers = [];
  return {
    playerMentorship: {
      findFirst: async ({ where }) => rows.find((row) =>
        row.playerId === where.playerId &&
        row.mentorCreatureId === where.mentorCreatureId &&
        row.status === where.status &&
        (!where.skillKey || row.skillKey === where.skillKey)
      ) ?? null,
    },
    resourceNode: {
      findFirst: async ({ where }) => resources.find((resource) =>
        resource.locationId === where.locationId &&
        resource.resourceKey === where.resourceType?.key
      ) ? { id: 1 } : null,
    },
    worldEvent: {
      findMany: async ({ where, take }) => events
        .filter((event) =>
          (!where.type || event.type === where.type) &&
          (!where.title || event.title === where.title) &&
          (!where.playerId || event.playerId === where.playerId) &&
          (!where.createdAt?.gte || event.createdAt >= where.createdAt.gte)
        )
        .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id)
        .slice(0, take ?? events.length),
      create: async ({ data }) => {
        const event = {
          id: events.length + 1,
          createdAt: data.createdAt ?? new Date(),
          ...data,
        };
        events.push(event);
        return event;
      },
    },
    events,
    markers,
    worldEventMarker: fakeWorldEventMarkerStore(markers),
  };
}

async function runAsyncAssertions() {
  const activeDb = fakeMentorshipDb([
    { id: 1, playerId: 7, mentorCreatureId: 9, skillKey: "gathering", status: "ACTIVE" },
    { id: 2, playerId: 7, mentorCreatureId: 10, skillKey: "gathering", status: "OFFERED" },
    { id: 3, playerId: 7, mentorCreatureId: 11, skillKey: "tracking", status: "ACTIVE" },
    { id: 4, playerId: 7, mentorCreatureId: 12, skillKey: "tracking", status: "DECLINED" },
  ]);
  assert.equal((await activeMentorshipForPlayer(7, activeDb)).id, 1);
  assert.equal((await activeMentorshipForPlayerAndMentor({ playerId: 7, mentorCreatureId: 9, skillKey: "gathering" }, activeDb)).id, 1);
  assert.equal(await activeMentorshipForPlayerAndMentor({ playerId: 7, mentorCreatureId: 10, skillKey: "gathering" }, activeDb), null);
  assert.equal(await activeMentorshipForPlayerAndMentor({ playerId: 7, mentorCreatureId: 9, skillKey: "tracking" }, activeDb), null);

  const bonus = await mentorshipObservationBonusForSource({
    playerId: 7,
    sourceEventId: 42,
    sourceDescription: "actorCreature=9; success=true; resource=herbs",
    skillKey: "gathering",
    contextKey: "resource:herbs",
  }, activeDb);
  assert.equal(bonus.applies, true);
  assert.equal(bonus.amount, 2);
  assert.match(bonus.description, /mentorCreature=9/);
  assert.match(bonus.description, /source=42/);

  const inactiveBonus = await mentorshipObservationBonusForSource({
    playerId: 7,
    sourceEventId: 43,
    sourceDescription: "actorCreature=10; success=true; resource=herbs",
    skillKey: "gathering",
    contextKey: "resource:herbs",
  }, activeDb);
  assert.equal(inactiveBonus.applies, false);
  assert.equal(inactiveBonus.amount, 1);

  assert.deepEqual(await mentorshipTrackingObservationLearningInput({
    playerId: 7,
    sourceEventId: 55,
    targetType: "CREATURE",
    targetId: 11,
    source: "visible_move",
    visibility: "clear",
  }, activeDb), {
    playerId: 7,
    skillKey: "tracking",
    sourceKey: "observation",
    contextKey: "mentorship_followed_movement",
    amount: 1,
    lastSourceEventId: 55,
  });
  assert.equal(await mentorshipTrackingObservationLearningInput({
    playerId: 7,
    sourceEventId: 56,
    targetType: "CREATURE",
    targetId: 12,
    source: "visible_move",
    visibility: "clear",
  }, activeDb), null);
  assert.equal(await mentorshipTrackingObservationLearningInput({
    playerId: 7,
    sourceEventId: 57,
    targetType: "CREATURE",
    targetId: 11,
    source: "hidden_route",
    visibility: "hidden",
  }, activeDb), null);
  assert.equal(await mentorshipTrackingObservationLearningInput({
    playerId: 7,
    sourceEventId: 58,
    targetType: "CREATURE",
    targetId: 11,
    source: "visible_move",
    visibility: "dark",
  }, activeDb), null);
  assert.equal(await mentorshipTrackingObservationLearningInput({
    playerId: 7,
    sourceEventId: 59,
    targetType: "CREATURE",
    targetId: 9,
    source: "visible_move",
    visibility: "clear",
  }, activeDb), null);

  const lessonDb = fakeMentorshipLessonDb();
  const lesson = await maybeRecordMentorshipLessonFeedback({
    playerId: 7,
    mentorCreatureId: 11,
    skillKey: "tracking",
    contextKey: "mentorship_followed_movement",
    mentorName: "Лукан",
    now: new Date("2026-06-07T10:00:00Z"),
  }, lessonDb);
  assert.equal(lesson.ok, true);
  assert.match(lesson.text, /Лукан/);
  assert.equal(lessonDb.events.length, 1);
  assert.equal(lessonDb.markers.length, 1);
  assert.equal(lessonDb.markers[0].markerKey, MENTORSHIP_LESSON_FEEDBACK_MARKER_KEY);
  assert.equal(lessonDb.markers[0].playerId, 7);
  assert.equal(lessonDb.markers[0].creatureId, 11);
  assert.equal(lessonDb.markers[0].contextKey, "tracking:mentorship_followed_movement");
  assert.equal(lessonDb.markers[0].worldEventId, lesson.event.id);
  assert.deepEqual(lessonDb.markers[0].metadata, {
    skillKey: "tracking",
    contextKey: "mentorship_followed_movement",
  });
  const cooldownLesson = await maybeRecordMentorshipLessonFeedback({
    playerId: 7,
    mentorCreatureId: 11,
    skillKey: "tracking",
    contextKey: "mentorship_followed_movement",
    mentorName: "Лукан",
    now: new Date("2026-06-07T10:01:00Z"),
  }, lessonDb);
  assert.equal(cooldownLesson.ok, false);
  assert.equal(cooldownLesson.reason, "cooldown");
  assert.equal(lessonDb.events.length, 1);
  assert.equal(lessonDb.markers.length, 1);
  assert.equal(await latestMentorshipLessonLine({ playerId: 7, mentorCreatureId: 11, skillKey: "tracking" }, lessonDb), "Останнє, що зачепилося: трава видала крок раніше, ніж ви побачили слід.");
  assert.equal(await latestMentorshipLessonLine({ playerId: 7, mentorCreatureId: 9, skillKey: "tracking" }, lessonDb), null);

  const mentorCreature = { id: 9, name: "Орина", species: { name: "людина", key: "human" } };
  const promptDb = fakeMentorshipPracticePromptDb({
    rows: [{ id: 1, playerId: 7, mentorCreatureId: 9, skillKey: "gathering", status: "ACTIVE", mentorCreature }],
  });
  const prompt = await maybeCreateMentorshipPracticePrompt({
    playerId: 7,
    mentorCreatureId: 9,
    skillKey: "gathering",
    contextKey: "resource:herbs",
    locationId: 13,
    now: new Date("2026-06-07T10:02:00Z"),
  }, promptDb);
  assert.equal(prompt.ok, true);
  assert.match(prompt.text, /Тепер ти/);
  assert.equal(prompt.keyboard.inline_keyboard[0][0].callback_data, "mentorship:practice:gather:herbs");
  assert.equal(promptDb.events.length, 1);
  assert.equal(promptDb.events[0].title, MENTORSHIP_PRACTICE_PROMPT_EVENT_TITLE);
  assert.match(promptDb.events[0].description, /action=gather:herbs/);
  assert.equal(promptDb.markers.length, 1);
  assert.equal(promptDb.markers[0].markerKey, MENTORSHIP_PRACTICE_PROMPT_MARKER_KEY);
  assert.equal(promptDb.markers[0].playerId, 7);
  assert.equal(promptDb.markers[0].creatureId, 9);
  assert.equal(promptDb.markers[0].contextKey, "gathering:resource:herbs:gather:herbs");
  assert.equal(promptDb.markers[0].worldEventId, prompt.event.id);
  assert.deepEqual(promptDb.markers[0].metadata, {
    skillKey: "gathering",
    contextKey: "resource:herbs",
    action: "gather",
    resourceKey: "herbs",
  });
  const duplicatePrompt = await maybeCreateMentorshipPracticePrompt({
    playerId: 7,
    mentorCreatureId: 9,
    skillKey: "gathering",
    contextKey: "resource:herbs",
    locationId: 13,
    now: new Date("2026-06-07T10:03:00Z"),
  }, promptDb);
  assert.equal(duplicatePrompt.ok, false);
  assert.equal(duplicatePrompt.reason, "cooldown");
  assert.equal(promptDb.events.length, 1);
  assert.equal(promptDb.markers.length, 1);

  const inactivePromptDb = fakeMentorshipPracticePromptDb({
    rows: [{ id: 2, playerId: 7, mentorCreatureId: 9, skillKey: "gathering", status: "OFFERED", mentorCreature }],
  });
  assert.equal((await maybeCreateMentorshipPracticePrompt({
    playerId: 7,
    mentorCreatureId: 9,
    skillKey: "gathering",
    contextKey: "resource:herbs",
    locationId: 13,
  }, inactivePromptDb)).ok, false);
  const unsupportedPrompt = await maybeCreateMentorshipPracticePrompt({
    playerId: 7,
    mentorCreatureId: 9,
    skillKey: "gathering",
    contextKey: "resource:honey",
    locationId: 13,
  }, promptDb);
  assert.equal(unsupportedPrompt.ok, false);
  assert.equal(unsupportedPrompt.reason, "unsupported-context");
  const emptyPromptDb = fakeMentorshipPracticePromptDb({
    rows: [{ id: 3, playerId: 7, mentorCreatureId: 9, skillKey: "gathering", status: "ACTIVE", mentorCreature }],
    resources: [],
  });
  const emptyPrompt = await maybeCreateMentorshipPracticePrompt({
    playerId: 7,
    mentorCreatureId: 9,
    skillKey: "gathering",
    contextKey: "resource:herbs",
    locationId: 13,
  }, emptyPromptDb);
  assert.equal(emptyPrompt.ok, false);
  assert.equal(emptyPrompt.reason, "no-resource");
  assert.match(emptyPrompt.text, /нічого вчити рукою/);
}

assert.ok(
  aliases.indexOf("const parsed = parseAlias(ctx.message.text);") <
  aliases.indexOf("if (await maybeHandleMentorshipAnswer(ctx)) return;"),
  "slashless aliases should be parsed before mentorship unclear-answer handling",
);
assert.ok(
  aliases.indexOf("if (await maybeHandleMentorshipAnswer(ctx)) return;") <
  aliases.indexOf("consumePendingReplyModeResult(player.id)"),
  "mentorship yes/no handling should run before pending free-text reply consumption",
);
assert.match(aliases, /replyTarget:pending/);

const gatherHandler = fs.readFileSync("src/handlers/gather.ts", "utf8");
assert.match(gatherHandler, /mentorship:practice:gather:\(berries\|mushrooms\|herbs\)/);
assert.match(gatherHandler, /submitGather\(bot, ctx, ctx\.match\[1\] as GatherKey, true\)/);

runAsyncAssertions()
  .then(() => console.log("Mentorship foundation helpers OK"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
