import { Bot } from "grammy";
import { ACTION_QUEUE_POLL_MS } from "../gameConfig";
import { setLastRuntimeError } from "../runtimeState";
import { logEvent } from "./worldEvents";
import { completeAction } from "./actionCompletions";
import { processActionQueue } from "./actionLifecycle";

export { actionDurationMs, actionStaminaCost, gatherDurationMs, movementDurationMs } from "./actionRules";
export { playerRestStatusText, renderPlayerActionQueue } from "./actionQueueView";
export {
  accelerateFirstQueuedPlayerAction,
  cancelCurrentPlayerAction,
  clearQueuedPlayerActions,
  enqueueCreatureAction,
  enqueuePlayerAction,
  enqueueWorldAction,
  hasActiveCreatureActions,
  hasPlayerActionQueueControls,
  interruptActorActions,
  performOrQueuePlayerAction,
  playerActionQueueControlCount,
  queuePlayerRest,
  startPlayerRest,
  stopPlayerRest,
} from "./actionLifecycle";

let actionQueueTimer: NodeJS.Timeout | null = null;
let actionQueueBot: Bot | null = null;

function runActionQueueLoop(bot: Bot) {
  processActionQueue(bot, completeAction).catch((error) => {
    setLastRuntimeError(error);
    console.error("Action queue failed:", error);
    logEvent("ERROR", "Action queue failed", String(error)).catch(() => undefined);
  });
}

export function restartActionQueueLoop() {
  if (!actionQueueBot) return;
  if (actionQueueTimer) clearInterval(actionQueueTimer);
  actionQueueTimer = setInterval(() => runActionQueueLoop(actionQueueBot!), ACTION_QUEUE_POLL_MS);
}

export function startActionQueueLoop(bot: Bot) {
  actionQueueBot = bot;
  restartActionQueueLoop();
}
