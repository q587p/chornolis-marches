import { Bot } from "grammy";
import { CreatureActivity, CreatureAge } from "@prisma/client";
import { prisma } from "../db";
import { getStatusData } from "../services/status";
import { getPlayerByTelegramId } from "../services/players";
import { buildMainReplyKeyboard } from "../ui/replyKeyboard";
import { stopPlayerAuto } from "./auto";

const ADMIN_COMMANDS = [
  "/adminHelp — список команд",
  "/world — стан світу й останні події",
  "/all — усі живі персонажі та істоти",
  "/all dead — усі записи істот, включно з inactive/dead/corpse/gone",
  "/location або кнопка 👀 Озирнутися — показати поточну місцину",
  "/locationAll — список усіх локацій і ключів",
  "/addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD] — додати тварин",
  "/addCreatureHelp — список speciesKey для тварин",
  "/forceOld [speciesKey] [count] — зробити кілька тварин у поточній локації похилими для тесту старіння",
  "/cleanupCreature [speciesKey] — видалити одну тварину в поточній локації",
  "/cleanupCreatures — очистити всіх тварин і нормалізувати унікальних NPC",
  "/tick — вручну запустити world tick",
  "/tickGet — показати tick-налаштування",
  "/tickSet <ms> — змінити інтервал tick",
  "/auto — увімкнути авто-режим гравця",
  "/autoStop — зупинити авто-режим",
  "/news — останні новини гри",
  "/restart — видалити свого персонажа, інвентар і статистику; наступний /start почне онбордінґ з нуля",
].join("\n");

type UniqueNpcSpec = {
  speciesKey: string;
  name: string;
  defaultLocationKey: string;
  alive: boolean;
  activity: CreatureActivity;
  currentAction: string;
};

const UNIQUE_NPCS: UniqueNpcSpec[] = [
  { speciesKey: "herbalist", name: "Травник", defaultLocationKey: "south_moss_clearing", alive: true, activity: "GATHERING", currentAction: "збирає трави" },
  { speciesKey: "lisovyk", name: "Дід Чорноліс", defaultLocationKey: "north_west_wood", alive: false, activity: "RESTING", currentAction: "спить у глибині Чорнолісу" },
];

function formatEvent(event: any) {
  const description = event.description ? ` — ${event.description}` : "";
  return `#${event.id} ${event.title}${description}`;
}

async function normalizeUniqueNpc(npc: UniqueNpcSpec) {
  const species = await prisma.creatureSpecies.findUnique({ where: { key: npc.speciesKey } });
  const fallbackLocation = await prisma.cellLocation.findUnique({ where: { key: npc.defaultLocationKey } });

  if (!species || !fallbackLocation) return { speciesKey: npc.speciesKey, keptId: null as number | null, removed: 0, created: false, skipped: true };

  const creatures = await prisma.creature.findMany({ where: { speciesId: species.id, name: npc.name }, orderBy: [{ isAlive: "desc" }, { updatedAt: "desc" }, { id: "asc" }] });
  let kept = creatures[0];
  let created = false;

  if (!kept) {
    kept = await prisma.creature.create({
      data: {
        speciesId: species.id,
        locationId: fallbackLocation.id,
        name: npc.name,
        hp: species.baseHp,
        isAlive: npc.alive,
        isGone: false,
        activity: npc.activity,
        currentAction: npc.currentAction,
      },
    });
    created = true;
  }

  if (npc.speciesKey === "herbalist" && (!kept.isAlive || kept.isGone)) {
    kept = await prisma.creature.update({
      where: { id: kept.id },
      data: { isAlive: true, isGone: false, locationId: fallbackLocation.id, hp: species.baseHp, activity: npc.activity, currentAction: npc.currentAction },
    });
  }

  if (npc.speciesKey === "lisovyk" && kept.hp <= 0) {
    kept = await prisma.creature.update({ where: { id: kept.id }, data: { hp: species.baseHp, isGone: false } });
  }

  const duplicateIds = creatures.filter((c) => c.id !== kept.id).map((c) => c.id);
  const removed = duplicateIds.length ? (await prisma.creature.deleteMany({ where: { id: { in: duplicateIds } } })).count : 0;
  return { speciesKey: npc.speciesKey, keptId: kept.id, removed, created, skipped: false };
}

async function findLocationByKeyOrCoords(locationArg: string) {
  const byKey = await prisma.cellLocation.findUnique({ where: { key: locationArg } });
  if (byKey) return byKey;

  const match = locationArg.match(/^(-?\d+),(-?\d+),(-?\d+)$/);
  if (!match) return null;

  const [, rawX, rawY, rawZ] = match;
  return prisma.cellLocation.findFirst({
    where: {
      x: Number(rawX),
      y: Number(rawY),
      z: Number(rawZ),
    },
  });
}

