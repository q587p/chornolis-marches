import { Bot } from "grammy";
import { FatigueState, Prisma, WorldActionType } from "@prisma/client";
import { prisma } from "../db";
import {
  BASE_HP,
  BASE_STAMINA,
  HEALTH_REGEN_PER_INTERVAL,
  PLAYER_HUNGER_MAX,
  PASSIVE_HEALTH_REGEN_INTERVAL_MS,
  PASSIVE_STAMINA_REGEN_PER_INTERVAL,
  REST_HEALTH_REGEN_INTERVAL_MS,
  REST_STAMINA_REGEN_INTERVAL_MS,
  REST_STAMINA_REGEN_PER_INTERVAL,
  STAMINA_REGEN_INTERVAL_MS,
  VERY_TIRED_STAMINA,
  playerStaminaCostConfig,
} from "../gameConfig";
import { buildFatigueRestKeyboard } from "../ui/keyboards";
import { getPlayerRestStaminaCap } from "./locationFeatures";
import { tutorialIdlePaceComments } from "./tutorialVoices";
import { logEvent } from "./worldEvents";
import { escapeHtml } from "../utils/text";

export function fatigueStateFor(stamina: number, staminaMax = BASE_STAMINA): FatigueState {
  if (stamina <= VERY_TIRED_STAMINA) return "VERY_TIRED";
  if (stamina < 0) return "TIRED";
  if (stamina >= staminaMax) return "RESTED";
  return "RESTED";
}

function quoteBlock(text: string) {
  return `<blockquote>${escapeHtml(text)}</blockquote>`;
}

function thresholdMessages(before: number, after: number, max: number, tookHp = false) {
  const messages: string[] = [];

  if (before >= 0 && after < 0) {
    messages.push("Ви відчуваєте втому. Наступні дії все ще можна планувати, але відновлення вже буде важливим.");
  }
  if (before > VERY_TIRED_STAMINA && after <= VERY_TIRED_STAMINA) {
    messages.push("Ви дуже втомлені. Вам дуже варто відпочити, інакше подальші дії забиратимуть здоров’я.");
  }
  if (tookHp) {
    messages.push("Виснаження боляче б’є по тілу: ви втрачаєте 1 здоров’я.");
  }
  if (before <= VERY_TIRED_STAMINA && after > VERY_TIRED_STAMINA) {
    messages.push("Ви трохи відновилися, але все ще втомлені.");
  }
  if (before < 0 && after >= 0) {
    messages.push("Ви відновилися, але ще трохи втомлені.");
  }
  if (before < max && after >= max) {
    messages.push("Ви відпочили і готові діяти далі!");
  }

  return messages;
}

function hpRecoveryMessages(before: number, after: number, max: number) {
  const messages: string[] = [];
  if (before <= 0 && after > 0) {
    messages.push("Ви приходите до тями. Ви дуже слабі, вам би ще відновитися, але інші дії знову доступні.");
  } else if (before < max && after >= max) {
    messages.push("Рани більше не заважають рухатися: здоров’я повністю відновилося.");
  } else if (after > before) {
    messages.push(`Тіло потроху відновлюється. Життя: ${after}/${max}.`);
  }
  return messages;
}

async function knockOutPlayer(bot: Bot, player: { id: number }, chatId?: number | string) {
  await prisma.worldAction.updateMany({
    where: { actorType: "PLAYER", playerId: player.id, status: { in: ["QUEUED", "RUNNING"] } },
    data: { status: "CANCELLED", note: "персонаж знепритомнів" },
  });
  await prisma.player.updateMany({
    where: { id: player.id },
    data: { hp: 0, isResting: true, fatigueState: "VERY_TIRED", lastHpRegenAt: new Date(), lastStaminaRegenAt: new Date() },
  });
  if (chatId) {
    await bot.api.sendMessage(chatId, "Життя впало до 0. Ви втрачаєте свідомість. Черга очищена, починається відпочинок. Поки життя не підніметься хоча б до 1, доступний лише відпочинок.", { reply_markup: buildFatigueRestKeyboard() });
  }
}

