import { Keyboard } from "grammy";

export function buildMainReplyKeyboard(isAuto = false) {
  return new Keyboard()
    .text("📍 Локація")
    .text("🧍 Персонаж")
    .row()
    .text("📋 Черга")
    .text(isAuto ? "⏹ Стоп" : "🤖 Авто")
    .row()
    .text("📰 Новини")
    .resized()
    .persistent();
}
