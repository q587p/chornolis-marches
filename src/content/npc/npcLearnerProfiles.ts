export type NpcLearnerTeacherProfileContent = {
  key: string;
  skillKey: string;
  contextKey: string;
  speciesKeys: readonly string[];
  professionKeys: readonly string[];
  relevantActivity: readonly string[];
  relevantActionWords: readonly string[];
  visibleFallbackName: string;
  noTeacherAction: string;
  restAction: string;
  decayAction: string;
};

export const NPC_LEARNER_TEACHER_PROFILE_CONTENT = [
  {
    key: "herbalist",
    skillKey: "gathering",
    contextKey: "resource:herbs",
    speciesKeys: ["herbalist"],
    professionKeys: ["znakhar", "travnytsia"],
    relevantActivity: ["GATHERING", "LOOKING"],
    relevantActionWords: ["збира", "трав", "кор", "суш"],
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
    visibleFallbackName: "мисливець",
    noTeacherAction: "прислухається, чи не працює десь майстер",
    restAction: "відпочиває після довгого придивляння до слідів",
    decayAction: "відпочиває й перебирає в пам'яті мисливські прикмети",
  },
] as const satisfies readonly NpcLearnerTeacherProfileContent[];

export function npcLearnerFollowTeacherAction(teacherName: string) {
  return `тримається сліду ${teacherName}`;
}

export function npcLearnerObserveTeacherAction(teacherName: string) {
  return `дивиться, як працює ${teacherName}`;
}
