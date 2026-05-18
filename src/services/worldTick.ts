import { Bot } from "grammy";
import { CreatureAge, Direction, LocationExit } from "@prisma/client";
import { prisma } from "../db";
import { notifyRegion } from "./notifications";
import { actionDurationMs, enqueueCreatureAction, gatherDurationMs, hasActiveCreatureActions, movementDurationMs } from "./actionQueue";

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

const STAGE_HP_MULTIPLIER: Record<CreatureAge, number> = {
  CHILD: 0.35,
  YOUNG: 0.75,
  ADULT: 1,
  OLD: 0.65,
  CORPSE: 0,
};

function chance(p: number) {
  return Math.random() * 100 < p;
}

function chancePermille(p: number) {
  return Math.random() * 1000 < p;
}

function pick<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function isExit(value: unknown): value is LocationExit {
  return Boolean(value && typeof value === "object" && "toLocationId" in value);
}

function stageFor(creature: any, nextAgeTicks: number): CreatureAge {
  const species = creature.species;
  const childEnd = species.childTicks;
  const youngEnd = childEnd + species.youngTicks;
  const adultEnd = youngEnd + species.adultTicks;

  if (nextAgeTicks < childEnd) return "CHILD";
  if (nextAgeTicks < youngEnd) return "YOUNG";
  if (nextAgeTicks < adultEnd) return "ADULT";
  return "OLD";
}

function stageMaxHp(creature: any, stage: CreatureAge) {
  const multiplier = STAGE_HP_MULTIPLIER[stage] ?? 1;
  return Math.max(1, Math.round(creature.species.baseHp * multiplier));
}

async function killAnimalFromOldAge(creature: any) {
  await prisma.worldAction.updateMany({
    where: { actorType: "CREATURE", creatureId: creature.id, status: { in: ["QUEUED", "RUNNING"] } },
    data: { status: "CANCELLED" },
  });

  await prisma.creature.update({
    where: { id: creature.id },
    data: {
      isAlive: false,
      age: "CORPSE",
      hp: 0,
      diedAtTick: tickNumber,
      corpseDecayTicksLeft: creature.species.corpseDecayTicks,
      activity: "RESTING",
      currentAction: "лежить нерухомо",
    },
  });

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Тварина померла від старості",
      description: `${creature.species.name} помирає від старості. Труп лишається в локації на ${creature.species.corpseDecayTicks} тіків.`,
      locationId: creature.locationId,
    },
  });
}

async function ageLivingAnimal(creature: any) {
  const nextAgeTicks = creature.ageTicks + 1;
  const nextStage = stageFor(creature, nextAgeTicks);
  const nextMaxHp = stageMaxHp(creature, nextStage);

  const data: any = {
    ageTicks: nextAgeTicks,
    age: nextStage,
    hp: Math.min(creature.hp, nextMaxHp),
  };

  if (nextStage === "OLD") {
    const childEnd = creature.species.childTicks;
    const youngEnd = childEnd + creature.species.youngTicks;
    const adultEnd = youngEnd + creature.species.adultTicks;
    const oldTicks = Math.max(0, nextAgeTicks - adultEnd);
    const deathChance = creature.species.oldDeathChancePermille + oldTicks * creature.species.oldDeathChanceGrowthPermille;

    if (chancePermille(deathChance)) {
      await killAnimalFromOldAge(creature);
      return "died";
    }
  }

  await prisma.creature.update({ where: { id: creature.id }, data });
  return nextStage !== creature.age ? "aged" : "same";
}

async function decayCorpse(creature: any) {
  const decayLeft = creature.corpseDecayTicksLeft ?? creature.species.corpseDecayTicks;

  if (decayLeft > 1) {
    await prisma.creature.update({
      where: { id: creature.id },
      data: { age: "CORPSE", isAlive: false, corpseDecayTicksLeft: decayLeft - 1, currentAction: `розкладається; залишилось ${decayLeft - 1} тіків` },
    });
    return "decaying";
  }

  const mushrooms = await prisma.resourceNode.findFirst({ where: { locationId: creature.locationId, resourceType: { key: "mushrooms" } } });
  if (mushrooms) {
    await prisma.resourceNode.update({ where: { id: mushrooms.id }, data: { amount: Math.min(mushrooms.maxAmount, mushrooms.amount + creature.species.mushroomBonusOnDecay) } });
  }

  await prisma.creature.update({ where: { id: creature.id }, data: { isGone: true, corpseDecayTicksLeft: 0, currentAction: "зникло, лишивши слід у землі" } });
  await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Труп зник", description: `Труп істоти «${creature.name ?? creature.species.name}» зник. Гриби в цій локації отримали +${creature.species.mushroomBonusOnDecay}.`, locationId: creature.locationId } });
  return "gone";
}

