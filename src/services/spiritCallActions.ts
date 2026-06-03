import { prisma } from "../db";
import { isSpiritCallActionLike } from "./spiritCall";

export async function summarizeQueuedOrRunningSpiritCallActionsForPlayer(playerId: number) {
  const actions = await prisma.worldAction.findMany({
    where: {
      actorType: "PLAYER",
      playerId,
      status: { in: ["QUEUED", "RUNNING"] },
      interruptible: true,
    },
    select: { id: true, note: true, payload: true },
  });
  const spiritCallIds: number[] = [];
  let otherCount = 0;
  for (const action of actions) {
    if (isSpiritCallActionLike(action)) spiritCallIds.push(action.id);
    else otherCount += 1;
  }
  return { spiritCallIds, otherCount };
}

export async function cancelQueuedOrRunningSpiritCallActionsForPlayer(playerId: number, reason = "manual action overrode spirit call") {
  const { spiritCallIds } = await summarizeQueuedOrRunningSpiritCallActionsForPlayer(playerId);
  if (spiritCallIds.length === 0) return { count: 0 };

  return prisma.worldAction.updateMany({
    where: { id: { in: spiritCallIds } },
    data: { status: "CANCELLED", note: reason },
  });
}
