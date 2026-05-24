import { WorldAction, WorldActionType } from "@prisma/client";
import {
  ACTION_BASE_TICKS,
  BASE_STAMINA,
  MIN_ACTION_DURATION_MS,
  QUICK_PLAYER_ACTION_DURATION_MS,
  TICK_MS,
  actionPriorityConfig,
  gatherConfig,
  playerStaminaCostConfig,
} from "../gameConfig";
import { directionLabels } from "../ui/labels";

type MovePayload = { direction?: keyof typeof directionLabels };
type GatherPayload = { resourceKey?: "berries" | "mushrooms" | "herbs" };

export function actionPriority(type: WorldActionType) {
  return actionPriorityConfig[type] ?? 0;
}

export function actionCost(type: WorldActionType) {
  return playerStaminaCostConfig[type] ?? 1;
}

function actionTicks(type: WorldActionType) {
  return Math.max(1, (playerStaminaCostConfig[type] ?? 1) * ACTION_BASE_TICKS);
}

export function effectivePlayerActionDurationMs(player: { stamina: number } | null | undefined, type: WorldActionType, requestedDurationMs: number) {
  if (type !== "REST" && type !== "WAIT" && player && player.stamina > 0) return QUICK_PLAYER_ACTION_DURATION_MS;
  return requestedDurationMs;
}

export function actionTitle(action: Pick<WorldAction, "type" | "payload" | "durationMs">) {
  if (action.type === "MOVE") {
    const payload = action.payload as unknown as MovePayload;
    const direction = payload.direction ? directionLabels[payload.direction].toLowerCase() : "невідомий напрямок";
    return `йдемо на ${direction}`;
  }

  if (action.type === "GATHER" || action.type === "GATHER_SPECIFIC") {
    const payload = action.payload as unknown as GatherPayload;
    const names: Record<NonNullable<GatherPayload["resourceKey"]>, string> = {
      berries: "ягоди",
      mushrooms: "гриби",
      herbs: "трави",
    };
    if (!payload.resourceKey) return "збираємо щось поблизу";
    return `збираємо ${names[payload.resourceKey] ?? payload.resourceKey}`;
  }

  if (action.type === "EAT") return "їмо";
  if (action.type === "LOOK") return "озираємось";
  if (action.type === "INSPECT") return "роздивляємось ціль";
  if (action.type === "GREET") return "вітаємось";
  if (action.type === "ATTACK") return "атакуємо";
  if (action.type === "FRESHEN") return "освіжуємо труп";
  if (action.type === "SAY") return "говоримо";
  if (action.type === "TRACK") return "вистежуємо";
  if (action.type === "REST") return "відпочиваємо";
  if (action.type === "SET_TRAP") return "ставимо пастку";
  if (action.type === "WAIT") return "чекаємо";

  return String(action.type).toLowerCase();
}

export function movementDurationMs(travelCost = 1, _stamina = BASE_STAMINA) {
  return Math.max(MIN_ACTION_DURATION_MS, actionTicks("MOVE") * TICK_MS * Math.max(1, travelCost));
}

export function gatherDurationMs(resourceKey: keyof typeof gatherConfig, _stamina = BASE_STAMINA) {
  return Math.max(MIN_ACTION_DURATION_MS, (gatherConfig[resourceKey]?.ticks ?? actionTicks("GATHER_SPECIFIC")) * ACTION_BASE_TICKS * TICK_MS);
}

export function actionDurationMs(type: WorldActionType, _stamina = BASE_STAMINA) {
  return Math.max(MIN_ACTION_DURATION_MS, actionTicks(type) * TICK_MS);
}

export function actionStaminaCost(type: WorldActionType) {
  return actionCost(type);
}
