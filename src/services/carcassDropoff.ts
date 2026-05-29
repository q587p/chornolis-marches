import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { resourceTypeDisplayName } from "./corpses";
import { inventoryResourceKeyFromText } from "./inventoryUse";

export const GATE_CARCASS_DROPOFF_FEATURE_KEY = "closed_gate_carcass_dropoff";
export const GATE_CARCASS_DROPOFF_SMALL_THRESHOLD = 3;
export const GATE_CARCASS_DROPOFF_LARGE_THRESHOLD = 13;

type CarriedResource = {
  id: number;
  amount: number;
  resourceType: {
    id: number;
    key: string;
    name: string;
  };
};

type DropoffReaction = {
  first: boolean;
  smallThreshold: boolean;
  largeThreshold: boolean;
};

function featureData(feature: { data?: unknown }) {
  return feature.data && typeof feature.data === "object" && !Array.isArray(feature.data) ? feature.data as Record<string, unknown> : {};
}

function normalize(value: string) {
  return value.toLocaleLowerCase("uk-UA")
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchKeysForFeature(feature: { key: string; name: string; type: string; data?: unknown }) {
  const data = featureData(feature);
  const aliases = Array.isArray(data.aliases) ? data.aliases : [];
  return [feature.key, feature.name, feature.type, ...aliases]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map(normalize);
}

function isCarcassDropoffFeature(feature: { data?: unknown }) {
  return featureData(feature).carcass_dropoff === true;
}

async function resolveLocalFeature(locationId: number, query: string) {
  const normalized = normalize(query);
  const features = await prisma.locationFeature.findMany({
    where: { locationId, isActive: true },
    orderBy: { id: "asc" },
  });

  const exact = features.find((feature) => searchKeysForFeature(feature).some((key) => key === normalized));
  if (exact) return exact;
  return features.find((feature) => searchKeysForFeature(feature).some((key) => key.includes(normalized) || normalized.includes(key))) ?? null;
}

function isGenericCarcassQuery(query: string) {
  const normalized = normalize(query);
  return /\b(corpse|carcass|remains)\b/u.test(normalized)
    || /(труп|туш|рештк|здобич|падал)/u.test(normalized);
}

export function isCarcassDropoffResourceKey(resourceKey: string) {
  return resourceKey.startsWith("corpse_");
}

export function dropoffReactionForTotals(before: number, after: number): DropoffReaction {
  return {
    first: before <= 0 && after > 0,
    smallThreshold: before < GATE_CARCASS_DROPOFF_SMALL_THRESHOLD && after >= GATE_CARCASS_DROPOFF_SMALL_THRESHOLD,
    largeThreshold: before < GATE_CARCASS_DROPOFF_LARGE_THRESHOLD && after >= GATE_CARCASS_DROPOFF_LARGE_THRESHOLD,
  };
}

function amountText(amount: number, resources: CarriedResource[]) {
  if (amount === 1 && resources.length === 1) return resourceTypeDisplayName(resources[0].resourceType);
  return `${amount} туші чи решток`;
}

function actorTextForDropoff(input: {
  amount: number;
  resources: CarriedResource[];
  reaction: DropoffReaction;
}) {
  const lines = [
    `Ви складаєте ${amountText(input.amount, input.resources)} до падального рову.`,
  ];

  if (input.reaction.first) {
    lines.push("Сторож киває до писаря біля воріт.\n\n— Запишемо. Не всяка поміч одразу сріблом важиться.");
  }

  if (input.reaction.smallThreshold) {
    lines.push("Писар перегортає засмальцьований клапоть берести.\n\n— Вже видно, що це не випадкова туша. Бери запасний факел: край пам’ятає поміч.");
  }

  if (input.reaction.largeThreshold) {
    lines.push("Біля воріт сьогодні говорять тихіше, але дивляться уважніше. Писар ставить довгу зарубку на сторожовому кілку.\n\n— Не плата, а знак. Коли питатимуть, скажемо: ця людина тримала край разом із нами.");
  }

  return lines.join("\n\n");
}

async function addPlayerResource(tx: Prisma.TransactionClient, playerId: number, resourceKey: string, amount: number) {
  const resourceType = await tx.resourceType.findUnique({ where: { key: resourceKey } });
  if (!resourceType) return;
  await tx.playerResource.upsert({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: resourceType.id } },
    update: { amount: { increment: amount } },
    create: { playerId, resourceTypeId: resourceType.id, amount },
  });
}

