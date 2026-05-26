import type { Bot } from "grammy";
import { prisma } from "../db";
import { resolveTarget } from "./targets";
import { performCreatureLocationSignal, performCreatureSocialSignal, performSocialSignal } from "./socialSignals";

const PLAYER_AUTO_SIGNAL_CHANCE = Number(process.env.PLAYER_AUTO_SIGNAL_CHANCE || 12);
const HERBALIST_SIGNAL_CHANCE = Number(process.env.HERBALIST_SIGNAL_CHANCE || 18);

function chance(p: number) {
  return Math.random() * 100 < p;
}

function pick<T>(items: T[]) {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}

async function visibleSignalTargets(locationId: number, excludePlayerId?: number) {
  const [players, creatures] = await Promise.all([
    prisma.player.findMany({
      where: { currentLocationId: locationId, ...(excludePlayerId ? { id: { not: excludePlayerId } } : {}) },
      orderBy: { id: "asc" },
    }),
    prisma.creature.findMany({
      where: { locationId, isAlive: true, isGone: false, isHidden: false },
      include: { species: true },
      orderBy: [{ species: { kind: "asc" } }, { id: "asc" }],
    }),
  ]);

  return [
    ...players.map((player) => ({ type: "player" as const, id: player.id, signal: pick(["nod", "wave"]) ?? "nod" })),
    ...creatures.map((creature) => ({
      type: "creature" as const,
      id: creature.id,
      signal: creature.species.kind === "ANIMAL" ? "point" : pick(["nod", "hush"]) ?? "nod",
    })),
  ];
}

export async function maybePerformPlayerAutoSignal(bot: Bot, player: any, chatId: number | string) {
  if (!player.currentLocationId || !chance(PLAYER_AUTO_SIGNAL_CHANCE)) return false;
  const targetRef = pick(await visibleSignalTargets(player.currentLocationId, player.id));
  if (!targetRef) return false;

  const target = await resolveTarget(targetRef.type, targetRef.id, player.currentLocationId, { viewerPlayerId: player.id });
  if (!target || target.isCorpse) return false;

  await performSocialSignal(bot, player, target, targetRef.signal, typeof chatId === "number" ? chatId : Number(chatId));
  return true;
}

export async function maybePerformHerbalistSignal(bot: Bot, creature: any) {
  if (!chance(HERBALIST_SIGNAL_CHANCE)) return false;

  const targetRef = pick(await visibleSignalTargets(creature.locationId));
  if (!targetRef || chance(30)) {
    await performCreatureLocationSignal(bot, creature, "hush");
    return true;
  }

  const target = await resolveTarget(targetRef.type, targetRef.id, creature.locationId);
  if (!target || target.isCorpse) return false;

  const signal = target.kind === "player" ? "hush" : target.isAnimal ? "point" : "nod";
  await performCreatureSocialSignal(bot, creature, target, signal);
  return true;
}

