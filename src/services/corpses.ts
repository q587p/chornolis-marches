import { prisma } from "../db";

const CARRIED_CORPSE_MARKER = "carried_corpse_by_player:";

export function corpseResourceKey(speciesKey: string) {
  return `corpse_${speciesKey}`;
}

export function corpseResourceName(speciesName: string) {
  return `труп ${speciesName}`;
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

export async function ensureCorpseResourceType(species: { key: string; name: string }) {
  const key = corpseResourceKey(species.key);
  return prisma.resourceType.upsert({
    where: { key },
    update: { name: corpseResourceName(species.name) },
    create: {
      key,
      name: corpseResourceName(species.name),
      description: "Підібраний труп істоти. Поки він у речах, він усе ще псується разом із тілом у світі.",
    },
  });
}

export async function addCorpseToInventory(playerId: number, creature: { id: number; corpseDecayTicksLeft: number | null; species: { key: string; name: string; corpseDecayTicks: number } }) {
  const resourceType = await ensureCorpseResourceType(creature.species);
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

export async function removeDecayedCorpseFromInventory(playerId: number, species: { key: string }) {
  const resourceType = await prisma.resourceType.findUnique({ where: { key: corpseResourceKey(species.key) } });
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
