import { Bot } from "grammy";
import { prisma } from "../db";
import { logEvent } from "./worldEvents";
import { isLisovykForbiddenRegion } from "./lisovykBoundaries";

export async function summonLisovykIfResourceDepleted(_bot: Bot, resourceName: string, regionId: number) {
  const region = await prisma.region.findUnique({ where: { id: regionId } });
  if (isLisovykForbiddenRegion(region)) return;
  await logEvent("SYSTEM", "Лісовик почув виснаження", `region=${regionId}; resourceName=${resourceName}; source=gather`);
}
