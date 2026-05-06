import { prisma } from "../db";
import { config } from "../config";
import { getLastRuntimeError } from "../runtimeState";

export async function getStatusData() {
  const [
    playersCount,
    regionsCount,
    locationsCount,
    exitsCount,
    aliveAnimalsCount,
    npcCount,
    aliveCreaturesCount,
    resourcesCount,
    eventsCount,
    latestEvents,
  ] = await Promise.all([
    prisma.player.count(),
    prisma.region.count(),
    prisma.cellLocation.count(),
    prisma.locationExit.count(),
    prisma.creature.count({ where: { isAlive: true, species: { kind: "ANIMAL" } } }),
    prisma.creature.count({ where: { isAlive: true, species: { kind: { not: "ANIMAL" } } } }),
    prisma.creature.count({ where: { isAlive: true } }),
    prisma.resourceNode.count(),
    prisma.worldEvent.count(),
    prisma.worldEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return {
    version: config.appVersion,
    playersCount,
    regionsCount,
    locationsCount,
    exitsCount,
    aliveAnimalsCount,
    npcCount,
    aliveCreaturesCount,
    resourcesCount,
    eventsCount,
    latestEvent: latestEvents[0] ?? null,
    latestEvents,
    lastRuntimeError: getLastRuntimeError(),
  };
}
