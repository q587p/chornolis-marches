import type { Bot } from "grammy";
import type { VisibilityRules } from "./visibility";
import { notifyLocationDynamic } from "./notifications";
import {
  TRACKING_ANIMAL_MOVEMENT_OBSERVATION_TEXT,
  recordTrackingAnimalMovementObservation,
} from "./trackingLearning";
import { canLearnFromVisibleObservation, visibilityRulesForLocation } from "./visibility";

export const TRACKING_ANIMAL_MOVEMENT_OBSERVATION_SPECIES_KEY = "rabbit";

export function canObserveAnimalMovementForTracking(input: {
  speciesKey?: string | null;
  isHidden?: boolean | null;
  sourceLocationId?: number | null;
  destinationLocationId?: number | null;
  visibility?: Pick<VisibilityRules, "showNearbyDetails" | "showTracks"> | null;
}) {
  return input.speciesKey === TRACKING_ANIMAL_MOVEMENT_OBSERVATION_SPECIES_KEY
    && input.isHidden !== true
    && Number.isFinite(input.sourceLocationId)
    && Number.isFinite(input.destinationLocationId)
    && input.sourceLocationId !== input.destinationLocationId
    && Boolean(input.visibility && canLearnFromVisibleObservation(input.visibility, "animal_movement"));
}

async function notifyTrackingObserversAtLocation(bot: Bot, input: {
  locationId: number;
  creatureId: number;
  speciesKey: string;
  isHidden: boolean;
  sourceLocationId: number;
  destinationLocationId: number;
  direction: string;
}) {
  const visibility = await visibilityRulesForLocation(input.locationId, "brief");
  if (!canObserveAnimalMovementForTracking({
    speciesKey: input.speciesKey,
    isHidden: input.isHidden,
    sourceLocationId: input.sourceLocationId,
    destinationLocationId: input.destinationLocationId,
    visibility,
  })) return 0;

  let recorded = 0;
  await notifyLocationDynamic(bot, input.locationId, -1, async (observer) => {
    const result = await recordTrackingAnimalMovementObservation({
      playerId: observer.id,
      locationId: input.locationId,
      creatureId: input.creatureId,
      fromLocationId: input.sourceLocationId,
      toLocationId: input.destinationLocationId,
      direction: input.direction,
    });
    if (!result.recorded) return null;
    recorded += 1;
    return { text: TRACKING_ANIMAL_MOVEMENT_OBSERVATION_TEXT };
  });
  return recorded;
}

export async function notifyAnimalMovementTrackingObservation(bot: Bot, input: {
  creatureId: number;
  speciesKey?: string | null;
  isHidden?: boolean | null;
  sourceLocationId: number;
  destinationLocationId: number;
  direction: string;
}) {
  try {
    if (input.speciesKey !== TRACKING_ANIMAL_MOVEMENT_OBSERVATION_SPECIES_KEY) return { notified: 0 };
    const speciesKey = input.speciesKey;
    const isHidden = input.isHidden === true;
    const locationIds = Array.from(new Set([
      input.sourceLocationId,
      input.destinationLocationId,
    ].filter((locationId) => Number.isFinite(locationId))));

    let notified = 0;
    for (const locationId of locationIds) {
      notified += await notifyTrackingObserversAtLocation(bot, {
        locationId,
        creatureId: input.creatureId,
        speciesKey,
        isHidden,
        sourceLocationId: input.sourceLocationId,
        destinationLocationId: input.destinationLocationId,
        direction: input.direction,
      });
    }

    return { notified };
  } catch (error) {
    console.warn("Failed to notify animal movement tracking observation:", error);
    return { notified: 0 };
  }
}
