import type { CreatureAge } from "@prisma/client";

export const ADD_CREATURE_BATCH_SIZE = 50;
export const ADD_CREATURE_MAX_COUNT = 500;

export type ParsedAddCreatureArgs = {
  speciesKey: string;
  locationArg: string;
  requestedCount: number;
  age: CreatureAge;
};

export type CorpseFreshness = "fresh" | "decaying" | "old";

export type ParsedAddCreatureCorpseArgs = {
  speciesKey: string;
  locationArg?: string;
  requestedCount: number;
  age: CreatureAge;
  freshness: CorpseFreshness;
};

const AGE_TOKENS = new Set<CreatureAge>(["YOUNG", "ADULT", "OLD"]);
const FRESHNESS_TOKENS = new Set<CorpseFreshness>(["fresh", "decaying", "old"]);

function isPositiveInteger(value: string | undefined) {
  return Boolean(value && /^\d+$/.test(value) && Number(value) > 0);
}

export function parseAddCreatureArgs(raw: string): ParsedAddCreatureArgs {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  const speciesKey = String(parts.shift() ?? "").trim();
  let age: CreatureAge = "ADULT";
  let requestedCount = 1;

  const possibleAge = parts[parts.length - 1]?.toUpperCase() as CreatureAge | undefined;
  if (possibleAge && AGE_TOKENS.has(possibleAge)) {
    age = possibleAge;
    parts.pop();
  }

  if (isPositiveInteger(parts[parts.length - 1])) requestedCount = Number(parts.pop());

  return {
    speciesKey,
    locationArg: parts.join(" "),
    requestedCount,
    age,
  };
}

export function parseAddCreatureCorpseArgs(raw: string): ParsedAddCreatureCorpseArgs {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  const speciesKey = String(parts.shift() ?? "").trim();
  let age: CreatureAge = "ADULT";
  let requestedCount = 1;
  let freshness: CorpseFreshness = "fresh";

  const possibleFreshnessRaw = parts[parts.length - 1];
  const possibleFreshness = possibleFreshnessRaw?.toLowerCase() as CorpseFreshness | undefined;
  const isExplicitFreshness = possibleFreshnessRaw !== possibleFreshnessRaw?.toUpperCase();
  if (possibleFreshness && isExplicitFreshness && FRESHNESS_TOKENS.has(possibleFreshness)) {
    freshness = possibleFreshness;
    parts.pop();
  }

  const possibleAge = parts[parts.length - 1]?.toUpperCase() as CreatureAge | undefined;
  if (possibleAge && AGE_TOKENS.has(possibleAge)) {
    age = possibleAge;
    parts.pop();
  }

  if (isPositiveInteger(parts[parts.length - 1])) requestedCount = Number(parts.pop());

  return {
    speciesKey,
    locationArg: parts.length ? parts.join(" ") : undefined,
    requestedCount,
    age,
    freshness,
  };
}

export function corpseDecayTicksForFreshness(speciesCorpseDecayTicks: number | null | undefined, freshness: CorpseFreshness) {
  const max = Math.max(1, speciesCorpseDecayTicks ?? 1);
  if (freshness === "fresh") return max;
  if (freshness === "decaying") return Math.max(1, Math.floor(max / 2));
  return 1;
}

export function planAddCreatureBatches(
  requestedCount: number,
  maxCount = ADD_CREATURE_MAX_COUNT,
  batchSize = ADD_CREATURE_BATCH_SIZE,
) {
  const safeRequested = Math.max(1, Math.floor(requestedCount));
  const count = Math.min(safeRequested, maxCount);
  const batches: number[] = [];

  for (let remaining = count; remaining > 0; remaining -= batchSize) {
    batches.push(Math.min(batchSize, remaining));
  }

  return {
    requestedCount: safeRequested,
    count,
    capped: safeRequested > count,
    batches,
  };
}
