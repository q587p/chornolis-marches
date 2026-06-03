import { prisma } from "../db";
import type { TextTargetRef } from "./textTargets";

export const FOLLOW_TARGET_PLAYER = "PLAYER";
export const FOLLOW_TARGET_CREATURE = "CREATURE";

export type FollowTargetType = typeof FOLLOW_TARGET_PLAYER | typeof FOLLOW_TARGET_CREATURE;

export type FollowIntentTargetRef = Pick<TextTargetRef, "type" | "id" | "label">;

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

export function followIntentStatusLine(label: string | null | undefined): string | null {
  const safeLabel = label?.trim();
  return safeLabel ? `Чужий слід: ${safeLabel}.` : null;
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