export async function spendPlayerStamina(bot: Bot, playerId: number, type: WorldActionType, chatId?: number | string) {
  const cost = playerStaminaCostConfig[type] ?? 0;
  if (cost <= 0) return;
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return;

  const max = player.staminaMax ?? BASE_STAMINA;
  const before = player.stamina;
  const after = before - cost;
  const tookHp = before <= VERY_TIRED_STAMINA;
  const nextHp = tookHp ? Math.max(0, player.hp - 1) : player.hp;
  const nextState = fatigueStateFor(after, max);

  const updated = await prisma.player.updateMany({
    where: { id: playerId },
    data: {
      stamina: after,
      hp: nextHp,
      fatigueState: nextState,
      isResting: false,
      lastActionAt: new Date(),
      lastStaminaRegenAt: new Date(),
      hunger: cost > 1 ? Math.min(PLAYER_HUNGER_MAX, player.hunger + 1) : player.hunger,
    },
  });
  if (updated.count === 0) return;
  if (nextHp <= 0 && player.hp > 0) await knockOutPlayer(bot, player, chatId);

  const messages = thresholdMessages(before, after, max, tookHp);
  if (chatId && messages.length) {
    for (const message of messages) {
      const shouldSuggestRest = message.includes("втом") || message.includes("Виснаження");
      await bot.api.sendMessage(chatId, message, shouldSuggestRest ? { reply_markup: buildFatigueRestKeyboard() } : undefined);
    }
  }
}

export async function spendCreatureStamina(creature: { id: number; hp?: number; stamina: number; staminaMax?: number | null }, cost = 1) {
  const max = creature.staminaMax ?? BASE_STAMINA;
  const after = creature.stamina - cost;
  const tookHp = creature.stamina <= VERY_TIRED_STAMINA;
  const nextHp = tookHp && creature.hp !== undefined ? Math.max(0, creature.hp - 1) : creature.hp;
  await prisma.creature.updateMany({
    where: { id: creature.id },
    data: {
      stamina: after,
      hp: nextHp,
      fatigueState: fatigueStateFor(after, max),
      lastStaminaRegenAt: new Date(),
      currentAction: tookHp ? "виснажується" : undefined,
    },
  });
}

