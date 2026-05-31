import type { WorldTimeSnapshot } from "../data/worldClock";
import { weatherLightModifier } from "./weather";

export type LightSnapshotLevel = "bright" | "clear" | "dim" | "dark";

export type LightSnapshot = {
  score: number;
  naturalScore: number;
  weatherModifier: number;
  hasLocalLight: boolean;
  level: LightSnapshotLevel;
  label: string;
};

export type LightSnapshotOptions = {
  hasLocalLight?: boolean;
};

function clampLight(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function naturalLightScore(snapshot: WorldTimeSnapshot) {
  if (snapshot.daypart === "dawn") return 45;
  if (snapshot.daypart === "day") return snapshot.hour >= 16 ? 72 : 86;
  if (snapshot.daypart === "dusk") return 34;
  return 6 + Math.round(snapshot.moonIllumination * 0.35);
}

function levelForScore(score: number): LightSnapshotLevel {
  if (score >= 75) return "bright";
  if (score >= 45) return "clear";
  if (score >= 20) return "dim";
  return "dark";
}

const LIGHT_LABELS: Record<LightSnapshotLevel, string> = {
  bright: "світло тримається певно",
  clear: "видно достатньо",
  dim: "присмерк краде дрібні обриси",
  dark: "темрява стискає погляд",
};

export function lightSnapshotFromWorldTime(snapshot: WorldTimeSnapshot, options: LightSnapshotOptions = {}): LightSnapshot {
  const naturalScore = naturalLightScore(snapshot);
  const weatherModifier = weatherLightModifier(snapshot.weatherKey, snapshot.weatherIntensity);
  const baseScore = clampLight(naturalScore + weatherModifier);
  const score = options.hasLocalLight ? Math.max(baseScore, 78) : baseScore;
  const level = levelForScore(score);

  return {
    score,
    naturalScore,
    weatherModifier,
    hasLocalLight: Boolean(options.hasLocalLight),
    level,
    label: LIGHT_LABELS[level],
  };
}

export async function lightSnapshotForLocation(locationId: number, snapshot: WorldTimeSnapshot): Promise<LightSnapshot> {
  const { hasActiveLightAtLocation } = await import("./fire");
  return lightSnapshotFromWorldTime(snapshot, {
    hasLocalLight: await hasActiveLightAtLocation(locationId),
  });
}
