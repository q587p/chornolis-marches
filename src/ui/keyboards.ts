import { InlineKeyboard } from "grammy";

export function buildMovementKeyboard(exits: any[]) {
  const keyboard = new InlineKeyboard();
  const north = exits.find((e) => e.direction === "NORTH");
  const east = exits.find((e) => e.direction === "EAST");
  const south = exits.find((e) => e.direction === "SOUTH");
  const west = exits.find((e) => e.direction === "WEST");

  if (north) keyboard.text("⬆️ Північ", "move:NORTH").row();
  if (west) keyboard.text("⬅️ Захід", "move:WEST");
  if (east) keyboard.text("Схід ➡️", "move:EAST");
  if (west || east) keyboard.row();
  if (south) keyboard.text("⬇️ Південь", "move:SOUTH").row();
  keyboard.text("🔎 Оглянутися", "look");
  return keyboard;
}

export function buildInteractionKeyboard() {
  return new InlineKeyboard()
    .text("👋 Привітатися", "social:greet")
    .text("👁 Придивитися", "social:inspect")
    .row()
    .text("⚔️ Атакувати", "social:attack");
}
