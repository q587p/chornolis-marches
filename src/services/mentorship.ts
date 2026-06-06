import { InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { withSlowLog } from "../utils/slowLog";
import { getPlayerFollowIntent, setPlayerFollowIntent } from "./following";
import { creatureForms } from "./grammar";
import { learningSkillDisplayName, observedActorSkillLevel } from "./learning";

export const MENTORSHIP_STATUS_OFFERED = "OFFERED";
export const MENTORSHIP_STATUS_ACTIVE = "ACTIVE";
export const MENTORSHIP_STATUS_DECLINED = "DECLINED";
export const MENTORSHIP_STATUS_ENDED = "ENDED";
export const MENTORSHIP_OFFER_COOLDOWN_MS = Number(process.env.MENTORSHIP_OFFER_COOLDOWN_MS || 10 * 60_000);

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
    return `Наука: ${forms.nominative} — ${skill}.\nЦе домовленість дивитися й іти поруч, не гарантія знання.`;
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
