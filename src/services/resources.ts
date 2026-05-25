import { Bot } from "grammy";
import { prisma } from "../db";
import { logEvent } from "./worldEvents";
import { notifyRegion } from "./notifications";

export async function summonLisovykIfResourceDepleted(bot: Bot, resourceName: string, regionId: number) {
  const species = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" } });
  if (!species) return;

  const alreadyAwake = await prisma.creature.findFirst({
    where: { speciesId: species.id, name: { in: ["Дід лісовик", "Дід Чорноліс"] }, isAlive: true, isHidden: false },
  });
  if (alreadyAwake) return;

  const locations = await prisma.cellLocation.findMany({ where: { regionId } });
  if (!locations.length) return;
  const location = locations[Math.floor(Math.random() * locations.length)];

  const existing = await prisma.creature.findFirst({ where: { speciesId: species.id, name: { in: ["Дід лісовик", "Дід Чорноліс"] } } });
  if (existing) {
    await prisma.creature.updateMany({
      where: { id: existing.id },
      data: { locationId: location.id, name: "Дід лісовик", isAlive: true, isHidden: false, hp: species.baseHp, currentAction: `полює через те, що зник ресурс ${resourceName}`, activity: "MOVING" },
    });
  } else {
    await prisma.creature.create({
      data: { speciesId: species.id, locationId: location.id, name: "Дід лісовик", hp: species.baseHp, isAlive: true, isHidden: false, currentAction: `полює через те, що зник ресурс ${resourceName}`, activity: "MOVING" },
    });
  }

  const message = `Дід лісовик гарчить: «О, де всі ${resourceName}? Хто винищив їх до нуля?!»`;
  await notifyRegion(bot, regionId, `🌲 Дід лісовик прокинувся.\n\n${message}`);
  await logEvent("NPC_SAY", "Лісовик прокинувся", message, location.id);
}
