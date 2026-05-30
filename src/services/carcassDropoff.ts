import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { resourceTypeDisplayName } from "./corpses";
import { inventoryResourceKeyFromText } from "./inventoryUse";

export const GATE_CARCASS_DROPOFF_FEATURE_KEY = "closed_gate_carcass_dropoff";
export const GATE_CARCASS_DROPOFF_SMALL_THRESHOLD = 3;
export const GATE_CARCASS_DROPOFF_LARGE_THRESHOLD = 13;
export const GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD = 21;
export const GATE_HUNTING_SATURATION_PREY_PRESSURE_MAX = 12;
export const GATE_HUNTING_SATURATION_RADIUS = 4;
export const CARCASS_QUEST_OVERRIDE_DATA_KEY = "carcassQuestOverride";
const DEPLETED_VEGETATION_FEATURE_PREFIX = "depleted_vegetation_";

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

export type GateHuntingSaturationState = {
  active: boolean;
  manualOverride: CarcassQuestOverride | null;
  contributionTotal: number;
  preyPressure: number;
  depletedSignals: number;
  enoughContributions: boolean;
  pressureQuiet: boolean;
  overgrazingQuiet: boolean;
};

export type CarcassQuestOverride = "start" | "stop";

type DropoffContributor = {
  contributorKind: "PLAYER" | "NPC" | "UNKNOWN";
  playerId?: number | null;
  creatureId?: number | null;
};

export const HUNTER_FIELD_LINES = {
  departure: [
    "Начувайтесь, гризуни.",
    "Відновимо рівновагу.",
    "Ліс не має лишатися без зубів.",
  ],
  trail: [
    "Звір розійшовся занадто близько до воріт.",
    "Поки хижаків мало, люди стануть зубами краю.",
    "Допоможемо лісовику втримати край.",
  ],
  return: [
    "Падальний рів сьогодні не пустуватиме.",
    "Не за срібло йду, а щоб трава знову піднялася.",
  ],
  deposit: [
    "Писарю, став зарубку.",
    "Ще трохи тиску на стадо.",
  ],
  giveUp: [
    "Сліди розсипались. Повернуся іншим колом.",
    "Сьогодні ліс не дав легкої стежки.",
  ],
  standDown: [
    "Досить на сьогодні. Хай трава трохи підведеться.",
    "Не кожен рух у лісі треба гнати ножем.",
    "Посидимо біля вогню. Якщо межа знову просяде, підемо.",
    "Гризуни ще лишаться. Але тепер не вони диктують день.",
    "Писар знак змінив. Значить, поки чекаємо.",
  ],
} as const;

export type HunterFieldLineKind = keyof typeof HUNTER_FIELD_LINES;

function featureData(feature: { data?: unknown }) {
  return feature.data && typeof feature.data === "object" && !Array.isArray(feature.data) ? feature.data as Record<string, unknown> : {};
}

