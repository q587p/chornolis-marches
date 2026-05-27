import { Keyboard } from "grammy";
import { type Direction } from "@prisma/client";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import { formatLifeState, formatResourceState } from "../utils/playerText";
import { playerCanShowTechnicalDetails } from "../services/technicalDetails";
import { DREAM_GATE_FEATURE_KEY, TUTORIAL_FORAGING_LOCATION_KEY, TUTORIAL_HUB_LOCATION_KEY, TUTORIAL_REST_LOCATION_KEY, TUTORIAL_SAFETY_LOCATION_KEY, hasTutorialForagingSuccess, isTutorialLocation, lockedExitDirections } from "../services/tutorial";

type MainKeyboardState = {
  isAuto?: boolean;
  exits?: Direction[];
  hasInventory?: boolean;
  statusLabel?: string;
  isTutorialDream?: boolean;
  canOpenDreamGate?: boolean;
  canWakeFromTutorial?: boolean;
  lockedExits?: Direction[];
};

export const EMPTY_KEYBOARD_BUTTON = "⠀";

function normalizeState(input: MainKeyboardState | boolean = {}) {
  if (typeof input === "boolean") return { isAuto: input } satisfies MainKeyboardState;
  return input;
}

export function buildMainReplyKeyboard(stateOrAuto: MainKeyboardState | boolean = {}) {
  const state = normalizeState(stateOrAuto);
  const exits = new Set(state.exits ?? []);
  const lockedExits = new Set(state.lockedExits ?? []);
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

  keyboard.text("🧭 Допомога");
  keyboard.text(directionButton("SOUTH", "⬇️ Південь"));
  keyboard.text("☰ Меню").row();

  if (state.statusLabel) keyboard.text(state.statusLabel).row();
  if (state.isTutorialDream) {
    if (state.canOpenDreamGate) keyboard.text("🚪 Відкрити");
    if (state.canWakeFromTutorial) keyboard.text("🌅 Прокинутися");
    if (state.canOpenDreamGate || state.canWakeFromTutorial) keyboard.row();
  }

  return keyboard.resized().persistent();
}

function statusButtonLabel(player: { hp: number; hpMax: number | null; stamina: number; staminaMax: number | null }) {
  const hpMax = player.hpMax ?? BASE_HP;
  const staminaMax = player.staminaMax ?? BASE_STAMINA;
  return `❤️ ${formatLifeState(player.hp, hpMax)} · ⚡ ${formatResourceState(player.stamina, staminaMax)}`;
}

function exactStatusButtonLabel(player: { hp: number; hpMax: number | null; stamina: number; staminaMax: number | null }) {
  return `❤️ ${player.hp}/${player.hpMax ?? BASE_HP} · ⚡ ${player.stamina}/${player.staminaMax ?? BASE_STAMINA}`;
}

export function buildMenuReplyKeyboard() {
  return new Keyboard()
    .text("📰 Новини")
    .text("📊 Статистика")
    .row()
    .text("💬 Репліки")
    .text("👥 Хто активний")
    .row()
    .text("🕯 Час")
    .text("↩️ Назад")
    .resized()
    .persistent();
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
      telegramId: true,
      role: true,
      showTechnicalDetails: true,
      currentLocation: {
        select: {
          key: true,
          z: true,
          region: { select: { key: true } },
          features: {
            where: { key: DREAM_GATE_FEATURE_KEY, isActive: true },
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
  const hasInventory = inventoryCount > 0 && (
    player.currentLocation?.key === TUTORIAL_FORAGING_LOCATION_KEY
      ? await hasTutorialForagingSuccess(player.id)
      : true
  );
  return buildMainReplyKeyboard({
    isAuto,
    exits,
    hasInventory,
    statusLabel: player.currentLocation?.key === TUTORIAL_REST_LOCATION_KEY
      ? statusButtonLabel(player)
      : showTechnicalDetails ? exactStatusButtonLabel(player) : statusButtonLabel(player),
    isTutorialDream,
    canOpenDreamGate: isTutorialDream && Boolean(player.currentLocation?.features.length),
    canWakeFromTutorial: player.currentLocation?.key === TUTORIAL_HUB_LOCATION_KEY || player.currentLocation?.key === TUTORIAL_SAFETY_LOCATION_KEY,
    lockedExits,
  });
}
