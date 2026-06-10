export type QueueDebugTextSummary = {
  playerOverdue?: number;
  creatureOverdue?: number;
  databaseSlow?: number;
  telegramSlow?: number;
  actionCompletionSlow?: number;
  deferredPending?: number;
  recommendations: string[];
};

function extractInt(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (!match?.[1]) return undefined;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : undefined;
}

function parseDurationMs(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s)$/i);
  if (!match) return undefined;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  return match[2].toLowerCase() === "s" ? amount * 1000 : amount;
}

function extractDurationMs(text: string, label: string): number | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return parseDurationMs(text.match(new RegExp(`${escaped}=([0-9.]+\\s*(?:ms|s))`))?.[1]);
}

function hasPositive(value: number | undefined) {
  return typeof value === "number" && value > 0;
}

export function summarizeQueueDebugText(text: string): QueueDebugTextSummary {
  const playerOverdue = extractInt(text, /overdue:\s*player=(\d+)/);
  const creatureOverdue = extractInt(text, /overdue:[^\n]*creature=(\d+)/);
  const databaseSlow = extractInt(text, /databaseQuery:[^\n]*slow=(\d+)/);
  const telegramSlow = extractInt(text, /telegramSend:[^\n]*slow=(\d+)/);
  const actionCompletionSlow = extractInt(text, /completionSlow:[^\n]*slow=(\d+)/);
  const deferredPending = extractInt(text, /deferredTelegram:[^\n]*pending=(\d+)/);
  const deferredDropped = extractInt(text, /deferredTelegram:[^\n]*dropped=(\d+)/);
  const deferredExpired = extractInt(text, /deferredTelegram:[^\n]*expired=(\d+)/);
  const deferredErrors = extractInt(text, /deferredTelegram:[^\n]*errors=(\d+)/);

  const playerCompleteMs = extractDurationMs(text, "playerComplete");
  const creatureCompleteMs = extractDurationMs(text, "complete");
  const recoveryPlayersMs = extractDurationMs(text, "players");
  const recoveryCreaturesMs = extractDurationMs(text, "creatures");
  const recommendations: string[] = [];

  if (hasPositive(playerOverdue) && (hasPositive(actionCompletionSlow) || (playerCompleteMs ?? 0) >= 100)) {
    recommendations.push("Inspect recent slow action completions and choose an action-specific optimization PR first.");
  }

  if (hasPositive(playerOverdue) && (hasPositive(creatureOverdue) || (creatureCompleteMs ?? 0) >= 100)) {
    recommendations.push("Inspect creature queue mode/reason before tuning creature backpressure thresholds.");
  }

  if ((recoveryPlayersMs ?? 0) >= 100 || (recoveryCreaturesMs ?? 0) >= 100) {
    recommendations.push("Inspect recovery counts and side effects before changing recovery cadence.");
  }

  if (hasPositive(telegramSlow)) {
    recommendations.push("Inspect awaited Telegram send contexts before deferring or reducing fan-out.");
  }

  if (hasPositive(databaseSlow)) {
    recommendations.push("Inspect database model/action samples before proposing query rewrites or indexes.");
  }

  if (hasPositive(deferredPending) || hasPositive(deferredDropped) || hasPositive(deferredExpired) || hasPositive(deferredErrors)) {
    recommendations.push("Inspect deferred follow-up drops/errors and decide whether queue limits or message criticality should change.");
  }

  if (recommendations.length === 0) {
    recommendations.push("No single bottleneck stands out; collect another idle/active/after-drain snapshot set before tuning.");
  }

  return {
    playerOverdue,
    creatureOverdue,
    databaseSlow,
    telegramSlow,
    actionCompletionSlow,
    deferredPending,
    recommendations,
  };
}