function normalizeAge(rawAge?: string): CreatureAge {
  const value = rawAge?.trim().toUpperCase();
  if (value === "YOUNG" || value === "ADULT" || value === "OLD") return value;
  return "ADULT";
}

function ageTicksFor(species: any, age: CreatureAge) {
  if (age === "YOUNG") return Math.max(0, species.childTicks ?? 0);
  if (age === "OLD") return (species.childTicks ?? 0) + (species.youngTicks ?? 0) + (species.adultTicks ?? 0) + 5;
  return (species.childTicks ?? 0) + (species.youngTicks ?? 0);
}

function hpForAge(species: any, age: CreatureAge) {
  const multiplier = age === "YOUNG" ? 0.75 : age === "OLD" ? 0.65 : 1;
  return Math.max(1, Math.round(species.baseHp * multiplier));
}

export function registerStatusHandlers(bot: Bot) {
  bot.command(["adminHelp", "adminhelp"], async (ctx) => {
    await ctx.reply(`🛠 Admin / debug commands\n\n${ADMIN_COMMANDS}`);
  });
  
  bot.command("restart", async (ctx) => {
    if (!ctx.from) return;

    const telegramId = String(ctx.from.id);
    stopPlayerAuto(ctx.from.id);

    const player = await prisma.player.findUnique({
      where: { telegramId },
      include: { currentLocation: true },
    });

    if (!player) {
      await ctx.reply("Персонажа ще немає. Напиши /start, щоб почати онбординг.", {
        reply_markup: buildMainReplyKeyboard(false),
      });
      return;
    }

    const removedResources = await prisma.playerResource.deleteMany({
      where: { playerId: player.id },
    });

    await prisma.player.delete({ where: { id: player.id } });

    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Player restarted onboarding",
        description: `telegramId=${telegramId}; oldPlayerId=${player.id}; removedResources=${removedResources.count}`,
        locationId: player.currentLocationId,
      },
    });

    await ctx.reply("♻️ Персонажа видалено разом з інвентарем і статистикою. Напиши /start, щоб пройти онбордінґ з нуля.", {
      reply_markup: buildMainReplyKeyboard(false),
    });
  });  

  bot.command(["locationAll", "locationall"], async (ctx) => {
    const locations = await prisma.cellLocation.findMany({ include: { region: true }, orderBy: [{ z: "asc" }, { y: "desc" }, { x: "asc" }] });
    const lines = locations.map((l) => `${l.key} — ${l.name} (${l.x},${l.y},${l.z}); danger=${l.dangerLevel}; region=${l.region.name}`);
    const text = `📍 Усі локації\n\n${lines.join("\n") || "немає"}`;
    for (let i = 0; i < text.length; i += 3500) await ctx.reply(text.slice(i, i + 3500));
  });

  bot.command(["addCreatureHelp", "addcreaturehelp"], async (ctx) => {
    const species = await prisma.creatureSpecies.findMany({ where: { kind: "ANIMAL" }, orderBy: { key: "asc" } });
    const lines = species.map(
      (s) => `${s.key} — ${s.name}; HP=${s.baseHp}; diet=${s.diet}; lifecycle=${s.childTicks}/${s.youngTicks}/${s.adultTicks}/${s.oldTicks}; corpse=${s.corpseDecayTicks}`
    );
    await ctx.reply(
      `🐾 Можливі тварини для /addCreature\n\n${lines.join("\n") || "немає"}\n\nФормат:\n/addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD]\n\nПриклади:\n/addCreature rabbit center_chornolis_edge 3\n/addCreature mouse 0,0,0 5 YOUNG\n/addCreature wolf south_wolf_track 1 OLD`
    );
  });

  bot.command("world", async (ctx) => {
    const s = await getStatusData();
    const latestEvents = s.latestEvents.length ? s.latestEvents.map(formatEvent).join("\n") : "немає";
    await ctx.reply(`🌲 Стан Порубіжжя Чорнолісу\n\nВерсія: ${s.version}\nПерсонажів гравців у базі: ${s.playersCount}\nРегіонів: ${s.regionsCount}\nЛокацій-клітинок: ${s.locationsCount}\nПереходів між клітинками: ${s.exitsCount}\nЖивих тварин: ${s.aliveAnimalsCount}\nТрупів тварин: ${s.animalCorpsesCount}\nЗниклих тварин: ${s.goneAnimalsCount}\nNPC / не-тварин: ${s.npcCount}\nЖивих істот загалом: ${s.aliveCreaturesCount}\nВузлів ресурсів: ${s.resourcesCount}\nПодій у журналі: ${s.eventsCount}\n\nОстанні події:\n${latestEvents}\n\nОстання помилка: ${s.lastRuntimeError ?? "немає"}`);
  });

  bot.command("all", async (ctx) => {
    const showDead = ctx.match?.trim().toLowerCase() === "dead";
    const [players, creatures] = await Promise.all([
      prisma.player.findMany({ include: { currentLocation: true }, orderBy: { id: "asc" } }),
      prisma.creature.findMany({ where: showDead ? undefined : { isAlive: true, isGone: false }, include: { location: true, species: true }, orderBy: { id: "asc" } }),
    ]);

    const playerLines = players.map((p) => {
      const loc = p.currentLocation ? `${p.currentLocation.name} (${p.currentLocation.x},${p.currentLocation.y},${p.currentLocation.z})` : "невідомо";
      return `#${p.id} ${p.firstName ?? p.username ?? "мандрівник"} — ${loc}; HP ${p.hp}; stamina ${p.stamina}; hunger ${p.hunger}`;
    });

    const creatureLines = creatures.map((c) => {
      const loc = c.location ? `${c.location.name} (${c.location.x},${c.location.y},${c.location.z})` : "невідомо";
      const state = c.isGone ? "gone" : c.isAlive ? "alive" : "corpse/inactive";
      const decay = !c.isAlive && !c.isGone ? `; decay ${c.corpseDecayTicksLeft ?? "?"}` : "";
      return `#${c.id} ${c.name ?? c.species.name} [${c.species.key}] — ${loc}; ${state}; HP ${c.hp}; age ${c.age}/${c.ageTicks}; ${c.activity ?? "IDLE"}; ${c.currentAction ?? "без дії"}${decay}`;
    });

    const mode = showDead ? "усі записи" : "тільки живі; /all dead покаже всі записи";
    const text = `🧾 Усі персонажі (${mode})\n\nГравці:\n${playerLines.join("\n") || "немає"}\n\nNPC / істоти:\n${creatureLines.join("\n") || "немає"}`;
    for (let i = 0; i < text.length; i += 3500) await ctx.reply(text.slice(i, i + 3500));
  });

  bot.command(["cleanupCreatures", "cleanupcreatures"], async (ctx) => {
    const uniqueResults = [];
    const keepIds: number[] = [];

    for (const npc of UNIQUE_NPCS) {
      const result = await normalizeUniqueNpc(npc);
      uniqueResults.push(result);
      if (result.keptId) keepIds.push(result.keptId);
    }

    const animalsRemoved = await prisma.creature.deleteMany({ where: { species: { kind: "ANIMAL" } } });
    const goneCleanup = await prisma.creature.deleteMany({ where: { isAlive: false, isGone: true, id: keepIds.length ? { notIn: keepIds } : undefined } });
    const duplicateCount = uniqueResults.reduce((sum, r) => sum + r.removed, 0);

    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Creature cleanup", description: `Removed animals=${animalsRemoved.count}; removed gone=${goneCleanup.count}; unique NPC duplicates=${duplicateCount}.` } });

    const fresh = await getStatusData();
    const lines = uniqueResults.map((r) => r.skipped ? `${r.speciesKey}: skipped, species/location missing` : `${r.speciesKey}: kept #${r.keptId}, removed duplicates=${r.removed}${r.created ? ", created" : ""}`);
    await ctx.reply(`🧹 Creature cleanup done.\n\n${lines.join("\n")}\nAnimals removed: ${animalsRemoved.count}\nGone/decomposed removed: ${goneCleanup.count}\n\nAlive animals: ${fresh.aliveAnimalsCount}\nAnimal corpses: ${fresh.animalCorpsesCount}\nGone animals: ${fresh.goneAnimalsCount}\nNPC / non-animals: ${fresh.npcCount}\nAlive creatures total: ${fresh.aliveCreaturesCount}`);
  });

  bot.command(["cleanupCreature", "cleanupcreature"], async (ctx) => {
    if (!ctx.from) return;
    const speciesKey = ctx.match?.trim() || undefined;
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const creature = await prisma.creature.findFirst({
      where: { isAlive: true, isGone: false, locationId: player.currentLocationId, species: { kind: "ANIMAL", ...(speciesKey ? { key: speciesKey } : {}) } },
      include: { species: true, location: true },
      orderBy: { id: "asc" },
    });

    if (!creature) return void (await ctx.reply(speciesKey ? `У поточній локації немає живої тварини виду ${speciesKey}.` : "У поточній локації немає живих тварин."));
    await prisma.creature.delete({ where: { id: creature.id } });
    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Creature removed", description: `Removed ${creature.species.key} #${creature.id} from current location.`, locationId: creature.locationId } });
    await ctx.reply(`🧹 Видалено: #${creature.id} ${creature.species.name} [${creature.species.key}] — ${creature.location.name}`);
  });

  bot.command(["addCreature", "addcreature"], async (ctx) => {
    const args = ctx.match?.trim().split(/\s+/).filter(Boolean) ?? [];
    const [speciesKey, locationArg, rawCount, rawAge] = args;
    const parsedCount = Number(rawCount || 1);
    const count = Number.isFinite(parsedCount) ? Math.max(1, Math.min(Math.floor(parsedCount), 50)) : NaN;

    if (!speciesKey || !locationArg || !Number.isFinite(count)) {
      return void (await ctx.reply("⚠️ Формат: /addCreature <speciesKey> <locationKey|x,y,z> [count] [YOUNG|ADULT|OLD]\nНаприклад: /addCreature rabbit center_chornolis_edge 3"));
    }

    const species = await prisma.creatureSpecies.findUnique({ where: { key: speciesKey } });
    const location = await findLocationByKeyOrCoords(locationArg);

    if (!species) return void (await ctx.reply(`⚠️ Невідомий вид: ${speciesKey}. Спробуй /addCreatureHelp.`));
    if (!location) return void (await ctx.reply(`⚠️ Невідома локація: ${locationArg}. Спробуй /locationAll або координати типу 0,0,0.`));
    if (species.kind !== "ANIMAL") return void (await ctx.reply("⚠️ /addCreature зараз призначена для тварин. Унікальні NPC керуються seed/cleanup."));

    const age = normalizeAge(rawAge);
    const ageTicks = ageTicksFor(species, age);
    const hp = hpForAge(species, age);

    for (let i = 0; i < count; i++) {
      const sex = Math.random() < 0.5 ? "MALE" : "FEMALE";
      await prisma.creature.create({
        data: {
          speciesId: species.id,
          locationId: location.id,
          hp,
          sex,
          age,
          ageTicks,
          isAlive: true,
          isGone: false,
          activity: "IDLE",
          currentAction: age === "OLD" ? "повільно рухається" : "прислухається",
        },
      });
    }

    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Creature added", description: `Added ${speciesKey} ×${count} (${age}) to ${location.key}.`, locationId: location.id } });
    await ctx.reply(`✅ Додано: ${species.name} ×${count} (${age}) → ${location.name} (${location.x},${location.y},${location.z})`);
  });

  bot.command(["forceOld", "forceold"], async (ctx) => {
    if (!ctx.from) return;
    const args = ctx.match?.trim().split(/\s+/).filter(Boolean) ?? [];
    const speciesKey = args[0];
    const parsedCount = Number(args[1] || 5);
    const count = Number.isFinite(parsedCount) ? Math.max(1, Math.min(Math.floor(parsedCount), 50)) : 5;
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const creatures = await prisma.creature.findMany({
      where: { isAlive: true, isGone: false, locationId: player.currentLocationId, species: { kind: "ANIMAL", ...(speciesKey ? { key: speciesKey } : {}) } },
      include: { species: true, location: true },
      take: count,
      orderBy: { id: "asc" },
    });

    if (!creatures.length) return void (await ctx.reply(speciesKey ? `У поточній локації немає живих тварин виду ${speciesKey}.` : "У поточній локації немає живих тварин."));

    for (const creature of creatures) {
      const ageTicks = ageTicksFor(creature.species, "OLD") + (creature.species.oldTicks ?? 0);
      await prisma.creature.update({
        where: { id: creature.id },
        data: { age: "OLD", ageTicks, hp: hpForAge(creature.species, "OLD"), currentAction: "ледь тримається на лапах" },
      });
    }

    await prisma.worldEvent.create({ data: { type: "SYSTEM", title: "Creatures forced old", description: `Forced old: ${creatures.map((c) => `#${c.id}`).join(", ")}.`, locationId: player.currentLocationId } });
    await ctx.reply(`🧪 Зістарено для тесту: ${creatures.map((c) => `#${c.id} ${c.species.name}`).join(", ")}. Запусти /tick кілька разів, щоб перевірити старість/смерть.`);
  });
}
