import type { Bot } from "grammy";
import { WorldActionType } from "@prisma/client";
import { prisma } from "../db";
import { actionDurationMs } from "./actionRules";
import { enqueueCreatureAction } from "./actionLifecycle";
import { isStrangeTotemFeature, strangeTotemNpcDismantleLine } from "./strangeTotems";

export const NPC_TOTEM_DISMANTLE_PRIORITY = 35;
export const PROFESSION_TOTEM_DISMANTLE_ACTION: WorldActionType = "DISMANTLE_TOTEM";
export const TOTEM_DISMANTLING_PROFESSION_KEYS = ["hunter", "znakhar", "travnytsia"] as const;

export function canProfessionNpcDismantleTotem(creature: { professionKey?: string | null }) {
  return Boolean(creature.professionKey && (TOTEM_DISMANTLING_PROFESSION_KEYS as readonly string[]).includes(creature.professionKey));
}

export async function localStrangeTotemForNpc(locationId: number) {
  const features = await prisma.locationFeature.findMany({
    where: { locationId, isActive: true, type: "LANDMARK" },
    orderBy: { id: "asc" },
  });
  return features.find(isStrangeTotemFeature) ?? null;
}

export async function maybeQueueProfessionTotemDismantle(_bot: Bot | null, creature: {
  id: number;
  locationId: number;
  stamina: number;
  professionKey?: string | null;
}) {
  if (!canProfessionNpcDismantleTotem(creature)) return false;
  const feature = await localStrangeTotemForNpc(creature.locationId);
  if (!feature?.id) return false;

  const reason = strangeTotemNpcDismantleLine(`${creature.id}:${feature.key ?? feature.id}`);
  await enqueueCreatureAction({
    creatureId: creature.id,
    type: PROFESSION_TOTEM_DISMANTLE_ACTION,
    payload: { featureId: feature.id, reason },
    durationMs: actionDurationMs(PROFESSION_TOTEM_DISMANTLE_ACTION, creature.stamina),
    priority: NPC_TOTEM_DISMANTLE_PRIORITY,
    interruptQueued: true,
  });
  await prisma.creature.updateMany({
    where: { id: creature.id, isAlive: true, isGone: false },
    data: { activity: "LOOKING", currentAction: reason },
  });
  return true;
}
