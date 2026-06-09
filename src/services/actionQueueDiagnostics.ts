import { getActionQueueRuntimeSnapshot, type ActionQueuePhaseDurations, type ActionQueueRuntimeSnapshot } from "../runtimeState";
import { getActionQueueStats } from "./status";

export type ActionQueueStatsSnapshot = Awaited<ReturnType<typeof getActionQueueStats>>;

export function formatQueueDurationMs(ms: number) {
  const safeMs = Math.max(0, Math.round(ms));
  if (safeMs < 1000) return `${safeMs} ms`;
  return `${Math.round(safeMs / 100) / 10} s`;
}

export function formatQueuePhaseDurations(durations: ActionQueuePhaseDurations | null | undefined) {
  if (!durations) return "немає завершеного проходу";
  return [
    `playerComplete=${formatQueueDurationMs(durations.playerCompleteMs)}`,
    `playerStart=${formatQueueDurationMs(durations.playerStartMs)}`,
    `playerRefresh=${formatQueueDurationMs(durations.playerRefreshMs)}`,
    `creatureKick=${formatQueueDurationMs(durations.creatureKickMs)}`,
    `total=${formatQueueDurationMs(durations.totalMs)}`,
  ].join("; ");
}

function formatAgo(value: Date | null | undefined, now: Date) {
  if (!value) return "немає";
  return `${formatQueueDurationMs(now.getTime() - value.getTime())} тому`;
}

function formatRunning(snapshot: ActionQueueRuntimeSnapshot, now: Date) {
  if (!snapshot.running) return "ні";
  return snapshot.runningSince ? `так, ${formatQueueDurationMs(now.getTime() - snapshot.runningSince.getTime())}` : "так";
}

function formatTopOverdue(stats: ActionQueueStatsSnapshot) {
  if (stats.topOverdueActions.length === 0) return "немає";
  return stats.topOverdueActions
    .map((action) => {
      const actor = action.actorType === "PLAYER" ? `player:${action.playerId ?? "?"}` : `creature:${action.creatureId ?? "?"}`;
      return `#${action.id} ${actor} ${action.type} overdue=${formatQueueDurationMs(action.overdueMs)}`;
    })
    .join("\n");
}

export function formatActionQueueDebugReport(
  stats: ActionQueueStatsSnapshot,
  snapshot: ActionQueueRuntimeSnapshot,
  now = new Date(),
) {
  return [
    "🧵 Черга дій: debug",
    `running: ${formatRunning(snapshot, now)}`,
    `lastStarted: ${formatAgo(snapshot.lastStartedAt, now)}`,
    `lastFinished: ${formatAgo(snapshot.lastFinishedAt, now)}`,
    `lastError: ${snapshot.lastError ?? "немає"}`,
    `phaseMs: ${formatQueuePhaseDurations(snapshot.lastPhaseDurations)}`,
    `lastCounts: completedPlayer=${snapshot.lastCompletedPlayerActions}; startedPlayer=${snapshot.lastStartedPlayerActions}; creatureKick=${snapshot.lastTriggeredCreatureQueue ? "так" : "ні"}`,
    `queued: player=${stats.playerQueued}; creature=${stats.creatureQueued}; total=${stats.totalQueued}`,
    `runningActions: player=${stats.playerRunning}; creature=${stats.creatureRunning}; total=${stats.totalRunning}`,
    `oldestQueued: player=${formatQueueDurationMs(stats.oldestQueuedPlayerAgeMs)}; creature=${formatQueueDurationMs(stats.oldestQueuedCreatureAgeMs)}; total=${formatQueueDurationMs(stats.oldestQueuedAgeMs)}`,
    `overdue: player=${stats.playerOverdue} (${formatQueueDurationMs(stats.playerMaxOverdueMs)}); creature=${stats.creatureOverdue} (${formatQueueDurationMs(stats.creatureMaxOverdueMs)}); total=${stats.overdueRunning} (${formatQueueDurationMs(stats.maxOverdueMs)})`,
    "topOverdue:",
    formatTopOverdue(stats),
  ].join("\n");
}

export async function buildActionQueueDebugReport() {
  const [stats, snapshot] = await Promise.all([
    getActionQueueStats(),
    Promise.resolve(getActionQueueRuntimeSnapshot()),
  ]);
  return formatActionQueueDebugReport(stats, snapshot);
}
