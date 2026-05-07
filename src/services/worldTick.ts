import { Bot } from "grammy";
import { LocationExit } from "@prisma/client";
import { prisma } from "../db";
import { notifyLocation, notifyRegion } from "./notifications";
import { buildTargetKeyboard, buildTrackKeyboard } from "../ui/keyboards";

const DEFAULT_TICK_INTERVAL_MS = Number(process.env.WORLD_TICK_INTERVAL_MS || 60000);
const DEBUG = process.env.WORLD_DEBUG === "true" || process.env.WORLD_TICK_DEBUG === "true";
const RESOURCE_REGEN_EVERY_TICKS = Number(process.env.WORLD_RESOURCE_REGEN_EVERY_TICKS || 10);
const RESOURCE_REGEN_AMOUNT = Number(process.env.WORLD_RESOURCE_REGEN_AMOUNT || 1);
const HERBALIST_SPEAK_CHANCE = Number(process.env.HERBALIST_SPEAK_CHANCE || 12);

let tickIntervalMs = DEFAULT_TICK_INTERVAL_MS;
let tickTimer: NodeJS.Timeout | null = null;
let running = false;
let botInstance: Bot | null = null;
let tickNumber = 0;

const HERBALIST_LINES = [
  "Трави самі говорять, якщо слухати тихо.",
  "Не кожен корінь лікує. Деякі тільки пам’ятають біль.",
  "Чорноліс сьогодні пахне дощем і старою корою.",
  "Не топчи мох без потреби — він старший за нас.",
  "Ягоди темнішають. Це не завжди добрий знак.",
  "Коли ліс мовчить — слухай землю.",
  "Тут десь має бути деревій... або щось, що ним прикидається.",
  "Гриби не брешуть. Люди — часто.",
  "Хто забирає все, той будить старше за себе.",
  "Тиша теж буває голодною.",
];

function chance(p: number) {
  return Math.random() * 100 < p;
}

function pick<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function isExit(value: unknown): value is LocationExit {
  return Boolean(value && typeof value === "object" && "toLocationId" in value);
}

async function maybeHerbalistSpeak(c: any) {
  if (!botInstance || !chance(HERBALIST_SPEAK_CHANCE)) return;
  const line = pick(HERBALIST_LINES);
  if (!line) return;
  await notifyLocation(botInstance, c.locationId, -1, `Травник промовляє: «${line}»`);
  await prisma.worldEvent.create({ data: { type: "NPC_SAY", title: "Травник промовляє", description: line, locationId: c.locationId } });
}

async function move(c: any, toLocationId: number, action: string) {
  if (c.locationId === toLocationId) return;

  const fromLocationId = c.locationId;
  const fromLocation = c.location?.name ?? "десь";
  const isAnimal = c.species?.kind === "ANIMAL";
  const name = c.name ?? c.species?.name ?? "істота";

  if (botInstance) {
    await notifyLocation(botInstance, fromLocationId, -1, isAnimal ? "Щось пішло звідси." : `${name} пішов звідси.`, buildTrackKeyboard());
  }

  await prisma.creature.update({
    where: { id: c.id },
    data: { locationId: toLocationId, activity: "MOVING", currentAction: action, steps: { increment: 1 }, hunger: { increment: 1 } },
  });

  if (botInstance) {
    const keyboard = buildTargetKeyboard([{ type: "creature", id: c.id, label: name, canGreet: !isAnimal }]);
    await notifyLocation(botInstance, toLocationId, -1, isAnimal ? `Щось зайшло сюди з боку: ${fromLocation}.` : `${name} прийшов сюди.`, keyboard);
  }
}

async function tickHerbalist(c: any) {
  await maybeHerbalistSpeak(c);
  const herbs = c.location.resources.find((r: any) => r.resourceType.key === "herbs");

  if (herbs && herbs.amount > 0) {
    await prisma.resourceNode.update({ where: { id: herbs.id }, data: { amount: { decrement: 1 } } });
    await prisma.creature.update({ where: { id: c.id }, data: { activity: "GATHERING", currentAction: "збирає трави" } });
    return "gathered";
  }

  const exit = pick(c.location.exitsFrom);
  if (isExit(exit)) {
    await move(c, exit.toLocationId, "шукає трави");
    return "moved";
  }

  return "idle";
}

async function tickHerbivore(c: any) {
  if (chance(50)) {
    const exit = pick(c.location.exitsFrom);
    if (isExit(exit)) {
      await move(c, exit.toLocationId, "шукає їжу");
      return "moved";
    }
  }
  await prisma.creature.update({ where: { id: c.id }, data: { activity: "IDLE", currentAction: "прислухається" } });
  return "idle";
}

