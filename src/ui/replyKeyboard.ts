import { Keyboard } from "grammy";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";

type MainKeyboardState = {
  isAuto?: boolean;
  hasQueue?: boolean;
  statusLabel?: string;
};

function normalizeState(input: MainKeyboardState | boolean = {}) {
  if (typeof input === "boolean") return { isAuto: input } satisfies MainKeyboardState;
  return input;
}

export function buildMainReplyKeyboard(stateOrAuto: MainKeyboardState | boolean = {}) {
  const state = normalizeState(stateOrAuto);
  const keyboard = new Keyboard().text("👀 Озирнутися");
  if (state.hasQueue) keyboard.text("📋 Черга");
  keyboard.text("☰ Меню").row();

  if (state.statusLabel) keyboard.text(state.statusLabel).row();

  return keyboard.resized().persistent();
}

function resourceState(value: number, max: number, zeroLabel = "нема") {
  if (value <= 0) return zeroLabel;
  if (value > max) return "екстра";
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 1) return "повно";
  if (ratio >= 0.75) return "багато";
  if (ratio >= 0.4) return "середньо";
  return "мало";
}

function lifeState(value: number, max: number) {
  if (value <= 0) return "непритомн.";
  return resourceState(value, max, "кепсько");
}

function statusButtonLabel(player: { hp: number; hpMax: number | null; stamina: number; staminaMax: number | null }) {
  const hpMax = player.hpMax ?? BASE_HP;
  const staminaMax = player.staminaMax ?? BASE_STAMINA;
  return `❤️ ${lifeState(player.hp, hpMax)} · ⚡ ${resourceState(player.stamina, staminaMax)}`;
}

export function buildMenuReplyKeyboard() {
  return new Keyboard()
    .text("📰 Новини")
    .text("📊 Статистика")
    .row()
    .text("💬 Репліки")
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
    select: { id: true, currentLocationId: true, hp: true, hpMax: true, stamina: true, staminaMax: true, isResting: true },
  });

  if (!player) return buildMainReplyKeyboard({ isAuto });

  const queueCount = await prisma.worldAction.count({ where: { actorType: "PLAYER", playerId: player.id, status: { in: ["QUEUED", "RUNNING"] } } });

  return buildMainReplyKeyboard({
    isAuto,
    hasQueue: queueCount > 0 || player.isResting,
    statusLabel: statusButtonLabel(player),
  });
}
