import {
  getActionQueueRuntimeSnapshot,
  getCreatureQueueRuntimeSnapshot,
  getRecoveryRuntimeSnapshot,
  type ActionQueuePhaseDurations,
  type ActionQueueRuntimeSnapshot,
  type CreatureQueuePhaseDurations,
  type CreatureQueueRuntimeSnapshot,
  type RecoveryPhaseDurations,
  type RecoveryRuntimeSnapshot,
} from "../runtimeState";
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

export function formatCreatureQueuePhaseDurations(durations: CreatureQueuePhaseDurations | null | undefined) {
  if (!durations) return "немає завершеного проходу";
  return [
    `complete=${formatQueueDurationMs(durations.creatureCompleteMs)}`,
    `start=${formatQueueDurationMs(durations.creatureStartMs)}`,
    `total=${formatQueueDurationMs(durations.totalMs)}`,
  ].join("; ");
}

export function formatRecoveryPhaseDurations(durations: RecoveryPhaseDurations | null | undefined) {
  if (!durations) return "немає завершеного проходу";
  return [
    `players=${formatQueueDurationMs(durations.playersMs)}`,
    `creatures=${formatQueueDurationMs(durations.creaturesMs)}`,
    `total=${formatQueueDurationMs(durations.totalMs)}`,
  ].join("; ");
}

function formatAgo(value: Date | null | undefined, now: Date) {
  if (!value) return "немає";
  return `${formatQueueDurationMs(now.getTime() - value.getTime())} тому`;
}

function formatRunning(snapshot: Pick<ActionQueueRuntimeSnapshot | CreatureQueueRuntimeSnapshot | RecoveryRuntimeSnapshot, "running" | "runningSince">, now: Date) {
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
  creatureSnapshot: CreatureQueueRuntimeSnapshot = getCreatureQueueRuntimeSnapshot(),
  recoverySnapshotOrNow: RecoveryRuntimeSnapshot | Date = getRecoveryRuntimeSnapshot(),
  nowMaybe?: Date,
) {
  const recoverySnapshot = recoverySnapshotOrNow instanceof Date ? getRecoveryRuntimeSnapshot() : recoverySnapshotOrNow;
  const now = recoverySnapshotOrNow instanceof Date ? recoverySnapshotOrNow : nowMaybe ?? new Date();
  return [
    "🧵 Службова черга: debug",
    `running: ${formatRunning(snapshot, now)}`,
    `lastStarted: ${formatAgo(snapshot.lastStartedAt, now)}`,
    `lastFinished: ${formatAgo(snapshot.lastFinishedAt, now)}`,
    `lastError: ${snapshot.lastError ?? "немає"}`,
    `phaseMs: ${formatQueuePhaseDurations(snapshot.lastPhaseDurations)}`,
    `lastCounts: completedPlayer=${snapshot.lastCompletedPlayerActions}; startedPlayer=${snapshot.lastStartedPlayerActions}; creatureKick=${snapshot.lastTriggeredCreatureQueue ? "так" : "ні"}`,
    `creatureQueue: running=${formatRunning(creatureSnapshot, now)}; mode=${creatureSnapshot.lastMode ?? "немає"}; reason=${creatureSnapshot.lastReason ?? "немає"}`,
    `creaturePhaseMs: ${formatCreatureQueuePhaseDurations(creatureSnapshot.lastPhaseDurations)}`,
    `creatureCounts: completed=${creatureSnapshot.lastCompletedCreatureActions}; started=${creatureSnapshot.lastStartedCreatureActions}; skippedStarts=${creatureSnapshot.lastSkippedCreatureStarts ? "yes" : "no"}`,
    `recovery: running=${formatRunning(recoverySnapshot, now)}; lastFinished=${formatAgo(recoverySnapshot.lastFinishedAt, now)}; lastError=${recoverySnapshot.lastError ?? "немає"}`,
    `recoveryPhaseMs: ${formatRecoveryPhaseDurations(recoverySnapshot.lastPhaseDurations)}`,
    `recoveryCounts: playersScanned=${recoverySnapshot.lastPlayersScanned}; playersUpdated=${recoverySnapshot.lastPlayersUpdated}; playersSkippedActive=${recoverySnapshot.lastPlayersSkippedActive}; idleReminders=${recoverySnapshot.lastIdleRemindersSent}; sleepAutoWakes=${recoverySnapshot.lastSleepAutoWakes}; playerMessages=${recoverySnapshot.lastPlayerMessagesSent}; creaturesScanned=${recoverySnapshot.lastCreaturesScanned}; creaturesUpdated=${recoverySnapshot.lastCreaturesUpdated}; activeCreaturesRefreshed=${recoverySnapshot.lastActiveCreaturesRefreshed}`,
    `queued: player=${stats.playerQueued}; creature=${stats.creatureQueued}; total=${stats.totalQueued}`,
    `runningActions: player=${stats.playerRunning}; creature=${stats.creatureRunning}; total=${stats.totalRunning}`,
    `oldestQueued: player=${formatQueueDurationMs(stats.oldestQueuedPlayerAgeMs)}; creature=${formatQueueDurationMs(stats.oldestQueuedCreatureAgeMs)}; total=${formatQueueDurationMs(stats.oldestQueuedAgeMs)}`,
    `overdue: player=${stats.playerOverdue} (${formatQueueDurationMs(stats.playerMaxOverdueMs)}); creature=${stats.creatureOverdue} (${formatQueueDurationMs(stats.creatureMaxOverdueMs)}); total=${stats.overdueRunning} (${formatQueueDurationMs(stats.maxOverdueMs)})`,
    "topOverdue:",
    formatTopOverdue(stats),
  ].join("\n");
}

export async function buildActionQueueDebugReport() {
  const [stats, snapshot, creatureSnapshot, recoverySnapshot] = await Promise.all([
    getActionQueueStats(),
    Promise.resolve(getActionQueueRuntimeSnapshot()),
    Promise.resolve(getCreatureQueueRuntimeSnapshot()),
    Promise.resolve(getRecoveryRuntimeSnapshot()),
  ]);
  return formatActionQueueDebugReport(stats, snapshot, creatureSnapshot, recoverySnapshot);
}
