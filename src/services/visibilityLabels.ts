import { hasActiveLitTorchForPlayer } from "./fire";
import { visibilityRulesForLocation } from "./visibility";

export function actorLabelFromVisibility(
  visibility: { showNearbyDetails: boolean },
  observerHasLight: boolean,
  fallback: string,
  visibleName: string,
) {
  return visibility.showNearbyDetails || observerHasLight ? visibleName : fallback;
}

export async function visibleActorLabelForObserver(
  locationId: number,
  observerPlayerId: number,
  fallback: string,
  visibleName: string,
) {
  const visibility = await visibilityRulesForLocation(locationId, "brief");
  const observerHasLight = visibility.showNearbyDetails ? false : await hasActiveLitTorchForPlayer(observerPlayerId);
  return actorLabelFromVisibility(visibility, observerHasLight, fallback, visibleName);
}
