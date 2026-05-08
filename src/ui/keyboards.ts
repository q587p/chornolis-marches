import { InlineKeyboard } from "grammy";

type TargetRef = {
  type: "player" | "creature";
  id: number;
  label: string;
  canGreet: boolean;
};

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
  keyboard.text("🔎 Придивитися", "look");
  return keyboard;
}

export function buildTrackKeyboard() {
  return new InlineKeyboard().text("👣 Відслідкувати", "track");
}

export function buildAnonymousTargetKeyboard(target: Pick<TargetRef, "type" | "id" | "canGreet">) {
  const keyboard = new InlineKeyboard()
    .text("👁 Оглянути", `social:inspect:${target.type}:${target.id}:mystery`)
    .text("⚔️ Атакувати", `social:attack:${target.type}:${target.id}:mystery`)
    .row();

  if (target.canGreet) keyboard.text("👋 Привітати", `social:greet:${target.type}:${target.id}:mystery`).row();
  return keyboard;
}

export function buildTargetActionKeyboard(target: Pick<TargetRef, "type" | "id" | "canGreet">, again = false) {
  const keyboard = new InlineKeyboard()
    .text(again ? "👁 Оглянути ще раз" : "👁 Оглянути", `social:inspect:${target.type}:${target.id}:known`)
    .text("⚔️ Атакувати", `social:attack:${target.type}:${target.id}:known`)
    .row();

  if (target.canGreet) keyboard.text("👋 Привітати", `social:greet:${target.type}:${target.id}:known`).row();
  return keyboard;
}

export function buildTargetListKeyboard(targets: TargetRef[]) {
  const keyboard = new InlineKeyboard();

  for (const target of targets) {
    keyboard.text(target.label, `target:${target.type}:${target.id}`).row();
  }

  return keyboard;
}

export function buildResourceMenuKeyboard(resources: { key: string; name: string; durationText?: string }[]) {
  const keyboard = new InlineKeyboard();

  for (const resource of resources) {
    keyboard.text(`🌿 ${resource.name}${resource.durationText ?? ""}`, `gather:${resource.key}`).row();
  }

  return keyboard;
}

export function buildInteractionKeyboard() {
  return new InlineKeyboard()
    .text("👁 Оглянути", "look")
    .row()
    .text("⚔️ Атакувати", "social:attack:creature:0:mystery");
}
