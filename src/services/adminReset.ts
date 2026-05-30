import { prisma } from "../db";
import { PLAYER_KILL_EVENT_TITLE, PREDATOR_KILL_EVENT_TITLE, STARVATION_DEATH_EVENT_TITLE } from "./ecologyStats";

export type AdminResetMode = "world" | "stats" | "full";

export type ResetStatsSummary = {
  resetPlayers: number;
  resetCreatures: number;
  removedDropoffContributions: number;
  removedWorldStatEvents: number;
};

const WORLD_TICK_EVENT_TITLE = "World Tick";

export function parseAdminResetMode(raw: string | null | undefined): AdminResetMode | null {
  const value = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!value) return null;

  if (["world", "seed", "state", "svit", "світ", "стан", "світовий"].includes(value)) return "world";
  if (["stats", "stat", "statistics", "стат", "стата", "статистика", "статистику"].includes(value)) return "stats";
  if (["full", "all", "everything", "повний", "повністю", "все", "усе", "весь"].includes(value)) return "full";

  return null;
}

export function adminResetModeTitle(mode: AdminResetMode) {
  if (mode === "world") return "світ";
  if (mode === "stats") return "статистику";
  return "світ і статистику";
}

export function adminResetModeDescription(mode: AdminResetMode) {
  if (mode === "world") return "скидає NPC, тварин, ресурси, черги, сліди, події світу й persistent auto-state; статистика персонажів лишається";
  if (mode === "stats") return "скидає лічильники персонажів і NPC, записані внески до падального рову та службові події, з яких рахується /stat; світ лишається на місці";
  return "спершу скидає світ до стартового seed-стану, потім очищає статистику персонажів, NPC, внески до падального рову та службові події для /stat";
}

export async function resetGameplayStatistics(): Promise<ResetStatsSummary> {
  const [players, creatures, dropoffs, worldStatEvents] = await prisma.$transaction([
    prisma.player.updateMany({
      data: {
        steps: 0,
        looks: 0,
        says: 0,
        gatherAttempts: 0,
        successfulGathers: 0,
        greetings: 0,
        animalsKilled: 0,
        berriesGathered: 0,
        mushroomsGathered: 0,
        herbsGathered: 0,
        restStarts: 0,
        restFullRecoveries: 0,
      },
    }),
    prisma.creature.updateMany({
      data: {
        steps: 0,
        looks: 0,
        says: 0,
        gatherAttempts: 0,
        successfulGathers: 0,
        attackAttempts: 0,
        successfulAttacks: 0,
        kills: 0,
      },
    }),
    prisma.carcassDropoffContribution.deleteMany(),
    prisma.worldEvent.deleteMany({
      where: {
        title: {
          in: [
            WORLD_TICK_EVENT_TITLE,
            PLAYER_KILL_EVENT_TITLE,
            PREDATOR_KILL_EVENT_TITLE,
            STARVATION_DEATH_EVENT_TITLE,
          ],
        },
      },
    }),
  ]);

  return {
    resetPlayers: players.count,
    resetCreatures: creatures.count,
    removedDropoffContributions: dropoffs.count,
    removedWorldStatEvents: worldStatEvents.count,
  };
}
