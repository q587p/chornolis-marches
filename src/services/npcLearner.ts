import { Direction } from "@prisma/client";
import { prisma } from "../db";
import { actionDurationMs, enqueueCreatureAction, movementDurationMs } from "./actionQueue";
import { findLocationRoute, type RouteStep } from "./routeFinding";
import { learningLevelForTotalProgress } from "./learning";

export const NPC_LEARNER_PROFESSION_KEY = "profession_learner";
export const NPC_LEARNER_LOOP_MARKER = "npc_learner:profession:v1";
export const NPC_LEARNER_DEFAULT_PROFILE_KEY = "any";
export const NPC_LEARNER_PROGRESS_CAP = 8;
export const NPC_LEARNER_TEACHER_LEVEL = 2;
export const NPC_LEARNER_DECAY_REST_TICKS = 4;
export const NPC_LEARNER_DECAY_AMOUNT = 4;

const LEARNER_ROUTE_MAX_DEPTH = 10;

type NpcLearnerTeacherProfile = {
  key: string;
  skillKey: string;
  contextKey: string;
  speciesKeys: readonly string[];
  professionKeys: readonly string[];
  relevantActivity: readonly string[];
  relevantActionWords: readonly string[];
  teacherLevel: number;
  visibleFallbackName: string;
  noTeacherAction: string;
  restAction: string;
  decayAction: string;
};

export const NPC_LEARNER_TEACHER_PROFILES = [
  {
    key: "herbalist",
    skillKey: "gathering",
    contextKey: "resource:herbs",
    speciesKeys: ["herbalist"],
    professionKeys: ["znakhar", "travnytsia"],
    relevantActivity: ["GATHERING", "LOOKING"],
    relevantActionWords: ["збира", "трав", "кор", "суш"],
    teacherLevel: NPC_LEARNER_TEACHER_LEVEL,
    visibleFallbackName: "травник",
    noTeacherAction: "прислухається, чи не працює десь майстер",
    restAction: "відпочиває після довгого придивляння до трав",
    decayAction: "відпочиває й перебирає в пам'яті трав'яні прикмети",
  },
  {
    key: "hunter",
    skillKey: "tracking",
    contextKey: "profession:hunter",
    speciesKeys: ["hunter"],
    professionKeys: ["hunter"],
    relevantActivity: ["MOVING", "LOOKING", "FIGHTING"],
    relevantActionWords: ["слід", "здобич", "полю", "гризун", "зайц", "миша", "миші", "мислив"],
    teacherLevel: NPC_LEARNER_TEACHER_LEVEL,
    visibleFallbackName: "мисливець",
    noTeacherAction: "прислухається, чи не працює десь майстер",
    restAction: "відпочиває після довгого придивляння до слідів",
    decayAction: "відпочиває й перебирає в пам'яті мисливські прикмети",
  },
] as const satisfies readonly NpcLearnerTeacherProfile[];

const TEACHER_SPECIES_KEYS = [...new Set(NPC_LEARNER_TEACHER_PROFILES.flatMap((profile) => profile.speciesKeys))];
const TEACHER_PROFESSION_KEYS = [...new Set(NPC_LEARNER_TEACHER_PROFILES.flatMap((profile) => profile.professionKeys))];

export type NpcLearnerState = {
  profileKey: string;
  teacherId: number | null;
  progress: number;
  rest: number;
};

export type NpcLearnerPlan =
  | { kind: "ineligible" }
  | { kind: "noTeacher"; activity: "LOOKING"; currentAction: string; state: NpcLearnerState }
  | { kind: "followTeacher"; activity: "MOVING"; currentAction: string; route: RouteStep[]; state: NpcLearnerState }
  | { kind: "observeTeacher"; activity: "LOOKING"; currentAction: string; state: NpcLearnerState; amount: number }
  | { kind: "restCaughtUp"; activity: "RESTING"; currentAction: string; state: NpcLearnerState }
  | { kind: "decayReset"; activity: "RESTING"; currentAction: string; state: NpcLearnerState };

export function isNpcLearnerCreature(creature: { professionKey?: string | null; currentAction?: string | null }) {
  return creature.professionKey === NPC_LEARNER_PROFESSION_KEY || Boolean(creature.currentAction?.includes(NPC_LEARNER_LOOP_MARKER));
}

