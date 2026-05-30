import { Keyboard } from "grammy";
import { type Direction } from "@prisma/client";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import { formatLifeState, formatResourceState } from "../utils/playerText";
import { isConfiguredAdminTelegramId } from "../services/adminAccess";
import { playerCanShowTechnicalDetails } from "../services/technicalDetails";
import { TUTORIAL_DEEP_REST_LOCATION_KEY, TUTORIAL_FORAGING_LOCATION_KEY, TUTORIAL_REST_LOCATION_KEY, TUTORIAL_SECOND_STEP_LOCATION_KEY, TUTORIAL_START_LOCATION_KEY, hasTutorialCommandHint, hasTutorialInventoryAvailable, isTutorialLocation, lockedExitDirections } from "../services/tutorial";

type MainKeyboardState = {
  isAuto?: boolean;
  exits?: Direction[];
  hasInventory?: boolean;
  statusLabel?: string;
  posture?: string | null;
  isResting?: boolean | null;
  showPostureActions?: boolean;
  isTutorialDream?: boolean;
  lockedExits?: Direction[];
  canExamine?: boolean;
  showUtilityActions?: boolean;
  showAdminMenu?: boolean;
};

export const EMPTY_KEYBOARD_BUTTON = "⠀";

export function shouldUseFocusedTutorialReplyKeyboard(locationKey: string | null | undefined, steps: number | null | undefined) {
  const safeSteps = Math.max(0, steps ?? 0);
  if (locationKey === TUTORIAL_START_LOCATION_KEY) return safeSteps === 0;
  if (locationKey === TUTORIAL_SECOND_STEP_LOCATION_KEY) return safeSteps <= 1;
  return false;
}

function trimTrailingEmptyRows(keyboard: Keyboard) {
  while (keyboard.keyboard.length > 0 && keyboard.keyboard[keyboard.keyboard.length - 1]?.length === 0) {
    keyboard.keyboard.pop();
  }
  return keyboard;
}

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
  const utilityButton = (label: string) => state.showUtilityActions === false ? EMPTY_KEYBOARD_BUTTON : label;
  const directionButton = (direction: Direction, label: string) => exits.has(direction)
    ? lockedExits.has(direction) ? `(${label})` : label
    : EMPTY_KEYBOARD_BUTTON;
  const keyboard = new Keyboard()
    .text("👀 Озирнутися");
  keyboard.text(directionButton("NORTH", "⬆️ Північ"));
  keyboard.text(state.canExamine === false ? EMPTY_KEYBOARD_BUTTON : "🔎 Роздивитися").row();

  keyboard.text(directionButton("WEST", "⬅️ Захід"));
  keyboard.text(state.hasInventory ? "🎒 Речі" : EMPTY_KEYBOARD_BUTTON);
  keyboard.text(directionButton("EAST", "Схід ➡️"));
  keyboard.row();

  keyboard.text(utilityButton(state.showAdminMenu ? "🛠 Адмін меню (/adminMenu)" : "🧭 Допомога"));
  keyboard.text(directionButton("SOUTH", "⬇️ Південь"));
  keyboard.text(utilityButton("☰ Меню")).row();

  if (state.statusLabel) keyboard.text(state.statusLabel).row();
  if (state.showPostureActions) {
    for (const label of postureActionLabelsForState(state)) keyboard.text(label);
    keyboard.row();
  }
  return trimTrailingEmptyRows(keyboard).resized().persistent(false);
}

export function buildTutorialStartReplyKeyboard() {
  return buildMainReplyKeyboard({
    exits: ["SOUTH"],
    isTutorialDream: true,
    canExamine: false,
    showUtilityActions: false,
  });
}

export function buildTutorialSecondStepReplyKeyboard() {
  return buildMainReplyKeyboard({
    exits: ["NORTH", "SOUTH"],
    isTutorialDream: true,
    canExamine: false,
    showUtilityActions: false,
  });
}

type StatusLabelPlayer = {
  id: number;
  currentLocation?: { key: string; z: number; region?: { key: string } | null } | null;
  hp: number;
  hpMax: number | null;
  stamina: number;
  staminaMax: number | null;
  showTechnicalDetails?: boolean | null;
};

function statusButtonLabel(player: { hp: number; hpMax: number | null; stamina: number; staminaMax: number | null }) {
  const hpMax = player.hpMax ?? BASE_HP;
  const staminaMax = player.staminaMax ?? BASE_STAMINA;
  return `❤️ ${formatLifeState(player.hp, hpMax)} · ⚡ ${formatResourceState(player.stamina, staminaMax)}`;
}

function exactStatusButtonLabel(player: { hp: number; hpMax: number | null; stamina: number; staminaMax: number | null }) {
  return `❤️ ${player.hp}/${player.hpMax ?? BASE_HP} · ⚡ ${player.stamina}/${player.staminaMax ?? BASE_STAMINA}`;
}

