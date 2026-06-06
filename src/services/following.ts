import { PlayerSleepState } from "@prisma/client";
import { prisma } from "../db";
import { guessNameForms, type NameForms } from "./grammar";
import type { TextTargetRef } from "./textTargets";

export const FOLLOW_TARGET_PLAYER = "PLAYER";
export const FOLLOW_TARGET_CREATURE = "CREATURE";

export type FollowTargetType = typeof FOLLOW_TARGET_PLAYER | typeof FOLLOW_TARGET_CREATURE;

export type FollowIntentTargetRef = Pick<TextTargetRef, "type" | "id" | "label"> & { forms?: Pick<NameForms, "instrumental"> };

export function followTargetTypeForRef(target: FollowIntentTargetRef): FollowTargetType {
  return target.type === "player" ? FOLLOW_TARGET_PLAYER : FOLLOW_TARGET_CREATURE;
}

export function isSelfFollowTarget(playerId: number, target: FollowIntentTargetRef): boolean {
  return target.type === "player" && target.id === playerId;
}

export function followIntentDataForTarget(target: FollowIntentTargetRef, locationId: number) {
  const targetType = followTargetTypeForRef(target);
  return {
    targetType,
    targetPlayerId: targetType === FOLLOW_TARGET_PLAYER ? target.id : null,
    targetCreatureId: targetType === FOLLOW_TARGET_CREATURE ? target.id : null,
    setAt: new Date(),
    lastSeenLocationId: locationId,
    lastKnownTargetLabel: target.label,
  };
}

export function followIntentStatusLine(label: string | null | undefined, options: { stale?: boolean } = {}): string | null {
  const safeLabel = label?.trim();
  return safeLabel ? `Чужий слід: ${safeLabel}${options.stale ? " (останній помічений)" : ""}.` : null;
}

export function followAssistStateText(enabled: boolean | null | undefined) {
  return `Автоспроба слідом: ${enabled ? "увімкнено" : "вимкнено"}.`;
}

export function followIntentUsageText() {
  return "За ким слідувати? Спробуйте: /follow <ім'я> або «слідувати за знахарем».";
}

export function followIntentTargetInstrumental(target: Pick<FollowIntentTargetRef, "label" | "forms">) {
  const explicit = target.forms?.instrumental?.trim();
  if (explicit) return explicit;
  const label = target.label?.trim();
  return label ? guessNameForms(label).instrumental : "кимось";
}

export function followIntentSetText(target: Pick<FollowIntentTargetRef, "label" | "forms">) {
  return `Ви тримаєтеся сліду за ${followIntentTargetInstrumental(target)}. Це ще не крок за кроком — радше уважність до чужого руху.`;
}

export function followIntentHelpText(input?: {
  label?: string | null;
  targetVisible?: boolean | null;
  assistEnabled?: boolean | null;
}) {
  const label = input?.label?.trim();
  if (!label) return followIntentUsageText();
  const targetVisible = input?.targetVisible !== false;
  const lines = [
    `Ви тримаєтеся чужого сліду: ${label}${targetVisible ? "" : " (останній помічений)"}.`,
    targetVisible
      ? "Це ще не автоматична хода слідом — лише увага до чужого руху."
      : "Ціль зараз не видно поруч, але цей слід лишається у вашій увазі.",
    "Щоб змінити ціль: /follow <ім'я>",
    "Щоб відпустити слід: /unfollow",
  ];
  if (targetVisible) lines.push("Щоб спробувати піти за свіжим ясним слідом: /follow_step");
  lines.push(followAssistStateText(Boolean(input?.assistEnabled)));
  lines.push("Щоб змінити автоспробу: /follow_assist on або /follow_assist off");
  return lines.join("\n");
}

export function followIntentAttentionContext(
  playerId: number,
  targetType: FollowTargetType,
  targetId: number,
) {
  return {
    playerId,
    targetType,
    targetId,
    attention: "follow-intent" as const,
  };
}

export async function getPlayerFollowIntent(playerId: number) {
  return prisma.playerFollowIntent.findUnique({ where: { playerId } });
}

export async function isFollowIntentTargetVisibleAtLocation(intent: Awaited<ReturnType<typeof getPlayerFollowIntent>> | null | undefined, locationId: number | null | undefined) {
  if (!intent || !locationId) return false;
  if (intent.targetType === FOLLOW_TARGET_PLAYER && intent.targetPlayerId) {
    const target = await prisma.player.findFirst({
      where: {
        id: intent.targetPlayerId,
        currentLocationId: locationId,
        hp: { gt: 0 },
        sleepState: PlayerSleepState.AWAKE,
      },
      select: { id: true },
    });
    return Boolean(target);
  }
  if (intent.targetType === FOLLOW_TARGET_CREATURE && intent.targetCreatureId) {
    const target = await prisma.creature.findFirst({
      where: {
        id: intent.targetCreatureId,
        locationId,
        isAlive: true,
        isGone: false,
        isHidden: false,
      },
      select: { id: true },
    });
    return Boolean(target);
  }
  return false;
}

export async function setPlayerFollowIntent(playerId: number, target: FollowIntentTargetRef, locationId: number) {
  const data = followIntentDataForTarget(target, locationId);
  return prisma.playerFollowIntent.upsert({
    where: { playerId },
    create: {
      playerId,
      ...data,
    },
    update: data,
  });
}

export async function setFollowAssistEnabled(playerId: number, enabled: boolean) {
  const existing = await prisma.playerFollowIntent.findUnique({ where: { playerId } });
  if (!existing) return null;
  return prisma.playerFollowIntent.update({
    where: { playerId },
    data: {
      assistEnabled: enabled,
      assistUpdatedAt: new Date(),
      ...(enabled ? {} : { lastAssistAt: null }),
    },
  });
}

export async function clearPlayerFollowIntent(playerId: number) {
  const existing = await prisma.playerFollowIntent.findUnique({ where: { playerId } });
  if (!existing) return null;
  await prisma.playerFollowIntent.delete({ where: { playerId } });
  return existing;
}

export async function isPlayerFollowingTarget(playerId: number, targetType: FollowTargetType, targetId: number) {
  const intent = await prisma.playerFollowIntent.findUnique({ where: { playerId } });
  if (!intent || intent.targetType !== targetType) return false;
  if (targetType === FOLLOW_TARGET_PLAYER) return intent.targetPlayerId === targetId;
  return intent.targetCreatureId === targetId;
}
