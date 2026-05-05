import { Bot } from "grammy";
import { prisma } from "../db";
import { getStatusData } from "../services/status";

export function registerStatusHandlers(bot: Bot) {
  bot.command("world", async (ctx) => {
    const s = await getStatusData();
    await ctx.reply(`🌲 Стан Порубіжжя Чорнолісу\n\nВерсія: ${s.version}\nПерсонажів гравців у базі: ${s.playersCount}\nРегіонів: ${s.regionsCount}\nЛокацій-клітинок: ${s.locationsCount}\nПереходів між клітинками: ${s.exitsCount}\nЖивих тварин: ${s.aliveAnimalsCount}\nNPC / не-тварин: ${s.npcCount}\nЖивих істот загалом: ${s.aliveCreaturesCount}\nВузлів ресурсів: ${s.resourcesCount}\nПодій у журналі: ${s.eventsCount}\n\nПоточна подія: ${s.latestEvent?.title ?? "немає"}\nОстання помилка: ${s.lastRuntimeError ?? "немає"}`);
  });

  bot.command("all", async (ctx) => {
    const [players, creatures] = await Promise.all([
      prisma.player.findMany({ include: { currentLocation: true }, orderBy: { id: "asc" } }),
      prisma.creature.findMany({ include: { location: true, species: true }, orderBy: { id: "asc" } }),
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

    const text = `🧾 Усі персонажі\n\nГравці:\n${playerLines.join("\n") || "немає"}\n\nNPC / істоти:\n${creatureLines.join("\n") || "немає"}`;
    for (let i = 0; i < text.length; i += 3500) await ctx.reply(text.slice(i, i + 3500));
  });
}
