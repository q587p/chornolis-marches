import { InlineKeyboard } from "grammy";
import type { ResolvedTarget } from "../services/targets";
import { SOCIAL_DEFINITIONS, quickSocialsForTarget } from "../services/socialSignals";

type TargetRef = {
  type: "player" | "creature";
  id: number;
  label: string;
  actionLabel?: string;
  canGreet: boolean;
  isAnimal?: boolean;
  isCorpse?: boolean;
};

const TARGETS_PER_PAGE = 8;

type TargetListOptions = {
  page?: number;
  pageCallbackPrefix?: string;
  showDisambiguators?: boolean;
};

export function buildMovementKeyboard(exits: any[]) {
  const keyboard = new InlineKeyboard();
  const north = exits.find((e) => e.direction === "NORTH");
  const east = exits.find((e) => e.direction === "EAST");
  const south = exits.find((e) => e.direction === "SOUTH");
  const west = exits.find((e) => e.direction === "WEST");

  if (north) keyboard.text("⬆️ Північ", "cmd:north").row();

  if (west) keyboard.text("⬅️ Захід", "cmd:west");
  keyboard.text("👁 Роздивитися", "examine");
  if (east) keyboard.text("Схід ➡️", "cmd:east");
  keyboard.row();

  if (south) keyboard.text("⬇️ Південь", "cmd:south").row();
  return keyboard;
}

export function buildActionQueueKeyboard(actionCount: number | boolean = true) {
  const keyboard = new InlineKeyboard();
  const count = typeof actionCount === "boolean" ? (actionCount ? 2 : 0) : actionCount;
  if (count <= 0) return keyboard;

  keyboard.text("🧘 Відпочити", "rest:queue-rest").row();
  if (count === 1) return keyboard.text("✋ Скасувати дію", "queue:clear");

  return keyboard
    .text("✋ Скасувати поточну", "queue:cancel-current")
    .row()
    .text("🧹 Очистити все", "queue:clear");
}

export function buildFatigueRestKeyboard() {
  return new InlineKeyboard().text("🧘 Відпочити", "rest:start");
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
  return new InlineKeyboard().text("🔎 Сліди", "track");
}

export function buildAnonymousTargetKeyboard(target: Pick<TargetRef, "type" | "id" | "canGreet" | "isAnimal">) {
  const keyboard = new InlineKeyboard()
    .text("👁 Роздивитися", `social:inspect:${target.type}:${target.id}:mystery`)
    .text("⚔️ Атакувати", `social:attack:${target.type}:${target.id}:mystery`)
    .row();

  if (target.canGreet) keyboard.text("💬 Привітати", `social:greet:${target.type}:${target.id}:mystery`).row();
  keyboard.text("✨ Сигнали", `signalMenu:${target.type}:${target.id}:mystery`).row();
  keyboard.text("↩️ Назад", "location:details").row();
  return keyboard;
}

export function buildTargetActionKeyboard(target: Pick<TargetRef, "type" | "id" | "canGreet" | "isAnimal">, again = false) {
  const keyboard = new InlineKeyboard()
    .text(again ? "👁 Роздивитися ще раз" : "👁 Роздивитися", `social:inspect:${target.type}:${target.id}:known`)
    .text("⚔️ Атакувати", `social:attack:${target.type}:${target.id}:known`)
    .row();

  if (target.canGreet) keyboard.text("💬 Привітати", `social:greet:${target.type}:${target.id}:known`).row();
  for (const socialId of quickSocialsForTarget({ kind: target.type, isAnimal: Boolean(target.isAnimal), canGreet: target.canGreet })) {
    const social = SOCIAL_DEFINITIONS.find((item) => item.id === socialId);
    if (social) keyboard.text(social.label, `signal:${social.id}:${target.type}:${target.id}:known`);
  }
  keyboard.row().text("✨ Ще сигнали", `signalMenu:${target.type}:${target.id}:known`).row();
  keyboard.text("↩️ Назад", "location:details").row();
  return keyboard;
}

export function buildSocialSignalKeyboard(target: Pick<TargetRef, "type" | "id">, mode: "known" | "mystery" = "known") {
  const keyboard = new InlineKeyboard();
  for (const [index, social] of SOCIAL_DEFINITIONS.entries()) {
    keyboard.text(social.label, `signal:${social.id}:${target.type}:${target.id}:${mode}`);
    if (index % 2 === 1) keyboard.row();
  }
  if (SOCIAL_DEFINITIONS.length % 2 === 1) keyboard.row();
  keyboard.text("↩️ Назад", `target:${target.type}:${target.id}`).row();
  return keyboard;
}

export function buildCorpseActionKeyboard(target: ResolvedTarget) {
  const keyboard = new InlineKeyboard().text("👁 Оглянути ще раз", `social:inspect:${target.kind}:${target.id}:known`).row();
  keyboard.text("🤲 Підібрати", `social:pickup:${target.kind}:${target.id}`).row();
  if (target.canFreshen) keyboard.text("🔪 Освіжувати", `social:freshen:${target.kind}:${target.id}:known`).row();
  keyboard.text("↩️ Назад", "location:details").row();
  return keyboard;
}

function targetButtonLabel(target: TargetRef) {
  return target.actionLabel ? `${target.label} — ${target.actionLabel}` : target.label;
}

function targetButtonLabels(targets: TargetRef[]) {
  const counts = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const target of targets) counts.set(target.label, (counts.get(target.label) ?? 0) + 1);

  return targets.map((target) => {
    const label = targetButtonLabel(target);
    const total = counts.get(target.label) ?? 1;
    if (total <= 1) return label;

    const index = (seen.get(target.label) ?? 0) + 1;
    seen.set(target.label, index);
    return `${label} ${index}/${total}`;
  });
}

export function buildTargetListKeyboard(targets: TargetRef[], options: TargetListOptions = {}) {
  const keyboard = new InlineKeyboard();
  const totalPages = Math.max(1, Math.ceil(targets.length / TARGETS_PER_PAGE));
  const page = Math.min(Math.max(options.page ?? 0, 0), totalPages - 1);
  const start = page * TARGETS_PER_PAGE;
  const pageTargets = targets.slice(start, start + TARGETS_PER_PAGE);
  const labels = options.showDisambiguators ? targetButtonLabels(targets) : targets.map(targetButtonLabel);

  for (const [index, target] of pageTargets.entries()) {
    keyboard.text(labels[start + index] ?? target.label, `target:${target.type}:${target.id}`).row();
  }

  if (totalPages > 1 && options.pageCallbackPrefix) {
    if (page > 0) keyboard.text("◀️ Назад", `${options.pageCallbackPrefix}:${page - 1}`);
    keyboard.text(`${page + 1}/${totalPages}`, "targetPage:noop");
    if (page < totalPages - 1) keyboard.text("Далі ▶️", `${options.pageCallbackPrefix}:${page + 1}`);
    keyboard.row();
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
    .text("👁 Роздивитися", "examine")
    .row()
    .text("⚔️ Атакувати", "social:attack:creature:0:mystery");
}
