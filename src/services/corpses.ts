import { prisma } from "../db";
import type { Prisma } from "@prisma/client";
import { creatureForms } from "./grammar";
import { isFreshenedCorpse } from "./meat";

const CARRIED_CORPSE_MARKER = "carried_corpse_by_player:";

const CORPSE_RESOURCE_DISPLAY_NAMES: Record<string, string> = {
  raw_meat: "сире м'ясо",
  cooked_meat: "смажене м'ясо",
  corpse_mouse: "труп миші",
  corpse_mouse_male: "труп миша",
  corpse_mouse_female: "труп миші",
  corpse_rabbit: "труп зайця",
  corpse_rabbit_male: "труп зайця",
  corpse_rabbit_female: "труп зайчихи",
  corpse_fox: "труп лисиці",
  corpse_fox_male: "труп лиса",
  corpse_fox_female: "труп лисиці",
  corpse_wolf: "труп вовка",
  corpse_wolf_male: "труп вовка",
  corpse_wolf_female: "труп вовчиці",
};

export type ResourceDisplayGender = "MASCULINE" | "FEMININE" | "NEUTER" | "PLURAL";

export function resourceTypeGrammaticalGender(resourceType: { key: string; name: string }): ResourceDisplayGender {
  if (resourceType.key === "raw_meat" || resourceType.key === "cooked_meat") return "NEUTER";
  if (resourceType.key === "berries" || resourceType.key === "mushrooms" || resourceType.key === "herbs") return "PLURAL";
  if (resourceType.key === "hand_axe") return "FEMININE";
  return "MASCULINE";
}

type CorpseResourceCreature = {
  sex?: string | null;
  species: {
    key: string;
    name: string;
    nameGenitive?: string | null;
    nameDative?: string | null;
    nameAccusative?: string | null;
    nameInstrumental?: string | null;
    nameLocative?: string | null;
    nameVocative?: string | null;
  };
};

export function corpseResourceKey(creature: CorpseResourceCreature | { key: string }) {
  if ("species" in creature) {
    const sexSuffix = creature.sex ? `_${String(creature.sex).toLowerCase()}` : "";
    return `corpse_${creature.species.key}${sexSuffix}`;
  }
  return `corpse_${creature.key}`;
}

export function isCorpseResourceKey(key: string | null | undefined) {
  return Boolean(key?.startsWith("corpse_"));
}

export function corpseResourceName(creature: CorpseResourceCreature) {
  return `труп ${creatureForms(creature).genitive}`;
}

export function resourceTypeDisplayName(resourceType: { key: string; name: string }) {
  if (resourceType.key === "torch") return "факел";
  if (resourceType.key === "lit_torch") return "запалений факел";
  return CORPSE_RESOURCE_DISPLAY_NAMES[resourceType.key] ?? resourceType.name;
}

export function carriedCorpseAction(playerId: number, decayLeft: number) {
  return `${CARRIED_CORPSE_MARKER}${playerId}; розкладається; залишилось ${decayLeft} тіків`;
}

export function carriedCorpseOwnerId(currentAction: string | null | undefined) {
  if (!currentAction?.startsWith(CARRIED_CORPSE_MARKER)) return null;
  const raw = currentAction.slice(CARRIED_CORPSE_MARKER.length).split(";")[0];
  const playerId = Number(raw);
  return Number.isSafeInteger(playerId) ? playerId : null;
}

