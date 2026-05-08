import { Bot } from "grammy";
import { CreatureActivity } from "@prisma/client";
import { prisma } from "../db";
import { getStatusData } from "../services/status";
import { getPlayerByTelegramId } from "../services/players";

const ADMIN_COMMANDS = [
  "/adminHelp — список команд",
  "/world — стан світу й останні події",
  "/all — усі живі персонажі та істоти",
  "/all dead — усі записи істот, включно з inactive/dead/corpse/gone",
  "/location або кнопка 📍 Локація — показати поточну локацію",
  "/locationAll — список усіх локацій і ключів",
  "/addCreature <speciesKey> <locationKey> [count] — додати тварин",
  "/addCreatureHelp — список speciesKey для тварин",
  "/cleanupCreature [speciesKey] — видалити одну тварину в поточній локації",
  "/cleanupCreatures — очистити всіх тварин і нормалізувати унікальних NPC",
  "/tick — вручну запустити world tick",
  "/tickGet — показати tick-налаштування",
  "/tickSet <ms> — змінити інтервал tick",
  "/auto — увімкнути авто-режим гравця",
  "/autoStop — зупинити авто-режим",
  "/news — останні новини гри",
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
  {
    speciesKey: "herbalist",
    name: "Травник",
    defaultLocationKey: "south_moss_clearing",
    alive: true,
    activity: "GATHERING",
    currentAction: "збирає трави",
  },
  {
    speciesKey: "lisovyk",
    name: "Дід Чорноліс",
    defaultLocationKey: "north_west_wood",
    alive: false,
    activity: "RESTING",
    currentAction: "спить у глибині Чорнолісу",
  },
];

function formatEvent(event: any) {
  const description = event.description ? ` — ${event.description}` : "";
  return `#${event.id} ${event.title}${description}`;
}