async function tickCarnivore(c: any) {
  const prey = await prisma.creature.findFirst({ where: { isAlive: true, locationId: c.locationId, species: { diet: "HERBIVORE" } } });
  if (prey) {
    await prisma.creature.update({ where: { id: c.id }, data: { activity: "LOOKING", currentAction: "вистежує здобич" } });
    return "looking";
  }
  if (chance(50)) {
    const exit = pick(c.location.exitsFrom);
    if (isExit(exit)) {
      await move(c, exit.toLocationId, "патрулює");
      return "moved";
    }
  }
  return "idle";
}

type DepletedRegionResource = { regionId: number; regionName: string; resourceKey: string; resourceName: string; locationId: number };

async function findRegionDepletedResource(): Promise<DepletedRegionResource | null> {
  const regions = await prisma.region.findMany({ include: { locations: { include: { resources: { include: { resourceType: true } } }, orderBy: { id: "asc" } } } });
  for (const region of regions) {
    const resourceKeys = new Set<string>();
    for (const location of region.locations) for (const node of location.resources) resourceKeys.add(node.resourceType.key);
    for (const resourceKey of resourceKeys) {
      const nodes = region.locations.flatMap((location) => location.resources.filter((node) => node.resourceType.key === resourceKey));
      const total = nodes.reduce((sum, node) => sum + node.amount, 0);
      if (total > 0) continue;
      const location = region.locations[0];
      if (!location) continue;
      return { regionId: region.id, regionName: region.name, resourceKey, resourceName: nodes[0]?.resourceType.name ?? resourceKey, locationId: location.id };
    }
  }
  return null;
}

async function wakeLisovykIfNeeded() {
  const depleted = await findRegionDepletedResource();
  if (!depleted) return false;
  const species = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" } });
  if (!species) return false;
  const existing = await prisma.creature.findFirst({ where: { speciesId: species.id, name: "Дід Чорноліс" } });
  if (existing?.isAlive) return false;
  const action = `полює через те, що в регіоні зник ресурс ${depleted.resourceKey}`;
  if (existing) await prisma.creature.update({ where: { id: existing.id }, data: { isAlive: true, locationId: depleted.locationId, hp: species.baseHp, activity: "LOOKING", currentAction: action } });
  else await prisma.creature.create({ data: { speciesId: species.id, name: "Дід Чорноліс", locationId: depleted.locationId, hp: species.baseHp, activity: "LOOKING", currentAction: action } });
  await prisma.worldEvent.create({ data: { type: "NPC_SAY", title: "Лісовик прокинувся", description: `У регіоні «${depleted.regionName}» зник ресурс «${depleted.resourceName}». Дід Чорноліс прокинувся і почав полювання.`, locationId: depleted.locationId } });
  if (botInstance) await notifyRegion(botInstance, depleted.regionId, `🌲 Дід Чорноліс прокинувся.\n\nУ всьому регіоні зник ресурс «${depleted.resourceName}».`);
  return true;
}

async function putLisovykToSleepIfForestRecovered() {
  const species = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" } });
  if (!species) return false;
  const lisovyk = await prisma.creature.findFirst({ where: { speciesId: species.id, name: "Дід Чорноліс", isAlive: true }, include: { location: true } });
  const match = lisovyk?.currentAction?.match(/зник ресурс ([a-zA-Z0-9_-]+)/);
  if (!lisovyk || !match) return false;
  const resourceKey = match[1];
  const regionId = lisovyk.location.regionId;
  const total = await prisma.resourceNode.aggregate({ where: { location: { regionId }, resourceType: { key: resourceKey } }, _sum: { amount: true } });
  if ((total._sum.amount ?? 0) <= 0) return false;
  const resource = await prisma.resourceType.findUnique({ where: { key: resourceKey } });
  await prisma.creature.update({ where: { id: lisovyk.id }, data: { isAlive: false, activity: "RESTING", currentAction: `заснув: ресурс ${resourceKey} відновився` } });
  await prisma.worldEvent.create({ data: { type: "NPC_SAY", title: "Лісовик заснув", description: `Дід Чорноліс відчув, що ресурс «${resource?.name ?? resourceKey}» у лісі відновився. Він перестає полювати на людей і ховається там, де був.`, locationId: lisovyk.locationId } });
  if (botInstance) await notifyRegion(botInstance, regionId, `🌲 Дід Чорноліс відчув, що ліс відновився.\n\nВін перестає полювати за людьми в лісі, ховається між деревами й засинає.`);
  return true;
}

