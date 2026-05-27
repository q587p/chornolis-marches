import type { Bot } from "grammy";
import { Direction } from "@prisma/client";
import { prisma } from "../db";
import { escapeHtml } from "../utils/text";
import { notifyLocationAll, notifyLocationExcept } from "./notifications";
import { creatureForms, playerForms, type NameForms } from "./grammar";
import type { ResolvedTarget } from "./targets";
import { enqueueCreatureAction, interruptActorActions, movementDurationMs } from "./actionQueue";
import { logEvent } from "./worldEvents";

type SocialContext = {
  actor: { kind: "player" | "creature"; id: number; locationId: number; forms: NameForms; telegramId?: string };
  target?: ResolvedTarget;
};

type SocialDefinition = {
  id: string;
  label: string;
  actorMessage: (ctx: SocialContext) => string;
  targetMessage: (ctx: SocialContext) => string;
  roomMessage: (ctx: SocialContext) => string;
  targetlessActorMessage?: (ctx: SocialContext) => string;
  targetlessRoomMessage?: (ctx: SocialContext) => string;
};

function actorName(ctx: SocialContext) {
  return escapeHtml(ctx.actor.forms.nominative);
}

function stripFinalPeriod(text: string) {
  return text.replace(/\.$/, "");
}

function currentActionFromRoomMessage(ctx: SocialContext, message: string) {
  const actorPrefix = `${actorName(ctx)} `;
  return stripFinalPeriod(message.startsWith(actorPrefix) ? message.slice(actorPrefix.length) : message);
}

function targetDative(ctx: SocialContext) {
  return escapeHtml(ctx.target?.forms.dative ?? "комусь поруч");
}

function targetAccusative(ctx: SocialContext) {
  return escapeHtml(ctx.target?.forms.accusative ?? "когось поруч");
}

export const SOCIAL_DEFINITIONS: SocialDefinition[] = [
  {
    id: "smile",
    label: "🙂 Усміхнутися",
    actorMessage: (ctx) => `Ви усміхаєтеся ${targetDative(ctx)}.`,
    targetMessage: (ctx) => `${actorName(ctx)} усміхається вам.`,
    roomMessage: (ctx) => `${actorName(ctx)} усміхається ${targetDative(ctx)}.`,
  },
  {
    id: "laugh",
    label: "😄 Засміятися",
    actorMessage: (ctx) => `Ви тихо смієтеся, дивлячись на ${targetAccusative(ctx)}.`,
    targetMessage: (ctx) => `${actorName(ctx)} тихо сміється, дивлячись на вас.`,
    roomMessage: (ctx) => `${actorName(ctx)} тихо сміється, дивлячись на ${targetAccusative(ctx)}.`,
  },
  {
    id: "nod",
    label: "✅ Кивнути",
    actorMessage: (ctx) => `Ви киваєте ${targetDative(ctx)}.`,
    targetMessage: (ctx) => `${actorName(ctx)} киває вам.`,
    roomMessage: (ctx) => `${actorName(ctx)} киває ${targetDative(ctx)}.`,
    targetlessActorMessage: () => "Ви киваєте.",
    targetlessRoomMessage: (ctx) => `${actorName(ctx)} киває.`,
  },
  {
    id: "bow",
    label: "🙇 Вклонитися",
    actorMessage: (ctx) => `Ви вклоняєтеся ${targetDative(ctx)}.`,
    targetMessage: (ctx) => `${actorName(ctx)} вклоняється вам.`,
    roomMessage: (ctx) => `${actorName(ctx)} вклоняється ${targetDative(ctx)}.`,
  },
  {
    id: "point",
    label: "👉 Вказати",
    actorMessage: (ctx) => `Ви вказуєте на ${targetAccusative(ctx)}.`,
    targetMessage: (ctx) => `${actorName(ctx)} вказує на вас.`,
    roomMessage: (ctx) => `${actorName(ctx)} вказує на ${targetAccusative(ctx)}.`,
  },
  {
    id: "glare",
    label: "😠 Насупитися",
    actorMessage: (ctx) => `Ви насуплено дивитеся на ${targetAccusative(ctx)}.`,
    targetMessage: (ctx) => `${actorName(ctx)} насуплено дивиться на вас.`,
    roomMessage: (ctx) => `${actorName(ctx)} насуплено дивиться на ${targetAccusative(ctx)}.`,
  },
  {
    id: "sigh",
    label: "😮‍💨 Зітхнути",
    actorMessage: (ctx) => `Ви зітхаєте, дивлячись на ${targetAccusative(ctx)}.`,
    targetMessage: (ctx) => `${actorName(ctx)} зітхає, дивлячись на вас.`,
    roomMessage: (ctx) => `${actorName(ctx)} зітхає, дивлячись на ${targetAccusative(ctx)}.`,
  },
  {
    id: "wave",
    label: "👋 Помахати",
    actorMessage: (ctx) => `Ви махаєте ${targetDative(ctx)}.`,
    targetMessage: (ctx) => `${actorName(ctx)} махає вам.`,
    roomMessage: (ctx) => `${actorName(ctx)} махає ${targetDative(ctx)}.`,
  },
  {
    id: "hush",
    label: "🤫 Притишити",
    actorMessage: (ctx) => `Ви прикладаєте палець до вуст, дивлячись на ${targetAccusative(ctx)}.`,
    targetMessage: (ctx) => `${actorName(ctx)} прикладає палець до вуст, дивлячись на вас.`,
    roomMessage: (ctx) => `${actorName(ctx)} прикладає палець до вуст, дивлячись на ${targetAccusative(ctx)}.`,
    targetlessActorMessage: () => "Ви прикладаєте палець до вуст і просите тиші.",
    targetlessRoomMessage: (ctx) => `${actorName(ctx)} прикладає палець до вуст і просить тиші.`,
  },
];