async function normalizeUniqueNpc(npc: UniqueNpcSpec) {
  const species = await prisma.creatureSpecies.findUnique({ where: { key: npc.speciesKey } });
  const fallbackLocation = await prisma.cellLocation.findUnique({ where: { key: npc.defaultLocationKey } });

  if (!species || !fallbackLocation) {
    return {
      speciesKey: npc.speciesKey,
      keptId: null as number | null,
      removed: 0,
      created: false,
      skipped: true,
    };
  }

  const creatures = await prisma.creature.findMany({
    where: { speciesId: species.id, name: npc.name },
    orderBy: [{ isAlive: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
  });

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

  if (npc.speciesKey === "herbalist" && !kept.isAlive) {
    kept = await prisma.creature.update({
      where: { id: kept.id },
      data: {
        isAlive: true,
        isGone: false,
        locationId: fallbackLocation.id,
        hp: species.baseHp,
        activity: npc.activity,
        currentAction: npc.currentAction,
      },
    });
  }

  if (npc.speciesKey === "lisovyk" && kept.hp <= 0) {
    kept = await prisma.creature.update({
      where: { id: kept.id },
      data: { hp: species.baseHp, isGone: false },
    });
  }

  const duplicateIds = creatures.filter((c) => c.id !== kept.id).map((c) => c.id);
  const removed = duplicateIds.length
    ? (await prisma.creature.deleteMany({ where: { id: { in: duplicateIds } } })).count
    : 0;

  return { speciesKey: npc.speciesKey, keptId: kept.id, removed, created, skipped: false };
}

export function registerStatusHandlers(bot: Bot) {
  bot.command(["adminHelp", "adminhelp"], async (ctx) => {
    await ctx.reply(`🛠 Admin / debug commands\n\n${ADMIN_COMMANDS}`);
  });

  bot.command(["locationAll", "locationall"], async (ctx) => {
    const locations = await prisma.cellLocation.findMany({
      include: { region: true },
      orderBy: [{ z: "asc" }, { y: "desc" }, { x: "asc" }],
    });

    const lines = locations.map(
      (l) => `${l.key} — ${l.name} (${l.x},${l.y},${l.z}); danger=${l.dangerLevel}; region=${l.region.name}`
    );
    const text = `📍 Усі локації\n\n${lines.join("\n") || "немає"}`;
    for (let i = 0; i < text.length; i += 3500) await ctx.reply(text.slice(i, i + 3500));
  });

  bot.command(["addCreatureHelp", "addcreaturehelp"], async (ctx) => {
    const species = await prisma.creatureSpecies.findMany({
      where: { kind: "ANIMAL" },
      orderBy: { key: "asc" },
    });
    const lines = species.map(
      (s) => `${s.key} — ${s.name}; HP=${s.baseHp}; diet=${s.diet}; STR=${s.strength}; AGI=${s.agility}; PER=${s.perception}`
    );
    await ctx.reply(`🐾 Можливі тварини для /addCreature\n\n${lines.join("\n") || "немає"}\n\nФормат: /addCreature <speciesKey> <locationKey> [count]`);
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
      prisma.creature.findMany({
        where: showDead ? undefined : { isAlive: true, isGone: false },
        include: { location: true, species: true },
        orderBy: { id: "asc" },
      }),
    ]);

    const playerLines = players.map((p) => {
      const loc = p.currentLocation
        ? `${p.currentLocation.name} (${p.currentLocation.x},${p.currentLocation.y},${p.currentLocation.z})`
        : "невідомо";
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

    const animalsRemoved = await prisma.creature.deleteMany({
      where: { species: { kind: "ANIMAL" } },
    });

    const deadCleanup = await prisma.creature.deleteMany({
      where: {
        isAlive: false,
        isGone: true,
        id: keepIds.length ? { notIn: keepIds } : undefined,
      },
    });

    const duplicateCount = uniqueResults.reduce((sum, r) => sum + r.removed, 0);

    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Creature cleanup",
        description: `Removed animals=${animalsRemoved.count}; removed gone=${deadCleanup.count}; unique NPC duplicates=${duplicateCount}.`,
      },
    });

    const fresh = await getStatusData();
    const lines = uniqueResults.map((r) => {
      if (r.skipped) return `${r.speciesKey}: skipped, species/location missing`;
      return `${r.speciesKey}: kept #${r.keptId}, removed duplicates=${r.removed}${r.created ? ", created" : ""}`;
    });

    await ctx.reply(
      `🧹 Creature cleanup done.\n\n${lines.join("\n")}\nAnimals removed: ${animalsRemoved.count}\nGone/decomposed removed: ${deadCleanup.count}\n\nAlive animals: ${fresh.aliveAnimalsCount}\nAnimal corpses: ${fresh.animalCorpsesCount}\nGone animals: ${fresh.goneAnimalsCount}\nNPC / non-animals: ${fresh.npcCount}\nAlive creatures total: ${fresh.aliveCreaturesCount}`
    );
  });

  bot.command(["cleanupCreature", "cleanupcreature"], async (ctx) => {
    if (!ctx.from) return;
    const speciesKey = ctx.match?.trim() || undefined;
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    const creature = await prisma.creature.findFirst({
      where: {
        isAlive: true,
        isGone: false,
        locationId: player.currentLocationId,
        species: { kind: "ANIMAL", ...(speciesKey ? { key: speciesKey } : {}) },
      },
      include: { species: true, location: true },
      orderBy: { id: "asc" },
    });

    if (!creature) {
      return void (await ctx.reply(
        speciesKey
          ? `У поточній локації немає живої тварини виду ${speciesKey}.`
          : "У поточній локації немає живих тварин."
      ));
    }

    await prisma.creature.delete({ where: { id: creature.id } });
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Creature removed",
        description: `Removed ${creature.species.key} #${creature.id} from current location.`,
        locationId: creature.locationId,
      },
    });

    await ctx.reply(`🧹 Видалено: #${creature.id} ${creature.species.name} [${creature.species.key}] — ${creature.location.name}`);
  });

  bot.command(["addCreature", "addcreature"], async (ctx) => {
    const args = ctx.match?.trim().split(/\s+/).filter(Boolean) ?? [];
    const [speciesKey, locationKey, rawCount] = args;
    const count = Math.max(1, Math.min(Number(rawCount || 1), 50));

    if (!speciesKey || !locationKey || !Number.isFinite(count)) {
      return void (await ctx.reply("⚠️ Формат: /addCreature <speciesKey> <locationKey> [count]\nНаприклад: /addCreature rabbit center_chornolis_edge 3"));
    }

    const species = await prisma.creatureSpecies.findUnique({ where: { key: speciesKey } });
    const location = await prisma.cellLocation.findUnique({ where: { key: locationKey } });

    if (!species) return void (await ctx.reply(`⚠️ Невідомий вид: ${speciesKey}`));
    if (!location) return void (await ctx.reply(`⚠️ Невідома локація: ${locationKey}`));
    if (species.kind !== "ANIMAL") return void (await ctx.reply("⚠️ /addCreature зараз призначена для тварин. Унікальні NPC керуються seed/cleanup."));

    for (let i = 0; i < count; i++) {
      const sex = Math.random() < 0.5 ? "MALE" : "FEMALE";
      await prisma.creature.create({
        data: {
          speciesId: species.id,
          locationId: location.id,
          hp: species.baseHp,
          maxHp: species.baseHp,
          isAlive: true,
          isGone: false,
          sex,
          age: "ADULT",
          ageTicks: 0,
          activity: "IDLE",
          currentAction: "прислухається",
        },
      });
    }

    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Creature added",
        description: `Added ${speciesKey} ×${count} to ${locationKey}.`,
        locationId: location.id,
      },
    });

    await ctx.reply(`✅ Додано: ${species.name} ×${count} → ${location.name} (${location.x},${location.y},${location.z})`);
  });
}
