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

export function buildTrackKeyboard() {
  return new InlineKeyboard().text("👣 Відслідкувати", "track");
}

export function buildTargetKeyboard(targets: { type: "player" | "creature"; id: number; label?: string; canGreet: boolean }[]) {
  const keyboard = new InlineKeyboard();
  const useNumbers = targets.length > 1;

  targets.forEach((target, index) => {
    const suffix = useNumbers ? ` ${index + 1}` : "";

    keyboard.text(`👁 Оглянути${suffix}`, `social:inspect:${target.type}:${target.id}`);
    keyboard.text(`⚔️ Атакувати${suffix}`, `social:attack:${target.type}:${target.id}`).row();

    if (target.canGreet) {
      keyboard.text(`👋 Привітати${suffix}`, `social:greet:${target.type}:${target.id}`).row();
    }
  });

  return keyboard;
}

export function buildInteractionKeyboard() {
  return new InlineKeyboard()
    .text("👁 Оглянути", "look")
    .row()
    .text("⚔️ Атакувати", "social:attack:creature:0");
}
