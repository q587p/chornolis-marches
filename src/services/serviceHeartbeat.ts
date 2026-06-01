import { prisma } from "../db";

export const HERALD_SERVICE_KEY = "herald";
export const HERALD_SERVICE_LABEL = "Канцелярія Межового Знаку";
export const HERALD_STANDALONE_MODE = "standalone";
export const SERVICE_HEARTBEAT_INTERVAL_MS = 60_000;
export const SERVICE_HEARTBEAT_STALE_AFTER_MS = 3 * SERVICE_HEARTBEAT_INTERVAL_MS;

type ServiceHeartbeatInput = {
  serviceKey: string;
  mode?: string | null;
  startedAt?: Date | null;
  now?: Date;
};

export type ServiceHeartbeatSnapshot = {
  serviceKey: string;
  mode: string | null;
  startedAt: Date | null;
  lastSeenAt: Date;
};

export async function recordServiceHeartbeat(input: ServiceHeartbeatInput) {
  const now = input.now ?? new Date();
  return prisma.serviceHeartbeat.upsert({
    where: { serviceKey: input.serviceKey },
    create: {
      serviceKey: input.serviceKey,
      mode: input.mode ?? null,
      startedAt: input.startedAt ?? now,
      lastSeenAt: now,
    },
    update: {
      mode: input.mode ?? null,
      startedAt: input.startedAt ?? undefined,
      lastSeenAt: now,
    },
  });
}

export async function getServiceHeartbeat(serviceKey: string): Promise<ServiceHeartbeatSnapshot | null> {
  return prisma.serviceHeartbeat.findUnique({
    where: { serviceKey },
    select: {
      serviceKey: true,
      mode: true,
      startedAt: true,
      lastSeenAt: true,
    },
  });
}

export function serviceHeartbeatAgeMs(heartbeat: { lastSeenAt: Date } | null | undefined, now = new Date()) {
  if (!heartbeat) return null;
  return Math.max(0, now.getTime() - heartbeat.lastSeenAt.getTime());
}

export function isServiceHeartbeatStale(
  heartbeat: { lastSeenAt: Date } | null | undefined,
  now = new Date(),
  staleAfterMs = SERVICE_HEARTBEAT_STALE_AFTER_MS,
) {
  const ageMs = serviceHeartbeatAgeMs(heartbeat, now);
  return ageMs === null || ageMs > staleAfterMs;
}

export function startServiceHeartbeatLoop(input: ServiceHeartbeatInput & { intervalMs?: number; logLabel?: string }) {
  const intervalMs = Math.max(5_000, Math.floor(input.intervalMs ?? SERVICE_HEARTBEAT_INTERVAL_MS));
  let lastFailureMessage: string | null = null;

  const beat = async () => {
    try {
      await recordServiceHeartbeat(input);
      lastFailureMessage = null;
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error);
      if (message !== lastFailureMessage) {
        console.warn(`${input.logLabel ?? input.serviceKey} heartbeat failed:`, message);
        lastFailureMessage = message;
      }
    }
  };

  void beat();
  const timer = setInterval(() => void beat(), intervalMs);
  timer.unref?.();
  return timer;
}