export async function recoverStamina(bot: Bot) {
  const now = new Date();
  const [players, activePlayerActions] = await Promise.all([
    prisma.player.findMany(),
    prisma.worldAction.findMany({
      where: { actorType: "PLAYER", status: { in: ["QUEUED", "RUNNING"] }, playerId: { not: null } },
      select: { playerId: true },
    }),
  ]);
  const activePlayerIds = new Set(activePlayerActions.map((action) => action.playerId).filter((id): id is number => Boolean(id)));

  for (const player of players) {
    const baseMax = player.staminaMax ?? BASE_STAMINA;
    const max = player.isResting ? Math.max(baseMax, await getPlayerRestStaminaCap(player.id)) : baseMax;
    const hpMax = player.hpMax ?? BASE_HP;
    const hasActiveActions = activePlayerIds.has(player.id);

    if (!player.isResting && !hasActiveActions) {
      const chatId = Number(player.telegramId);
      if (Number.isSafeInteger(chatId)) {
        const voiceComments = await tutorialIdlePaceComments(player, now);
        for (const comment of voiceComments) {
          if (player.currentLocationId) await logEvent("NPC_SAY", comment.title, comment.text, player.currentLocationId);
          await bot.api.sendMessage(chatId, `${comment.title}:\n${quoteBlock(comment.text)}`, { parse_mode: "HTML" });
        }
      }
    }

    if (player.stamina >= max && player.hp >= hpMax && !player.isResting) continue;

    if (hasActiveActions && !player.isResting) {
      await prisma.player.updateMany({ where: { id: player.id }, data: { lastStaminaRegenAt: now, lastHpRegenAt: now } });
      continue;
    }

    const last = player.lastStaminaRegenAt ?? player.updatedAt ?? now;
    const staminaIntervalMs = player.isResting ? REST_STAMINA_REGEN_INTERVAL_MS : STAMINA_REGEN_INTERVAL_MS;
    const intervals = Math.floor((now.getTime() - last.getTime()) / staminaIntervalMs);

    const before = player.stamina;
    const rate = player.isResting ? REST_STAMINA_REGEN_PER_INTERVAL : PASSIVE_STAMINA_REGEN_PER_INTERVAL;
    const after = intervals > 0 ? Math.min(max, before + intervals * rate) : before;
    const messages = thresholdMessages(before, after, max);
    const hpBefore = player.hp;
    const hpIntervalMs = player.isResting ? REST_HEALTH_REGEN_INTERVAL_MS : PASSIVE_HEALTH_REGEN_INTERVAL_MS;
    const hpLast = player.lastHpRegenAt ?? player.updatedAt ?? now;
    const hpIntervals = Math.floor((now.getTime() - hpLast.getTime()) / hpIntervalMs);
    const hpAfter = hpIntervals > 0 ? Math.min(hpMax, hpBefore + hpIntervals * HEALTH_REGEN_PER_INTERVAL) : hpBefore;
    messages.push(...hpRecoveryMessages(hpBefore, hpAfter, hpMax));

    if (intervals <= 0 && hpIntervals <= 0) continue;

    const fullyRested = after >= max && hpAfter >= hpMax;
    const regainedConsciousness = hpBefore <= 0 && hpAfter > 0;
    const nextState = fatigueStateFor(after, max);
    const data: Prisma.PlayerUpdateInput = {
      stamina: after,
      hp: hpAfter,
      fatigueState: nextState,
      isResting: regainedConsciousness ? false : player.isResting && !fullyRested,
      restFullRecoveries: fullyRested && player.isResting && (before < max || hpBefore < hpMax) ? { increment: 1 } : undefined,
    };

    if (intervals > 0) data.lastStaminaRegenAt = new Date(last.getTime() + intervals * staminaIntervalMs);
    if (hpIntervals > 0) data.lastHpRegenAt = new Date(hpLast.getTime() + hpIntervals * hpIntervalMs);

    await prisma.player.updateMany({
      where: { id: player.id },
      data,
    });

    const chatId = Number(player.telegramId);
    if (Number.isSafeInteger(chatId)) {
      for (const message of messages) {
        const shouldSuggestRest = message.includes("втом") || message.includes("Виснаження") || message.includes("слаб");
        await bot.api.sendMessage(chatId, message, shouldSuggestRest ? { reply_markup: buildFatigueRestKeyboard() } : undefined);
      }
    }
  }

  const [creatures, activeCreatureActions] = await Promise.all([
    prisma.creature.findMany({ where: { isGone: false } }),
    prisma.worldAction.findMany({
      where: { actorType: "CREATURE", status: { in: ["QUEUED", "RUNNING"] }, creatureId: { not: null } },
      select: { creatureId: true },
    }),
  ]);
  const activeCreatureIds = new Set(activeCreatureActions.map((action) => action.creatureId).filter((id): id is number => Boolean(id)));
  const activeCreatureIdsToRefresh: number[] = [];

  for (const creature of creatures) {
    const max = creature.staminaMax ?? BASE_STAMINA;
    if (creature.stamina >= max) continue;

    if (activeCreatureIds.has(creature.id)) {
      activeCreatureIdsToRefresh.push(creature.id);
      continue;
    }

    const last = creature.lastStaminaRegenAt ?? creature.updatedAt ?? now;
    const intervals = Math.floor((now.getTime() - last.getTime()) / STAMINA_REGEN_INTERVAL_MS);
    if (intervals <= 0) continue;
    const after = Math.min(max, creature.stamina + intervals * PASSIVE_STAMINA_REGEN_PER_INTERVAL);
    await prisma.creature.updateMany({
      where: { id: creature.id },
      data: {
        stamina: after,
        fatigueState: fatigueStateFor(after, max),
        lastStaminaRegenAt: new Date(last.getTime() + intervals * STAMINA_REGEN_INTERVAL_MS),
      },
    });
  }

  if (activeCreatureIdsToRefresh.length > 0) {
    await prisma.creature.updateMany({
      where: { id: { in: activeCreatureIdsToRefresh } },
      data: { lastStaminaRegenAt: now },
    });
  }
}
