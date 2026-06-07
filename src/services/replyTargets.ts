import { InlineKeyboard } from "grammy";
import { prisma } from "../db";

const REPLY_TARGET_EVENT_TITLE = "Reply target remembered";
const REPLY_TARGET_KIND = "reply-target";
export const PENDING_REPLY_MODE_TTL_MS = Number(process.env.PENDING_REPLY_MODE_TTL_MS || 2 * 60_000);
export const PENDING_REPLY_TIMEOUT_TEXT = "Ця відповідь розійшлася з часом. Натисніть «Відповісти» ще раз або скажіть /reply <текст>.";

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

type PendingReplyMode = {
  target: RememberedReplyTarget;
  createdAt: number;
};

export type PendingReplyModeResult =
  | { kind: "none" }
  | { kind: "ready"; target: RememberedReplyTarget }
  | { kind: "expired"; target: RememberedReplyTarget };

const pendingReplyModes = new Map<number, PendingReplyMode>();

export function pendingReplyButton() {
  return new InlineKeyboard().text("Відповісти", "replyTarget:pending");
}

export function pendingReplyModePrompt(target: RememberedReplyTarget) {
  const label = target.speakerDative || target.speakerName;
  return `Наступне повідомлення піде як відповідь ${label}.`;
}

export function setPendingReplyMode(playerId: number, target: RememberedReplyTarget, now = Date.now()) {
  pendingReplyModes.set(playerId, { target, createdAt: now });
}

export function consumePendingReplyModeResult(playerId: number, now = Date.now()): PendingReplyModeResult {
  const pending = pendingReplyModes.get(playerId);
  if (!pending) return { kind: "none" };
  pendingReplyModes.delete(playerId);
  if (now - pending.createdAt > PENDING_REPLY_MODE_TTL_MS) return { kind: "expired", target: pending.target };
  return { kind: "ready", target: pending.target };
}

export function consumePendingReplyMode(playerId: number, now = Date.now()) {
  const result = consumePendingReplyModeResult(playerId, now);
  return result.kind === "ready" ? result.target : null;
}

export function clearPendingReplyMode(playerId: number) {
  return pendingReplyModes.delete(playerId);
}

export function isPendingReplyCancelText(text: string) {
  const normalized = String(text ?? "").trim().toLocaleLowerCase("uk-UA");
  return ["/cancel", "cancel", "скасувати", "скасувати відповідь", "не відповідати"].includes(normalized);
}

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
