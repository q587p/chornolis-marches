const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  MENTORSHIP_STATUS_ACTIVE,
  MENTORSHIP_STATUS_DECLINED,
  MENTORSHIP_STATUS_ENDED,
  MENTORSHIP_STATUS_OFFERED,
  canCreatureOfferMentorship,
  mentorCanTeach,
  mentorshipOfferKeyboard,
  mentorshipOfferText,
  mentorshipSkillForCreature,
  parseMentorshipAnswer,
} = require("../../src/services/mentorship");

assert.equal(MENTORSHIP_STATUS_OFFERED, "OFFERED");
assert.equal(MENTORSHIP_STATUS_ACTIVE, "ACTIVE");
assert.equal(MENTORSHIP_STATUS_DECLINED, "DECLINED");
assert.equal(MENTORSHIP_STATUS_ENDED, "ENDED");

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

console.log("Mentorship foundation helpers OK");
