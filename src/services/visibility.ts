import type { LightSnapshot } from "./lightSnapshot";

export type VisibilityMode = "brief" | "details";

export type VisibilityRules = {
  light: LightSnapshot;
  showLocationDescription: boolean;
  showFeatures: boolean;
  showNearbyDetails: boolean;
  showTracks: boolean;
  showGroundObjects: boolean;
  showResourceDetails: boolean;
};

function canSeeBriefDetails(light: LightSnapshot) {
  return light.hasLocalLight || light.level === "bright" || light.level === "clear";
}

export function visibilityRulesFromLight(light: LightSnapshot, mode: VisibilityMode): VisibilityRules {
  if (mode === "details") {
    return {
      light,
      showLocationDescription: true,
      showFeatures: true,
      showNearbyDetails: true,
      showTracks: true,
      showGroundObjects: true,
      showResourceDetails: true,
    };
  }

  const showDetails = canSeeBriefDetails(light);
  return {
    light,
    showLocationDescription: true,
    showFeatures: true,
    showNearbyDetails: showDetails,
    showTracks: showDetails,
    showGroundObjects: showDetails,
    showResourceDetails: false,
  };
}

export async function visibilityRulesForLocation(locationId: number, mode: VisibilityMode) {
  const { lightSnapshotForLocation } = await import("./lightSnapshot");
  const { getCurrentWorldTimeSnapshot } = await import("./worldTime");
  const worldTime = await getCurrentWorldTimeSnapshot();
  const light = await lightSnapshotForLocation(locationId, worldTime);
  return visibilityRulesFromLight(light, mode);
}