function boundedNumber(value: unknown, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

export function parseNpcLearnerState(currentAction: string | null | undefined): NpcLearnerState {
  if (!currentAction?.includes(NPC_LEARNER_LOOP_MARKER)) {
    return { profileKey: NPC_LEARNER_DEFAULT_PROFILE_KEY, teacherId: null, progress: 0, rest: 0 };
  }

  const profileKey = currentAction.match(/(?:^|;)profile=([A-Za-z0-9_-]+)/u)?.[1] ?? NPC_LEARNER_DEFAULT_PROFILE_KEY;
  const teacherRaw = currentAction.match(/(?:^|;)teacher=(none|\d+)/u)?.[1];
  const teacherId = teacherRaw && teacherRaw !== "none" ? Number(teacherRaw) : null;
  return {
    profileKey,
    teacherId: Number.isSafeInteger(teacherId) ? teacherId : null,
    progress: boundedNumber(currentAction.match(/(?:^|;)progress=(\d+)/u)?.[1], 0, NPC_LEARNER_PROGRESS_CAP),
    rest: boundedNumber(currentAction.match(/(?:^|;)rest=(\d+)/u)?.[1], 0, NPC_LEARNER_DECAY_REST_TICKS),
  };
}

export function formatNpcLearnerAction(state: NpcLearnerState, visibleAction: string) {
  const profile = state.profileKey || NPC_LEARNER_DEFAULT_PROFILE_KEY;
  const teacher = state.teacherId ?? "none";
  const progress = boundedNumber(state.progress, 0, NPC_LEARNER_PROGRESS_CAP);
  const rest = boundedNumber(state.rest, 0, NPC_LEARNER_DECAY_REST_TICKS);
  return `${NPC_LEARNER_LOOP_MARKER};profile=${profile};teacher=${teacher};progress=${progress};rest=${rest}; ${visibleAction}`;
}

export function stripNpcLearnerActionMarker(action: string) {
  return action.replace(new RegExp(`^${NPC_LEARNER_LOOP_MARKER};profile=[A-Za-z0-9_-]+;teacher=(?:none|\\d+);progress=\\d+;rest=\\d+;\\s*`, "u"), "");
}

export function npcLearnerLevel(state: NpcLearnerState) {
  return learningLevelForTotalProgress(state.progress);
}

export function npcLearnerCaughtUp(state: NpcLearnerState, teacherLevel = NPC_LEARNER_TEACHER_LEVEL) {
  return npcLearnerLevel(state) >= teacherLevel || state.progress >= NPC_LEARNER_PROGRESS_CAP;
}

export function npcLearnerTeacherProfileForCreature(creature: {
  professionKey?: string | null;
  species?: { key?: string | null } | null;
}, profileKey = NPC_LEARNER_DEFAULT_PROFILE_KEY) {
  return NPC_LEARNER_TEACHER_PROFILES.find((profile) =>
    (profileKey === NPC_LEARNER_DEFAULT_PROFILE_KEY || profile.key === profileKey)
    && (profile.speciesKeys as readonly string[]).includes(creature.species?.key ?? "")
    && (profile.professionKeys as readonly string[]).includes(creature.professionKey ?? "")
  ) ?? null;
}

export function isNpcLearnerTeacher(creature: {
  id?: number;
  professionKey?: string | null;
  species?: { key?: string | null } | null;
}, learnerId?: number, profileKey = NPC_LEARNER_DEFAULT_PROFILE_KEY) {
  if (learnerId && creature.id === learnerId) return false;
  return Boolean(npcLearnerTeacherProfileForCreature(creature, profileKey));
}

function visibleTeacherName(teacher: { name?: string | null; professionName?: string | null }, profile: NpcLearnerTeacherProfile) {
  return teacher.name ?? teacher.professionName ?? profile.visibleFallbackName;
}

function teacherActionIsRelevant(teacher: { activity?: string | null; currentAction?: string | null }, profile: NpcLearnerTeacherProfile) {
  const action = String(teacher.currentAction ?? "").toLocaleLowerCase("uk-UA");
  return (profile.relevantActivity as readonly string[]).includes(teacher.activity ?? "")
    || profile.relevantActionWords.some((word) => action.includes(word));
}

export function npcLearnerPlan(input: {
  learner: {
    id: number;
    locationId: number;
    currentAction?: string | null;
    professionKey?: string | null;
  };
  teacher?: {
    id: number;
    name?: string | null;
    professionName?: string | null;
    locationId: number;
    activity?: string | null;
    currentAction?: string | null;
    professionKey?: string | null;
    species?: { key?: string | null } | null;
  } | null;
  routeToTeacher?: RouteStep[] | null;
}): NpcLearnerPlan {
  if (!isNpcLearnerCreature(input.learner)) return { kind: "ineligible" };

  const current = parseNpcLearnerState(input.learner.currentAction);
  const currentProfile = NPC_LEARNER_TEACHER_PROFILES.find((profile) => profile.key === current.profileKey) ?? NPC_LEARNER_TEACHER_PROFILES[0];
  if (npcLearnerCaughtUp(current, currentProfile.teacherLevel)) {
    const nextRest = current.rest + 1;
    if (nextRest >= NPC_LEARNER_DECAY_REST_TICKS) {
      const state = {
        profileKey: current.profileKey,
        teacherId: current.teacherId,
        progress: Math.max(0, current.progress - NPC_LEARNER_DECAY_AMOUNT),
        rest: 0,
      };
      return {
        kind: "decayReset",
        activity: "RESTING",
        state,
        currentAction: formatNpcLearnerAction(state, currentProfile.decayAction),
      };
    }

    const state = { ...current, rest: nextRest };
    return {
      kind: "restCaughtUp",
      activity: "RESTING",
      state,
      currentAction: formatNpcLearnerAction(state, currentProfile.restAction),
    };
  }

  const teacher = input.teacher;
  const teacherProfile = teacher ? npcLearnerTeacherProfileForCreature(teacher, current.profileKey) : null;
  if (!teacher || !teacherProfile || !isNpcLearnerTeacher(teacher, input.learner.id, current.profileKey)) {
    const state = { profileKey: current.profileKey, teacherId: null, progress: current.progress, rest: 0 };
    return {
      kind: "noTeacher",
      activity: "LOOKING",
      state,
      currentAction: formatNpcLearnerAction(state, currentProfile.noTeacherAction),
    };
  }

  const teacherId = teacher.id;
  const profileKey = teacherProfile.key;
  if (teacher.locationId !== input.learner.locationId) {
    const route = input.routeToTeacher ?? [];
    if (route.length > 0) {
      const state = { profileKey, teacherId, progress: current.progress, rest: 0 };
      return {
        kind: "followTeacher",
        activity: "MOVING",
        route,
        state,
        currentAction: formatNpcLearnerAction(state, `тримається сліду ${visibleTeacherName(teacher, teacherProfile)}`),
      };
    }
  }

  const amount = teacherActionIsRelevant(teacher, teacherProfile) ? 2 : 1;
  const state = {
    profileKey,
    teacherId,
    progress: Math.min(NPC_LEARNER_PROGRESS_CAP, current.progress + amount),
    rest: 0,
  };
  return {
    kind: "observeTeacher",
    activity: "LOOKING",
    state,
    amount,
    currentAction: formatNpcLearnerAction(state, `дивиться, як працює ${visibleTeacherName(teacher, teacherProfile)}`),
  };
}

async function findNearestNpcLearnerTeacher(learner: { id: number; locationId: number; currentAction?: string | null }) {
  const state = parseNpcLearnerState(learner.currentAction);
  const teachers = await prisma.creature.findMany({
    where: {
      id: { not: learner.id },
      isAlive: true,
      isGone: false,
      isHidden: false,
      species: { key: { in: TEACHER_SPECIES_KEYS } },
      professionKey: { in: TEACHER_PROFESSION_KEYS },
    },
    include: { species: true },
    orderBy: [{ locationId: "asc" }, { id: "asc" }],
    take: 12,
  });
  const compatibleTeachers = teachers.filter((teacher) => isNpcLearnerTeacher(teacher, learner.id, state.profileKey));

  const sameLocation = compatibleTeachers.find((teacher) => teacher.locationId === learner.locationId);
  if (sameLocation) return { teacher: sameLocation, route: null };

  for (const teacher of compatibleTeachers) {
    const route = await findLocationRoute(learner.locationId, teacher.locationId, { maxDepth: LEARNER_ROUTE_MAX_DEPTH });
    if (route?.length) return { teacher, route };
  }

  return { teacher: compatibleTeachers[0] ?? null, route: null };
}

export async function tickNpcLearner(learner: any) {
  if (!isNpcLearnerCreature(learner)) return null;

  const { teacher, route } = await findNearestNpcLearnerTeacher(learner);
  const plan = npcLearnerPlan({ learner, teacher, routeToTeacher: route });

  if (plan.kind === "ineligible") return null;
  if (plan.kind === "followTeacher") {
    const step = plan.route[0];
    await prisma.creature.updateMany({
      where: { id: learner.id, isAlive: true, isGone: false },
      data: { activity: plan.activity, currentAction: plan.currentAction },
    });
    await enqueueCreatureAction({
      creatureId: learner.id,
      type: "MOVE",
      payload: { direction: step.direction as Direction, reason: plan.currentAction },
      durationMs: movementDurationMs(step.travelCost, learner.stamina),
    });
    return "queuedMove";
  }

  if (plan.kind === "observeTeacher") {
    await prisma.creature.updateMany({
      where: { id: learner.id, isAlive: true, isGone: false },
      data: { activity: plan.activity, currentAction: plan.currentAction },
    });
    await enqueueCreatureAction({
      creatureId: learner.id,
      type: "LOOK",
      payload: { reason: plan.currentAction },
      durationMs: actionDurationMs("LOOK", learner.stamina),
    });
    return "queuedLook";
  }

  await prisma.creature.updateMany({
    where: { id: learner.id, isAlive: true, isGone: false },
    data: { activity: plan.activity, currentAction: plan.currentAction },
  });
  return "stoodDown";
}
