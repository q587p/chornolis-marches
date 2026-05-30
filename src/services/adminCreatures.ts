import type { CreatureAge } from "@prisma/client";

export const ADD_CREATURE_BATCH_SIZE = 50;
export const ADD_CREATURE_MAX_COUNT = 500;

export type ParsedAddCreatureArgs = {
  speciesKey: string;
  locationArg: string;
  requestedCount: number;
  age: CreatureAge;
};

const AGE_TOKENS = new Set<CreatureAge>(["YOUNG", "ADULT", "OLD"]);

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
