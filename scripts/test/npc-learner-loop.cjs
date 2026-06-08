const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/chornolis_test";

require("ts-node/register");

const {
  NPC_LEARNER_DEFAULT_PROFILE_KEY,
  NPC_LEARNER_LOOP_MARKER,
  NPC_LEARNER_PROFESSION_KEY,
  NPC_LEARNER_PROGRESS_CAP,
  NPC_LEARNER_TEACHER_PROFILES,
  formatNpcLearnerAction,
  isNpcLearnerCreature,
  isNpcLearnerTeacher,
  npcLearnerCaughtUp,
  npcLearnerPlan,
  npcLearnerTeacherProfileForCreature,
  parseNpcLearnerState,
  stripNpcLearnerActionMarker,
} = require("../../src/services/npcLearner");
const { normalizeCreatureActionText } = require("../../src/utils/creatureActionText");

const learner = {
  id: 10,
  locationId: 1,
  professionKey: NPC_LEARNER_PROFESSION_KEY,
  currentAction: `${NPC_LEARNER_LOOP_MARKER};profile=any;teacher=none;progress=0;rest=0; придивляється до чужої роботи`,
};
const herbalistTeacher = {
  id: 20,
  locationId: 1,
  name: "Ведана",
  professionKey: "travnytsia",
  professionName: "травниця",
  activity: "GATHERING",
  currentAction: "збирає кору й шепоче над травами",
  species: { key: "herbalist" },
};
const hunterTeacher = {
  id: 30,
  locationId: 1,
  name: "Лукан",
  professionKey: "hunter",
  professionName: "мисливець",
  activity: "MOVING",
  currentAction: "тримається сліду здобичі",
  species: { key: "hunter" },
};

assert.deepEqual(
  NPC_LEARNER_TEACHER_PROFILES.map((profile) => profile.key),
  ["herbalist", "hunter"],
  "learner profiles should already be table-driven beyond one profession",
);
assert.equal(isNpcLearnerCreature(learner), true);
assert.equal(isNpcLearnerCreature({ professionKey: "travnytsia", currentAction: null }), false);
assert.equal(isNpcLearnerTeacher(herbalistTeacher, learner.id), true);
assert.equal(isNpcLearnerTeacher(hunterTeacher, learner.id), true);
assert.equal(isNpcLearnerTeacher(hunterTeacher, learner.id, "herbalist"), false);
assert.equal(isNpcLearnerTeacher({ ...herbalistTeacher, id: learner.id }, learner.id), false);
assert.equal(npcLearnerTeacherProfileForCreature(herbalistTeacher).key, "herbalist");
assert.equal(npcLearnerTeacherProfileForCreature(hunterTeacher).key, "hunter");

const parsed = parseNpcLearnerState(learner.currentAction);
assert.deepEqual(parsed, {
  profileKey: NPC_LEARNER_DEFAULT_PROFILE_KEY,
  teacherId: null,
  progress: 0,
  rest: 0,
});

const herbalistObserve = npcLearnerPlan({ learner, teacher: herbalistTeacher });
assert.equal(herbalistObserve.kind, "observeTeacher");
assert.equal(herbalistObserve.amount, 2);
assert.equal(herbalistObserve.state.profileKey, "herbalist");
assert.equal(herbalistObserve.state.teacherId, herbalistTeacher.id);
assert.equal(herbalistObserve.state.progress, 2);
assert.match(herbalistObserve.currentAction, /^npc_learner:profession:v1;profile=herbalist;teacher=20;progress=2;rest=0; /);
assert.equal(stripNpcLearnerActionMarker(herbalistObserve.currentAction), "дивиться, як працює Ведана");
assert.equal(normalizeCreatureActionText(herbalistObserve.currentAction), "дивиться, як працює Ведана");

const hunterObserve = npcLearnerPlan({ learner, teacher: hunterTeacher });
assert.equal(hunterObserve.kind, "observeTeacher");
assert.equal(hunterObserve.state.profileKey, "hunter");
assert.equal(hunterObserve.state.progress, 2);
assert.equal(normalizeCreatureActionText(hunterObserve.currentAction), "дивиться, як працює Лукан");

const route = [{ fromLocationId: 1, toLocationId: 2, direction: "EAST", travelCost: 1 }];
const follow = npcLearnerPlan({
  learner,
  teacher: { ...hunterTeacher, locationId: 2 },
  routeToTeacher: route,
});
assert.equal(follow.kind, "followTeacher");
assert.equal(follow.route, route);
assert.equal(follow.state.progress, 0, "following should not grant progress by itself");
assert.equal(normalizeCreatureActionText(follow.currentAction), "тримається сліду Лукан");

const nearlyCaughtUp = {
  ...learner,
  currentAction: formatNpcLearnerAction({ profileKey: "hunter", teacherId: hunterTeacher.id, progress: NPC_LEARNER_PROGRESS_CAP - 1, rest: 0 }, "дивиться, як працює Лукан"),
};
const capped = npcLearnerPlan({ learner: nearlyCaughtUp, teacher: hunterTeacher });
assert.equal(capped.kind, "observeTeacher");
assert.equal(capped.state.progress, NPC_LEARNER_PROGRESS_CAP, "learning gain is bounded by the teacher profile cap");
assert.equal(npcLearnerCaughtUp(capped.state), true);

const caughtUp = {
  ...learner,
  currentAction: formatNpcLearnerAction({ profileKey: "hunter", teacherId: hunterTeacher.id, progress: NPC_LEARNER_PROGRESS_CAP, rest: 0 }, "дивиться, як працює Лукан"),
};
const stopped = npcLearnerPlan({ learner: caughtUp, teacher: hunterTeacher, routeToTeacher: route });
assert.equal(stopped.kind, "restCaughtUp");
assert.equal(stopped.state.progress, NPC_LEARNER_PROGRESS_CAP);
assert.equal(stopped.state.rest, 1);
assert.equal(stopped.activity, "RESTING");

const readyToDecay = {
  ...learner,
  currentAction: formatNpcLearnerAction({ profileKey: "hunter", teacherId: hunterTeacher.id, progress: NPC_LEARNER_PROGRESS_CAP, rest: 3 }, "відпочиває"),
};
const decayed = npcLearnerPlan({ learner: readyToDecay, teacher: hunterTeacher });
assert.equal(decayed.kind, "decayReset");
assert.equal(decayed.state.progress, 4);
assert.equal(decayed.state.rest, 0);
assert.equal(npcLearnerCaughtUp(decayed.state), false, "decay/reset hook lets the loop repeat later");

const noTeacher = npcLearnerPlan({ learner, teacher: null });
assert.equal(noTeacher.kind, "noTeacher");
assert.equal(noTeacher.state.teacherId, null);

for (const plan of [herbalistObserve, hunterObserve, follow, stopped, decayed, noTeacher]) {
  const serialized = JSON.stringify(plan);
  assert.equal(serialized.includes("playerId"), false, "NPC learner loop should not grant player reward state");
  assert.equal(serialized.includes("reward"), false, "NPC learner loop should not expose reward fields");
  assert.equal(normalizeCreatureActionText(plan.currentAction).includes("progress="), false, "public action text should hide technical progress");
}

console.log("NPC learner loop helpers OK");
