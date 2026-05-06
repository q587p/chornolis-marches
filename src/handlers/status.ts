import { Bot } from "grammy";
import { CreatureActivity } from "@prisma/client";
import { prisma } from "../db";
import { getStatusData } from "../services/status";

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
      data: { hp: species.baseHp },
    });
  }

  const duplicateIds = creatures.filter((c) => c.id !== kept.id).map((c) => c.id);
  const removed = duplicateIds.length
    ? (await prisma.creature.deleteMany({ where: { id: { in: duplicateIds } } })).count
    : 0;

  return { speciesKey: npc.speciesKey, keptId: kept.id, removed, created, skipped: false };
}

function parseAddCreatureArgs(input: string) {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  const [speciesKey, locationArg, maybeCount, ...nameParts] = parts;
  const count = maybeCount && /^\d+$/.test(maybeCount) ? Number(maybeCount) : 1;
  const name = maybeCount && !/^\d+$/.test(maybeCount) ? [maybeCount, ...nameParts].join(" ") : nameParts.join(" ");

  return {
    speciesKey,
    locationArg,
    count: Math.min(Math.max(count, 1), 20),
    name: name.trim() || undefined,
  };
}

async function findLocation(locationArg: string) {
  const coords = locationArg.match(/^(-?\d+),(-?\d+),(-?\d+)$/);
  if (coords) {
    const [, x, y, z] = coords;
    return prisma.cellLocation.findFirst({
      where: { x: Number(x), y: Number(y), z: Number(z) },
    });
  }

  return prisma.cellLocation.findFirst({
    where: {
      OR: [
        { key: locationArg },
        { name: { equals: locationArg, mode: "insensitive" } },
      ],
    },
  });
}

function formatWorldEvents(events: Awaited<ReturnType<typeof getStatusData>>["latestEvents"]) {
  if (!events.length) return "немає";

  return events
    .map((event) => {
      const created = event.createdAt.toISOString().replace("T", " ").slice(0, 16);
      const description = event.description ? ` — ${event.description}` : "";
      return `- #${event.id} ${created}: ${event.title}${description}`;
    })
    .join("\n");
}

export function registerStatusHandlers(bot: Bot) {
  bot.command("world", async (ctx) => {
    const s = await getStatusData();
    await ctx.reply(
      `🌲 Стан Порубіжжя Чорнолісу\n\n` +
        `Версія: ${s.version}\n` +
        `Персонажів гравців у базі: ${s.playersCount}\n` +
        `Регіонів: ${s.regionsCount}\n` +
        `Локацій-клітинок: ${s.locationsCount}\n` +
        `Переходів між клітинками: ${s.exitsCount}\n` +
        `Живих тварин: ${s.aliveAnimalsCount}\n` +
        `NPC / не-тварин: ${s.npcCount}\n` +
        `Живих істот загалом: ${s.aliveCreaturesCount}\n` +
        `Вузлів ресурсів: ${s.resourcesCount}\n` +
        `Подій у журналі: ${s.eventsCount}\n\n` +
        `Останні події:\n${formatWorldEvents(s.latestEvents)}\n\n` +
        `Остання помилка: ${s.lastRuntimeError ?? "немає"}`
    );
  });

  bot.command("all", async (ctx) => {
    const showDead = ctx.match?.trim().toLowerCase() === "dead";
    const [players, creatures] = await Promise.all([
      prisma.player.findMany({ include: { currentLocation: true }, orderBy: { id: "asc" } }),
      prisma.creature.findMany({
        where: showDead ? undefined : { isAlive: true },
        include: { location: true, species: true },
        orderBy: { id: "asc" },
      }),
    ]);

    const playerLines = players.map((p) => {
      const loc = p.currentLocation ? `${p.currentLocation.name} (${p.currentLocation.x},${p.currentLocation.y},${p.currentLocation.z})` : "невідомо";
      return `#${p.id} ${p.firstName ?? p.username ?? "мандрівник"} — ${loc}; HP ${p.hp}; stamina ${p.stamina}; hunger ${p.hunger}`;
    });

    const creatureLines = creatures.map((c) => {
      const loc = c.location ? `${c.location.name} (${c.location.x},${c.location.y},${c.location.z})` : "невідомо";
      const state = c.isAlive ? "alive" : "inactive/dead";
      return `#${c.id} ${c.name ?? c.species.name} [${c.species.key}] — ${loc}; ${state}; HP ${c.hp}; ${c.activity ?? "IDLE"}; ${c.currentAction ?? "без дії"}`;
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

    const animalsCleanup = await prisma.creature.deleteMany({
      where: { species: { kind: "ANIMAL" } },
    });

    const deadCleanup = await prisma.creature.deleteMany({
      where: {
        isAlive: false,
        id: keepIds.length ? { notIn: keepIds } : undefined,
      },
    });

    const fresh = await getStatusData();
    const duplicateCount = uniqueResults.reduce((sum, r) => sum + r.removed, 0);

    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Creature cleanup",
        description: `Removed animals=${animalsCleanup.count}; dead=${deadCleanup.count}; unique NPC duplicates=${duplicateCount}.`,
      },
    });

    const lines = uniqueResults.map((r) => {
      if (r.skipped) return `${r.speciesKey}: skipped, species/location missing`;
      return `${r.speciesKey}: kept #${r.keptId}, removed duplicates=${r.removed}${r.created ? ", created" : ""}`;
    });

    await ctx.reply(
      `🧹 Creature cleanup done.\n\n` +
        `${lines.join("\n")}\n` +
        `Animals removed: ${animalsCleanup.count}\n` +
        `Dead/inactive removed: ${deadCleanup.count}\n\n` +
        `Alive animals: ${fresh.aliveAnimalsCount}\n` +
        `NPC / non-animals: ${fresh.npcCount}\n` +
        `Alive creatures total: ${fresh.aliveCreaturesCount}`
    );
  });

  bot.command(["addCreature", "addcreature"], async (ctx) => {
    const args = parseAddCreatureArgs(ctx.match ?? "");

    if (!args.speciesKey || !args.locationArg) {
      await ctx.reply(
        "⚠️ Формат:\n" +
          "/addCreature <speciesKey> <locationKey|x,y,z> [count] [name]\n\n" +
          "Приклади:\n" +
          "/addCreature rabbit center_chornolis_edge 3\n" +
          "/addCreature wolf -1,-1,0\n" +
          "/addCreature fox west_fox_path 2"
      );
      return;
    }

    const species = await prisma.creatureSpecies.findUnique({ where: { key: args.speciesKey } });
    const location = await findLocation(args.locationArg);

    if (!species) {
      await ctx.reply(`⚠️ Невідомий speciesKey: ${args.speciesKey}`);
      return;
    }

    if (!location) {
      await ctx.reply(`⚠️ Не знайшов локацію: ${args.locationArg}`);
      return;
    }

    const created = [];
    for (let i = 0; i < args.count; i++) {
      const creature = await prisma.creature.create({
        data: {
          speciesId: species.id,
          locationId: location.id,
          name: args.name ?? null,
          hp: species.baseHp,
          activity: "IDLE",
          currentAction: "прислухається",
        },
      });
      created.push(creature.id);
    }

    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Creature added",
        description: `Added ${args.count} × ${species.key} at ${location.key}.`,
        locationId: location.id,
      },
    });

    await ctx.reply(
      `✅ Додано істот: ${args.count}\n` +
        `Вид: ${species.name} [${species.key}]\n` +
        `Локація: ${location.name} (${location.x},${location.y},${location.z})\n` +
        `ID: ${created.map((id) => `#${id}`).join(", ")}`
    );
  });
}
