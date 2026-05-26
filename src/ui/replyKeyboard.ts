import { Keyboard } from "grammy";
import { prisma } from "../db";

type MainKeyboardState = {
  isAuto?: boolean;
  hasQueue?: boolean;
};

function normalizeState(input: MainKeyboardState | boolean = {}) {
  if (typeof input === "boolean") return { isAuto: input } satisfies MainKeyboardState;
  return input;
}

export function buildMainReplyKeyboard(stateOrAuto: MainKeyboardState | boolean = {}) {
  const state = normalizeState(stateOrAuto);
  const keyboard = new Keyboard()
    .text("👀 Озирнутися")
    .text("🧍 Персонаж")
    .row();

  let hasUtilityRow = false;
  if (state.hasQueue) {
    keyboard.text("📋 Черга");
    hasUtilityRow = true;
  }
  if (hasUtilityRow) keyboard.row();

  return keyboard
    .text("☰ Меню")
    .resized()
    .persistent();
}

export function buildMenuReplyKeyboard() {
  return new Keyboard()
    .text("📰 Новини")
    .text("📊 Статистика")
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
  });
}
