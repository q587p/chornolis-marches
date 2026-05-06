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

export function registerStatusHandlers(bot: Bot) {
  bot.command("world", async (ctx) => {
    const s = await getStatusData();
    await ctx.reply(`🌲 Стан Порубіжжя Чорнолісу\n\nВерсія: ${s.version}\nПерсонажів гравців у базі: ${s.playersCount}\nРегіонів: ${s.regionsCount}\nЛокацій-клітинок: ${s.locationsCount}\nПереходів між клітинками: ${s.exitsCount}\nЖивих тварин: ${s.aliveAnimalsCount}\nNPC / не-тварин: ${s.npcCount}\nЖивих істот загалом: ${s.aliveCreaturesCount}\nВузлів ресурсів: ${s.resourcesCount}\nПодій у журналі: ${s.eventsCount}\n\nПоточна подія: ${s.latestEvent?.title ?? "немає"}\nОстання помилка: ${s.lastRuntimeError ?? "немає"}`);
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
        description: `Removed dead=${deadCleanup.count}; unique NPC duplicates=${duplicateCount}.`,
      },
    });

    const lines = uniqueResults.map((r) => {
      if (r.skipped) return `${r.speciesKey}: skipped, species/location missing`;
      return `${r.speciesKey}: kept #${r.keptId}, removed duplicates=${r.removed}${r.created ? ", created" : ""}`;
    });

    await ctx.reply(
      `🧹 Creature cleanup done.\n\n${lines.join("\n")}\nDead/inactive removed: ${deadCleanup.count}\n\nAlive animals: ${fresh.aliveAnimalsCount}\nNPC / non-animals: ${fresh.npcCount}\nAlive creatures total: ${fresh.aliveCreaturesCount}`
    );
  });
}
