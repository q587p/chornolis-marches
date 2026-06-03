import type { Bot } from "grammy";
import type { Direction } from "@prisma/client";
import { prisma } from "../db";
import { directionLabels } from "../ui/labels";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { escapeHtml } from "../utils/text";
import { safeSendMessage } from "../utils/telegram";
import { canSendProactiveToTelegramId } from "./sessionPresence";
import { visibilityRulesForLocation } from "./visibility";
import { recordLearningProgress } from "./learning";
import { FOLLOW_TARGET_CREATURE, FOLLOW_TARGET_PLAYER, type FollowTargetType } from "./following";

export const FOLLOW_ROUTE_MEMORY_EVENT_TITLE = "Follow intent route memory";
export const FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE = "Follow intent hidden route memory";

export type FollowRouteTarget = {
  type: FollowTargetType;
  id: number;
  label: string;
  visible?: boolean | null;
};

export type FollowIntentRouteLike = {
  targetType?: string | null;
  targetPlayerId?: number | null;
  targetCreatureId?: number | null;
  lastKnownTargetLabel?: string | null;
};

export function followIntentMatchesMoveTarget(intent: FollowIntentRouteLike | null | undefined, target: Pick<FollowRouteTarget, "type" | "id">) {
  if (!intent || intent.targetType !== target.type) return false;
  if (target.type === FOLLOW_TARGET_PLAYER) return intent.targetPlayerId === target.id;
  return intent.targetCreatureId === target.id;
}

export function followRouteMemoryKind(input: {
  exitVisible?: boolean | null;
  targetVisible?: boolean | null;
  showTracks?: boolean | null;
}) {
  if (!input.exitVisible || input.targetVisible === false) return "none" as const;
  return input.showTracks ? "clear" as const : "dark" as const;
}

export function followedRouteMemoryText(input: {
  label?: string | null;
  direction?: Direction | string | null;
  kind: "clear" | "dark";
}) {
  if (input.kind === "dark") return "Ви відчуваєте, що чужий слід зрушив, але темрява забирає напрям.";
  const label = input.label?.trim() || "хтось";
  const direction = input.direction ? String(directionLabels[input.direction] ?? input.direction).toLocaleLowerCase("uk-UA") : "невідомо куди";
  return `Ви трималися чужого сліду: ${escapeHtml(label)} рушає на ${escapeHtml(direction)}.`;
}

export function followedHiddenRouteMemoryText() {
  return "Чужий слід зникає не кроком. Ви запам'ятовуєте не напрям, а слово й місце біля зарубок.";
}

export function followRouteMemoryEventDescription(input: {
  playerId: number;
  targetType: FollowTargetType;
  targetId: number;
  fromLocationId: number;
  toLocationId?: number | null;
  direction?: Direction | string | null;
  source: "visible_move" | "hidden_route";
  visibility?: "clear" | "dark" | "hidden";
}) {
  return [
    `playerId=${input.playerId}`,
    `targetType=${input.targetType}`,
    `targetId=${input.targetId}`,
    `from=${input.fromLocationId}`,
    input.toLocationId ? `to=${input.toLocationId}` : null,
    input.direction ? `direction=${input.direction}` : null,
    `source=${input.source}`,
    input.visibility ? `visibility=${input.visibility}` : null,
  ].filter(Boolean).join("; ");
}

export function followIntentTrackMatches(intent: FollowIntentRouteLike | null | undefined, track: any) {
  if (!intent) return false;
  if (intent.targetType === FOLLOW_TARGET_PLAYER) return Boolean(intent.targetPlayerId && track.playerId === intent.targetPlayerId);
  if (intent.targetType === FOLLOW_TARGET_CREATURE) return Boolean(intent.targetCreatureId && track.creatureId === intent.targetCreatureId);
  return false;
}

export function prioritizeFollowIntentTracks<T extends { id?: number }>(tracks: T[], intent: FollowIntentRouteLike | null | undefined) {
  if (!intent) return tracks;
  return [...tracks].sort((a: any, b: any) => Number(followIntentTrackMatches(intent, b)) - Number(followIntentTrackMatches(intent, a)));
}

export function followedTrackDisplayLabel(intent: FollowIntentRouteLike | null | undefined, track: any, fallbackLabel: string) {
  if (!followIntentTrackMatches(intent, track)) return fallbackLabel;
  const label = intent?.lastKnownTargetLabel?.trim() || fallbackLabel;
  return `чужий слід: ${label}`;
}

