import { prisma } from "../db";
import { config } from "../config";
import { getLastRuntimeError } from "../runtimeState";

const ACTIVE_ACTION_STATUSES = ["QUEUED", "RUNNING"] as const;

function oldestAgeMs(value: Date | null | undefined, now: Date) {
  return value ? Math.max(0, now.getTime() - value.getTime()) : 0;
}

export async function getActionQueueStats() {
  const now = new Date();
  const [groups, oldestQueued, oldestRunning, overdueRunning, overdueGroups] = await Promise.all([
    prisma.worldAction.groupBy({
      by: ["actorType", "status"],
      where: { status: { in: [...ACTIVE_ACTION_STATUSES] } },
      _count: { _all: true },
    }),
    prisma.worldAction.findFirst({
      where: { status: "QUEUED" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { createdAt: true },
    }),
    prisma.worldAction.findFirst({
      where: { status: "RUNNING" },
      orderBy: [{ startedAt: "asc" }, { id: "asc" }],
      select: { startedAt: true },
    }),
    prisma.worldAction.findMany({
      where: { status: "RUNNING", executeAt: { lte: now } },
      orderBy: [{ executeAt: "asc" }, { id: "asc" }],
      take: 1,
      select: { executeAt: true },
    }),
    prisma.worldAction.groupBy({
      by: ["actorType"],
      where: { status: "RUNNING", executeAt: { lte: now } },
      _count: { _all: true },
    }),
  ]);

  const stats = {
    playerQueued: 0,
    playerRunning: 0,
    creatureQueued: 0,
    creatureRunning: 0,
    totalQueued: 0,
    totalRunning: 0,
    oldestQueuedAgeMs: oldestAgeMs(oldestQueued?.createdAt, now),
    oldestRunningAgeMs: oldestAgeMs(oldestRunning?.startedAt, now),
    overdueRunning: 0,
    maxOverdueMs: oldestAgeMs(overdueRunning[0]?.executeAt, now),
  };

  for (const group of groups) {
    const count = group._count._all;
    if (group.status === "QUEUED") stats.totalQueued += count;
    if (group.status === "RUNNING") stats.totalRunning += count;
    if (group.actorType === "PLAYER" && group.status === "QUEUED") stats.playerQueued = count;
    if (group.actorType === "PLAYER" && group.status === "RUNNING") stats.playerRunning = count;
    if (group.actorType === "CREATURE" && group.status === "QUEUED") stats.creatureQueued = count;
    if (group.actorType === "CREATURE" && group.status === "RUNNING") stats.creatureRunning = count;
  }

  stats.overdueRunning = overdueGroups.reduce((sum, group) => sum + group._count._all, 0);

  return stats;
}

export async function getStatusData() {
  const [
    playersCount,
    regionsCount,
    locationsCount,
    exitsCount,
    aliveAnimalsCount,
    animalCorpsesCount,
    goneAnimalsCount,
    npcCount,
    aliveCreaturesCount,
    resourcesCount,
    eventsCount,
    latestEvents,
    actionQueue,
  ] = await Promise.all([
    prisma.player.count(),
    prisma.region.count(),
    prisma.cellLocation.count(),
    prisma.locationExit.count(),
    prisma.creature.count({ where: { isAlive: true, isGone: false, species: { kind: "ANIMAL" } } }),
    prisma.creature.count({ where: { isAlive: false, isGone: false, species: { kind: "ANIMAL" } } }),
    prisma.creature.count({ where: { isGone: true, species: { kind: "ANIMAL" } } }),
    prisma.creature.count({ where: { isAlive: true, isGone: false, species: { kind: { not: "ANIMAL" } } } }),
    prisma.creature.count({ where: { isAlive: true, isGone: false } }),
    prisma.resourceNode.count(),
    prisma.worldEvent.count(),
    prisma.worldEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    getActionQueueStats(),
  ]);

  return {
    version: config.appVersion,
    playersCount,
    regionsCount,
    locationsCount,
    exitsCount,
    aliveAnimalsCount,
    animalCorpsesCount,
    goneAnimalsCount,
    npcCount,
    aliveCreaturesCount,
    resourcesCount,
    eventsCount,
    latestEvent: latestEvents[0] ?? null,
    latestEvents,
    actionQueue,
    lastRuntimeError: getLastRuntimeError(),
  };
}
