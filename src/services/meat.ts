import { prisma } from "../db";
import { isExtinguishedCampfire } from "./fire";

export const RAW_MEAT_KEY = "raw_meat";
export const COOKED_MEAT_KEY = "cooked_meat";
const FRESHENED_CORPSE_MARKER = "freshened_by_player:";
const FRESHENED_CORPSE_PATTERN = /(?:^|;\s*)freshened_by_(?:player|hunter):\d+\b/;
const COOKED_MEAT_HUNGER_RELIEF = 5;
const COOKING_SUCCESS_CHANCE = 0.6;

export function meatYieldForSpecies(speciesKey: string) {
  if (speciesKey === "mouse") return 1;
  if (speciesKey === "rabbit") return 3;
  if (speciesKey === "fox") return 5;
  if (speciesKey === "wolf") return 7;
  return 2;
}

export function isFreshenedCorpse(currentAction: string | null | undefined) {
  return FRESHENED_CORPSE_PATTERN.test(currentAction ?? "");
}

export function meatCookingSucceeds(roll = Math.random()) {
  return roll < COOKING_SUCCESS_CHANCE;
}

function freshenedCorpseAction(playerId: number, amount: number) {
  return `${FRESHENED_CORPSE_MARKER}${playerId}; м'ясо=${amount}`;
}

export async function ensureMeatResourceTypes() {
  const [rawMeat, cookedMeat] = await Promise.all([
    prisma.resourceType.upsert({
      where: { key: RAW_MEAT_KEY },
      update: {
        name: "сире м'ясо",
        description: "Щойно здобуте м'ясо. Його краще підсмажити біля вогнища.",
      },
      create: {
        key: RAW_MEAT_KEY,
        name: "сире м'ясо",
        description: "Щойно здобуте м'ясо. Його краще підсмажити біля вогнища.",
      },
    }),
    prisma.resourceType.upsert({
      where: { key: COOKED_MEAT_KEY },
      update: {
        name: "смажене м'ясо",
        description: "Підсмажене біля вогнища м'ясо. Втамовує голод краще за випадкові знахідки.",
      },
      create: {
        key: COOKED_MEAT_KEY,
        name: "смажене м'ясо",
        description: "Підсмажене біля вогнища м'ясо. Втамовує голод краще за випадкові знахідки.",
      },
    }),
  ]);
  return { rawMeat, cookedMeat };
}

export async function freshenCorpseForMeat(input: {
  playerId: number;
  creatureId: number;
  locationId: number;
  speciesKey: string;
}) {
  const { rawMeat } = await ensureMeatResourceTypes();
  const amount = meatYieldForSpecies(input.speciesKey);

  await prisma.$transaction(async (tx) => {
    const freshened = await tx.creature.updateMany({
      where: {
        id: input.creatureId,
        locationId: input.locationId,
        isAlive: false,
        isGone: false,
        isHidden: false,
        age: "CORPSE",
        NOT: { currentAction: { startsWith: FRESHENED_CORPSE_MARKER } },
      },
      data: { isHidden: true, currentAction: freshenedCorpseAction(input.playerId, amount) },
    });
    if (freshened.count === 0) throw new Error("Труп уже не підходить для освіжування.");

    await tx.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId: input.playerId, resourceTypeId: rawMeat.id } },
      update: { amount: { increment: amount } },
      create: { playerId: input.playerId, resourceTypeId: rawMeat.id, amount },
    });
  });

  return { amount, resourceName: rawMeat.name };
}

export async function canCookMeatAtLocation(locationId: number | null | undefined) {
  if (!locationId) return false;
  const campfire = await prisma.locationFeature.findFirst({
    where: {
      locationId,
      isActive: true,
      providesLight: true,
      type: { in: ["CAMPFIRE", "MAGIC_CAMPFIRE"] },
    },
    select: { data: true, providesLight: true },
  });
  return Boolean(campfire && !isExtinguishedCampfire(campfire));
}

export async function canCookPlayerMeat(playerId: number) {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  return canCookMeatAtLocation(player?.currentLocationId);
}

export async function cookRawMeat(playerId: number) {
  const { rawMeat, cookedMeat } = await ensureMeatResourceTypes();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  if (!(await canCookMeatAtLocation(player.currentLocationId))) {
    throw new Error("Потрібне вогнище поруч. Самого факела замало, щоб підсмажити м'ясо.");
  }
  const cookedSuccessfully = meatCookingSucceeds();

  await prisma.$transaction(async (tx) => {
    const carried = await tx.playerResource.findUnique({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: rawMeat.id } },
    });
    if (!carried || carried.amount <= 0) throw new Error("У ваших речах немає сирого м'яса.");

    if (carried.amount > 1) {
      await tx.playerResource.update({ where: { id: carried.id }, data: { amount: { decrement: 1 } } });
    } else {
      await tx.playerResource.delete({ where: { id: carried.id } });
    }

    if (!cookedSuccessfully) return;

    await tx.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: cookedMeat.id } },
      update: { amount: { increment: 1 } },
      create: { playerId, resourceTypeId: cookedMeat.id, amount: 1 },
    });
  });

  return cookedSuccessfully
    ? "Ви підсмажили шмат м'яса над вогнищем."
    : "М'ясо підгоріло й розсипалося чорним крихким шматтям. Їсти тут уже нічого.";
}

export async function eatCookedMeat(playerId: number) {
  const { cookedMeat } = await ensureMeatResourceTypes();
  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId }, select: { hunger: true } });
    if (!player) throw new Error("Ти ще не увійшов у світ. Напиши /start");
    if (player.hunger <= 0) throw new Error("Ви не голодні. Смажене м'ясо краще лишити на потім.");

    const carried = await tx.playerResource.findUnique({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: cookedMeat.id } },
    });
    if (!carried || carried.amount <= 0) throw new Error("У ваших речах немає смаженого м'яса.");

    if (carried.amount > 1) {
      await tx.playerResource.update({ where: { id: carried.id }, data: { amount: { decrement: 1 } } });
    } else {
      await tx.playerResource.delete({ where: { id: carried.id } });
    }

    const nextHunger = Math.max(0, player.hunger - COOKED_MEAT_HUNGER_RELIEF);
    await tx.player.update({ where: { id: playerId }, data: { hunger: nextHunger } });
    return nextHunger <= 0
      ? "Ви з'їли смажене м'ясо. Голод відступив."
      : "Ви з'їли смажене м'ясо. Голод помітно відступає.";
  });
}
