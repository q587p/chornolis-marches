export type ParsedAddResourceArgs = {
  resourceKey: string;
  locationArg: string;
  amount: number;
};

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
