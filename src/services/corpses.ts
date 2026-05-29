import { prisma } from "../db";
import { creatureForms } from "./grammar";

const CARRIED_CORPSE_MARKER = "carried_corpse_by_player:";

const CORPSE_RESOURCE_DISPLAY_NAMES: Record<string, string> = {
  raw_meat: "сире м'ясо",
  cooked_meat: "смажене м'ясо",
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
