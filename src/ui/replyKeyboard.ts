import { Keyboard } from "grammy";

export function buildMainReplyKeyboard(isAuto = false) {
  return new Keyboard()
    .text("🌲 /start")
    .row()
    .text("📍 Локація")
    .text("🧍 Персонаж")
    .row()
    .text(isAuto ? "⏹ Стоп" : "🤖 Авто")
    .text("📰 Новини")
    .resized()
    .persistent();
}
