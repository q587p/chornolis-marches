import { prisma } from "../db";

const REPLY_TARGET_EVENT_TITLE = "Reply target remembered";
const REPLY_TARGET_KIND = "reply-target";

type RememberedReplyTargetPayload = {
  kind: typeof REPLY_TARGET_KIND;
  speakerName: string;
  speakerPlayerId?: number;
  speakerCreatureId?: number;
  speakerDative?: string;
};

export type RememberedReplyTarget = {
  speakerName: string;
  speakerPlayerId?: number;
  speakerCreatureId?: number;
  speakerDative?: string;
};

export function rememberedReplyTargetDescription(input: string | RememberedReplyTarget) {
  const speakerName = typeof input === "string" ? input : input.speakerName;
  const speakerPlayerId = typeof input === "string" ? undefined : input.speakerPlayerId;
  const speakerCreatureId = typeof input === "string" ? undefined : input.speakerCreatureId;
  const speakerDative = typeof input === "string" ? undefined : input.speakerDative?.trim().slice(0, 120);
  return JSON.stringify({
    kind: REPLY_TARGET_KIND,
    speakerName: speakerName.trim().slice(0, 120),
    speakerPlayerId,
    speakerCreatureId,
    speakerDative,
  } satisfies RememberedReplyTargetPayload);
}

export function parseRememberedReplyTargetDescription(description?: string | null) {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description) as Partial<RememberedReplyTargetPayload>;
    const speakerName = typeof parsed.speakerName === "string" ? parsed.speakerName.trim() : "";
    if (parsed.kind !== REPLY_TARGET_KIND || !speakerName) return null;
    const speakerPlayerId = Number(parsed.speakerPlayerId);
    const speakerCreatureId = Number(parsed.speakerCreatureId);
    const speakerDative = typeof parsed.speakerDative === "string" ? parsed.speakerDative.trim() : "";
    return {
      speakerName,
      ...(Number.isSafeInteger(speakerPlayerId) && speakerPlayerId > 0 ? { speakerPlayerId } : {}),
      ...(Number.isSafeInteger(speakerCreatureId) && speakerCreatureId > 0 ? { speakerCreatureId } : {}),
      ...(speakerDative ? { speakerDative } : {}),
    } satisfies RememberedReplyTarget;
  } catch {
    return null;
  }
}

export async function rememberPlayerReplyTarget(input: {
  playerId: number;
  speakerName: string;
  speakerPlayerId?: number;
  speakerCreatureId?: number;
  speakerDative?: string;
  locationId?: number | null;
}) {
  const speakerName = input.speakerName.trim().slice(0, 120);
  if (!speakerName) return;
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: REPLY_TARGET_EVENT_TITLE,
      description: rememberedReplyTargetDescription({
        speakerName,
        speakerPlayerId: input.speakerPlayerId,
        speakerCreatureId: input.speakerCreatureId,
        speakerDative: input.speakerDative,
      }),
      playerId: input.playerId,
      locationId: input.locationId ?? undefined,
    },
  });
}

export async function latestRememberedReplyTarget(playerId: number) {
  const events = await prisma.worldEvent.findMany({
    where: {
      type: "SYSTEM",
      title: REPLY_TARGET_EVENT_TITLE,
      playerId,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 5,
  });

  for (const event of events) {
    const target = parseRememberedReplyTargetDescription(event.description);
    if (target) return target;
  }
  return null;
}