function carcassQuestOverrideFromData(data: unknown): CarcassQuestOverride | null {
  const value = featureData({ data })[CARCASS_QUEST_OVERRIDE_DATA_KEY];
  return value === "start" || value === "stop" ? value : null;
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

export function dropoffReactionForTotals(before: number, after: number, options: { saturationActive?: boolean } = {}): DropoffReaction {
  const reaction = {
    first: before <= 0 && after > 0,
    smallThreshold: before < GATE_CARCASS_DROPOFF_SMALL_THRESHOLD && after >= GATE_CARCASS_DROPOFF_SMALL_THRESHOLD,
    largeThreshold: before < GATE_CARCASS_DROPOFF_LARGE_THRESHOLD && after >= GATE_CARCASS_DROPOFF_LARGE_THRESHOLD,
  };
  return options.saturationActive ? suppressDropoffRewards(reaction) : reaction;
}

export function gateHuntingSaturationForSignals(input: {
  contributionTotal: number;
  preyPressure: number;
  depletedSignals?: number;
  manualOverride?: CarcassQuestOverride | null;
}): GateHuntingSaturationState {
  const contributionTotal = Math.max(0, Math.trunc(input.contributionTotal));
  const preyPressure = Math.max(0, Math.trunc(input.preyPressure));
  const depletedSignals = Math.max(0, Math.trunc(input.depletedSignals ?? 0));
  const enoughContributions = contributionTotal >= GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD;
  const pressureQuiet = preyPressure <= GATE_HUNTING_SATURATION_PREY_PRESSURE_MAX;
  const overgrazingQuiet = depletedSignals <= 0;
  const manualOverride = input.manualOverride ?? null;
  const automaticActive = enoughContributions && pressureQuiet && overgrazingQuiet;
  return {
    active: manualOverride === "start" ? false : manualOverride === "stop" ? true : automaticActive,
    manualOverride,
    contributionTotal,
    preyPressure,
    depletedSignals,
    enoughContributions,
    pressureQuiet,
    overgrazingQuiet,
  };
}

function suppressDropoffRewards(reaction: DropoffReaction): DropoffReaction {
  return { first: reaction.first, smallThreshold: false, largeThreshold: false };
}

export function hunterFieldLine(kind: HunterFieldLineKind, seed = 0) {
  const lines = HUNTER_FIELD_LINES[kind];
  const index = Math.abs(seed) % lines.length;
  return lines[index];
}

async function totalDropoffContributions(db: any, dropoffFeatureKey: string) {
  const aggregate = await db.carcassDropoffContribution.aggregate({
    where: { dropoffFeatureKey },
    _sum: { amount: true },
  });
  return aggregate._sum.amount ?? 0;
}

export function gateHuntingAreaLocationWhere(location: { x: number; y: number; z: number }, radius = GATE_HUNTING_SATURATION_RADIUS) {
  return {
    z: location.z,
    x: { gte: location.x - radius, lte: location.x + radius },
    y: { gte: location.y - radius, lte: location.y + radius },
  };
}

async function saturationSignals(db: any, dropoffFeatureKey: string) {
  const feature = await db.locationFeature.findUnique({
    where: { key: dropoffFeatureKey },
    include: { location: true },
  });
  if (!feature?.location) return gateHuntingSaturationForSignals({ contributionTotal: 0, preyPressure: Number.POSITIVE_INFINITY });
  const manualOverride = carcassQuestOverrideFromData(feature.data);

  const nearbyLocations = await db.cellLocation.findMany({
    where: gateHuntingAreaLocationWhere(feature.location),
    select: { id: true },
  });
  const locationIds = nearbyLocations.map((location: { id: number }) => location.id);
  const [contributionTotal, preyPressure, depletedSignals] = await Promise.all([
    totalDropoffContributions(db, dropoffFeatureKey),
    db.creature.count({
      where: {
        locationId: { in: locationIds },
        isAlive: true,
        isGone: false,
        isHidden: false,
        species: { key: { in: ["mouse", "rabbit"] }, diet: "HERBIVORE" },
      },
    }),
    db.locationFeature.count({
      where: {
        locationId: { in: locationIds },
        isActive: true,
        key: { startsWith: DEPLETED_VEGETATION_FEATURE_PREFIX },
      },
    }),
  ]);

  return gateHuntingSaturationForSignals({ contributionTotal, preyPressure, depletedSignals, manualOverride });
}

export async function getGateHuntingSaturationState(dropoffFeatureKey = GATE_CARCASS_DROPOFF_FEATURE_KEY) {
  return saturationSignals(prisma, dropoffFeatureKey);
}

export async function setCarcassQuestOverride(mode: CarcassQuestOverride, dropoffFeatureKey = GATE_CARCASS_DROPOFF_FEATURE_KEY) {
  const feature = await prisma.locationFeature.findUnique({
    where: { key: dropoffFeatureKey },
    select: { id: true, key: true, name: true, locationId: true, data: true },
  });
  if (!feature) throw new Error(`Не знайдено падальний рів: ${dropoffFeatureKey}.`);

  const current = featureData(feature);
  await prisma.locationFeature.update({
    where: { id: feature.id },
    data: {
      data: {
        ...current,
        [CARCASS_QUEST_OVERRIDE_DATA_KEY]: mode,
      } as Prisma.InputJsonValue,
    },
  });

  const state = await getGateHuntingSaturationState(dropoffFeatureKey);
  return { feature, state };
}

function saturationTechnicalLine(state: GateHuntingSaturationState) {
  return `Технічно: huntingSaturation=${state.active ? "active" : "inactive"}; override=${state.manualOverride ?? "auto"}; contributions=${state.contributionTotal}/${GATE_HUNTING_SATURATION_CONTRIBUTION_THRESHOLD}; preyPressure=${state.preyPressure}/${GATE_HUNTING_SATURATION_PREY_PRESSURE_MAX}; depletedSignals=${state.depletedSignals}.`;
}

export function gateHuntingNoticeText(baseText: string | null | undefined, state: GateHuntingSaturationState, showTechnicalDetails = false) {
  const text = state.active
    ? "На дошці біля воріт висить свіжіша записка. Старі рядки про гризунів не зірвані, але поверх них прибито вузьку смугу берести.\n\nПоки досить. Тиск на стадо повернувся, трава біля межі має час підвестися, а мисливцям не велено гнати кожну тінь ножем.\n\nПадальний рів лишається на місці: придатні рештки все ще можна скласти туди, якщо вже принесли. Але сьогодні поселення більше не кличе за новою здобиччю."
    : baseText ?? "На дошці біля воріт висить записка про звіра біля межі.";
  return showTechnicalDetails ? `${text}\n\n${saturationTechnicalLine(state)}` : text;
}

export function gateHuntingDropoffText(baseText: string | null | undefined, state: GateHuntingSaturationState, showTechnicalDetails = false) {
  const text = state.active
    ? "Падальний рів під частоколом не засипаний, але сторожовий кілок біля нього перев’язано свіжою смугою берести: поки вистачить.\n\nЯкщо ви вже несете придатну тушу чи рештки, їх можна скласти сюди. Писар поставить зарубку, але нових припасів за це зараз не видаватимуть: край має перепочити від полювання."
    : baseText ?? "Тут складають туші та рештки здобичі для писарського рахунку.";
  return showTechnicalDetails ? `${text}\n\n${saturationTechnicalLine(state)}` : text;
}

function amountText(amount: number, resources: CarriedResource[]) {
  if (amount === 1 && resources.length === 1) return resourceTypeDisplayName(resources[0].resourceType);
  return `${amount} туші чи решток`;
}

function actorTextForDropoff(input: {
  amount: number;
  resources: CarriedResource[];
  reaction: DropoffReaction;
  saturationActive?: boolean;
}) {
  const lines = [
    `Ви складаєте ${amountText(input.amount, input.resources)} до падального рову.`,
  ];

  if (input.saturationActive) {
    lines.push("Сторож дивиться на свіжу бересту біля кілка й тихо каже:\n\n— Приймемо, якщо вже принесли. Але край сьогодні не просить більшої різанини, тож нових припасів за це не буде.");
  }

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

async function contributionTotal(tx: Prisma.TransactionClient, input: { dropoffFeatureKey: string } & DropoffContributor) {
  const aggregate = await tx.carcassDropoffContribution.aggregate({
    where: {
      dropoffFeatureKey: input.dropoffFeatureKey,
      contributorKind: input.contributorKind,
      playerId: input.playerId ?? null,
      creatureId: input.creatureId ?? null,
    },
    _sum: { amount: true },
  });
  return aggregate._sum.amount ?? 0;
}

function npcDropoffText(input: { amount: number; creatureName: string; reaction: DropoffReaction }) {
  const lines = [
    `${input.creatureName} складає ${input.amount} туші чи решток до падального рову.`,
  ];

  if (input.reaction.first) {
    lines.push("Писар біля воріт мовчки ставить нову зарубку: допомога прийшла не від мандрівника, але край це теж запам’ятає.");
  }

  if (input.reaction.smallThreshold) {
    lines.push("Сторож перевіряє рів і киває до мисливця: тиск на стадо вже відчутний.");
  }

  if (input.reaction.largeThreshold) {
    lines.push("На сторожовому кілку з’являється довша зарубка. Це не плата, а знак, що поселення тримало край не самими словами.");
  }

  return lines.join("\n\n");
}

export async function recordNpcCarcassDropoffContribution(input: {
  creatureId: number;
  dropoffFeatureKey?: string;
  resourceTypeKey: string;
  amount?: number;
}) {
  const amount = input.amount ?? 1;
  if (amount <= 0) throw new Error("Скільки саме покласти?");
  if (!isCarcassDropoffResourceKey(input.resourceTypeKey)) {
    throw new Error("Падальний рів приймає тільки туші чи придатні рештки здобичі.");
  }

  const dropoffFeatureKey = input.dropoffFeatureKey ?? GATE_CARCASS_DROPOFF_FEATURE_KEY;
  const saturation = await getGateHuntingSaturationState(dropoffFeatureKey).catch(() => null);

  return prisma.$transaction(async (tx) => {
    const [feature, creature] = await Promise.all([
      tx.locationFeature.findUnique({ where: { key: dropoffFeatureKey } }),
      tx.creature.findUnique({
        where: { id: input.creatureId },
        include: { species: true },
      }),
    ]);

    if (!feature || !isCarcassDropoffFeature(feature)) {
      throw new Error("Тут немає придатного падального рову.");
    }
    if (!creature) throw new Error("Такого мисливця не знайдено.");

    const before = await contributionTotal(tx, {
      dropoffFeatureKey: feature.key,
      contributorKind: "NPC",
      creatureId: input.creatureId,
    });

    await tx.carcassDropoffContribution.create({
      data: {
        dropoffFeatureKey: feature.key,
        locationId: feature.locationId,
        contributorKind: "NPC",
        creatureId: input.creatureId,
        resourceTypeKey: input.resourceTypeKey,
        amount,
      },
    });

    const after = before + amount;
    const reaction = dropoffReactionForTotals(before, after, { saturationActive: saturation?.active });
    const creatureName = creature.name ?? creature.species.name;

    return {
      amount,
      featureKey: feature.key,
      locationId: feature.locationId,
      contributorKind: "NPC" as const,
      creatureId: input.creatureId,
      contributionTotal: after,
      reaction,
      text: npcDropoffText({ amount, creatureName, reaction }),
      observerText: `${creatureName} складає здобич до падального рову біля воріт.`,
      fieldLine: hunterFieldLine("deposit", after),
    };
  });
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
  const saturation = await getGateHuntingSaturationState(feature.key).catch(() => null);

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

    const before = await contributionTotal(tx, {
      dropoffFeatureKey: feature.key,
      contributorKind: "PLAYER",
      playerId: input.playerId,
    });
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
    const reaction = dropoffReactionForTotals(before, after, { saturationActive: saturation?.active });
    if (!saturation?.active && reaction.smallThreshold) await addPlayerResource(tx, input.playerId, "torch", 1);
    if (!saturation?.active && reaction.largeThreshold) await addPlayerResource(tx, input.playerId, "twigs", 3);

    return {
      amount: requested,
      featureKey: feature.key,
      locationId,
      text: actorTextForDropoff({ amount: requested, resources: matched, reaction, saturationActive: Boolean(saturation?.active) }),
      observerText: `Хтось складає здобич до падального рову біля воріт.`,
      contributionTotal: after,
      reaction,
    };
  });
}