async function matchingCarriedResources(tx: Prisma.TransactionClient, playerId: number, itemQuery: string) {
  const carried = await tx.playerResource.findMany({
    where: { playerId, amount: { gt: 0 } },
    include: { resourceType: true },
    orderBy: { id: "asc" },
  });

  const exactKey = inventoryResourceKeyFromText(itemQuery);
  const exact = carried.filter((item) => item.resourceType.key === exactKey);
  if (exact.length) return exact;
  if (isGenericCarcassQuery(itemQuery)) return carried.filter((item) => isCarcassDropoffResourceKey(item.resourceType.key));
  return [];
}

async function contributionTotal(tx: Prisma.TransactionClient, input: { dropoffFeatureKey: string; playerId: number }) {
  const aggregate = await tx.carcassDropoffContribution.aggregate({
    where: {
      dropoffFeatureKey: input.dropoffFeatureKey,
      contributorKind: "PLAYER",
      playerId: input.playerId,
    },
    _sum: { amount: true },
  });
  return aggregate._sum.amount ?? 0;
}

export async function putInventoryIntoLocalFeature(input: {
  playerId: number;
  itemQuery: string;
  amount?: number | "all";
  containerQuery: string;
}) {
  const player = await prisma.player.findUnique({ where: { id: input.playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  const locationId = player.currentLocationId;

  const feature = await resolveLocalFeature(locationId, input.containerQuery);
  if (!feature) throw new Error("Тут немає такого місця, куди це можна покласти.");
  if (!isCarcassDropoffFeature(feature)) throw new Error("Це не місце для туш чи решток.");

  return prisma.$transaction(async (tx) => {
    const matched = await matchingCarriedResources(tx, input.playerId, input.itemQuery);
    if (!matched.length) throw new Error("У ваших речах немає такої туші чи придатних решток.");
    if (matched.some((item) => !isCarcassDropoffResourceKey(item.resourceType.key))) {
      throw new Error("Падальний рів приймає тільки туші чи придатні рештки здобичі. Це краще лишити при собі.");
    }

    const available = matched.reduce((sum, item) => sum + item.amount, 0);
    const requested = input.amount === "all" ? available : input.amount ?? 1;
    if (requested <= 0) throw new Error("Скільки саме покласти?");
    if (requested > available) throw new Error(`У ваших речах стільки немає. Можна покласти щонайбільше ${available}.`);

    const before = await contributionTotal(tx, { dropoffFeatureKey: feature.key, playerId: input.playerId });
    let remaining = requested;
    for (const item of matched) {
      if (remaining <= 0) break;
      const moved = Math.min(remaining, item.amount);
      remaining -= moved;

      if (moved >= item.amount) {
        await tx.playerResource.delete({ where: { id: item.id } });
      } else {
        await tx.playerResource.update({ where: { id: item.id }, data: { amount: { decrement: moved } } });
      }

      await tx.carcassDropoffContribution.create({
        data: {
          dropoffFeatureKey: feature.key,
          locationId,
          contributorKind: "PLAYER",
          playerId: input.playerId,
          resourceTypeKey: item.resourceType.key,
          amount: moved,
        },
      });
    }

    const after = before + requested;
    const reaction = dropoffReactionForTotals(before, after);
    if (reaction.smallThreshold) await addPlayerResource(tx, input.playerId, "torch", 1);
    if (reaction.largeThreshold) await addPlayerResource(tx, input.playerId, "twigs", 3);

    return {
      amount: requested,
      featureKey: feature.key,
      locationId,
      text: actorTextForDropoff({ amount: requested, resources: matched, reaction }),
      observerText: `Хтось складає здобич до падального рову біля воріт.`,
      contributionTotal: after,
      reaction,
    };
  });
}