export function socialDefinitionById(id: string) {
  return SOCIAL_DEFINITIONS.find((social) => social.id === id);
}

export function quickSocialsForTarget(target: Pick<ResolvedTarget, "kind" | "isAnimal" | "canGreet">) {
  if (target.kind === "player") return ["nod", "wave"];
  if (target.isAnimal) return ["point", "glare"];
  return target.canGreet ? ["nod", "smile"] : ["bow", "glare"];
}

function chance(percent: number) {
  return Math.random() * 100 < percent;
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function animalSignalFleeChance(signalId: string, creature: any) {
  const speciesKey = creature.species?.key;
  const diet = creature.species?.diet;
  const base =
    speciesKey === "mouse" ? 58 :
    speciesKey === "rabbit" ? 52 :
    speciesKey === "fox" ? 34 :
    speciesKey === "wolf" ? 18 :
    diet === "HERBIVORE" ? 45 :
    diet === "CARNIVORE" ? 24 :
    30;
  const modifier =
    signalId === "glare" ? 14 :
    signalId === "wave" ? 8 :
    signalId === "laugh" ? 6 :
    signalId === "point" ? 4 :
    signalId === "hush" ? -8 :
    signalId === "smile" ? -12 :
    0;
  return Math.max(0, Math.min(75, base + modifier));
}

async function maybeReactToSocialSignal(bot: Bot, actor: SocialContext["actor"], target: ResolvedTarget, socialId: string) {
  if (target.kind !== "creature" || !target.isAnimal || target.isCorpse) return;

  const creature = await prisma.creature.findFirst({
    where: { id: target.id, locationId: actor.locationId, isAlive: true, isGone: false, isHidden: false },
    include: { species: true, location: { include: { exitsFrom: { where: { isHidden: false } } } } },
  });
  if (!creature || !creature.location.exitsFrom.length) return;

  const fleeChance = animalSignalFleeChance(socialId, creature);
  if (!chance(fleeChance)) return;

  const exit = pick(creature.location.exitsFrom);
  if (!exit) return;

  const forms = creatureForms(creature);
  await interruptActorActions({ actorType: "CREATURE", creatureId: creature.id }, "злякалося сигналу", true);
  await enqueueCreatureAction({
    creatureId: creature.id,
    type: "MOVE",
    payload: { direction: exit.direction as Direction, reason: "лякається різкого жесту" },
    durationMs: movementDurationMs(exit.travelCost, creature.stamina),
    priority: 80,
    interruptQueued: true,
  });

  const message = `${forms.nominative} лякається жесту й кидається геть.`;
  await notifyLocationAll(bot, actor.locationId, message);
  await logEvent("NPC_ACTION", "Тварина злякалася сигналу", `${forms.nominative}; signal=${socialId}; exit=${exit.direction}`, actor.locationId);
}

async function writeSocialEvent(title: string, target: ResolvedTarget | null, locationId: number) {
  const targetText = target ? `${target.kind}:${target.id}; ${target.forms.nominative}` : null;
  await prisma.worldEvent.create({
    data: {
      type: "SOCIAL_SIGNAL",
      title,
      description: targetText,
      locationId,
    },
  });
}

async function performSocialSignalForActor(bot: Bot, actor: SocialContext["actor"], target: ResolvedTarget, socialId: string, chatId?: number) {
  if (target.kind === actor.kind && target.id === actor.id) return;

  const social = socialDefinitionById(socialId);
  if (!social) throw new Error("Невідомий сигнал.");

  const ctx: SocialContext = { actor, target };
  const targetPlayer = target.kind === "player" ? await prisma.player.findUnique({ where: { id: target.id } }) : null;
  if (targetPlayer) {
    await bot.api.sendMessage(targetPlayer.telegramId, social.targetMessage(ctx), { parse_mode: "HTML" });
  }

  await notifyLocationExcept(
    bot,
    actor.locationId,
    [actor.kind === "player" ? actor.id : null, targetPlayer?.id].filter((id): id is number => Boolean(id)),
    social.roomMessage(ctx),
    { parseMode: "HTML" },
  );

  const roomMessage = social.roomMessage(ctx);
  await writeSocialEvent(roomMessage, target, actor.locationId);

  if (chatId) {
    await bot.api.sendMessage(chatId, social.actorMessage(ctx), { parse_mode: "HTML" });
  }

  await maybeReactToSocialSignal(bot, actor, target, socialId);
}

export async function performSocialSignal(bot: Bot, player: any, target: ResolvedTarget, socialId: string, chatId?: number) {
  if (!player.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  const actorForms = playerForms(player);
  await performSocialSignalForActor(bot, { kind: "player", id: player.id, locationId: player.currentLocationId, forms: actorForms, telegramId: player.telegramId }, target, socialId, chatId);
}

export async function performCreatureSocialSignal(bot: Bot, creature: any, target: ResolvedTarget, socialId: string) {
  const social = socialDefinitionById(socialId);
  if (!social) throw new Error("Невідомий сигнал.");
  const actorForms = creatureForms(creature);
  const actor = { kind: "creature" as const, id: creature.id, locationId: creature.locationId, forms: actorForms };
  if (target.kind === actor.kind && target.id === actor.id) return;

  await performSocialSignalForActor(bot, actor, target, socialId);
  const ctx: SocialContext = { actor, target };
  await prisma.creature.updateMany({
    where: { id: creature.id },
    data: { activity: "LOOKING", currentAction: currentActionFromRoomMessage(ctx, social.roomMessage(ctx)) },
  });
}

export async function performCreatureLocationSignal(bot: Bot, creature: any, socialId: string) {
  const social = socialDefinitionById(socialId);
  if (!social) throw new Error("Невідомий сигнал.");
  const actorForms = creatureForms(creature);
  const ctx: SocialContext = { actor: { kind: "creature", id: creature.id, locationId: creature.locationId, forms: actorForms } };
  const message = social.targetlessRoomMessage?.(ctx) ?? `${actorName(ctx)} подає знак.`;
  await notifyLocationAll(bot, creature.locationId, message);
  await writeSocialEvent(message, null, creature.locationId);
  await prisma.creature.updateMany({
    where: { id: creature.id },
    data: { activity: "LOOKING", currentAction: currentActionFromRoomMessage(ctx, message) },
  });
}
