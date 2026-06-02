import type { WorldActionType } from "@prisma/client";

export class PlayerMustStandError extends Error {
  constructor(
    public readonly actionType: WorldActionType | string,
    message = sittingActionBlockMessage(actionType),
    public readonly recoveryAction: "stand" | "wake" = "stand",
  ) {
    super(message);
    this.name = "PlayerMustStandError";
  }
}

const PHYSICAL_ACTION_TYPES = new Set<WorldActionType>([
  "MOVE",
  "GATHER",
  "GATHER_SPECIFIC",
  "ATTACK",
  "FRESHEN",
  "DROP_ITEM",
  "COOK",
  "LIGHT_TORCH",
  "DOUSE_TORCH",
  "ADD_TWIGS",
  "LIGHT_CAMPFIRE",
  "BUILD_CAMPFIRE",
  "DOUSE_CAMPFIRE",
  "DISMANTLE_CAMPFIRE",
  "DISMANTLE_TOTEM",
  "SET_TRAP",
]);

export function isPhysicalPlayerAction(type: WorldActionType) {
  return PHYSICAL_ACTION_TYPES.has(type);
}

export function isPlayerMustStandError(error: unknown): error is PlayerMustStandError {
  return error instanceof PlayerMustStandError;
}

export function isSittingOrResting(player: { posture?: string | null; isResting?: boolean | null }) {
  return player.posture === "SITTING" || Boolean(player.isResting);
}

export function isLyingOrSleeping(player: { posture?: string | null; sleepState?: string | null }) {
  return player.posture === "LYING" || player.sleepState === "ORDINARY_SLEEP";
}

export function assertCanPerformPhysicalAction(player: { posture?: string | null; sleepState?: string | null; isResting?: boolean | null }, actionType: WorldActionType | string) {
  if (player.sleepState === "ORDINARY_SLEEP") throw new PlayerMustStandError(actionType, sleepingActionBlockMessage(actionType), "wake");
  if (player.posture === "LYING") throw new PlayerMustStandError(actionType, lyingActionBlockMessage(actionType));
  if (isSittingOrResting(player)) throw new PlayerMustStandError(actionType);
}

export function sittingActionBlockMessage(type: WorldActionType | string) {
  if (type === "MOVE") return "Ви не можете піти, поки сидите. Вам треба встати.";
  if (type === "GATHER" || type === "GATHER_SPECIFIC") return "Ви не можете збирати, поки сидите. Вам треба встати.";
  if (type === "ATTACK") return "Ви не можете атакувати, поки сидите. Вам треба встати.";
  if (type === "FRESHEN") return "Ви не можете освіжувати тушу, поки сидите. Вам треба встати.";
  if (type === "DROP_ITEM") return "Ви не можете викинути це, поки сидите. Вам треба встати.";
  if (type === "COOK") return "Ви не можете підсмажувати, поки сидите. Вам треба встати.";
  if (type === "LIGHT_TORCH" || type === "DOUSE_TORCH") return "Ви не можете поратися з факелом, поки сидите. Вам треба встати.";
  if (type === "ADD_TWIGS" || type === "LIGHT_CAMPFIRE" || type === "BUILD_CAMPFIRE" || type === "DOUSE_CAMPFIRE" || type === "DISMANTLE_CAMPFIRE") return "Ви не можете поратися з вогнем, поки сидите. Вам треба встати.";
  if (type === "DISMANTLE_TOTEM") return "Ви не можете розбирати тотем, поки сидите. Вам треба встати.";
  if (type === "SET_TRAP") return "Ви не можете ставити пастку, поки сидите. Вам треба встати.";
  if (type === "PICK_UP") return "Ви не можете взяти це, поки сидите. Вам треба встати.";
  if (type === "DROP") return "Ви не можете викинути це, поки сидите. Вам треба встати.";
  if (type === "PUT") return "Ви не можете покласти це, поки сидите. Вам треба встати.";
  if (type === "GIVE") return "Ви не можете передати це, поки сидите. Вам треба встати.";
  if (type === "COOK") return "Ви не можете підсмажувати, поки сидите. Вам треба встати.";
  if (type === "FIRE") return "Ви не можете поратися з вогнем, поки сидите. Вам треба встати.";
  if (type === "TORCH") return "Ви не можете поратися з факелом, поки сидите. Вам треба встати.";
  return "Ви не можете виконати цю дію, поки сидите. Вам треба встати.";
}

export function lyingActionBlockMessage(type: WorldActionType | string) {
  return sittingActionBlockMessage(type).split("сидите").join("лежите");
}

export function sleepingActionBlockMessage(_type: WorldActionType | string) {
  return "Ви спите. Спершу треба прокинутися.";
}