export function mainStatusLabelForPlayer(player: StatusLabelPlayer, options: { hasRestLesson?: boolean } = {}) {
  const isTutorialDream = player.currentLocation ? isTutorialLocation(player.currentLocation) : false;
  const tutorialStatusVisible = !isTutorialDream
    || player.currentLocation?.key === TUTORIAL_REST_LOCATION_KEY
    || player.currentLocation?.key === TUTORIAL_DEEP_REST_LOCATION_KEY
    || Boolean(options.hasRestLesson);
  if (!tutorialStatusVisible) return undefined;

  if (player.currentLocation?.key === TUTORIAL_REST_LOCATION_KEY) return statusButtonLabel(player);
  return playerCanShowTechnicalDetails(player) ? exactStatusButtonLabel(player) : statusButtonLabel(player);
}

export async function mainStatusLabelForPlayerId(playerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      hp: true,
      hpMax: true,
      stamina: true,
      staminaMax: true,
      showTechnicalDetails: true,
      currentLocation: {
        select: {
          key: true,
          z: true,
          region: { select: { key: true } },
        },
      },
    },
  });
  if (!player) return undefined;
  return mainStatusLabelForPlayer(player, { hasRestLesson: await hasTutorialCommandHint(player.id, "rest") });
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
    .text("🌒 Час")
    .text("↩️ Назад")
    .row()
    .text("🌙 AFK / відійти")
    .text("🚪 Завершити сесію");
  return keyboard.resized().persistent(false);
}

export function buildAdminMenuReplyKeyboard() {
  return new Keyboard()
    .text("📊 Статистика (/stat)")
    .text("🌲 Світ (/world)")
    .row()
    .text("👥 Усі (/all)")
    .text("📍 Місцини (/locationAll)")
    .row()
    .text("🧭 Телепорт (/teleport)")
    .text("✨ Відновити снагу (/restAdmin)")
    .text("🌿 Ресурси")
    .row()
    .text("🦴 Падальний рів (/carcassQuest)")
    .row()
    .text("🔥 Вогонь")
    .text("🛠 Повна довідка (/adminHelp)")
    .row()
    .text("↩️ Назад")
    .resized()
    .persistent(false);
}

export function buildAdminResourcesReplyKeyboard() {
  return new Keyboard()
    .text("🌿 Ключі ресурсів (/addResourceHelp)")
    .row()
    .text("🍓 Додати ягоди (/restoreBerries)")
    .text("🌱 Додати трави (/restoreHerbs)")
    .row()
    .text("🍄 Додати гриби (/restoreMushrooms)")
    .text("➕ Додати ресурс (/addResource)")
    .row()
    .text("🛠 Адмін меню (/adminMenu)")
    .text("↩️ Назад")
    .resized()
    .persistent(false);
}

export function buildAdminFireReplyKeyboard() {
  return new Keyboard()
    .text("🔥 Додати вогнище (/addCampfire)")
    .row()
    .text("🕯 Додати факел (/addTorch)")
    .text("🪵 Додати хмиз (/addTwigs)")
    .row()
    .text("🛠 Адмін меню (/adminMenu)")
    .text("↩️ Назад")
    .resized()
    .persistent(false);
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
      steps: true,
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
  const isTutorialDream = player.currentLocation ? isTutorialLocation(player.currentLocation) : false;
  const tutorialInventoryAvailable = isTutorialDream ? await hasTutorialInventoryAvailable(player.id) : false;
  const hasInventory = shouldShowInventoryButton({ inventoryCount, isTutorialDream, tutorialInventoryAvailable });
  const hasRestLesson = await hasTutorialCommandHint(player.id, "rest");
  const hasExamineLesson = await hasTutorialCommandHint(player.id, "examine");
  const tutorialExamineVisible = !isTutorialDream
    || player.currentLocation?.key === TUTORIAL_FORAGING_LOCATION_KEY
    || hasExamineLesson;
  if (shouldUseFocusedTutorialReplyKeyboard(player.currentLocation?.key, player.steps)) {
    if (player.currentLocation?.key === TUTORIAL_START_LOCATION_KEY) {
      return buildTutorialStartReplyKeyboard();
    }
    if (player.currentLocation?.key === TUTORIAL_SECOND_STEP_LOCATION_KEY) {
      return buildTutorialSecondStepReplyKeyboard();
    }
  }

  return buildMainReplyKeyboard({
    isAuto,
    exits,
    hasInventory,
    statusLabel: mainStatusLabelForPlayer(player, { hasRestLesson }),
    posture: player.posture,
    isResting: player.isResting,
    showPostureActions: false,
    isTutorialDream,
    canExamine: tutorialExamineVisible,
    showUtilityActions: !isTutorialDream,
    showAdminMenu: player.role === "SCRIBE" || isConfiguredAdminTelegramId(telegramId),
    lockedExits,
  });
}