async function sendFollowRouteMemoryMessage(bot: Bot, player: { telegramId: string; isAutoEnabled?: boolean | null }, text: string) {
  if (!(await canSendProactiveToTelegramId(player.telegramId))) return;
  await safeSendMessage(
    bot,
    player.telegramId,
    text,
    {
      parse_mode: "HTML",
      reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), Boolean(player.isAutoEnabled)),
    },
    "follow route memory sendMessage",
  );
}

async function followersForTargetAtLocation(sourceLocationId: number, target: FollowRouteTarget) {
  return prisma.playerFollowIntent.findMany({
    where: {
      targetType: target.type,
      ...(target.type === FOLLOW_TARGET_PLAYER ? { targetPlayerId: target.id } : { targetCreatureId: target.id }),
      player: {
        currentLocationId: sourceLocationId,
        hp: { gt: 0 },
        sleepState: "AWAKE",
      },
    },
    include: { player: true },
  });
}

export async function rememberFollowedTargetVisibleMove(bot: Bot, input: {
  sourceLocationId: number;
  destinationLocationId: number;
  direction: Direction;
  target: FollowRouteTarget;
}) {
  try {
    const followers = await followersForTargetAtLocation(input.sourceLocationId, input.target);
    if (!followers.length) return 0;

    const visibility = await visibilityRulesForLocation(input.sourceLocationId, "brief");
    const kind = followRouteMemoryKind({
      exitVisible: true,
      targetVisible: input.target.visible !== false,
      showTracks: visibility.showTracks,
    });
    if (kind === "none") return 0;

    for (const intent of followers) {
      try {
        const label = input.target.label || intent.lastKnownTargetLabel || "хтось";
        const event = await prisma.worldEvent.create({
          data: {
            type: "MOVE",
            title: FOLLOW_ROUTE_MEMORY_EVENT_TITLE,
            description: followRouteMemoryEventDescription({
              playerId: intent.playerId,
              targetType: input.target.type,
              targetId: input.target.id,
              fromLocationId: input.sourceLocationId,
              toLocationId: input.destinationLocationId,
              direction: input.direction,
              source: "visible_move",
              visibility: kind,
            }),
            playerId: intent.playerId,
            locationId: input.sourceLocationId,
          },
        });
        await prisma.playerFollowIntent.update({
          where: { playerId: intent.playerId },
          data: {
            lastSeenLocationId: kind === "clear" ? input.destinationLocationId : input.sourceLocationId,
            lastKnownTargetLabel: label,
          },
        });
        if (kind === "clear") {
          await recordLearningProgress({
            playerId: intent.playerId,
            skillKey: "tracking",
            sourceKey: "observation",
            contextKey: "followed_movement",
            amount: 1,
            lastSourceEventId: event.id,
          });
        }
        await sendFollowRouteMemoryMessage(bot, intent.player, followedRouteMemoryText({
          label,
          direction: input.direction,
          kind,
        }));
      } catch (error) {
        console.warn("Failed to record follow route memory:", error);
      }
    }

    return followers.length;
  } catch (error) {
    console.warn("Failed to inspect follow route memory:", error);
    return 0;
  }
}

export async function rememberFollowedTargetHiddenRoute(bot: Bot, input: {
  sourceLocationId: number;
  destinationLocationId?: number | null;
  target: FollowRouteTarget;
}) {
  try {
    const followers = await followersForTargetAtLocation(input.sourceLocationId, input.target);
    if (!followers.length) return 0;

    for (const intent of followers) {
      try {
        const label = input.target.label || intent.lastKnownTargetLabel || "хтось";
        await prisma.worldEvent.create({
          data: {
            type: "MOVE",
            title: FOLLOW_ROUTE_HIDDEN_MEMORY_EVENT_TITLE,
            description: followRouteMemoryEventDescription({
              playerId: intent.playerId,
              targetType: input.target.type,
              targetId: input.target.id,
              fromLocationId: input.sourceLocationId,
              toLocationId: input.destinationLocationId,
              source: "hidden_route",
              visibility: "hidden",
            }),
            playerId: intent.playerId,
            locationId: input.sourceLocationId,
          },
        });
        await prisma.playerFollowIntent.update({
          where: { playerId: intent.playerId },
          data: {
            lastSeenLocationId: input.sourceLocationId,
            lastKnownTargetLabel: label,
          },
        });
        await sendFollowRouteMemoryMessage(bot, intent.player, followedHiddenRouteMemoryText());
      } catch (error) {
        console.warn("Failed to record hidden follow route memory:", error);
      }
    }

    return followers.length;
  } catch (error) {
    console.warn("Failed to inspect hidden follow route memory:", error);
    return 0;
  }
}
