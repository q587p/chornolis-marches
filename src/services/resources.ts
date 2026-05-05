import { Bot } from "grammy";
import { prisma } from "../db";
import { logEvent } from "./worldEvents";
import { notifyRegion } from "./notifications";

export async function summonLisovykIfResourceDepleted(bot: Bot, resourceName: string, regionId: number) {
  const species = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" } });
  if (!species) return;

  const alreadyAlive = await prisma.creature.findFirst({ where: { speciesId: species.id, name: "Дід Чорноліс", isAlive: true } });
  if (alreadyAlive) return;

  const locations = await prisma.cellLocation.findMany({ where: { regionId } });
  if (!locations.length) return;
  const location = locations[Math.floor(Math.random() * locations.length)];

  const existing = await prisma.creature.findFirst({ where: { speciesId: species.id, name: "Дід Чорноліс" } });
  if (existing) {
    await prisma.creature.update({
      where: { id: existing.id },
      data: { locationId: location.id, isAlive: true, hp: species.baseHp, currentAction: "обурено ходить між деревами", activity: "MOVING" },
    });
  } else {
    await prisma.creature.create({
      data: { speciesId: species.id, locationId: location.id, name: "Дід Чорноліс", hp: species.baseHp, isAlive: true, currentAction: "обурено ходить між деревами", activity: "MOVING" },
    });
  }

  await notifyRegion(bot, regionId, `🌲 О ні, люди зібрали всі ${resourceName}! Десь у Чорнолісі прокинувся Дід Чорноліс.`);
  await logEvent("SYSTEM", "Lisovyk awakened", `Resource depleted: ${resourceName}`, location.id);
}
