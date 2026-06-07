import { InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { withSlowLog } from "../utils/slowLog";
import { getPlayerFollowIntent, setPlayerFollowIntent } from "./following";
import { creatureForms } from "./grammar";
import { learningSkillDisplayName, observedActorSkillLevel } from "./learning";
import { createWorldEventMarker, findRecentWorldEventMarker } from "./worldEventMarkers";

export const MENTORSHIP_STATUS_OFFERED = "OFFERED";
export const MENTORSHIP_STATUS_ACTIVE = "ACTIVE";
export const MENTORSHIP_STATUS_DECLINED = "DECLINED";
export const MENTORSHIP_STATUS_ENDED = "ENDED";
export const MENTORSHIP_OBSERVATION_EVENT_TITLE = "Mentorship observation";
export const MENTORSHIP_LESSON_FEEDBACK_EVENT_TITLE = "Mentorship lesson feedback";
export const MENTORSHIP_PRACTICE_PROMPT_EVENT_TITLE = "Mentorship practice prompt";
export const MENTORSHIP_LESSON_FEEDBACK_MARKER_KEY = "mentorship_lesson_feedback";
export const MENTORSHIP_PRACTICE_PROMPT_MARKER_KEY = "mentorship_practice_prompt";
export const TRACKING_MENTORSHIP_FOLLOWED_MOVEMENT_CONTEXT = "mentorship_followed_movement";
export const MENTORSHIP_OFFER_COOLDOWN_MS = Number(process.env.MENTORSHIP_OFFER_COOLDOWN_MS || 10 * 60_000);
export const MENTORSHIP_LESSON_FEEDBACK_COOLDOWN_MS = Number(process.env.MENTORSHIP_LESSON_FEEDBACK_COOLDOWN_MS || 10 * 60_000);
export const MENTORSHIP_PRACTICE_PROMPT_COOLDOWN_MS = Number(process.env.MENTORSHIP_PRACTICE_PROMPT_COOLDOWN_MS || 15 * 60_000);

const APOSTROPHES = /[ʼ’`´]/g;
const MENTORSHIP_ANSWER_PUNCTUATION = /[!?.,;:]+/g;

type MentorshipCreatureLike = {
  id?: number;
  name?: string | null;
  professionKey?: string | null;
  professionName?: string | null;
  isAlive?: boolean | null;
  isGone?: boolean | null;
  isHidden?: boolean | null;
  species?: { kind?: string | null; name?: string | null } | null;
};

export type MentorshipAnswerKind = "accept" | "decline" | "unclear";

type MentorshipDb = {
  playerMentorship: any;
  worldEvent?: any;
  worldEventMarker?: any;
  resourceNode?: any;
};

type MentorshipLessonInput = {
  playerId: number;
  mentorCreatureId: number;
  skillKey: string;
  contextKey: string;
  locationId?: number | null;
  mentorName?: string | null;
  now?: Date;
};

type MentorshipPracticePromptInput = Pick<MentorshipLessonInput, "playerId" | "mentorCreatureId" | "skillKey" | "contextKey" | "locationId" | "now">;
type MentorshipPracticePromptAction = { action: "gather"; resourceKey: "herbs" | "berries" | "mushrooms" };

const MENTORSHIP_GATHER_PROMPT_RESOURCES = new Set(["herbs", "berries", "mushrooms"]);

function normalizeMentorshipAnswerInput(text: string) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(MENTORSHIP_ANSWER_PUNCTUATION, "")
    .replace(/\s+/g, " ");
}

export function mentorshipSkillForCreature(creature: Pick<MentorshipCreatureLike, "professionKey" | "professionName" | "species">) {
  const profession = `${creature.professionKey ?? ""} ${creature.professionName ?? ""}`.toLowerCase();
  if (/(herbalist|znakhar|travnytsia|трав|знах)/u.test(profession)) return "gathering";
  if (/(hunter|мислив)/u.test(profession)) return "tracking";
  return null;
}

export function canCreatureOfferMentorship(creature: MentorshipCreatureLike, skillKey = mentorshipSkillForCreature(creature)) {
  if (!skillKey) return false;
  if (creature.isAlive === false || creature.isGone || creature.isHidden) return false;
  if (creature.species?.kind === "ANIMAL") return false;
  return true;
}

export function mentorCanTeach(playerLevel: number, mentorLevel: number) {
  return mentorLevel >= playerLevel + 1;
}

export function parseMentorshipAnswer(text: string): MentorshipAnswerKind {
  const normalized = normalizeMentorshipAnswerInput(text);
  if ([
    "так",
    "ага",
    "хочу",
    "звісно",
    "звичайно",
    "добре",
    "давай",
    "так хочу",
    "я хочу",
    "навчи",
    "навчи мене",
    "повчи мене",
    "yes",
    "y",
    "ok",
  ].includes(normalized)) return "accept";
  if ([
    "ні",
    "не",
    "не зараз",
    "потім",
    "ні дякую",
    "не хочу",
    "no",
    "n",
    "later",
  ].includes(normalized)) return "decline";
  return "unclear";
}

export function mentorshipOfferText(creature: MentorshipCreatureLike, skillKey: string) {
  const name = creature.name?.trim() || creature.species?.name || "місцевий";
  if (skillKey === "tracking") {
    return `${name} озирається на ваш крок: “Якщо йдеш за мною, дивись не на мене. Дивись, де трава не встигла випростатись. Учитися хочеш?”`;
  }
  return `${name} помічає, що ви тримаєтесь її сліду, і стишує крок: “Хочеш повчитися, як не рвати землю дарма?”`;
}

export function mentorshipOfferKeyboard(id: number) {
  return new InlineKeyboard()
    .text("Так, хочу", `mentorship:accept:${id}`)
    .text("Не зараз", `mentorship:decline:${id}`);
}

export function mentorshipNotBetterText(creature: MentorshipCreatureLike) {
  const name = creature.name?.trim() || creature.species?.name || "місцевий";
  return `${name} хитає головою: “Ти вже тримаєш цей слід не гірше за мене. Можеш іти поруч, але вчитись тут буде мало з чого.”`;
}

function mentorshipActiveText(creature: MentorshipCreatureLike, skillKey: string) {
  const name = creature.name?.trim() || creature.species?.name || "місцевий";
  return `Наука вже триває: ${name} — ${learningSkillDisplayName(skillKey)}. Тримайте слід уважно; це не гурт і не автопохід.`;
}

function activeOrOfferedStatuses() {
  return [MENTORSHIP_STATUS_OFFERED, MENTORSHIP_STATUS_ACTIVE];
}

function recentPromptStillCoolingDown(record: { lastPromptAt: Date | null; offeredAt?: Date | null; createdAt: Date }) {
  const lastPrompt = record.lastPromptAt ?? record.offeredAt ?? record.createdAt;
  return MENTORSHIP_OFFER_COOLDOWN_MS > 0 && Date.now() - lastPrompt.getTime() < MENTORSHIP_OFFER_COOLDOWN_MS;
}

export async function mentorSkillComparison(playerId: number, mentorCreatureId: number, skillKey: string) {
  const [playerLevel, mentorLevel] = await Promise.all([
    observedActorSkillLevel({ actorType: "PLAYER", playerId }, skillKey),
    observedActorSkillLevel({ actorType: "CREATURE", creatureId: mentorCreatureId }, skillKey),
  ]);
  return {
    playerLevel,
    mentorLevel,
    canTeach: mentorCanTeach(playerLevel, mentorLevel),
  };
}

export async function activeMentorshipForPlayer(playerId: number, db: MentorshipDb = prisma) {
  return db.playerMentorship.findFirst({
    where: { playerId, status: MENTORSHIP_STATUS_ACTIVE },
    orderBy: { updatedAt: "desc" },
    include: { mentorCreature: { include: { species: true } } },
  });
}

export async function activeMentorshipForPlayerAndMentor(input: {
  playerId: number;
  mentorCreatureId: number;
  skillKey?: string | null;
}, db: MentorshipDb = prisma) {
  return db.playerMentorship.findFirst({
    where: {
      playerId: input.playerId,
      mentorCreatureId: input.mentorCreatureId,
      status: MENTORSHIP_STATUS_ACTIVE,
      ...(input.skillKey ? { skillKey: input.skillKey } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { mentorCreature: { include: { species: true } } },
  });
}

export function mentorshipObservationContext(input: {
  sourceDescription?: string | null;
  skillKey: string;
  contextKey?: string | null;
}) {
  const mentorCreatureId = input.sourceDescription?.match(/(?:^|;\s*)actorCreature=(\d+)/u)?.[1];
  if (!mentorCreatureId || !input.contextKey) return null;
  return {
    mentorCreatureId: Number(mentorCreatureId),
    skillKey: input.skillKey,
    contextKey: input.contextKey,
  };
}

export async function mentorshipObservationBonusForSource(input: {
  playerId: number;
  sourceEventId: number;
  sourceDescription?: string | null;
  skillKey: string;
  contextKey?: string | null;
}, db: MentorshipDb = prisma) {
  const context = mentorshipObservationContext(input);
  if (!context || !Number.isFinite(context.mentorCreatureId)) {
    return { applies: false as const, amount: 1 };
  }
  const mentorship = await activeMentorshipForPlayerAndMentor({
    playerId: input.playerId,
    mentorCreatureId: context.mentorCreatureId,
    skillKey: context.skillKey,
  }, db);
  if (!mentorship) return { applies: false as const, amount: 1 };
  return {
    applies: true as const,
    amount: 2,
    mentorship,
    mentorCreatureId: context.mentorCreatureId,
    skillKey: context.skillKey,
    contextKey: context.contextKey,
    description: `player=${input.playerId}; mentorCreature=${context.mentorCreatureId}; source=${input.sourceEventId}; skillKey=${context.skillKey}; contextKey=${context.contextKey}; amount=2`,
  };
}

export function mentorshipTrackingRouteMemoryContext(input: {
  targetType?: string | null;
  targetId?: number | null;
  source?: string | null;
  visibility?: string | null;
}) {
  if (input.targetType !== "CREATURE") return null;
  if (!input.targetId) return null;
  if (input.source !== "visible_move") return null;
  if (input.visibility !== "clear") return null;
  return {
    mentorCreatureId: input.targetId,
    skillKey: "tracking",
    contextKey: TRACKING_MENTORSHIP_FOLLOWED_MOVEMENT_CONTEXT,
  };
}

export async function mentorshipTrackingObservationLearningInput(input: {
  playerId: number;
  sourceEventId?: number | null;
  targetType?: string | null;
  targetId?: number | null;
  source?: string | null;
  visibility?: string | null;
}, db: MentorshipDb = prisma) {
  const context = mentorshipTrackingRouteMemoryContext(input);
  if (!context) return null;
  const mentorship = await activeMentorshipForPlayerAndMentor({
    playerId: input.playerId,
    mentorCreatureId: context.mentorCreatureId,
    skillKey: context.skillKey,
  }, db);
  if (!mentorship) return null;
  return {
    playerId: input.playerId,
    skillKey: "tracking",
    sourceKey: "observation",
    contextKey: context.contextKey,
    amount: 1,
    ...(input.sourceEventId ? { lastSourceEventId: input.sourceEventId } : {}),
  };
}

export function mentorshipLessonText(input: Pick<MentorshipLessonInput, "skillKey" | "mentorName">) {
  const mentorName = input.mentorName?.trim();
  if (input.skillKey === "tracking") {
    return mentorName
      ? `${mentorName} не дивиться на слід довше за вас. Погляд лягає раніше — туди, де земля ще не встигла замовкнути.`
      : "Ви не просто бачите, куди рушив мисливець; починаєте вловлювати, чому трава видала цей крок.";
  }
  return mentorName
    ? `${mentorName} не пояснює довго. Рука просто показує, де стебло саме відпускає землю.`
    : "Ви не просто бачите, як працює наставник; ви починаєте ловити, чому рука не рве зайвого.";
}

export function mentorshipLessonRecentLine(input: Pick<MentorshipLessonInput, "skillKey" | "contextKey">) {
  if (input.skillKey === "tracking") {
    return "Останнє, що зачепилося: трава видала крок раніше, ніж ви побачили слід.";
  }
  return "Останнє, що зачепилося: рука наставника не рве зайвого.";
}

export function mentorshipLessonFeedbackDescription(input: Pick<MentorshipLessonInput, "playerId" | "mentorCreatureId" | "skillKey" | "contextKey">) {
  return `player=${input.playerId}; mentorCreature=${input.mentorCreatureId}; skillKey=${input.skillKey}; contextKey=${input.contextKey}`;
}

export function mentorshipLessonFeedbackMarkerContext(input: Pick<MentorshipLessonInput, "skillKey" | "contextKey">) {
  return `${input.skillKey}:${input.contextKey}`;
}

export function mentorshipPracticePromptAction(input: Pick<MentorshipPracticePromptInput, "skillKey" | "contextKey">) {
  if (input.skillKey !== "gathering") return null;
  const resourceKey = input.contextKey.match(/^resource:(herbs|berries|mushrooms)$/u)?.[1] as MentorshipPracticePromptAction["resourceKey"] | undefined;
  if (!resourceKey || !MENTORSHIP_GATHER_PROMPT_RESOURCES.has(resourceKey)) return null;
  return { action: "gather" as const, resourceKey };
}

export function mentorshipPracticePromptDescription(input: Pick<MentorshipPracticePromptInput, "playerId" | "mentorCreatureId" | "skillKey" | "contextKey"> & { action: string }) {
  return `player=${input.playerId}; mentorCreature=${input.mentorCreatureId}; skillKey=${input.skillKey}; contextKey=${input.contextKey}; action=${input.action}`;
}

export function mentorshipPracticePromptMarkerContext(input: Pick<MentorshipPracticePromptInput, "skillKey" | "contextKey"> & { action: string }) {
  return `${input.skillKey}:${input.contextKey}:${input.action}`;
}

export function mentorshipPracticePromptText(input: { mentorName?: string | null; skillKey: string; contextKey: string; blocked?: "no-resource" | null }) {
  const mentorName = input.mentorName?.trim() || "Наставник";
  if (input.blocked === "no-resource") {
    return `${mentorName} дивиться на порожнє місце: “Тут уже нічого вчити рукою. Ходімо далі.”`;
  }
  if (input.skillKey === "gathering") {
    return `${mentorName} відступає від стебел: “Тепер ти. Не поспішай — земля сама покаже, де відпустити.”`;
  }
  return `${mentorName} відступає на крок: “Тепер спробуй сам.”`;
}

export function mentorshipPracticePromptKeyboard(input: MentorshipPracticePromptAction) {
  if (input.action === "gather") {
    return new InlineKeyboard().text("Спробувати зібрати", `mentorship:practice:gather:${input.resourceKey}`);
  }
  return undefined;
}

function parseMentorshipLessonFeedbackDescription(description?: string | null) {
  if (!description) return null;
  const playerId = Number(description.match(/(?:^|;\s*)player=(\d+)/u)?.[1]);
  const mentorCreatureId = Number(description.match(/(?:^|;\s*)mentorCreature=(\d+)/u)?.[1]);
  const skillKey = description.match(/(?:^|;\s*)skillKey=([^;]+)/u)?.[1]?.trim();
  const contextKey = description.match(/(?:^|;\s*)contextKey=([^;]+)/u)?.[1]?.trim();
  if (!Number.isSafeInteger(playerId) || !Number.isSafeInteger(mentorCreatureId) || !skillKey || !contextKey) return null;
  return { playerId, mentorCreatureId, skillKey, contextKey };
}

function parseMentorshipPracticePromptDescription(description?: string | null) {
  if (!description) return null;
  const playerId = Number(description.match(/(?:^|;\s*)player=(\d+)/u)?.[1]);
  const mentorCreatureId = Number(description.match(/(?:^|;\s*)mentorCreature=(\d+)/u)?.[1]);
  const skillKey = description.match(/(?:^|;\s*)skillKey=([^;]+)/u)?.[1]?.trim();
  const contextKey = description.match(/(?:^|;\s*)contextKey=([^;]+)/u)?.[1]?.trim();
  const action = description.match(/(?:^|;\s*)action=([^;]+)/u)?.[1]?.trim();
  if (!Number.isSafeInteger(playerId) || !Number.isSafeInteger(mentorCreatureId) || !skillKey || !contextKey || !action) return null;
  return { playerId, mentorCreatureId, skillKey, contextKey, action };
}

function mentorshipLessonFeedbackMatches(description: string | null | undefined, input: Pick<MentorshipLessonInput, "playerId" | "mentorCreatureId" | "skillKey" | "contextKey">) {
  const parsed = parseMentorshipLessonFeedbackDescription(description);
  return Boolean(parsed &&
    parsed.playerId === input.playerId &&
    parsed.mentorCreatureId === input.mentorCreatureId &&
    parsed.skillKey === input.skillKey &&
    parsed.contextKey === input.contextKey);
}

function mentorshipPracticePromptMatches(description: string | null | undefined, input: Pick<MentorshipPracticePromptInput, "playerId" | "mentorCreatureId" | "skillKey" | "contextKey"> & { action: string }) {
  const parsed = parseMentorshipPracticePromptDescription(description);
  return Boolean(parsed &&
    parsed.playerId === input.playerId &&
    parsed.mentorCreatureId === input.mentorCreatureId &&
    parsed.skillKey === input.skillKey &&
    parsed.contextKey === input.contextKey &&
    parsed.action === input.action);
}

async function recentMentorshipLessonFeedbackWorldEvent(input: Pick<MentorshipLessonInput, "playerId" | "mentorCreatureId" | "skillKey" | "contextKey"> & { now?: Date }, db: MentorshipDb = prisma) {
  if (!db.worldEvent || MENTORSHIP_LESSON_FEEDBACK_COOLDOWN_MS <= 0) return null;
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - MENTORSHIP_LESSON_FEEDBACK_COOLDOWN_MS);
  const events = await db.worldEvent.findMany({
    where: {
      type: "SYSTEM",
      title: MENTORSHIP_LESSON_FEEDBACK_EVENT_TITLE,
      playerId: input.playerId,
      createdAt: { gte: since },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 8,
  });
  return events.find((event: any) => mentorshipLessonFeedbackMatches(event.description, input)) ?? null;
}

export async function recentMentorshipLessonFeedback(input: Pick<MentorshipLessonInput, "playerId" | "mentorCreatureId" | "skillKey" | "contextKey"> & { now?: Date }, db: MentorshipDb = prisma) {
  if (MENTORSHIP_LESSON_FEEDBACK_COOLDOWN_MS <= 0) return null;
  const marker = await findRecentWorldEventMarker({
    markerKey: MENTORSHIP_LESSON_FEEDBACK_MARKER_KEY,
    scopeType: "PLAYER_MENTOR",
    playerId: input.playerId,
    creatureId: input.mentorCreatureId,
    contextKey: mentorshipLessonFeedbackMarkerContext(input),
    cooldownMs: MENTORSHIP_LESSON_FEEDBACK_COOLDOWN_MS,
    now: input.now,
  }, db as any);
  return marker ?? recentMentorshipLessonFeedbackWorldEvent(input, db);
}

export async function maybeRecordMentorshipLessonFeedback(input: MentorshipLessonInput, db: MentorshipDb = prisma) {
  if (!db.worldEvent) return { ok: false as const, reason: "missing-world-event" as const };
  const recent = await recentMentorshipLessonFeedback(input, db);
  if (recent) return { ok: false as const, reason: "cooldown" as const, event: recent };
  const description = mentorshipLessonFeedbackDescription(input);
  const event = await db.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: MENTORSHIP_LESSON_FEEDBACK_EVENT_TITLE,
      description,
      playerId: input.playerId,
      locationId: input.locationId ?? undefined,
      ...(input.now ? { createdAt: input.now } : {}),
    },
  });
  if (db.worldEventMarker) {
    await createWorldEventMarker({
      markerKey: MENTORSHIP_LESSON_FEEDBACK_MARKER_KEY,
      scopeType: "PLAYER_MENTOR",
      playerId: input.playerId,
      creatureId: input.mentorCreatureId,
      locationId: input.locationId,
      contextKey: mentorshipLessonFeedbackMarkerContext(input),
      worldEventId: event.id,
      ttlMs: MENTORSHIP_LESSON_FEEDBACK_COOLDOWN_MS,
      now: input.now,
      metadata: {
        skillKey: input.skillKey,
        contextKey: input.contextKey,
      },
    }, db as any);
  }
  return {
    ok: true as const,
    event,
    description,
    text: mentorshipLessonText(input),
  };
}

async function recentMentorshipPracticePromptWorldEvent(input: Pick<MentorshipPracticePromptInput, "playerId" | "mentorCreatureId" | "skillKey" | "contextKey"> & { action: string; now?: Date }, db: MentorshipDb = prisma) {
  if (!db.worldEvent || MENTORSHIP_PRACTICE_PROMPT_COOLDOWN_MS <= 0) return null;
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - MENTORSHIP_PRACTICE_PROMPT_COOLDOWN_MS);
  const events = await db.worldEvent.findMany({
    where: {
      type: "SYSTEM",
      title: MENTORSHIP_PRACTICE_PROMPT_EVENT_TITLE,
      playerId: input.playerId,
      createdAt: { gte: since },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 8,
  });
  return events.find((event: any) => mentorshipPracticePromptMatches(event.description, input)) ?? null;
}

export async function recentMentorshipPracticePrompt(input: Pick<MentorshipPracticePromptInput, "playerId" | "mentorCreatureId" | "skillKey" | "contextKey"> & { action: string; now?: Date }, db: MentorshipDb = prisma) {
  if (MENTORSHIP_PRACTICE_PROMPT_COOLDOWN_MS <= 0) return null;
  const marker = await findRecentWorldEventMarker({
    markerKey: MENTORSHIP_PRACTICE_PROMPT_MARKER_KEY,
    scopeType: "PLAYER_MENTOR",
    playerId: input.playerId,
    creatureId: input.mentorCreatureId,
    contextKey: mentorshipPracticePromptMarkerContext(input),
    cooldownMs: MENTORSHIP_PRACTICE_PROMPT_COOLDOWN_MS,
    now: input.now,
  }, db as any);
  return marker ?? recentMentorshipPracticePromptWorldEvent(input, db);
}

export async function maybeCreateMentorshipPracticePrompt(input: MentorshipPracticePromptInput, db: MentorshipDb = prisma) {
  if (!db.worldEvent) return { ok: false as const, reason: "missing-world-event" as const };
  const action = mentorshipPracticePromptAction(input);
  if (!action) return { ok: false as const, reason: "unsupported-context" as const };
  const mentorship = await activeMentorshipForPlayerAndMentor({
    playerId: input.playerId,
    mentorCreatureId: input.mentorCreatureId,
    skillKey: input.skillKey,
  }, db);
  if (!mentorship) return { ok: false as const, reason: "inactive-mentorship" as const };
  const mentorName = creatureForms(mentorship.mentorCreature).nominative;
  if (action.action === "gather" && input.locationId && db.resourceNode) {
    const available = await db.resourceNode.findFirst({
      where: {
        locationId: input.locationId,
        amount: { gt: 0 },
        resourceType: { key: action.resourceKey },
      },
      select: { id: true },
    });
    if (!available) {
      return {
        ok: false as const,
        reason: "no-resource" as const,
        text: mentorshipPracticePromptText({ mentorName, skillKey: input.skillKey, contextKey: input.contextKey, blocked: "no-resource" }),
      };
    }
  }
  const description = mentorshipPracticePromptDescription({ ...input, action: `${action.action}:${action.resourceKey}` });
  const recent = await recentMentorshipPracticePrompt({ ...input, action: `${action.action}:${action.resourceKey}` }, db);
  if (recent) return { ok: false as const, reason: "cooldown" as const, event: recent };
  const event = await db.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: MENTORSHIP_PRACTICE_PROMPT_EVENT_TITLE,
      description,
      playerId: input.playerId,
      locationId: input.locationId ?? undefined,
      ...(input.now ? { createdAt: input.now } : {}),
    },
  });
  if (db.worldEventMarker) {
    await createWorldEventMarker({
      markerKey: MENTORSHIP_PRACTICE_PROMPT_MARKER_KEY,
      scopeType: "PLAYER_MENTOR",
      playerId: input.playerId,
      creatureId: input.mentorCreatureId,
      locationId: input.locationId,
      contextKey: mentorshipPracticePromptMarkerContext({ ...input, action: `${action.action}:${action.resourceKey}` }),
      worldEventId: event.id,
      ttlMs: MENTORSHIP_PRACTICE_PROMPT_COOLDOWN_MS,
      now: input.now,
      metadata: {
        skillKey: input.skillKey,
        contextKey: input.contextKey,
        action: action.action,
        resourceKey: action.resourceKey,
      },
    }, db as any);
  }
  return {
    ok: true as const,
    event,
    description,
    text: mentorshipPracticePromptText({ mentorName, skillKey: input.skillKey, contextKey: input.contextKey }),
    keyboard: mentorshipPracticePromptKeyboard(action),
  };
}

export async function latestMentorshipLessonLine(input: { playerId: number; mentorCreatureId?: number | null; skillKey?: string | null }, db: MentorshipDb = prisma) {
  if (!db.worldEvent) return null;
  const events = await db.worldEvent.findMany({
    where: {
      type: "SYSTEM",
      title: MENTORSHIP_LESSON_FEEDBACK_EVENT_TITLE,
      playerId: input.playerId,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 5,
  });
  for (const event of events) {
    const parsed = parseMentorshipLessonFeedbackDescription(event.description);
    if (input.mentorCreatureId && parsed?.mentorCreatureId !== input.mentorCreatureId) continue;
    if (input.skillKey && parsed?.skillKey !== input.skillKey) continue;
    if (parsed) return mentorshipLessonRecentLine(parsed);
  }
  return null;
}

export async function latestMentorshipLessonLineForPlayer(playerId: number, db: MentorshipDb = prisma) {
  return latestMentorshipLessonLine({ playerId }, db);
}

export async function maybeOfferMentorshipAfterFollow(input: {
  playerId: number;
  mentorCreatureId: number;
}) {
  return withSlowLog("mentorship.offer", () => maybeOfferMentorshipAfterFollowInner(input));
}

async function maybeOfferMentorshipAfterFollowInner(input: {
  playerId: number;
  mentorCreatureId: number;
}) {
  const creature = await prisma.creature.findUnique({
    where: { id: input.mentorCreatureId },
    include: { species: true },
  });
  if (!creature) return { kind: "none" as const };
  const skillKey = mentorshipSkillForCreature(creature);
  if (!canCreatureOfferMentorship(creature, skillKey)) return { kind: "none" as const };

  const existing = await prisma.playerMentorship.findFirst({
    where: {
      playerId: input.playerId,
      mentorCreatureId: input.mentorCreatureId,
      skillKey: skillKey!,
      status: { in: [...activeOrOfferedStatuses(), MENTORSHIP_STATUS_DECLINED] },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (existing?.status === MENTORSHIP_STATUS_ACTIVE) {
    return { kind: "active" as const, text: mentorshipActiveText(creature, skillKey!), mentorship: existing };
  }
  if (existing?.status === MENTORSHIP_STATUS_OFFERED) {
    if (recentPromptStillCoolingDown(existing)) {
      return { kind: "cooldown" as const, mentorship: existing };
    }
    const refreshed = await prisma.playerMentorship.update({
      where: { id: existing.id },
      data: { lastPromptAt: new Date() },
    });
    return { kind: "offer" as const, text: mentorshipOfferText(creature, skillKey!), mentorship: refreshed };
  }
  if (existing?.status === MENTORSHIP_STATUS_DECLINED && recentPromptStillCoolingDown(existing)) {
    return { kind: "cooldown" as const, mentorship: existing };
  }

  const comparison = await mentorSkillComparison(input.playerId, input.mentorCreatureId, skillKey!);
  if (!comparison.canTeach) {
    const data = {
      playerId: input.playerId,
      mentorCreatureId: input.mentorCreatureId,
      skillKey: skillKey!,
      status: MENTORSHIP_STATUS_DECLINED,
      declinedAt: new Date(),
      lastPromptAt: new Date(),
    };
    const mentorship = existing
      ? await prisma.playerMentorship.update({ where: { id: existing.id }, data })
      : await prisma.playerMentorship.create({ data });
    return { kind: "not-better" as const, text: mentorshipNotBetterText(creature), mentorship, comparison };
  }

  const mentorship = await prisma.playerMentorship.create({
    data: {
      playerId: input.playerId,
      mentorCreatureId: input.mentorCreatureId,
      skillKey: skillKey!,
      status: MENTORSHIP_STATUS_OFFERED,
      lastPromptAt: new Date(),
    },
  });
  return { kind: "offer" as const, text: mentorshipOfferText(creature, skillKey!), mentorship, comparison };
}

export async function acceptMentorship(playerId: number, mentorshipId: number) {
  const mentorship = await prisma.playerMentorship.findFirst({
    where: { id: mentorshipId, playerId },
    include: { mentorCreature: { include: { species: true } } },
  });
  if (!mentorship) return { ok: false as const, text: "Цю науку вже не знайти." };
  if (mentorship.status === MENTORSHIP_STATUS_DECLINED || mentorship.status === MENTORSHIP_STATUS_ENDED) {
    return { ok: false as const, text: "Ця наука вже відпущена. Якщо треба, знову візьміть слід наставника." };
  }

  const [player, previousIntent] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId } }),
    getPlayerFollowIntent(playerId),
  ]);
  if (!player?.currentLocationId) return { ok: false as const, text: "Спершу треба увійти у світ." };

  const forms = creatureForms(mentorship.mentorCreature);
  const updated = await prisma.playerMentorship.update({
    where: { id: mentorship.id },
    data: { status: MENTORSHIP_STATUS_ACTIVE, acceptedAt: new Date() },
  });
  await setPlayerFollowIntent(playerId, {
    type: "creature",
    id: mentorship.mentorCreatureId,
    label: forms.nominative,
    forms,
  }, player.currentLocationId);

  const assistLine = previousIntent?.assistEnabled
    ? "\nАвтокрок уже готовий підхопити видимий крок, але приховані переходи він не повторить."
    : "\nАвтокрок можна ввімкнути окремо: /follow_assist on.";
  return {
    ok: true as const,
    mentorship: updated,
    text: `Ви стаєте до науки ${forms.genitive}. Тримайте її слід уважно; це домовленість дивитися й іти поруч, не гурт і не наказ.${assistLine}`,
  };
}

export async function declineMentorship(playerId: number, mentorshipId: number) {
  const mentorship = await prisma.playerMentorship.findFirst({
    where: { id: mentorshipId, playerId },
    include: { mentorCreature: { include: { species: true } } },
  });
  if (!mentorship) return { ok: false as const, text: "Цю науку вже не знайти." };
  if (mentorship.status !== MENTORSHIP_STATUS_OFFERED) return { ok: false as const, text: "Ця відповідь уже не потрібна." };
  const updated = await prisma.playerMentorship.update({
    where: { id: mentorship.id },
    data: { status: MENTORSHIP_STATUS_DECLINED, declinedAt: new Date() },
  });
  const name = mentorship.mentorCreature.name?.trim() || mentorship.mentorCreature.species.name;
  return {
    ok: true as const,
    mentorship: updated,
    text: `Ви не стаєте до науки зараз. ${name} киває: “Тоді просто не заважай землі говорити.”`,
  };
}

export async function respondToMentorshipOffer(playerId: number, text: string) {
  const pending = await prisma.playerMentorship.findFirst({
    where: { playerId, status: MENTORSHIP_STATUS_OFFERED },
    orderBy: { lastPromptAt: "desc" },
    include: { mentorCreature: { include: { species: true } } },
  });
  if (!pending) return { handled: false as const };
  const answer = parseMentorshipAnswer(text);
  if (answer === "accept") return { handled: true as const, ...(await acceptMentorship(playerId, pending.id)) };
  if (answer === "decline") return { handled: true as const, ...(await declineMentorship(playerId, pending.id)) };

  if (pending.clarificationCount < 1) {
    await prisma.playerMentorship.update({
      where: { id: pending.id },
      data: { clarificationCount: { increment: 1 } },
    });
    const name = pending.mentorCreature.name?.trim() || pending.mentorCreature.species.name;
    return { handled: true as const, ok: true as const, text: `${name} хитає головою: “Не вловила. То йдеш учитися чи ні?”` };
  }

  if (pending.clarificationCount > 1) return { handled: false as const };

  await prisma.playerMentorship.update({
    where: { id: pending.id },
    data: { clarificationCount: { increment: 1 } },
  });

  const name = pending.mentorCreature.name?.trim() || pending.mentorCreature.species.name;
  return { handled: true as const, ok: true as const, text: `${name} лишає це без відповіді. Якщо захочете — скажіть ясніше.` };
}

export async function mentorshipStatusText(playerId: number) {
  const mentorship = await prisma.playerMentorship.findFirst({
    where: { playerId, status: { in: [MENTORSHIP_STATUS_ACTIVE, MENTORSHIP_STATUS_OFFERED] } },
    orderBy: { updatedAt: "desc" },
    include: { mentorCreature: { include: { species: true } } },
  });
  if (!mentorship) return "Науки зараз немає. Візьміть слід місцевого, який справді вміє більше, і він може запропонувати вчитись.";
  const forms = creatureForms(mentorship.mentorCreature);
  const skill = learningSkillDisplayName(mentorship.skillKey);
  if (mentorship.status === MENTORSHIP_STATUS_ACTIVE) {
    const intent = await getPlayerFollowIntent(playerId);
    const followsMentor = intent?.targetType === "creature" && intent.targetCreatureId === mentorship.mentorCreatureId;
    const followLine = followsMentor
      ? "Слід наставника: тримаєте."
      : `Слід наставника: не тримаєте. Взяти знову: /follow ${forms.nominative}.`;
    const assistLine = intent?.assistEnabled
      ? "Автокрок: увімкнено."
      : "Автокрок: вимкнено. Увімкнути: /follow_assist on.";
    const recentLessonLine = await latestMentorshipLessonLine({
      playerId,
      mentorCreatureId: mentorship.mentorCreatureId,
      skillKey: mentorship.skillKey,
    });
    return [
      `Наука: ${forms.nominative} — ${skill}.`,
      followLine,
      assistLine,
      ...(recentLessonLine ? [recentLessonLine] : []),
      "Це домовленість дивитися й іти поруч, не гарантія знання.",
    ].join("\n");
  }
  return `Очікує відповідь: ${forms.nominative} — ${skill}.\nСкажіть “так, хочу” або “не зараз”.`;
}

export async function endActiveMentorship(playerId: number) {
  const mentorship = await prisma.playerMentorship.findFirst({
    where: { playerId, status: MENTORSHIP_STATUS_ACTIVE },
    orderBy: { updatedAt: "desc" },
    include: { mentorCreature: { include: { species: true } } },
  });
  if (!mentorship) return { ok: false as const, text: "Активної науки зараз немає." };
  await prisma.playerMentorship.update({
    where: { id: mentorship.id },
    data: { status: MENTORSHIP_STATUS_ENDED, endedAt: new Date() },
  });
  const forms = creatureForms(mentorship.mentorCreature);
  return { ok: true as const, text: `Ви відпускаєте науку ${forms.genitive}. Слід лишається вашим, якщо не відпустити його окремо: /unfollow.` };
}
