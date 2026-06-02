import { prisma } from "../db";
import { GRIVNA_RESOURCE_KEY, SHAH_RESOURCE_KEY } from "../utils/moneyText";

export const DEFAULT_GATHER_SHAH_CHANCE_PERMILLE = 30;

export const GATHER_SHAH_BONUS_MESSAGES = [
  "Між корінням коротко блиснуло. Ви знайшли шаг.",
  "У вологій землі щось дзенькнуло об пальці. Шаг.",
  "Під листям лежала темна дрібна монета. Ви забрали шаг.",
] as const;

export type LootLocationLike = {
  key?: string | null;
  z?: number | null;
  region?: { key?: string | null } | null;
};

function intFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1000, Math.floor(parsed)));
}

export function gatherShahChancePermille(value = process.env.LOOT_GATHER_SHAH_CHANCE_PERMILLE) {
  return intFromEnv(value, DEFAULT_GATHER_SHAH_CHANCE_PERMILLE);
}

export function isWakingWorldLootLocation(location?: LootLocationLike | null) {
  if (!location) return false;
  if (typeof location.z === "number" && location.z <= -10) return false;
  const key = String(location.key ?? "");
  const regionKey = String(location.region?.key ?? "");
  if (key.startsWith("dream_")) return false;
  if (regionKey.startsWith("dream")) return false;
  return true;
}

export function gatherShahBonusHits(chancePermille = gatherShahChancePermille(), roll = Math.random()) {
  const chance = Math.max(0, Math.min(1000, Math.floor(chancePermille)));
  if (chance <= 0) return false;
  if (chance >= 1000) return true;
  return Math.floor(Math.max(0, Math.min(0.999999, roll)) * 1000) < chance;
}

export function gatherShahBonusMessage(random = Math.random) {
  const index = Math.floor(Math.max(0, Math.min(0.999999, random())) * GATHER_SHAH_BONUS_MESSAGES.length);
  return GATHER_SHAH_BONUS_MESSAGES[index] ?? GATHER_SHAH_BONUS_MESSAGES[0];
}

export async function ensureMoneyResourceTypes() {
  const [shah, grivna] = await Promise.all([
    prisma.resourceType.upsert({
      where: { key: SHAH_RESOURCE_KEY },
      update: {
        name: "шаг",
        description: "Дрібна потемніла монета. Не дуже блищить, але писарі все одно впізнають її вагу.",
      },
      create: {
        key: SHAH_RESOURCE_KEY,
        name: "шаг",
        description: "Дрібна потемніла монета. Не дуже блищить, але писарі все одно впізнають її вагу.",
      },
    }),
    prisma.resourceType.upsert({
      where: { key: GRIVNA_RESOURCE_KEY },
      update: {
        name: "ґривня",
        description: "Більша грошова одиниця, важча й рідкісніша за шаг. У Порубіжжі її радше бережуть, ніж витрачають похапцем.",
      },
      create: {
        key: GRIVNA_RESOURCE_KEY,
        name: "ґривня",
        description: "Більша грошова одиниця, важча й рідкісніша за шаг. У Порубіжжі її радше бережуть, ніж витрачають похапцем.",
      },
    }),
  ]);
  return { shah, grivna };
}

export async function maybeGrantGatherShahBonus(input: {
  playerId: number;
  location?: LootLocationLike | null;
  chancePermille?: number;
  random?: () => number;
}) {
  if (!isWakingWorldLootLocation(input.location)) return null;
  const random = input.random ?? Math.random;
  if (!gatherShahBonusHits(input.chancePermille ?? gatherShahChancePermille(), random())) return null;

  const { shah } = await ensureMoneyResourceTypes();
  await prisma.playerResource.upsert({
    where: { playerId_resourceTypeId: { playerId: input.playerId, resourceTypeId: shah.id } },
    update: { amount: { increment: 1 } },
    create: { playerId: input.playerId, resourceTypeId: shah.id, amount: 1 },
  });

  return {
    key: SHAH_RESOURCE_KEY,
    amount: 1,
    text: gatherShahBonusMessage(random),
  };
}
