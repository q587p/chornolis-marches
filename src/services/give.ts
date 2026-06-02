import { prisma } from "../db";
import { resourceTypeDisplayName } from "./corpses";
import { playerForms } from "./grammar";
import { isCampSpiritCatCreature } from "./campSpiritCat";
import { ensureMeatResourceTypes, RAW_MEAT_KEY } from "./meat";

export const GIVE_ITEM_STAMINA_COST = 1;

export type GiveRawMeatResult = {
  text: string;
  observerText: string;
  locationId: number;
  targetId: number;
  itemName: string;
};

export function isSupportedGiveResourceKey(resourceKey: string) {
  return resourceKey === RAW_MEAT_KEY;
}

export async function giveRawMeatToCampSpiritCat(playerId: number, targetCreatureId: number): Promise<GiveRawMeatResult> {
  const { rawMeat } = await ensureMeatResourceTypes();

  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");

    const target = await tx.creature.findFirst({
      where: {
        id: targetCreatureId,
        locationId: player.currentLocationId,
        isAlive: true,
        isGone: false,
        isHidden: false,
      },
      include: { species: true },
    });

    if (!target || !isCampSpiritCatCreature(target)) {
      throw new Error("Поруч не видно Кота-бережника, якому можна це дати.");
    }

    const carried = await tx.playerResource.findUnique({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: rawMeat.id } },
    });

    if (!carried || carried.amount <= 0) throw new Error("У ваших Речах немає сирого м'яса.");

    if (carried.amount > 1) {
      await tx.playerResource.update({ where: { id: carried.id }, data: { amount: { decrement: 1 } } });
    } else {
      await tx.playerResource.delete({ where: { id: carried.id } });
    }

    await tx.creature.update({
      where: { id: target.id },
      data: {
        activity: "RESTING",
        currentAction: "сидить над шматком сирого м'яса й лиже лапу, ніби все так і мало бути",
      },
    });

    const actor = playerForms(player).nominative;
    const itemName = resourceTypeDisplayName(rawMeat);

    return {
      text: "Ви простягаєте сире м'ясо Коту-бережнику. Він бере його без поспіху, відходить на крок і їсть так, ніби це не частування, а маленька угода з табором.",
      observerText: `${actor} простягає сире м'ясо Коту-бережнику. Кіт бере його й відходить на крок.`,
      locationId: player.currentLocationId,
      targetId: target.id,
      itemName,
    };
  });
}
