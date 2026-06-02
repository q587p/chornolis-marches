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

type LocationLightContext = {
  key?: string | null;
  z?: number | null;
  region?: { key?: string | null } | null;
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

export function isDreamLocationForLight(location?: LocationLightContext | null) {
  if (!location) return false;
  if (typeof location.z === "number" && location.z <= -10) return true;
  const regionKey = location.region?.key ?? "";
  const locationKey = location.key ?? "";
  return regionKey.startsWith("dream") || locationKey.startsWith("dream_");
}

export function dreamLightSnapshot(): LightSnapshot {
  return {
    score: 72,
    naturalScore: 72,
    weatherModifier: 0,
    hasLocalLight: false,
    level: "clear",
    label: LIGHT_LABELS.clear,
  };
}

export async function lightSnapshotForLocation(locationId: number, snapshot: WorldTimeSnapshot): Promise<LightSnapshot> {
  const { prisma } = await import("../db");
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    select: { key: true, z: true, region: { select: { key: true } } },
  });
  if (isDreamLocationForLight(location)) return dreamLightSnapshot();
  const { hasActiveLightAtLocation } = await import("./fire");
  return lightSnapshotFromWorldTime(snapshot, {
    hasLocalLight: await hasActiveLightAtLocation(locationId),
  });
}