function carriedCorpseDecayLeft(currentAction: string | null | undefined, fallback: number) {
  const match = currentAction?.match(/залишилось\s+(\d+)\s+тіків/u);
  const parsed = Number(match?.[1]);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeCorpseQuery(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("uk-UA")
    .replace(/^#/, "")
    .replace(/\s+/g, " ");
}

function stripCorpseWords(value: string) {
  return normalizeCorpseQuery(value)
    .replace(/^(?:all|everything|все|усе|всі|усі)\s+/u, "")
    .replace(/^(?:corpse|corpses|body|bodies|carcass|carcasses|труп|трупи|туша|туші|рештки)\s*/u, "")
    .replace(/\s+(?:corpse|corpses|body|bodies|carcass|carcasses|труп|трупи|туша|туші|рештки)$/u, "")
    .trim();
}

export function isCorpseQuery(query: string | null | undefined) {
  if (!query) return false;
  const normalized = normalizeCorpseQuery(query);
  return ["corpse", "corpses", "body", "bodies", "carcass", "carcasses", "труп", "трупи", "туша", "туші", "рештки"].includes(normalized);
}

function corpseMatchesQuery(creature: CorpseResourceCreature, query?: string | null) {
  if (!query || isCorpseQuery(query)) return true;

  const normalized = stripCorpseWords(query);
  if (!normalized) return true;

  const forms = creatureForms(creature);
  const resourceKey = corpseResourceKey(creature);
  const keys = [
    resourceKey,
    resourceKey.replace(/^corpse_/, ""),
    corpseResourceName(creature),
    forms.nominative,
    forms.genitive,
    forms.accusative,
    creature.species.key,
    creature.species.name,
    creature.species.nameGenitive,
    creature.species.nameAccusative,
  ]
    .filter(Boolean)
    .map((key) => stripCorpseWords(String(key)))
    .filter(Boolean);

  return keys.some((key) => key === normalized || key.includes(normalized) || normalized.includes(key));
}

export async function ensureCorpseResourceType(creature: CorpseResourceCreature) {
  const key = corpseResourceKey(creature);
  const name = corpseResourceName(creature);
  return prisma.resourceType.upsert({
    where: { key },
    update: { name },
    create: {
      key,
      name,
      description: "Підібраний труп істоти. Поки він у речах, він усе ще псується разом із тілом у світі.",
    },
  });
}

export async function addCorpseToInventory(playerId: number, creature: { id: number; sex?: string | null; corpseDecayTicksLeft: number | null; species: CorpseResourceCreature["species"] & { corpseDecayTicks: number } }) {
  const resourceType = await ensureCorpseResourceType(creature);
  const decayLeft = creature.corpseDecayTicksLeft ?? creature.species.corpseDecayTicks;

  await prisma.$transaction(async (tx) => {
    const pickedUp = await tx.creature.updateMany({
      where: { id: creature.id, isAlive: false, isGone: false, isHidden: false },
      data: { isHidden: true, currentAction: carriedCorpseAction(playerId, decayLeft) },
    });
    if (pickedUp.count === 0) throw new Error("Corpse is no longer available.");

    await tx.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: resourceType.id } },
      update: { amount: { increment: 1 } },
      create: { playerId, resourceTypeId: resourceType.id, amount: 1 },
    });
  });

  return resourceType;
}

export async function addVisibleCorpsesToInventory(playerId: number, query?: string | null) {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");

  const creatures = await prisma.creature.findMany({
    where: {
      locationId: player.currentLocationId,
      isAlive: false,
      isGone: false,
      isHidden: false,
      age: "CORPSE",
    },
    include: { species: true },
    orderBy: { id: "asc" },
  });

  const visibleCorpses = creatures
    .filter((creature) => !isFreshenedCorpse(creature.currentAction))
    .filter((creature) => corpseMatchesQuery(creature, query));

  if (!visibleCorpses.length) throw new Error("Поруч немає таких трупів, які можна підняти.");

  const groups = new Map<string, { key: string; name: string; amount: number }>();
  for (const creature of visibleCorpses) {
    const resourceType = await addCorpseToInventory(playerId, { ...creature, species: creature.species });
    const name = resourceTypeDisplayName(resourceType);
    const group = groups.get(resourceType.key) ?? { key: resourceType.key, name, amount: 0 };
    group.amount += 1;
    groups.set(resourceType.key, group);
  }

  return { locationId: player.currentLocationId, items: [...groups.values()] };
}

export async function dropCarriedCorpseResource(
  tx: Prisma.TransactionClient,
  playerId: number,
  locationId: number,
  resourceType: { id: number; key: string; name: string },
) {
  if (!isCorpseResourceKey(resourceType.key)) return null;

  const candidates = await tx.creature.findMany({
    where: {
      isAlive: false,
      isGone: false,
      isHidden: true,
      age: "CORPSE",
      currentAction: { startsWith: CARRIED_CORPSE_MARKER + playerId },
    },
    include: { species: true },
    orderBy: { id: "asc" },
  });
  const creature = candidates.find((candidate) => corpseResourceKey(candidate) === resourceType.key);
  if (!creature) return null;

  const decayLeft = carriedCorpseDecayLeft(creature.currentAction, creature.corpseDecayTicksLeft ?? creature.species.corpseDecayTicks);
  await tx.creature.update({
    where: { id: creature.id },
    data: {
      locationId,
      isHidden: false,
      corpseDecayTicksLeft: decayLeft,
      currentAction: `розкладається; залишилось ${decayLeft} тіків`,
    },
  });

  return {
    creatureId: creature.id,
    key: resourceType.key,
    name: resourceTypeDisplayName(resourceType),
  };
}

export async function removeDecayedCorpseFromInventory(playerId: number, creature: CorpseResourceCreature) {
  const resourceType = await prisma.resourceType.findUnique({ where: { key: corpseResourceKey(creature) } });
  if (!resourceType) return;

  const item = await prisma.playerResource.findUnique({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: resourceType.id } },
  });
  if (!item) return;

  if (item.amount > 1) {
    await prisma.playerResource.update({ where: { id: item.id }, data: { amount: { decrement: 1 } } });
  } else {
    await prisma.playerResource.delete({ where: { id: item.id } });
  }
}
