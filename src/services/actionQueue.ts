import { Bot } from "grammy";
import * as gameConfig from "../gameConfig";
import { setLastRuntimeError } from "../runtimeState";
import { logEvent } from "./worldEvents";
import { completeAction } from "./actionCompletions";
import { processActionQueue } from "./actionLifecycle";
import { withSlowLog } from "../utils/slowLog";

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
  playerObservationActionDedupePolicy,
  queuePlayerRest,
  startPlayerRest,
  stopPlayerRest,
} from "./actionLifecycle";

let actionQueueTimer: NodeJS.Timeout | null = null;
let actionQueueBot: Bot | null = null;
let actionQueueRunning = false;

function runActionQueueLoop(bot: Bot) {
  if (actionQueueRunning) return;
  actionQueueRunning = true;
  withSlowLog("actionQueue.process", () => processActionQueue(bot, completeAction))
    .catch((error) => {
      setLastRuntimeError(error);
      console.error("Action queue failed:", error);
      logEvent("ERROR", "Action queue failed", String(error)).catch(() => undefined);
    })
    .finally(() => {
      actionQueueRunning = false;
    });
}

export function restartActionQueueLoop() {
  if (!actionQueueBot) return;
  if (actionQueueTimer) clearInterval(actionQueueTimer);
  runActionQueueLoop(actionQueueBot);
  actionQueueTimer = setInterval(() => runActionQueueLoop(actionQueueBot!), gameConfig.ACTION_QUEUE_POLL_MS);
}

export function startActionQueueLoop(bot: Bot) {
  actionQueueBot = bot;
  restartActionQueueLoop();
}
