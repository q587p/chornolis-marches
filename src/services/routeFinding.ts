import { Direction } from "@prisma/client";
import { prisma } from "../db";
import { lockedExitDirections } from "./tutorial";

export type RouteExit = {
  fromLocationId: number;
  toLocationId: number;
  direction: Direction;
  travelCost?: number | null;
  isHidden?: boolean | null;
};

export type RouteStep = {
  fromLocationId: number;
  toLocationId: number;
  direction: Direction;
  travelCost: number;
};

export type RouteBlockedExit = string | { fromLocationId: number; direction: Direction };

export type FindRouteOptions = {
  allowHidden?: boolean;
  blockedExits?: Iterable<RouteBlockedExit>;
  maxDepth?: number;
  maxVisited?: number;
};

export type FindLocationRouteOptions = FindRouteOptions & {
  allowLocked?: boolean;
};

function blockedExitKey(fromLocationId: number, direction: Direction) {
  return `${fromLocationId}:${direction}`;
}

function normalizeBlockedExits(blockedExits?: Iterable<RouteBlockedExit>) {
  const blocked = new Set<string>();
  if (!blockedExits) return blocked;

  for (const exit of blockedExits) {
    if (typeof exit === "string") {
      blocked.add(exit);
    } else {
      blocked.add(blockedExitKey(exit.fromLocationId, exit.direction));
    }
  }
  return blocked;
}

function isUsableExit(exit: RouteExit, options: FindRouteOptions, blocked: Set<string>) {
  if (!options.allowHidden && exit.isHidden) return false;
  return !blocked.has(blockedExitKey(exit.fromLocationId, exit.direction));
}

export function findRouteInGraph(
  exits: RouteExit[],
  startLocationId: number,
  targetLocationId: number,
  options: FindRouteOptions = {},
): RouteStep[] | null {
  if (startLocationId === targetLocationId) return [];

  const maxDepth = Math.max(1, options.maxDepth ?? 80);
  const maxVisited = Math.max(1, options.maxVisited ?? 5_000);
  const blocked = normalizeBlockedExits(options.blockedExits);
  const exitsByFrom = new Map<number, RouteExit[]>();

  for (const exit of exits) {
    if (!isUsableExit(exit, options, blocked)) continue;
    const list = exitsByFrom.get(exit.fromLocationId) ?? [];
    list.push(exit);
    exitsByFrom.set(exit.fromLocationId, list);
  }

  const queue: number[] = [startLocationId];
  const visited = new Set<number>([startLocationId]);
  const previous = new Map<number, RouteStep>();
  const depth = new Map<number, number>([[startLocationId, 0]]);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentDepth = depth.get(current) ?? 0;
    if (currentDepth >= maxDepth) continue;

    for (const exit of exitsByFrom.get(current) ?? []) {
      if (visited.has(exit.toLocationId)) continue;

      const step: RouteStep = {
        fromLocationId: exit.fromLocationId,
        toLocationId: exit.toLocationId,
        direction: exit.direction,
        travelCost: Math.max(1, Math.floor(exit.travelCost ?? 1)),
      };

      previous.set(exit.toLocationId, step);
      if (exit.toLocationId === targetLocationId) {
        const route = [step];
        let cursor = step.fromLocationId;
        while (cursor !== startLocationId) {
          const previousStep = previous.get(cursor);
          if (!previousStep) return null;
          route.push(previousStep);
          cursor = previousStep.fromLocationId;
        }
        return route.reverse();
      }

      visited.add(exit.toLocationId);
      if (visited.size > maxVisited) return null;
      depth.set(exit.toLocationId, currentDepth + 1);
      queue.push(exit.toLocationId);
    }
  }

  return null;
}

export async function findLocationRoute(
  startLocationId: number,
  targetLocationId: number,
  options: FindLocationRouteOptions = {},
) {
  const exits = await prisma.locationExit.findMany({
    where: options.allowHidden ? undefined : { isHidden: false },
    orderBy: [{ fromLocationId: "asc" }, { direction: "asc" }],
  });

  const blockedExits: RouteBlockedExit[] = [...(options.blockedExits ?? [])];
  if (!options.allowLocked) {
    const fromLocationIds = [...new Set(exits.map((exit) => exit.fromLocationId))];
    for (const fromLocationId of fromLocationIds) {
      const locked = await lockedExitDirections(fromLocationId);
      for (const direction of locked.keys()) blockedExits.push({ fromLocationId, direction });
    }
  }

  return findRouteInGraph(exits, startLocationId, targetLocationId, {
    ...options,
    blockedExits,
  });
}
