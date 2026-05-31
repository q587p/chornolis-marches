import { InlineKeyboard } from "grammy";
import type { ResolvedTarget } from "../services/targets";
import { SOCIAL_DEFINITIONS, quickSocialsForTarget } from "../services/socialSignals";

type TargetRef = {
  type: "player" | "creature";
  id: number;
  label: string;
  actionLabel?: string;
  canGreet: boolean;
  canAttack?: boolean;
  isAnimal?: boolean;
  isCorpse?: boolean;
  canFreshen?: boolean;
};

const TARGETS_PER_PAGE = 8;

type TargetListOptions = {
  page?: number;
  pageCallbackPrefix?: string;
  showDisambiguators?: boolean;
};

function returnCallbackForTargetPage(options: TargetListOptions, page: number) {
  return options.pageCallbackPrefix ? `${options.pageCallbackPrefix}:${page}` : undefined;
}

function targetPageSuffix(returnCallback: string) {
  const match = returnCallback.match(/^targetPage:(brief|details):(\d+)$/);
  return match ? `:${match[1]}:${match[2]}` : "";
}

export function buildMovementKeyboard(exits: any[]) {
  const keyboard = new InlineKeyboard();
  const north = exits.find((e) => e.direction === "NORTH");
  const up = exits.find((e) => e.direction === "UP");
  const east = exits.find((e) => e.direction === "EAST");
  const south = exits.find((e) => e.direction === "SOUTH");
  const down = exits.find((e) => e.direction === "DOWN");
  const west = exits.find((e) => e.direction === "WEST");

  if (up) keyboard.text("⬆️ Вгору", "cmd:up").row();
  if (north) keyboard.text("⬆️ Північ", "cmd:north").row();

  if (west) keyboard.text("⬅️ Захід", "cmd:west");
  keyboard.text("🔎 Роздивитися", "examine");
  if (east) keyboard.text("Схід ➡️", "cmd:east");
  keyboard.row();

  if (south) keyboard.text("⬇️ Південь", "cmd:south").row();
  if (down) keyboard.text("⬇️ Вниз", "cmd:down").row();
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

export function buildAutoConfirmKeyboard() {
  return new InlineKeyboard()
    .text("Так, увімкнути авто", "auto:confirm")
    .row()
    .text("Ні, лишити вручну", "auto:cancel");
}

export function buildFatigueRestKeyboard() {
  return new InlineKeyboard().text("🧘 Відпочити", "rest:start");
}

export function buildStandUpKeyboard() {
  return new InlineKeyboard().text("Встати", "posture:stand");
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
  return new InlineKeyboard().text("🐾 Сліди", "track");
}

export function buildExamineLocationKeyboard() {
  return new InlineKeyboard().text("🔎 Роздивитися", "examine");
}

export function buildExamineTracksKeyboard() {
  return new InlineKeyboard().text("🐾 Сліди", "track:details");
}

export function buildAnonymousTargetKeyboard(target: Pick<TargetRef, "type" | "id" | "canGreet" | "canAttack" | "isAnimal">) {
  const keyboard = new InlineKeyboard()
    .text("👁 Глянути", `social:look:${target.type}:${target.id}:mystery`)
    .text("🔎 Роздивитися", `social:inspect:${target.type}:${target.id}:mystery`)
    .text("⚔️ Атакувати", `social:attack:${target.type}:${target.id}:mystery`)
    .row();

  if (target.canGreet) keyboard.text("💬 Привітати", `social:greet:${target.type}:${target.id}:mystery`);
  keyboard.text("🗣 Сказати", `targetSpeech:say:${target.type}:${target.id}:mystery`);
  keyboard.text("🤫 Прошепотіти", `targetSpeech:whisper:${target.type}:${target.id}:mystery`).row();
  keyboard.text("✨ Сигнали", `signalMenu:${target.type}:${target.id}:mystery`).row();
  keyboard.text("↩️ Назад", "location:details");
  return keyboard;
}

export function buildTargetActionKeyboard(target: Pick<TargetRef, "type" | "id" | "canGreet" | "canAttack" | "isAnimal">, again = false, returnCallback = "location:details") {
  const pageSuffix = targetPageSuffix(returnCallback);
  const keyboard = new InlineKeyboard()
    .text("👁 Глянути", `social:look:${target.type}:${target.id}:known${pageSuffix}`)
    .text(again ? "🔎 Роздивитися ще раз" : "🔎 Роздивитися", `social:inspect:${target.type}:${target.id}:known${pageSuffix}`)
    .text("⚔️ Атакувати", `social:attack:${target.type}:${target.id}:known${pageSuffix}`)
    .row();

  if (target.canGreet) keyboard.text("💬 Привітати", `social:greet:${target.type}:${target.id}:known${pageSuffix}`);
  keyboard.text("🗣 Сказати", `targetSpeech:say:${target.type}:${target.id}:known`);
  keyboard.text("🤫 Прошепотіти", `targetSpeech:whisper:${target.type}:${target.id}:known`).row();
  for (const socialId of quickSocialsForTarget({ kind: target.type, isAnimal: Boolean(target.isAnimal), canGreet: target.canGreet })) {
    const social = SOCIAL_DEFINITIONS.find((item) => item.id === socialId);
    if (social) keyboard.text(social.label, `signal:${social.id}:${target.type}:${target.id}:known`);
  }
  keyboard.text("✨ Ще сигнали", `signalMenu:${target.type}:${target.id}:known`).row();
  keyboard.text("↩️ Назад", returnCallback);
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

export function buildLocationSocialSignalKeyboard() {
  const keyboard = new InlineKeyboard();
  const targetlessSocials = SOCIAL_DEFINITIONS.filter((social) => social.targetlessActorMessage && social.targetlessRoomMessage);
  for (const [index, social] of targetlessSocials.entries()) {
    keyboard.text(social.label, `character:signal:${social.id}`);
    if (index % 2 === 1) keyboard.row();
  }
  if (targetlessSocials.length % 2 === 1) keyboard.row();
  return keyboard.text("↩️ Назад", "character:back");
}

export function buildCorpseActionKeyboard(target: ResolvedTarget, returnCallback = "location:details") {
  const pageSuffix = targetPageSuffix(returnCallback);
  const keyboard = new InlineKeyboard().text("🔎 Оглянути труп", `social:inspect:${target.kind}:${target.id}:known${pageSuffix}`).row();
  keyboard.text("🤲 Підібрати", `social:pickup:${target.kind}:${target.id}${pageSuffix}`).row();
  if (target.canFreshen) keyboard.text("🔪 Освіжувати", `social:freshen:${target.kind}:${target.id}:known${pageSuffix}`).row();
  keyboard.text("↩️ Назад", returnCallback);
  return keyboard;
}

function targetButtonLabel(target: TargetRef) {
  if (target.isCorpse) return target.label;
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
  const returnCallback = returnCallbackForTargetPage(options, page);
  const pageContext = returnCallback ? `:${options.pageCallbackPrefix?.endsWith(":brief") ? "brief" : "details"}:${page}` : "";

  for (const [index, target] of pageTargets.entries()) {
    keyboard.text(labels[start + index] ?? target.label, `target:${target.type}:${target.id}${pageContext}`).row();
  }

  const freshenableCorpses = targets.filter((target) => target.type === "creature" && target.isCorpse && target.canFreshen);
  if (freshenableCorpses.length > 1) {
    keyboard.text("🔪 Освіжувати всі", "social:freshenAll");
    if (totalPages > 1 && options.pageCallbackPrefix) keyboard.row();
  }

  if (totalPages > 1 && options.pageCallbackPrefix) {
    if (page > 0) keyboard.text("◀️ Назад", `${options.pageCallbackPrefix}:${page - 1}`);
    keyboard.text(`${page + 1}/${totalPages}`, "targetPage:noop");
    if (page < totalPages - 1) keyboard.text("Далі ▶️", `${options.pageCallbackPrefix}:${page + 1}`);
    keyboard.row();
  }

  while (keyboard.inline_keyboard.length > 0 && keyboard.inline_keyboard[keyboard.inline_keyboard.length - 1]?.length === 0) {
    keyboard.inline_keyboard.pop();
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

export function buildGatherRetryKeyboard(resourceKey: string) {
  return new InlineKeyboard().text("🌿 Пошукати ще", `gather:${resourceKey}`);
}

export function buildInteractionKeyboard() {
  return new InlineKeyboard()
    .text("🔎 Роздивитися", "examine")
    .row()
    .text("⚔️ Атакувати", "social:attack:creature:0:mystery");
}
