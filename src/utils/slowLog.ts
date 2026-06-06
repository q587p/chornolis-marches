export const DEFAULT_SLOW_COMMAND_LOG_MS = 1000;

export function slowLogThresholdMs(value = process.env.SLOW_COMMAND_LOG_MS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SLOW_COMMAND_LOG_MS;
  return Math.max(0, Math.floor(parsed));
}

export async function withSlowLog<T>(
  label: string,
  fn: () => Promise<T>,
  thresholdMs = slowLogThresholdMs(),
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const durationMs = Date.now() - start;
    if (thresholdMs > 0 && durationMs >= thresholdMs) {
      console.warn(`slow:${label} durationMs=${durationMs}`);
    }
  }
}