async function regenerateResourcesIfNeeded() {
  if (tickNumber === 0 || tickNumber % RESOURCE_REGEN_EVERY_TICKS !== 0) return 0;
  const nodes = await prisma.resourceNode.findMany({ where: { amount: { gt: -1 } } });
  let regenerated = 0;
  for (const node of nodes) {
    if (node.amount >= node.maxAmount) continue;
    await prisma.resourceNode.update({ where: { id: node.id }, data: { amount: Math.min(node.maxAmount, node.amount + RESOURCE_REGEN_AMOUNT) } });
    regenerated++;
  }
  if (regenerated > 0) await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Ресурси відновлюються", description: `Ліс повільно відновив ${regenerated} ресурсних вузлів: +${RESOURCE_REGEN_AMOUNT}.` } });
  return regenerated;
}

export async function worldTick() {
  if (running) return;
  running = true;
  let moved = 0, gathered = 0, idle = 0, looking = 0, errors = 0, regenerated = 0;
  let lisovykAwakened = false, lisovykSlept = false;
  try {
    if (DEBUG) console.log(`[WORLD TICK] start ${new Date().toISOString()}`);
    tickNumber++;
    lisovykAwakened = await wakeLisovykIfNeeded();
    regenerated = await regenerateResourcesIfNeeded();
    if (!lisovykAwakened) lisovykSlept = await putLisovykToSleepIfForestRecovered();
    const creatures = await prisma.creature.findMany({ where: { isAlive: true }, include: { species: true, location: { include: { exitsFrom: true, resources: { include: { resourceType: true } } } } } });
    for (const c of creatures) {
      try {
        let result = "idle";
        if (c.species.key === "herbalist") result = await tickHerbalist(c);
        else if (c.species.key === "lisovyk") result = "looking";
        else if (c.species.diet === "HERBIVORE") result = await tickHerbivore(c);
        else if (c.species.diet === "CARNIVORE") result = await tickCarnivore(c);
        if (result === "moved") moved++; else if (result === "gathered") gathered++; else if (result === "looking") looking++; else idle++;
      } catch (error) { errors++; if (DEBUG) console.warn("Creature tick failed:", error); }
    }
    if (DEBUG) console.log(`[WORLD TICK] done: processed=${moved + gathered + idle + looking}, moved=${moved}, gathered=${gathered}, looking=${looking}, idle=${idle}, regenerated=${regenerated}, lisovykAwakened=${lisovykAwakened ? 1 : 0}, lisovykSlept=${lisovykSlept ? 1 : 0}, errors=${errors}`);
    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "World Tick", description: `Tick #${tickNumber}: moved=${moved}, gathered=${gathered}, looking=${looking}, idle=${idle}, regenerated=${regenerated}, lisovykAwakened=${lisovykAwakened ? 1 : 0}, lisovykSlept=${lisovykSlept ? 1 : 0}, errors=${errors}` } });
    if (botInstance && tickNumber % 5 === 0) {
      const region = await prisma.region.findFirst();
      if (region) await notifyRegion(botInstance, region.id, `🌿 Світ ворухнувся.\n\nТік #${tickNumber}: рухів — ${moved}, збору — ${gathered}, відновлено вузлів — ${regenerated}.`);
    }
  } finally { running = false; }
}

function restartWorldTickTimer() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => { worldTick().catch(console.error); }, tickIntervalMs);
  if (DEBUG) {
    console.log("TICK INTERVAL ENV:", process.env.WORLD_TICK_INTERVAL_MS);
    console.log(`World tick loop started: every ${tickIntervalMs}ms`);
  }
}

function registerTickCommands(bot: Bot) {
  bot.command("tick", async (ctx) => { await worldTick(); await ctx.reply("✅ World tick запущено вручну."); });
  bot.command(["tickGet", "tickget"], async (ctx) => { await ctx.reply(`🌲 World tick\n\nІнтервал: ${tickIntervalMs} ms\nTick #: ${tickNumber}\nРегенерація ресурсів: раз на ${RESOURCE_REGEN_EVERY_TICKS} тіків, +${RESOURCE_REGEN_AMOUNT}`); });
  bot.command(["tickSet", "tickset"], async (ctx) => {
    const value = Number(ctx.match?.trim());
    if (!Number.isFinite(value) || value < 1000) return void (await ctx.reply("⚠️ Формат: /tickSet 5000\nМінімум: 1000 ms."));
    tickIntervalMs = Math.floor(value);
    restartWorldTickTimer();
    await ctx.reply(`✅ World tick interval set to ${tickIntervalMs} ms.`);
  });
}

export function startWorldTickLoop(bot?: Bot) {
  botInstance = bot ?? null;
  if (botInstance) registerTickCommands(botInstance);
  restartWorldTickTimer();
}
