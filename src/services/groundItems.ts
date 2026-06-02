import { prisma } from "../db";
import { resourceTypeDisplayName } from "./corpses";
import { assertCanPerformPhysicalAction } from "./postureRules";

const PICKABLE_RESOURCE_KEYS = ["torch", "lit_torch", "twigs", "raw_meat", "cooked_meat", "shah", "grivna"] as const;
const TUTORIAL_LOOSE_RESOURCE_KEYS = ["berries", "herbs"] as const;
export type PickableResourceKey = (typeof PICKABLE_RESOURCE_KEYS)[number];
export type TutorialLooseResourceKey = (typeof TUTORIAL_LOOSE_RESOURCE_KEYS)[number];
export type VisibleGroundResourceKey = PickableResourceKey | TutorialLooseResourceKey;

export function isPickableResourceKey(key: string): key is PickableResourceKey {
  return (PICKABLE_RESOURCE_KEYS as readonly string[]).includes(key);
}

export function isTutorialLooseResourceKey(key: string): key is TutorialLooseResourceKey {
  return (TUTORIAL_LOOSE_RESOURCE_KEYS as readonly string[]).includes(key);
}

function isTutorialLocationLike(location?: { key?: string | null; z?: number | null; region?: { key?: string | null } | null } | null) {
  return location?.z === -13 || location?.region?.key === "dream_tutorial" || String(location?.key ?? "").startsWith("dream_tutorial_");
}

export function isVisibleGroundResource(
  resource: { amount: number; resourceType: { key: string } },
  location?: { key?: string | null; z?: number | null; region?: { key?: string | null } | null } | null,
) {
  if (resource.amount <= 0) return false;
  const key = resource.resourceType.key;
  if (isTutorialLocationLike(location)) return isTutorialLooseResourceKey(key);
  return isPickableResourceKey(key);
}

export function canPickUpGroundItem(player: { hp: number; stamina: number; isResting: boolean; posture?: string | null; sleepState?: string | null }) {
  assertCanPerformPhysicalAction(player, "PICK_UP");
  return player.hp > 0 && player.stamina > 0;
}

export async function pickUpGroundResource(playerId: number, resourceNodeId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      currentLocationId: true,
      hp: true,
      stamina: true,
      isResting: true,
      posture: true,
      sleepState: true,
      currentLocation: { select: { key: true, z: true, region: { select: { key: true } } } },
    },
  });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  if (!canPickUpGroundItem(player)) throw new Error("Ви надто втомлені, щоб підняти це просто зараз. Спершу перепочиньте.");
  const locationId = player.currentLocationId;

  return prisma.$transaction(async (tx) => {
    const node = await tx.resourceNode.findFirst({
      where: {
        id: resourceNodeId,
        locationId,
        amount: { gt: 0 },
      },
      select: { id: true, resourceTypeId: true, updatedAt: true, resourceType: { select: { key: true, name: true } } },
    });
    if (!node || !isVisibleGroundResource({ amount: 1, resourceType: node.resourceType }, player.currentLocation)) throw new Error("Цього вже немає поруч.");

    const picked = await tx.resourceNode.updateMany({
      where: { id: node.id, amount: { gt: 0 } },
      data: { amount: { decrement: 1 } },
    });
    if (picked.count === 0) throw new Error("Цього вже немає поруч.");

    const litTorchData = node.resourceType.key === "lit_torch" ? { updatedAt: node.updatedAt } : {};
    await tx.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: node.resourceTypeId } },
      update: { amount: { increment: 1 }, ...litTorchData },
      create: { playerId, resourceTypeId: node.resourceTypeId, amount: 1, ...litTorchData },
    });

    return {
      key: node.resourceType.key,
      name: resourceTypeDisplayName(node.resourceType),
      locationId,
    };
  });
}

export async function pickUpVisibleGroundResources(playerId: number, options: { key?: VisibleGroundResourceKey } = {}) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      currentLocationId: true,
      hp: true,
      stamina: true,
      isResting: true,
      posture: true,
      sleepState: true,
      currentLocation: { select: { key: true, z: true, region: { select: { key: true } } } },
    },
  });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  if (!canPickUpGroundItem(player)) throw new Error("Ви надто втомлені, щоб підняти це просто зараз. Спершу перепочиньте.");

  const locationId = player.currentLocationId;

  return prisma.$transaction(async (tx) => {
    const nodes = await tx.resourceNode.findMany({
      where: {
        locationId,
        amount: { gt: 0 },
        ...(options.key ? { resourceType: { key: options.key } } : {}),
      },
      select: {
        id: true,
        amount: true,
        resourceTypeId: true,
        updatedAt: true,
        resourceType: { select: { key: true, name: true } },
      },
      orderBy: { id: "asc" },
    });

    const visibleNodes = nodes.filter((node) => isVisibleGroundResource(node, player.currentLocation));
    if (visibleNodes.length === 0) throw new Error("Поруч немає речей, які можна підняти.");

    const picked: Array<{ key: string; name: string; amount: number }> = [];
    for (const node of visibleNodes) {
      const amount = Math.max(0, node.amount);
      if (amount <= 0) continue;

      const updated = await tx.resourceNode.updateMany({
        where: { id: node.id, amount: { gte: amount } },
        data: { amount: { decrement: amount } },
      });
      if (updated.count === 0) continue;

      const litTorchData = node.resourceType.key === "lit_torch" ? { updatedAt: node.updatedAt } : {};
      await tx.playerResource.upsert({
        where: { playerId_resourceTypeId: { playerId, resourceTypeId: node.resourceTypeId } },
        update: { amount: { increment: amount }, ...litTorchData },
        create: { playerId, resourceTypeId: node.resourceTypeId, amount, ...litTorchData },
      });

      picked.push({
        key: node.resourceType.key,
        name: resourceTypeDisplayName(node.resourceType),
        amount,
      });
    }

    if (picked.length === 0) throw new Error("Поруч немає речей, які можна підняти.");
    return { locationId, items: picked };
  });
}

export async function pickUpAllVisibleGroundResources(playerId: number) {
  return pickUpVisibleGroundResources(playerId);
}

export async function pickUpAllVisibleGroundResourcesByKey(playerId: number, key: VisibleGroundResourceKey) {
  return pickUpVisibleGroundResources(playerId, { key });
}

export async function pickUpFirstGroundResourceByKey(playerId: number, key: PickableResourceKey) {
  return pickUpFirstVisibleGroundResourceByKey(playerId, key);
}

export async function pickUpFirstVisibleGroundResourceByKey(playerId: number, key: VisibleGroundResourceKey) {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");

  const node = await prisma.resourceNode.findFirst({
    where: { locationId: player.currentLocationId, amount: { gt: 0 }, resourceType: { key } },
    orderBy: { id: "asc" },
  });
  if (!node) throw new Error("Цього вже немає поруч.");
  return pickUpGroundResource(playerId, node.id);
}
