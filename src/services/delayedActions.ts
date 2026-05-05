import { TICK_MS } from "../gameConfig";
import { setLastRuntimeError } from "../runtimeState";
import { logEvent } from "./worldEvents";

export function runDelayed(label: string, ticks: number, action: () => Promise<void>) {
  setTimeout(() => {
    action().catch((error) => {
      setLastRuntimeError(error);
      console.error(`${label} failed:`, error);
      logEvent("ERROR", `${label} failed`, String(error)).catch(() => undefined);
    });
  }, ticks * TICK_MS);
}
