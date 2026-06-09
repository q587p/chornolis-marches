import { Bot } from "grammy";
import { config } from "../config";
import { setLastRuntimeError } from "../runtimeState";
import { withSlowLog } from "../utils/slowLog";
import { recoverStamina } from "./actionRecovery";
import { logEvent } from "./worldEvents";

let recoveryTimer: NodeJS.Timeout | null = null;
let recoveryBot: Bot | null = null;
let recoveryRunning = false;

function runRecoveryLoop(bot: Bot) {
  if (recoveryRunning) return;
  recoveryRunning = true;
  withSlowLog("recoveryLoop.pass", () => recoverStamina(bot))
    .catch((error) => {
      setLastRuntimeError(error);
      console.error("Recovery loop failed:", error);
      logEvent("ERROR", "Recovery loop failed", String(error)).catch(() => undefined);
    })
    .finally(() => {
      recoveryRunning = false;
    });
}

export function restartRecoveryLoop() {
  if (!recoveryBot) return;
  if (recoveryTimer) clearInterval(recoveryTimer);
  runRecoveryLoop(recoveryBot);
  recoveryTimer = setInterval(() => runRecoveryLoop(recoveryBot!), config.recoveryPollMs);
}

export function startRecoveryLoop(bot: Bot) {
  recoveryBot = bot;
  restartRecoveryLoop();
}
