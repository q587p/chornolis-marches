import { Keyboard } from "grammy";
import { type Direction } from "@prisma/client";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import { formatLifeState, formatResourceState } from "../utils/playerText";
import { playerCanShowTechnicalDetails } from "../services/technicalDetails";

type MainKeyboardState = {
  isAuto?: boolean;
  exits?: Direction[];
  hasInventory?: boolean;
  statusLabel?: string;
};

function normalizeState(input: MainKeyboardState | boolean = {}) {
  if (typeof input === "boolean") return { isAuto: input } satisfies MainKeyboardState;
  return input;
}

export function buildMainReplyKeyboard(stateOrAuto: MainKeyboardState | boolean = {}) {
  const state = normalizeState(stateOrAuto);
  const exits = new Set(state.exits ?? []);
  const keyboard = new Keyboard()
    .text("👀 Озирнутися");
  if (exits.has("NORTH")) keyboard.text("⬆️ Північ");
  keyboard.text("👁 Роздивитися").row();

  if (exits.has("WEST")) keyboard.text("⬅️ Захід");
  if (state.hasInventory) keyboard.text("🎒 Речі");
  if (exits.has("EAST")) keyboard.text("Схід ➡️");
  keyboard.row();

  if (exits.has("SOUTH")) keyboard.text("⬇️ Південь");
  keyboard.text("☰ Меню").row();

  if (state.statusLabel) keyboard.text(state.statusLabel).row();

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
    .text("🧭 Допомога")
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
      hp: true,
      hpMax: true,
      stamina: true,
      staminaMax: true,
      telegramId: true,
      role: true,
      showTechnicalDetails: true,
      currentLocation: {
        select: {
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
  const showTechnicalDetails = playerCanShowTechnicalDetails(player);

  return buildMainReplyKeyboard({
    isAuto,
    exits,
    hasInventory: inventoryCount > 0,
    statusLabel: showTechnicalDetails ? exactStatusButtonLabel(player) : statusButtonLabel(player),
  });
}
