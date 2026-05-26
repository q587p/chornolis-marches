import type { Bot } from "grammy";
import { prisma } from "../db";
import { escapeHtml } from "../utils/text";
import { notifyLocationExcept } from "./notifications";
import { playerForms } from "./grammar";
import type { ResolvedTarget } from "./targets";

type SocialContext = {
  actor: { id: number; locationId: number; forms: ReturnType<typeof playerForms>; telegramId: string };
  target: ResolvedTarget;
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

function targetDative(ctx: SocialContext) {
  return escapeHtml(ctx.target.forms.dative);
}

function targetAccusative(ctx: SocialContext) {
  return escapeHtml(ctx.target.forms.accusative);
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
];

export function socialDefinitionById(id: string) {
  return SOCIAL_DEFINITIONS.find((social) => social.id === id);
}

export function quickSocialsForTarget(target: Pick<ResolvedTarget, "kind" | "isAnimal" | "canGreet">) {
  if (target.kind === "player") return ["nod", "wave"];
  if (target.isAnimal) return ["point", "glare"];
  return target.canGreet ? ["nod", "smile"] : ["bow", "glare"];
}

export async function performSocialSignal(bot: Bot, player: any, target: ResolvedTarget, socialId: string, chatId?: number) {
  const social = socialDefinitionById(socialId);
  if (!social) throw new Error("Невідомий сигнал.");
  if (!player.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");

  const actorForms = playerForms(player);
  const ctx: SocialContext = {
    actor: {
      id: player.id,
      locationId: player.currentLocationId,
      forms: actorForms,
      telegramId: player.telegramId,
    },
    target,
  };

  const targetPlayer = target.kind === "player" ? await prisma.player.findUnique({ where: { id: target.id } }) : null;

  if (targetPlayer) {
    await bot.api.sendMessage(targetPlayer.telegramId, social.targetMessage(ctx), { parse_mode: "HTML" });
  }

  await notifyLocationExcept(
    bot,
    player.currentLocationId,
    [player.id, targetPlayer?.id].filter((id): id is number => Boolean(id)),
    social.roomMessage(ctx),
    { parseMode: "HTML" },
  );

  await prisma.worldEvent.create({
    data: {
      type: "PLAYER_ACTION",
      title: `${actorForms.nominative}: ${social.label}`,
      description: `${target.kind}:${target.id}; ${target.forms.nominative}`,
      locationId: player.currentLocationId,
    },
  });

  if (chatId) {
    await bot.api.sendMessage(chatId, social.actorMessage(ctx), { parse_mode: "HTML" });
  }
}
