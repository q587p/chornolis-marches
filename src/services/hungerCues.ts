import { prisma } from "../db";
import { PLAYER_HUNGER_MAX } from "../gameConfig";
import { isCampfireFeature } from "./locationFeatures";
import { isExtinguishedCampfire } from "./fire";

export type HungerCueLevel = "notice" | "serious";

const EDIBLE_INVENTORY_KEYS = ["berries", "mushrooms", "cooked_meat"] as const;
const COOKABLE_INVENTORY_KEYS = ["raw_meat"] as const;
const GATHERABLE_FOOD_KEYS = ["berries", "mushrooms"] as const;

export function hungerCueLevel(before: number, after: number, max = PLAYER_HUNGER_MAX): HungerCueLevel | null {
  const safeMax = Math.max(1, max);
  const notice = Math.ceil(safeMax * 0.55);
  const serious = Math.ceil(safeMax * 0.9);
  if (before < serious && after >= serious) return "serious";
  if (before < notice && after >= notice) return "notice";
  return null;
}

export function hungerCueText(level: HungerCueLevel, context: { hasEdibleInventory?: boolean; canCookRawMeat?: boolean; hasLocalFood?: boolean } = {}) {
  if (context.hasEdibleInventory) {
    return level === "serious"
      ? "Голод уже не просто тінь. У Речах є щось їстівне (/inventory)."
      : "Живіт стиха нагадує про себе. У Речах є щось їстівне (/inventory).";
  }

  if (context.canCookRawMeat) {
    return level === "serious"
      ? "Голод уже не просто тінь. У Речах є сире м'ясо; біля вогню його можна підсмажити."
      : "Живіт стиха нагадує про себе. Сире м'ясо можна підсмажити біля вогню.";
  }

  if (context.hasLocalFood) {
    return level === "serious"
      ? "Голод уже не просто тінь. Варто пошукати поживу поруч, доки місцина щось дає."
      : "Живіт стиха нагадує про себе. Поруч може знайтися дрібна пожива.";
  }

  return level === "serious"
    ? "Голод уже не просто тінь. Варто поїсти, якщо маєш що."
    : "Живіт стиха нагадує про себе. Це ще не біда, але тіло вже слухає запахи уважніше.";
}

export async function hungerCueContextForPlayer(playerId: number, locationId?: number | null) {
  const resources = await prisma.playerResource.findMany({
    where: {
      playerId,
      amount: { gt: 0 },
      resourceType: { key: { in: [...EDIBLE_INVENTORY_KEYS, ...COOKABLE_INVENTORY_KEYS] } },
    },
    select: { resourceType: { select: { key: true } } },
  });
  const carried = new Set(resources.map((resource) => resource.resourceType.key));
  const hasEdibleInventory = EDIBLE_INVENTORY_KEYS.some((key) => carried.has(key));
  const hasRawMeat = COOKABLE_INVENTORY_KEYS.some((key) => carried.has(key));

  const [features, foodNodes] = locationId
    ? await Promise.all([
        prisma.locationFeature.findMany({ where: { locationId, isActive: true } }),
        prisma.resourceNode.findMany({
          where: { locationId, amount: { gt: 0 }, resourceType: { key: { in: [...GATHERABLE_FOOD_KEYS] } } },
          select: { id: true },
        }),
      ])
    : [[], []];
  const hasCookFire = features.some((feature) => isCampfireFeature(feature) && !isExtinguishedCampfire(feature));

  return {
    hasEdibleInventory,
    canCookRawMeat: hasRawMeat && hasCookFire,
    hasLocalFood: foodNodes.length > 0,
  };
}