async function processAnimalLifecycle() {
  const livingAnimals = await prisma.creature.findMany({ where: { isAlive: true, isGone: false, species: { kind: "ANIMAL" } }, include: { species: true } });
  const corpses = await prisma.creature.findMany({ where: { isAlive: false, isGone: false, species: { kind: "ANIMAL" } }, include: { species: true } });
  let aged = 0, died = 0, decayed = 0, gone = 0;

  for (const creature of livingAnimals) {
    const result = await ageLivingAnimal(creature);
    if (result === "died") died++;
    else if (result === "aged") aged++;
  }

  for (const creature of corpses) {
    const result = await decayCorpse(creature);
    if (result === "gone") gone++;
    else decayed++;
  }

  return { aged, died, decayed, gone };
}

async function maybeHerbalistSpeak(c: any) {
  if (!chance(HERBALIST_SPEAK_CHANCE)) return false;
  const line = pick(HERBALIST_LINES);
  if (!line) return false;
  await enqueueCreatureAction({ creatureId: c.id, type: "SAY", payload: { text: line }, durationMs: actionDurationMs("SAY", c.stamina) });
  return true;
}

async function queueMove(c: any, exit: LocationExit, reason: string) {
  await enqueueCreatureAction({ creatureId: c.id, type: "MOVE", payload: { direction: exit.direction as Direction, reason }, durationMs: movementDurationMs(exit.travelCost, c.stamina) });
  return "queuedMove";
}

async function tickHerbalist(c: any) {
  if (await maybeHerbalistSpeak(c)) return "queuedSay";

  const herbs = c.location.resources.find((r: any) => r.resourceType.key === "herbs");
  if (herbs && herbs.amount > 0) {
    await enqueueCreatureAction({ creatureId: c.id, type: "GATHER_SPECIFIC", payload: { resourceKey: "herbs" }, durationMs: gatherDurationMs("herbs", c.stamina) });
    return "queuedGather";
  }

  const exit = pick(c.location.exitsFrom);
  if (isExit(exit)) return queueMove(c, exit, "шукає трави");
  await enqueueCreatureAction({ creatureId: c.id, type: "REST", payload: {}, durationMs: actionDurationMs("REST", c.stamina) });
  return "queuedRest";
}

async function tickHerbivore(c: any) {
  const hasFood = c.location.resources.some((r: any) => r.amount > 0 && ["berries", "herbs", "mushrooms"].includes(r.resourceType.key));
  if (hasFood && c.hunger > 0 && chance(60)) {
    await enqueueCreatureAction({ creatureId: c.id, type: "EAT", payload: {}, durationMs: actionDurationMs("EAT", c.stamina) });
    return "queuedEat";
  }

  if (chance(50)) {
    const exit = pick(c.location.exitsFrom);
    if (isExit(exit)) return queueMove(c, exit, "шукає їжу");
  }

  await enqueueCreatureAction({ creatureId: c.id, type: "LOOK", payload: {}, durationMs: actionDurationMs("LOOK", c.stamina) });
  return "queuedLook";
}

