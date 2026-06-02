import { normalizeInput } from "../input/aliases";
import { creatureForms } from "./grammar";

export function normalizeTrackQuery(query: string) {
  return normalizeInput(query);
}

export function normalizedTrackSearchKeys(track: any) {
  const rawLabel = String(track.label ?? "")
    .replace(/^сліди:\s*/i, "")
    .replace(/^слід:\s*/i, "")
    .replace(/^свіжий слід:\s*/i, "")
    .trim();
  const keys = [
    track.label,
    rawLabel,
    track.player?.nameNominative,
    track.player?.firstName,
    track.player?.lastName,
    track.player?.username,
    track.creature?.name,
    track.creature?.species?.key,
    track.creature?.species?.name,
    track.creature ? creatureForms(track.creature).nominative : null,
  ];

  return [...new Set(keys.filter(Boolean).map((key) => normalizeInput(String(key))).filter(Boolean))];
}

export function trackMatchesQuery(track: any, normalizedQuery: string) {
  return normalizedTrackSearchKeys(track).some((key) => key.includes(normalizedQuery) || normalizedQuery.includes(key));
}
