export type ParsedAddResourceArgs = {
  resourceKey: string;
  locationArg: string;
  amount: number;
};

export type ParsedAdminInventoryResourceArgs = {
  playerArg: string;
  amount: number;
};

export type ParsedAdminInventoryItemArgs = {
  resourceKey: string;
  playerArg: string;
  amount: number;
};

export type ParsedRestoreGrassArgs = {
  locationArg: string;
  amount: number | "full";
};

export const DEFAULT_ADMIN_GRASS_MAX_AMOUNT = 80;

function isPositiveInteger(value: string | undefined) {
  return Boolean(value && /^\d+$/.test(value) && Number(value) > 0);
}

export function parseAddResourceArgs(raw: string, defaultResourceKey = ""): ParsedAddResourceArgs {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  const resourceKey = defaultResourceKey || String(parts.shift() ?? "").trim();
  let amount = 1;

  if (isPositiveInteger(parts[parts.length - 1])) amount = Number(parts.pop());

  return {
    resourceKey,
    locationArg: parts.join(" "),
    amount,
  };
}

export function nextResourceAmount(current: number, maxAmount: number, amountToAdd: number) {
  const safeMax = Math.max(1, maxAmount);
  const safeCurrent = Math.max(0, current);
  const safeDelta = Math.max(1, amountToAdd);
  return Math.min(safeMax, safeCurrent + safeDelta);
}

export function parseRestoreGrassArgs(raw: string): ParsedRestoreGrassArgs {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  let amount: number | "full" = "full";
  const last = parts[parts.length - 1]?.toLowerCase();

  if (isPositiveInteger(last)) amount = Number(parts.pop());
  else if (last && ["full", "all", "повністю", "усе", "все"].includes(last)) {
    amount = "full";
    parts.pop();
  }

  return {
    locationArg: parts.join(" "),
    amount,
  };
}

export function nextGrassRestoreAmount(current: number, maxAmount: number, amount: number | "full") {
  const safeMax = Math.max(1, maxAmount);
  if (amount === "full") return safeMax;
  return nextResourceAmount(current, safeMax, amount);
}

export function grassRecoveryThreshold(maxAmount: number) {
  return Math.ceil(Math.max(1, maxAmount) / 4);
}

export function parseAdminInventoryResourceArgs(raw: string): ParsedAdminInventoryResourceArgs {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  let amount = 1;

  if (isPositiveInteger(parts[parts.length - 1])) amount = Number(parts.pop());

  return {
    playerArg: parts.join(" "),
    amount,
  };
}

export function parseAdminInventoryItemArgs(raw: string, defaultResourceKey = ""): ParsedAdminInventoryItemArgs {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  let amount = 1;

  if (isPositiveInteger(parts[parts.length - 1])) amount = Number(parts.pop());

  const resourceKey = defaultResourceKey || String(parts.shift() ?? "").trim();
  return {
    resourceKey,
    playerArg: parts.join(" "),
    amount,
  };
}
