import { Keyboard } from "grammy";
import { type Direction } from "@prisma/client";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import { formatLifeState, formatResourceState } from "../utils/playerText";
import { playerCanShowTechnicalDetails } from "../services/technicalDetails";
import { DREAM_GATE_FEATURE_KEYS, TUTORIAL_HUB_LOCATION_KEY, TUTORIAL_REST_LOCATION_KEY, TUTORIAL_SAFETY_LOCATION_KEY, TUTORIAL_SECOND_STEP_LOCATION_KEY, TUTORIAL_START_LOCATION_KEY, hasTutorialInventoryAvailable, isTutorialLocation, lockedExitDirections } from "../services/tutorial";

type MainKeyboardState = {
  isAuto?: boolean;
  exits?: Direction[];
  hasInventory?: boolean;
  statusLabel?: string;
  posture?: string | null;
  isResting?: boolean | null;
  showPostureActions?: boolean;
  isTutorialDream?: boolean;
  showTutorialStatus?: boolean;
  canOpenDreamGate?: boolean;
  canWakeFromTutorial?: boolean;
  lockedExits?: Direction[];
};

export const EMPTY_KEYBOARD_BUTTON = "⠀";

function normalizeState(input: MainKeyboardState | boolean = {}) {
  if (typeof input === "boolean") return { isAuto: input } satisfies MainKeyboardState;
  return input;
}

export function postureActionLabelsForState(state: Pick<MainKeyboardState, "posture" | "isResting">) {
  const isSitting = state.posture === "SITTING" || Boolean(state.isResting);
  if (state.isResting) return ["Встати"];
  return isSitting ? ["Встати", "🧘 Відпочити"] : ["Сісти", "🧘 Відпочити"];
}

export function shouldShowInventoryButton(state: { inventoryCount: number; isTutorialDream?: boolean; tutorialInventoryAvailable?: boolean }) {
  if (state.isTutorialDream) return state.inventoryCount > 0 || Boolean(state.tutorialInventoryAvailable);
  return state.inventoryCount > 0;
}

export function buildMainReplyKeyboard(stateOrAuto: MainKeyboardState | boolean = {}) {
  const state = normalizeState(stateOrAuto);
  const exits = new Set(state.exits ?? []);
  const lockedExits = new Set(state.lockedExits ?? []);
  const utilityButton = (label: string) => state.isTutorialDream ? EMPTY_KEYBOARD_BUTTON : label;
  const directionButton = (direction: Direction, label: string) => exits.has(direction)
    ? lockedExits.has(direction) ? `(${label})` : label
    : EMPTY_KEYBOARD_BUTTON;
  const keyboard = new Keyboard()
    .text("👀 Озирнутися");
  keyboard.text(directionButton("NORTH", "⬆️ Північ"));
  keyboard.text("🔎 Роздивитися").row();

  keyboard.text(directionButton("WEST", "⬅️ Захід"));
  keyboard.text(state.hasInventory ? "🎒 Речі" : EMPTY_KEYBOARD_BUTTON);
  keyboard.text(directionButton("EAST", "Схід ➡️"));
  keyboard.row();

  keyboard.text(utilityButton("🧭 Допомога"));
  keyboard.text(directionButton("SOUTH", "⬇️ Південь"));
  keyboard.text(utilityButton("☰ Меню")).row();

  if (state.statusLabel && (!state.isTutorialDream || state.showTutorialStatus)) keyboard.text(state.statusLabel).row();
  if (state.showPostureActions) {
    for (const label of postureActionLabelsForState(state)) keyboard.text(label);
    keyboard.row();
  }
  if (state.isTutorialDream) {
    if (state.canOpenDreamGate) keyboard.text("💬 Сказати «Відчинитися»");
    if (state.canWakeFromTutorial) keyboard.text("🌅 Прокинутися");
  }

  return keyboard.resized().persistent(false);
}

export function buildTutorialStartReplyKeyboard() {
  return new Keyboard()
    .text("👀 Озирнутися")
    .text("⬇️ Південь")
    .resized()
    .persistent(false);
}

