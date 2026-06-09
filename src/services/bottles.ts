import { prisma } from "../db";
import { canPickUpGroundItem } from "./groundItems";

export const EMPTY_BOTTLE_KEY = "empty_bottle";
export const EMPTY_BOTTLE_SOURCE_CARRY_CAP = 3;
export const EMPTY_BOTTLE_SOURCE_TAKE_EVENT_TITLE = "Player took empty bottle";
export const EMPTY_BOTTLE_TAKE_BUTTON_LABEL = "🧪 Взяти пляшечку";
export const EMPTY_BOTTLE_NO_SOURCE_TEXT = "Поруч немає ніші з порожніми пляшечками.";
export const EMPTY_BOTTLE_SOURCE_CARRY_CAP_TEXT = "У вас уже є кілька порожніх пляшечок. Брати більше з ніші зараз ні до чого: скло в дорозі любить тріскатися не тоді, коли його просять.";

const EMPTY_BOTTLE_NAME = "порожня пляшечка";
const EMPTY_BOTTLE_ACCUSATIVE = "порожню пляшечку";

type JsonRecord = Record<string, unknown>;
export type EmptyBottleTakeResult = { taken: boolean; text: string };

function jsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

export function isEmptyBottleSourceData(data: unknown) {
  return jsonRecord(data).empty_bottle_source === true;
}

export function isEmptyBottleSourceFeature(feature: { data?: unknown | null }) {
  return isEmptyBottleSourceData(feature.data);
}

export function isEmptyBottleTarget(target: string) {
  const normalized = target.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return [
    "empty bottle",
    "empty bottles",
    "bottle",
    "bottles",
    "vial",
    "vessel",
    "порожня пляшечка",
    "порожню пляшечку",
    "порожньої пляшечки",
    "порожні пляшечки",
    "пляшечка",
    "пляшечку",
    "пляшечки",
    "пляшка",
    "пляшку",
    "посудинка",
    "посудину",
  ].includes(normalized);
}

export function emptyBottleSourceInspectionText(fallback?: string | null) {
  return fallback
    ?? "У сухій глині стоять малі чисті пляшечки. Одну можна взяти з собою для майбутніх трав'яних приготувань.";
}

export function canTakeBottleFromSourceAmount(amount: number) {
  return Math.max(0, Math.floor(amount)) < EMPTY_BOTTLE_SOURCE_CARRY_CAP;
}

async function ensureEmptyBottleResourceType() {
  return prisma.resourceType.upsert({
    where: { key: EMPTY_BOTTLE_KEY },
    update: {
      name: EMPTY_BOTTLE_NAME,
      description: "Мала чиста пляшечка для майбутніх настоїв і трав'яних приготувань.",
    },
    create: {
      key: EMPTY_BOTTLE_KEY,
      name: EMPTY_BOTTLE_NAME,
      description: "Мала чиста пляшечка для майбутніх настоїв і трав'яних приготувань.",
    },
  });
}

export async function emptyBottleCarryAmount(playerId: number, resourceTypeId?: number) {
  const resourceType = resourceTypeId
    ? { id: resourceTypeId }
    : await prisma.resourceType.findUnique({ where: { key: EMPTY_BOTTLE_KEY }, select: { id: true } });
  if (!resourceType) return 0;

  const carried = await prisma.playerResource.findUnique({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: resourceType.id } },
    select: { amount: true },
  });
  return carried?.amount ?? 0;
}

export async function takeBottleFromFeature(playerId: number, featureId: number): Promise<EmptyBottleTakeResult> {
  const [resourceType, player] = await Promise.all([
    ensureEmptyBottleResourceType(),
    prisma.player.findUnique({
      where: { id: playerId },
      select: { currentLocationId: true, hp: true, stamina: true, isResting: true, posture: true, sleepState: true },
    }),
  ]);

  if (!player?.currentLocationId) return { taken: false, text: "Ти ще не увійшов у світ. Напиши /start" };
  if (!canPickUpGroundItem(player)) return { taken: false, text: "Ви надто втомлені, щоб брати це просто зараз. Спершу перепочиньте." };

  const feature = await prisma.locationFeature.findUnique({
    where: { id: featureId },
    select: { locationId: true, isActive: true, data: true },
  });
  if (!feature?.isActive || feature.locationId !== player.currentLocationId || !isEmptyBottleSourceFeature(feature)) {
    return { taken: false, text: "Тут уже не видно, звідки взяти пляшечку." };
  }

  if (!canTakeBottleFromSourceAmount(await emptyBottleCarryAmount(playerId, resourceType.id))) {
    return { taken: false, text: EMPTY_BOTTLE_SOURCE_CARRY_CAP_TEXT };
  }

  await prisma.playerResource.upsert({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: resourceType.id } },
    update: { amount: { increment: 1 } },
    create: { playerId, resourceTypeId: resourceType.id, amount: 1 },
  });

  return { taken: true, text: `🧪 Ви взяли ${EMPTY_BOTTLE_ACCUSATIVE}.` };
}

export async function takeBottleFromCurrentLocation(playerId: number): Promise<EmptyBottleTakeResult> {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) return { taken: false, text: "Ти ще не увійшов у світ. Напиши /start" };

  const source = (await prisma.locationFeature.findMany({
    where: { locationId: player.currentLocationId, isActive: true },
    orderBy: { id: "asc" },
    select: { id: true, data: true },
  })).find(isEmptyBottleSourceFeature);

  if (!source) return { taken: false, text: EMPTY_BOTTLE_NO_SOURCE_TEXT };
  return takeBottleFromFeature(playerId, source.id);
}
