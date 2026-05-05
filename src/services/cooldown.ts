import { TICK_MS } from "../gameConfig";

const actionCooldown = new Map<string, number>();

export function canSpendTicks(key: string, ticks = 1) {
  const now = Date.now();
  const until = actionCooldown.get(key) || 0;
  if (now < until) return false;
  actionCooldown.set(key, now + ticks * TICK_MS);
  return true;
}