async function tickCarnivore(c: any) {
  const prey = await prisma.creature.findFirst({ where: { isAlive: true, isGone: false, locationId: c.locationId, species: { diet: "HERBIVORE" } } });
  if (prey) {
    if (chance(35)) {
      await enqueueCreatureAction({
        creatureId: c.id,
        type: "ATTACK",
        payload: { targetType: "creature", targetId: prey.id, mode: "mystery" },
        durationMs: actionDurationMs("ATTACK", c.stamina),
        interruptQueued: true,
      });
      return "queuedAttack";
    }

    await enqueueCreatureAction({ creatureId: c.id, type: "LOOK", payload: { targetType: "creature", targetId: prey.id }, durationMs: actionDurationMs("LOOK", c.stamina) });
    return "queuedLook";
  }

  if (chance(50)) {
    const exit = pick(c.location.exitsFrom);
    if (isExit(exit)) return queueMove(c, exit, "патрулює");
  }

  await enqueueCreatureAction({ creatureId: c.id, type: "REST", payload: {}, durationMs: actionDurationMs("REST", c.stamina) });
  return "queuedRest";
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
  if (existing) await prisma.creature.update({ where: { id: existing.id }, data: { isAlive: true, isGone: false, locationId: depleted.locationId, hp: species.baseHp, activity: "LOOKING", currentAction: action } });
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
  await prisma.worldAction.updateMany({ where: { actorType: "CREATURE", creatureId: lisovyk.id, status: { in: ["QUEUED", "RUNNING"] } }, data: { status: "CANCELLED" } });
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
  let queuedMove = 0, queuedGather = 0, queuedEat = 0, queuedLook = 0, queuedSay = 0, queuedRest = 0, queuedAttack = 0, skippedBusy = 0, errors = 0, regenerated = 0;
  let aged = 0, oldAgeDeaths = 0, corpsesDecaying = 0, corpsesGone = 0;
  let lisovykAwakened = false, lisovykSlept = false;
  try {
    if (DEBUG) console.log(`[WORLD TICK] start ${new Date().toISOString()}`);
    tickNumber++;
    const lifecycle = await processAnimalLifecycle();
    aged = lifecycle.aged;
    oldAgeDeaths = lifecycle.died;
    corpsesDecaying = lifecycle.decayed;
    corpsesGone = lifecycle.gone;

    lisovykAwakened = await wakeLisovykIfNeeded();
    regenerated = await regenerateResourcesIfNeeded();
    if (!lisovykAwakened) lisovykSlept = await putLisovykToSleepIfForestRecovered();

    const creatures = await prisma.creature.findMany({
      where: { isAlive: true, isGone: false },
      include: { species: true, location: { include: { exitsFrom: true, resources: { include: { resourceType: true } } } } },
    });

    for (const c of creatures) {
      try {
        if (await hasActiveCreatureActions(c.id)) {
          skippedBusy++;
          continue;
        }

        let result = "queuedRest";
        if (c.species.key === "herbalist") result = await tickHerbalist(c);
        else if (c.species.key === "lisovyk") {
          const exit = pick(c.location.exitsFrom);
          if (isExit(exit) && chance(50)) {
            result = await queueMove(c, exit, "нишпорить між деревами");
          } else {
            await enqueueCreatureAction({
              creatureId: c.id,
              type: "LOOK",
              payload: { reason: "полює й дослухається до лісу" },
              durationMs: actionDurationMs("LOOK", c.stamina),
            });
            result = "queuedLook";
          }
        }
        else if (c.species.diet === "HERBIVORE") result = await tickHerbivore(c);
        else if (c.species.diet === "CARNIVORE") result = await tickCarnivore(c);
        else {
          await enqueueCreatureAction({ creatureId: c.id, type: "REST", payload: {}, durationMs: actionDurationMs("REST", c.stamina) });
          result = "queuedRest";
        }

        if (result === "queuedMove") queuedMove++;
        else if (result === "queuedGather") queuedGather++;
        else if (result === "queuedEat") queuedEat++;
        else if (result === "queuedLook") queuedLook++;
        else if (result === "queuedSay") queuedSay++;
        else if (result === "queuedAttack") queuedAttack++;
        else queuedRest++;
      } catch (error) {
        errors++;
        if (DEBUG) console.warn("Creature tick failed:", error);
      }
    }

    if (DEBUG) console.log(`[WORLD TICK] done: queuedMove=${queuedMove}, queuedGather=${queuedGather}, queuedEat=${queuedEat}, queuedLook=${queuedLook}, queuedSay=${queuedSay}, queuedRest=${queuedRest}, queuedAttack=${queuedAttack}, skippedBusy=${skippedBusy}, aged=${aged}, oldAgeDeaths=${oldAgeDeaths}, corpsesDecaying=${corpsesDecaying}, corpsesGone=${corpsesGone}, regenerated=${regenerated}, lisovykAwakened=${lisovykAwakened ? 1 : 0}, lisovykSlept=${lisovykSlept ? 1 : 0}, errors=${errors}`);
    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "World Tick", description: `Tick #${tickNumber}: queuedMove=${queuedMove}, queuedGather=${queuedGather}, queuedEat=${queuedEat}, queuedLook=${queuedLook}, queuedSay=${queuedSay}, queuedRest=${queuedRest}, queuedAttack=${queuedAttack}, skippedBusy=${skippedBusy}, aged=${aged}, oldAgeDeaths=${oldAgeDeaths}, corpsesDecaying=${corpsesDecaying}, corpsesGone=${corpsesGone}, regenerated=${regenerated}, lisovykAwakened=${lisovykAwakened ? 1 : 0}, lisovykSlept=${lisovykSlept ? 1 : 0}, errors=${errors}` } });
    if (botInstance && tickNumber % 5 === 0) {
      const region = await prisma.region.findFirst();
      if (region) await notifyRegion(botInstance, region.id, `🌿 Світ ворухнувся.\n\nТік #${tickNumber}: заплановано рухів — ${queuedMove}, збору — ${queuedGather}, їжі — ${queuedEat}, оглядів — ${queuedLook}, атак — ${queuedAttack}, зайнятих істот — ${skippedBusy}, старість — ${aged}, смертей від старості — ${oldAgeDeaths}, зниклих трупів — ${corpsesGone}, відновлено вузлів — ${regenerated}.`);
    }
  } finally {
    running = false;
  }
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
  bot.command(["tickGet", "tickget"], async (ctx) => { await ctx.reply(`🌲 World tick\n\nІнтервал: ${tickIntervalMs} ms\nTick #: ${tickNumber}\nРегенерація ресурсів: раз на ${RESOURCE_REGEN_EVERY_TICKS} тіків, +${RESOURCE_REGEN_AMOUNT}\nNPC/тварини: дії плануються через WorldAction queue.`); });
  bot.command(["tickSet", "tickset"], async (ctx) => {
    const value = Number(ctx.match?.trim());
    if (!Number.isFinite(value) || value < 1000) {
      await ctx.reply("⚠️ Формат: /tickSet 5000\nМінімум: 1000 ms.");
      return;
    }
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
