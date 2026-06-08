import type { Bot } from "grammy";
import { Direction } from "@prisma/client";
import { prisma } from "../db";
import { escapeHtml } from "../utils/text";
import { safeSendMessage } from "../utils/telegram";
import { notifyLocationAll, notifyLocationExcept } from "./notifications";
import { creatureForms, playerForms, type NameForms } from "./grammar";
import type { ResolvedTarget } from "./targets";
import { enqueueCreatureAction, interruptActorActions, movementDurationMs } from "./actionQueue";
import { logEvent } from "./worldEvents";
import { hunterReactionDurationMs, hunterSocialReactionSignal, isHunterCreature } from "./npcHunter";
import { canSendProactiveToTelegramId } from "./sessionPresence";
import { creatureUsableExits } from "./creatureMovement";
import {
  SOCIAL_DEFINITIONS,
  type SocialDefinition,
  type SocialTemplateContext,
} from "../content/social/socialSignals";

export { SOCIAL_DEFINITIONS } from "../content/social/socialSignals";

type SocialContext = {
  actor: { kind: "player" | "creature"; id: number; locationId: number; forms: NameForms; telegramId?: string };
  target?: ResolvedTarget;
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

function socialTemplateContext(ctx: SocialContext): SocialTemplateContext {
  return {
    actorName: actorName(ctx),
    targetDative: targetDative(ctx),
    targetAccusative: targetAccusative(ctx),
  };
}

function socialActorMessage(social: SocialDefinition, ctx: SocialContext) {
  return social.actorMessage(socialTemplateContext(ctx));
}

function socialTargetMessage(social: SocialDefinition, ctx: SocialContext) {
  return social.targetMessage(socialTemplateContext(ctx));
}

function socialRoomMessage(social: SocialDefinition, ctx: SocialContext) {
  return social.roomMessage(socialTemplateContext(ctx));
}

function socialTargetlessActorMessage(social: SocialDefinition, ctx: SocialContext) {
  return social.targetlessActorMessage?.(socialTemplateContext(ctx));
}

function socialTargetlessRoomMessage(social: SocialDefinition, ctx: SocialContext) {
  return social.targetlessRoomMessage?.(socialTemplateContext(ctx));
}

export function socialDefinitionById(id: string) {
  return SOCIAL_DEFINITIONS.find((social) => social.id === id);
}

export function quickSocialsForTarget(target: Pick<ResolvedTarget, "kind" | "isAnimal" | "canGreet">) {
  if (target.kind === "player") return ["nod", "wave"];
  if (target.isAnimal) return ["point", "glare"];
  return target.canGreet ? ["nod", "wave"] : ["bow", "glare"];
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
  if (target.kind !== "creature" || target.isCorpse) return;

  if (!target.isAnimal) {
    const reaction = hunterSocialReactionSignal(socialId);
    if (!reaction) return;
    const hunter = await prisma.creature.findFirst({
      where: { id: target.id, locationId: actor.locationId, isAlive: true, isGone: false, isHidden: false },
      include: { species: true },
    });
    if (!hunter || !isHunterCreature(hunter)) return;

    const actorTarget = await resolveActorAsTarget(actor);
    if (!actorTarget) return;
    await enqueueCreatureAction({
      creatureId: hunter.id,
      type: "GREET",
      payload: { targetType: actorTarget.kind, targetId: actorTarget.id, socialId: reaction },
      durationMs: hunterReactionDurationMs("GREET", hunter.stamina),
    });
    return;
  }

  const creature = await prisma.creature.findFirst({
    where: { id: target.id, locationId: actor.locationId, isAlive: true, isGone: false, isHidden: false },
    include: { species: true, location: { include: { exitsFrom: { where: { isHidden: false } } } } },
  });
  if (!creature || !creature.location.exitsFrom.length) return;

  const fleeChance = animalSignalFleeChance(socialId, creature);
  if (!chance(fleeChance)) return;

  const exit = pick(creatureUsableExits(creature, creature.location.exitsFrom));
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

async function resolveActorAsTarget(actor: SocialContext["actor"]): Promise<ResolvedTarget | null> {
  if (actor.kind === "player") {
    const player = await prisma.player.findFirst({ where: { id: actor.id, currentLocationId: actor.locationId } });
    if (!player) return null;
    return {
      kind: "player",
      id: player.id,
      name: actor.forms.nominative,
      forms: actor.forms,
      canGreet: true,
      canAttack: false,
      isAnimal: false,
      isCorpse: false,
      canFreshen: false,
      inspect: "",
    };
  }

  const creature = await prisma.creature.findFirst({
    where: { id: actor.id, locationId: actor.locationId, isAlive: true, isGone: false, isHidden: false },
    include: { species: true },
  });
  if (!creature) return null;
  return {
    kind: "creature",
    id: creature.id,
    name: actor.forms.nominative,
    forms: actor.forms,
    canGreet: creature.species.kind !== "ANIMAL",
    canAttack: false,
    isAnimal: creature.species.kind === "ANIMAL",
    isCorpse: false,
    canFreshen: false,
    inspect: "",
  };
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
  if (targetPlayer && await canSendProactiveToTelegramId(targetPlayer.telegramId)) {
    await safeSendMessage(bot, targetPlayer.telegramId, socialTargetMessage(social, ctx), { parse_mode: "HTML" }, "social signal target sendMessage");
  }

  const roomMessage = socialRoomMessage(social, ctx);
  await notifyLocationExcept(
    bot,
    actor.locationId,
    [actor.kind === "player" ? actor.id : null, targetPlayer?.id].filter((id): id is number => Boolean(id)),
    roomMessage,
    { parseMode: "HTML" },
  );

  await writeSocialEvent(roomMessage, target, actor.locationId);

  if (chatId) {
    await bot.api.sendMessage(chatId, socialActorMessage(social, ctx), { parse_mode: "HTML" });
  }

  await maybeReactToSocialSignal(bot, actor, target, socialId);
}

export async function performSocialSignal(bot: Bot, player: any, target: ResolvedTarget, socialId: string, chatId?: number) {
  if (!player.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  const actorForms = playerForms(player);
  await performSocialSignalForActor(bot, { kind: "player", id: player.id, locationId: player.currentLocationId, forms: actorForms, telegramId: player.telegramId }, target, socialId, chatId);
}

export async function performPlayerLocationSignal(bot: Bot, player: any, socialId: string, chatId?: number) {
  if (!player.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  const social = socialDefinitionById(socialId);
  if (!social) throw new Error("Невідомий сигнал.");
  const actorForms = playerForms(player);
  const ctx: SocialContext = { actor: { kind: "player", id: player.id, locationId: player.currentLocationId, forms: actorForms, telegramId: player.telegramId } };
  const actorMessage = socialTargetlessActorMessage(social, ctx);
  const roomMessage = socialTargetlessRoomMessage(social, ctx);
  if (!actorMessage || !roomMessage) throw new Error("Цей сигнал просить ціль поруч.");

  await notifyLocationExcept(bot, player.currentLocationId, [player.id], roomMessage, { parseMode: "HTML" });
  await writeSocialEvent(roomMessage, null, player.currentLocationId);

  if (chatId) {
    await bot.api.sendMessage(chatId, actorMessage, { parse_mode: "HTML" });
  }
}

export async function performCreatureSocialSignal(bot: Bot, creature: any, target: ResolvedTarget, socialId: string) {
  const social = socialDefinitionById(socialId);
  if (!social) throw new Error("Невідомий сигнал.");
  const actorForms = creatureForms(creature);
  const actor = { kind: "creature" as const, id: creature.id, locationId: creature.locationId, forms: actorForms };
  if (target.kind === actor.kind && target.id === actor.id) return;

  await performSocialSignalForActor(bot, actor, target, socialId);
  const ctx: SocialContext = { actor, target };
  const roomMessage = socialRoomMessage(social, ctx);
  await prisma.creature.updateMany({
    where: { id: creature.id },
    data: { activity: "LOOKING", currentAction: currentActionFromRoomMessage(ctx, roomMessage) },
  });
}

export async function performCreatureLocationSignal(bot: Bot, creature: any, socialId: string) {
  const social = socialDefinitionById(socialId);
  if (!social) throw new Error("Невідомий сигнал.");
  const actorForms = creatureForms(creature);
  const ctx: SocialContext = { actor: { kind: "creature", id: creature.id, locationId: creature.locationId, forms: actorForms } };
  const message = socialTargetlessRoomMessage(social, ctx) ?? `${actorName(ctx)} подає знак.`;
  await notifyLocationAll(bot, creature.locationId, message);
  await writeSocialEvent(message, null, creature.locationId);
  await prisma.creature.updateMany({
    where: { id: creature.id },
    data: { activity: "LOOKING", currentAction: currentActionFromRoomMessage(ctx, message) },
  });
}
