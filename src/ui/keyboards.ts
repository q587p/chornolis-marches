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

  if (north) keyboard.text("⬆️ Північ", "cmd:north").row();

  if (west) keyboard.text("⬅️ Захід", "cmd:west");
  keyboard.text("🔎 Придивитися", "look");
  if (east) keyboard.text("Схід ➡️", "cmd:east");
  keyboard.row();

  if (south) keyboard.text("⬇️ Південь", "cmd:south").row();
  return keyboard;
}

export function buildActionQueueKeyboard(hasActions = true) {
  const keyboard = new InlineKeyboard();
  if (!hasActions) return keyboard;

  return keyboard
    .text("✋ Скасувати поточну", "queue:cancel-current")
    .row()
    .text("🧹 Очистити чергу", "queue:clear");
}

export function buildFatigueRestKeyboard() {
  return new InlineKeyboard().text("🛌 Відпочити", "rest:start");
}

export function buildRestingActionChoiceKeyboard() {
  return new InlineKeyboard()
    .text("✋ Перервати", "rest:interrupt")
    .text("📋 Поставити в чергу", "rest:queue");
}

export function buildRestWithQueueChoiceKeyboard() {
  return new InlineKeyboard()
    .text("Так, почати відпочинок", "rest:confirm-start")
    .row()
    .text("Ні, додати в чергу", "rest:queue-rest");
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
  keyboard.text("↩️ Назад", "location:details").row();
  return keyboard;
}

export function buildTargetActionKeyboard(target: Pick<TargetRef, "type" | "id" | "canGreet">, again = false) {
  const keyboard = new InlineKeyboard()
    .text(again ? "👁 Оглянути ще раз" : "👁 Оглянути", `social:inspect:${target.type}:${target.id}:known`)
    .text("⚔️ Атакувати", `social:attack:${target.type}:${target.id}:known`)
    .row();

  if (target.canGreet) keyboard.text("👋 Привітати", `social:greet:${target.type}:${target.id}:known`).row();
  keyboard.text("↩️ Назад", "location:details").row();
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

  keyboard.text("↩️ Назад", "location:details").row();
  return keyboard;
}

export function buildInteractionKeyboard() {
  return new InlineKeyboard()
    .text("👁 Оглянути", "look")
    .row()
    .text("⚔️ Атакувати", "social:attack:creature:0:mystery");
}
