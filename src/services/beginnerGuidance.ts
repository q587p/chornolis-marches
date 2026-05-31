import type { VisibilityRules } from "./visibility";
import { prisma } from "../db";
import { isTutorialLocation } from "./tutorial";
import { canSendProactiveMessage } from "./sessionPresence";
import { visibilityRulesForLocation } from "./visibility";

const FIRST_NIGHT_GUIDANCE_EVENT_TITLE = "First night guidance shown";

export const FIRST_NIGHT_GUIDANCE_TEXT = [
  "Темрява тут не просто гасить барви. Вона забирає дрібні речі: сліди, рухи, те, що лежить під ногами.",
  "",
  "Вогонь або факел можуть повернути частину побаченого.",
].join("\n");

export function visibilityReductionActive(rules: VisibilityRules) {
  return !rules.showLocationDescription ||
    !rules.showNearbyDetails ||
    !rules.showTracks ||
    !rules.showGroundObjects ||
    !rules.showResourceDetails;
}

export function shouldShowFirstNightGuidanceForVisibility(rules: VisibilityRules) {
  return !rules.light.hasLocalLight &&
    (rules.light.level === "dim" || rules.light.level === "dark") &&
    visibilityReductionActive(rules);
}

export async function firstNightGuidanceForPlayer(playerId: number, locationId: number | null | undefined) {
  if (!locationId) return null;

  const [player, location] = await Promise.all([
    prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        onboardingComplete: true,
        sessionPresence: true,
        remindersPaused: true,
      },
    }),
    prisma.cellLocation.findUnique({
      where: { id: locationId },
      select: { id: true, key: true, z: true, region: { select: { key: true } } },
    }),
  ]);

  if (!player || !location) return null;
  if (isTutorialLocation(location)) return null;
  if (!canSendProactiveMessage(player)) return null;

  const rules = await visibilityRulesForLocation(locationId, "details");
  if (!shouldShowFirstNightGuidanceForVisibility(rules)) return null;

  const seen = await prisma.worldEvent.findFirst({
    where: {
      playerId,
      type: "SYSTEM",
      title: FIRST_NIGHT_GUIDANCE_EVENT_TITLE,
    },
    select: { id: true },
    orderBy: { id: "desc" },
  });
  if (seen) return null;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: FIRST_NIGHT_GUIDANCE_EVENT_TITLE,
      description: rules.light.level,
      playerId,
      locationId,
    },
  });

  return FIRST_NIGHT_GUIDANCE_TEXT;
}