export function buildTutorialSecondStepReplyKeyboard() {
  return new Keyboard()
    .text("👀 Озирнутися")
    .row()
    .text("⬆️ Північ")
    .text("⬇️ Південь")
    .resized()
    .persistent(false);
}

function statusButtonLabel(player: { hp: number; hpMax: number | null; stamina: number; staminaMax: number | null }) {
  const hpMax = player.hpMax ?? BASE_HP;
  const staminaMax = player.staminaMax ?? BASE_STAMINA;
  return `❤️ ${formatLifeState(player.hp, hpMax)} · ⚡ ${formatResourceState(player.stamina, staminaMax)}`;
}

function exactStatusButtonLabel(player: { hp: number; hpMax: number | null; stamina: number; staminaMax: number | null }) {
  return `❤️ ${player.hp}/${player.hpMax ?? BASE_HP} · ⚡ ${player.stamina}/${player.staminaMax ?? BASE_STAMINA}`;
}

export function buildMenuReplyKeyboard(options: { canSeeStats?: boolean } = {}) {
  const keyboard = new Keyboard()
    .text("📰 Новини");
  if (options.canSeeStats) keyboard.text("📊 Статистика");
  keyboard
    .row()
    .text("💬 Репліки")
    .text("👥 Хто активний")
    .row()
    .text("🕯 Час")
    .text("↩️ Назад")
  return keyboard.resized().persistent(false);
}

export async function buildMainReplyKeyboardForTelegramId(telegramId: number, isAuto = false) {
  const player = await prisma.player.findUnique({
    where: { telegramId: String(telegramId) },
    select: {
      id: true,
      currentLocationId: true,
      hp: true,
      hpMax: true,
      stamina: true,
      staminaMax: true,
      posture: true,
      isResting: true,
      telegramId: true,
      role: true,
      showTechnicalDetails: true,
      currentLocation: {
        select: {
          key: true,
          z: true,
          region: { select: { key: true } },
          features: {
            where: { key: { in: [...DREAM_GATE_FEATURE_KEYS] }, isActive: true },
            select: { id: true },
          },
          exitsFrom: {
            where: { isHidden: false },
            select: { direction: true },
          },
        },
      },
    },
  });

  if (!player) return buildMainReplyKeyboard({ isAuto });

  const inventoryCount = await prisma.playerResource.count({ where: { playerId: player.id, amount: { gt: 0 } } });
  const exits = player.currentLocation?.exitsFrom.map((exit) => exit.direction) ?? [];
  const lockedExits = player.currentLocationId ? Array.from((await lockedExitDirections(player.currentLocationId)).keys()) : [];
  const showTechnicalDetails = playerCanShowTechnicalDetails(player);
  const isTutorialDream = player.currentLocation ? isTutorialLocation(player.currentLocation) : false;
  const tutorialInventoryAvailable = isTutorialDream ? await hasTutorialInventoryAvailable(player.id) : false;
  const hasInventory = shouldShowInventoryButton({ inventoryCount, isTutorialDream, tutorialInventoryAvailable });
  if (player.currentLocation?.key === TUTORIAL_START_LOCATION_KEY) {
    return buildTutorialStartReplyKeyboard();
  }
  if (player.currentLocation?.key === TUTORIAL_SECOND_STEP_LOCATION_KEY) {
    return buildTutorialSecondStepReplyKeyboard();
  }

  return buildMainReplyKeyboard({
    isAuto,
    exits,
    hasInventory,
    statusLabel: isTutorialDream
      ? player.currentLocation?.key === TUTORIAL_REST_LOCATION_KEY ? statusButtonLabel(player) : undefined
      : showTechnicalDetails ? exactStatusButtonLabel(player) : statusButtonLabel(player),
    posture: player.posture,
    isResting: player.isResting,
    showPostureActions: false,
    isTutorialDream,
    showTutorialStatus: player.currentLocation?.key === TUTORIAL_REST_LOCATION_KEY,
    canOpenDreamGate: isTutorialDream && Boolean(player.currentLocation?.features.length),
    canWakeFromTutorial: player.currentLocation?.key === TUTORIAL_HUB_LOCATION_KEY || player.currentLocation?.key === TUTORIAL_SAFETY_LOCATION_KEY,
    lockedExits,
  });
}
