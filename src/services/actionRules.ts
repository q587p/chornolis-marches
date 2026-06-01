import { WorldAction, WorldActionType } from "@prisma/client";
import {
  ACTION_BASE_TICKS,
  BASE_STAMINA,
  MIN_ACTION_DURATION_MS,
  QUICK_PLAYER_ACTION_DURATION_MS,
  TICK_MS,
  actionDurationTicks,
  actionPriorityConfig,
  gatherConfig,
  playerStaminaCostConfig,
} from "../gameConfig";
import { directionLabels } from "../ui/labels";

type MovePayload = { direction?: keyof typeof directionLabels };
type GatherPayload = { resourceKey?: "berries" | "mushrooms" | "herbs" };
type InventoryPayload = { resourceKey?: string; target?: string; allFilter?: string | null; cacheContribution?: boolean };

const CACHE_CONTRIBUTION_LABELS: Record<string, string> = {
  berries: "ягоди",
  herbs: "лікарські трави",
  mushrooms: "гриби",
  raw_meat: "сире м'ясо",
  cooked_meat: "смажене м'ясо",
  twigs: "хмиз",
};

export function actionPriority(type: WorldActionType) {
  return actionPriorityConfig[type] ?? 0;
}

export function actionCost(type: WorldActionType) {
  return playerStaminaCostConfig[type] ?? 1;
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
      herbs: "лікарські трави",
    };
    if (!payload.resourceKey) return "збираємо щось поблизу";
    return `збираємо ${names[payload.resourceKey] ?? payload.resourceKey}`;
  }

  if (action.type === "EAT") return "їмо";
  if (action.type === "USE_ITEM") {
    const payload = action.payload as unknown as InventoryPayload;
    if (payload.resourceKey === "berries") return "їмо ягоди";
    if (payload.resourceKey === "mushrooms") return "їмо гриби";
    if (payload.resourceKey === "herbs") return "використовуємо трави";
    if (payload.resourceKey === "cooked_meat") return "їмо смажене м'ясо";
    return "використовуємо річ";
  }
  if (action.type === "DROP_ITEM") {
    const payload = action.payload as unknown as InventoryPayload;
    if (payload.cacheContribution) {
      const label = payload.resourceKey ? CACHE_CONTRIBUTION_LABELS[payload.resourceKey] : null;
      return label ? `лишаємо ${label} у скрині` : "лишаємо річ у скрині";
    }
    return payload.allFilter !== undefined ? "викладаємо речі" : "викидаємо річ";
  }
  if (action.type === "COOK") return "підсмажуємо м'ясо";
  if (action.type === "LIGHT_TORCH") return "запалюємо факел";
  if (action.type === "DOUSE_TORCH") return "притушуємо факел";
  if (action.type === "ADD_TWIGS") return "підкидаємо хмиз";
  if (action.type === "LIGHT_CAMPFIRE") return "розпалюємо вогонь";
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
  return Math.max(MIN_ACTION_DURATION_MS, actionDurationTicks("MOVE") * TICK_MS * Math.max(1, travelCost));
}

export function gatherDurationMs(resourceKey: keyof typeof gatherConfig, _stamina = BASE_STAMINA) {
  return Math.max(MIN_ACTION_DURATION_MS, (gatherConfig[resourceKey]?.ticks ?? actionDurationTicks("GATHER_SPECIFIC")) * ACTION_BASE_TICKS * TICK_MS);
}

export function actionDurationMs(type: WorldActionType, _stamina = BASE_STAMINA) {
  return Math.max(MIN_ACTION_DURATION_MS, actionDurationTicks(type) * TICK_MS);
}

export function actionStaminaCost(type: WorldActionType) {
  return actionCost(type);
}
