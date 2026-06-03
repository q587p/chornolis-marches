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

function canSeeDetails(light: LightSnapshot) {
  return light.hasLocalLight || light.level === "bright" || light.level === "clear";
}

export function canShowFeatureDetails(rules: VisibilityRules) {
  return rules.showLocationDescription;
}

export function visibilityDarknessText(rules: VisibilityRules) {
  if (rules.light.level === "dim") {
    return "Присмерк краде дрібні обриси. Видно достатньо, щоб не збитися зі стежки, але не все відкривається з першого погляду.";
  }
  return "Темрява стискає погляд. Без світла місцина лишає тільки найближчі обриси й тіні.";
}

export function visibilityPresenceText(rules: VisibilityRules, kind: "nearby" | "ground" | "tracks" | "resources" = "nearby") {
  if (kind === "ground") return rules.light.level === "dim"
    ? "На землі щось темніє, та присмерк не дає розібрати певно."
    : "На землі може щось лежати, але без світла це радше тінь, ніж знахідка.";
  if (kind === "tracks") return rules.light.level === "dim"
    ? "Сліди тут є, але присмерк змиває найтонші риски."
    : "У темряві ви не розрізняєте дрібних слідів.";
  if (kind === "resources") return rules.light.level === "dim"
    ? "Рослинність поруч є, але присмерк плутає ягоди, листя й трави."
    : "Без світла важко відрізнити корисне від темної плями в листі.";
  return rules.light.level === "dim"
    ? "Щось може бути поруч, але присмерк не дає назвати це напевно."
    : "Щось може бути поруч, але без світла важко сказати напевно.";
}

export function visibilityRulesFromLight(light: LightSnapshot, mode: VisibilityMode): VisibilityRules {
  const showDetails = canSeeDetails(light);

  if (mode === "details") {
    return {
      light,
      showLocationDescription: showDetails,
      showFeatures: true,
      showNearbyDetails: showDetails,
      showTracks: showDetails,
      showGroundObjects: showDetails,
      showResourceDetails: showDetails,
    };
  }

  return {
    light,
    showLocationDescription: showDetails,
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
