import { Bot, InlineKeyboard } from "grammy";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";
import http from "http";
import fs from "fs";
import path from "path";

dotenv.config();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
if (!process.env.BOT_TOKEN) throw new Error("BOT_TOKEN is not set");

const appVersion = getAppVersion();
const port = Number(process.env.PORT || 3000);
const { Pool } = pg;
const isRenderInternalDb = process.env.DATABASE_URL.includes(".internal");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderInternalDb ? false : { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const bot = new Bot(process.env.BOT_TOKEN);

let lastRuntimeError: string | null = null;

const directionLabels: Record<string, string> = {
  NORTH: "Північ",
  EAST: "Схід",
  SOUTH: "Південь",
  WEST: "Захід",
  UP: "Вгору",
  DOWN: "Вниз",
  INSIDE: "Всередину",
  OUTSIDE: "Назовні",
};

const gatherConfig: Record<string, { chance: number; ticks: number }> = {
  mushrooms: { chance: 1 / 3, ticks: 2 },
  berries: { chance: 1 / 4, ticks: 2 },
  herbs: { chance: 1 / 5, ticks: 3 },
};

const actionCooldown = new Map<string, number>();
const TICK_MS = 1500;

function getAppVersion() {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return String(pkg.version || process.env.APP_VERSION || "dev");
  } catch {
    return String(process.env.APP_VERSION || "dev");
  }
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripUnsafeText(text: string) {
  return text.replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

function canSpendTicks(key: string, ticks = 1) {
  const now = Date.now();
  const until = actionCooldown.get(key) || 0;
  if (now < until) return false;
  actionCooldown.set(key, now + ticks * TICK_MS);
  return true;
}

function runDelayed(label: string, ticks: number, action: () => Promise<void>) {
  setTimeout(() => {
    action().catch((error) => {
      lastRuntimeError = String(error);
      console.error(`${label} failed:`, error);
      logEvent("ERROR", `${label} failed`, lastRuntimeError).catch(() => undefined);
    });
  }, ticks * TICK_MS);
}

async function logEvent(type: any, title: string, description?: string, locationId?: number) {
  try {
    await prisma.worldEvent.create({ data: { type, title, description, locationId } });
  } catch (error) {
    console.warn("Failed to write world event:", error);
  }
}

function buildMovementKeyboard(exits: any[]) {
  const keyboard = new InlineKeyboard();
  const north = exits.find((e) => e.direction === "NORTH");
  const east = exits.find((e) => e.direction === "EAST");
  const south = exits.find((e) => e.direction === "SOUTH");
  const west = exits.find((e) => e.direction === "WEST");

  if (north) keyboard.text("⬆️ Північ", "move:NORTH").row();
  if (west) keyboard.text("⬅️ Захід", "move:WEST");
  if (east) keyboard.text("Схід ➡️", "move:EAST");
  if (west || east) keyboard.row();
  if (south) keyboard.text("⬇️ Південь", "move:SOUTH").row();
  keyboard.text("🔎 Оглянутися", "look");
  return keyboard;
}

function buildInteractionKeyboard() {
  return new InlineKeyboard()
    .text("👋 Привітатися", "social:greet")
    .text("👁 Придивитися", "social:inspect")
    .row()
    .text("⚔️ Атакувати", "social:attack");
}

async function safeAnswerCallbackQuery(ctx: any, text?: string) {
  try {
    await ctx.answerCallbackQuery(text ? { text } : undefined);
  } catch (error) {
    console.warn("answerCallbackQuery ignored:", error);
  }
}

async function getStartLocationId() {
  const location = await prisma.cellLocation.findUnique({ where: { key: "center_chornolis_edge" } });
  if (!location) throw new Error("Start location not found. Run npm run seed first.");
  return location.id;
}

async function getPlayerByTelegramId(telegramId: number) {
  return prisma.player.findUnique({ where: { telegramId: String(telegramId) } });
}

function characterCount(location: any, viewerPlayerId?: number) {
  const otherPlayers = location.players.filter((p: any) => p.id !== viewerPlayerId).length;
  const nonAnimalCreatures = location.creatures.filter((c: any) => c.species.kind !== "ANIMAL").length;
  return otherPlayers + nonAnimalCreatures;
}

function hasVisibleCharacters(location: any, viewerPlayerId?: number) {
  return characterCount(location, viewerPlayerId) > 0;
}

async function renderLocationBrief(locationId: number, viewerPlayerId?: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isAlive: true }, include: { species: true } },
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const exitsText = location.exitsFrom.length
    ? location.exitsFrom.map((exit) => `- ${directionLabels[exit.direction]} → ${exit.toLocation.name}`).join("\n")
    : "Виходів не видно.";

  const othersText = hasVisibleCharacters(location, viewerPlayerId) ? "\n\n<i>Поруч хтось є.</i>" : "";

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n\n${escapeHtml(location.description ?? "")}${othersText}\n\nВиходи:\n${escapeHtml(exitsText)}`,
    keyboard: buildMovementKeyboard(location.exitsFrom),
  };
}

async function renderLocationDetails(locationId: number, viewerPlayerId?: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isAlive: true }, include: { species: true } },
      resources: { include: { resourceType: true } },
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const otherPlayers = location.players.filter((p) => p.id !== viewerPlayerId);
  const npcs = location.creatures.filter((c) => c.species.kind !== "ANIMAL");
  const visibleCharacters = [
    ...otherPlayers.map((p) => p.firstName ?? p.username ?? "мандрівник"),
    ...npcs.map((c) => c.name ?? c.species.name),
  ];
  const charactersText = visibleCharacters.length
    ? `\n\nПоруч:\n${visibleCharacters.map((x) => `- ${x}`).join("\n")}`
    : "";

  const resourceLines = location.resources
    .filter((r) => r.amount > 0)
    .map((r) => {
      const amount = r.amount >= 20 ? "багато" : r.amount >= 8 ? "трохи" : "майже немає";
      return `- <i>${escapeHtml(r.resourceType.name)}</i>: ${escapeHtml(amount)}`;
    });
  const resourcesText = resourceLines.length ? `\n\nВи помічаєте:\n${resourceLines.join("\n")}` : "";

  const creatureHints = location.creatures
    .filter((c) => c.species.kind === "ANIMAL")
    .slice(0, 5)
    .map((c) => `${c.species.name}: ${c.currentAction ?? "проходить"}`);
  const tracksText = creatureHints.length
    ? `\n\nСліди та рух:\n${creatureHints.map((x) => `- ${escapeHtml(x)}`).join("\n")}`
    : "";

  const keyboard = new InlineKeyboard();
  for (const resource of location.resources.filter((r) => r.amount > 0)) {
    const cfg = gatherConfig[resource.resourceType.key];
    const durationText = cfg ? ` (${Math.round((cfg.ticks * TICK_MS) / 1000)} с)` : "";
    keyboard.text(`Зібрати: ${resource.resourceType.name}${durationText}`, `gather:${resource.resourceType.key}`).row();
  }

  if (visibleCharacters.length > 0) {
    keyboard.text("👋 Привітатися", "social:greet")
      .text("👁 Придивитися", "social:inspect")
      .row()
      .text("⚔️ Атакувати", "social:attack")
      .row();
  }

  const movement = buildMovementKeyboard(location.exitsFrom);
  for (const row of movement.inline_keyboard) {
    for (const button of row) {
      if ("text" in button && "callback_data" in button) keyboard.text(button.text, button.callback_data);
    }
    keyboard.row();
  }

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n\n${escapeHtml(location.description ?? "")}\n\n<i>Ви придивляєтесь.</i>\n\nКоординати: ${location.x}, ${location.y}, ${location.z}\nНебезпека: ${location.dangerLevel}${resourcesText}${charactersText ? escapeHtml(charactersText) : ""}${tracksText}`,
    keyboard,
  };
}

async function notifyLocation(locationId: number, exceptPlayerId: number, text: string, keyboard?: InlineKeyboard) {
  const players = await prisma.player.findMany({ where: { currentLocationId: locationId, NOT: { id: exceptPlayerId } } });
  for (const player of players) {
    try {
      await bot.api.sendMessage(player.telegramId, text, keyboard ? { reply_markup: keyboard } : undefined);
    } catch (error) {
      console.warn("Failed to notify location player:", error);
    }
  }
}

async function notifyRegion(regionId: number, text: string) {
  const players = await prisma.player.findMany({
    where: { currentLocation: { regionId } },
  });

  for (const player of players) {
    try {
      await bot.api.sendMessage(player.telegramId, text);
    } catch (error) {
      console.warn("Failed to notify region player:", error);
    }
  }
}

async function summonLisovykIfResourceDepleted(resourceName: string, regionId: number) {
  const species = await prisma.creatureSpecies.findUnique({ where: { key: "lisovyk" } });
  if (!species) return;

  const alreadyAlive = await prisma.creature.findFirst({
    where: { speciesId: species.id, name: "Дід Чорноліс", isAlive: true },
  });

  if (alreadyAlive) return;

  const locations = await prisma.cellLocation.findMany({ where: { regionId } });
  if (!locations.length) return;

  const location = locations[Math.floor(Math.random() * locations.length)];

  const existing = await prisma.creature.findFirst({
    where: { speciesId: species.id, name: "Дід Чорноліс" },
  });

  if (existing) {
    await prisma.creature.update({
      where: { id: existing.id },
      data: {
        locationId: location.id,
        isAlive: true,
        hp: species.baseHp,
        currentAction: "обурено ходить між деревами",
        activity: "MOVING",
      },
    });
  } else {
    await prisma.creature.create({
      data: {
        speciesId: species.id,
        locationId: location.id,
        name: "Дід Чорноліс",
        hp: species.baseHp,
        isAlive: true,
        currentAction: "обурено ходить між деревами",
        activity: "MOVING",
      },
    });
  }

  await notifyRegion(regionId, `🌲 О ні, люди зібрали всі ${resourceName}! Десь у Чорнолісі прокинувся Дід Чорноліс.`);
  await logEvent("SYSTEM", "Lisovyk awakened", `Resource depleted: ${resourceName}`, location.id);
}

async function announceWorldUpdatedOnce() {
  const eventTitle = `DEPLOY:${appVersion}`;
  const alreadySent = await prisma.worldEvent.findFirst({ where: { type: "SYSTEM", title: eventTitle } });
  if (alreadySent) return;

  const players = await prisma.player.findMany({ select: { telegramId: true } });
  let success = 0;
  let failed = 0;
  for (const player of players) {
    try {
      await bot.api.sendMessage(player.telegramId, `⚙️ Світ Чорнолісу оновився.\n\nВерсія: ${appVersion}\n\nМожна продовжувати гру.`);
      success++;
    } catch (error) {
      failed++;
      console.warn("Failed to notify player about deploy:", error);
    }
  }

  await logEvent("SYSTEM", eventTitle, `World update notification sent. Success: ${success}. Failed: ${failed}.`);
}

async function getStatusData() {
  const [playersCount, regionsCount, locationsCount, exitsCount, aliveAnimalsCount, npcCount, aliveCreaturesCount, resourcesCount, eventsCount, latestEvent] = await Promise.all([
    prisma.player.count(),
    prisma.region.count(),
    prisma.cellLocation.count(),
    prisma.locationExit.count(),
    prisma.creature.count({ where: { isAlive: true, species: { kind: "ANIMAL" } } }),
    prisma.creature.count({ where: { isAlive: true, species: { kind: { not: "ANIMAL" } } } }),
    prisma.creature.count({ where: { isAlive: true } }),
    prisma.resourceNode.count(),
    prisma.worldEvent.count(),
    prisma.worldEvent.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  return { version: appVersion, playersCount, regionsCount, locationsCount, exitsCount, aliveAnimalsCount, npcCount, aliveCreaturesCount, resourcesCount, eventsCount, latestEvent, lastRuntimeError };
}

function startHttpServer() {
  http
    .createServer(async (req, res) => {
      try {
        const status = await getStatusData();
        if (req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, version: status.version, lastRuntimeError: status.lastRuntimeError, latestEvent: status.latestEvent?.title ?? null }));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!doctype html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Chornolis Marches status</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 18px;background:#10170f;color:#e8e0c9} .card{border:1px solid #3b4a2f;border-radius:16px;padding:18px;background:#172114} code{color:#d8b55d}</style></head><body><h1>🌲 Chornolis Marches</h1><div class="card"><p>Status: <strong>online</strong></p><p>Version: <strong>${escapeHtml(status.version)}</strong></p><p>Players: ${status.playersCount}</p><p>Regions: ${status.regionsCount}</p><p>Locations: ${status.locationsCount}</p><p>Exits: ${status.exitsCount}</p><p>Alive animals: ${status.aliveAnimalsCount}</p><p>NPC / non-animals: ${status.npcCount}</p><p>Alive creatures total: ${status.aliveCreaturesCount}</p><p>Resource nodes: ${status.resourcesCount}</p><p>World events: ${status.eventsCount}</p><p>Latest event: <code>${escapeHtml(status.latestEvent?.title ?? "none")}</code></p><p>Last runtime error: <code>${escapeHtml(status.lastRuntimeError ?? "none")}</code></p></div><p><a href="/health" style="color:#d8b55d">/health JSON</a></p></body></html>`);
      } catch (error) {
        lastRuntimeError = String(error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: lastRuntimeError }));
      }
    })
    .listen(port, () => console.log(`Server running on port ${port}`));
}

bot.command("start", async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  const startLocationId = await getStartLocationId();
  const player = await prisma.player.upsert({
    where: { telegramId: String(from.id) },
    update: { username: from.username ?? null, firstName: from.first_name ?? null, lastName: from.last_name ?? null, currentLocationId: startLocationId },
    create: { telegramId: String(from.id), username: from.username ?? null, firstName: from.first_name ?? null, lastName: from.last_name ?? null, currentLocationId: startLocationId },
  });
  const view = await renderLocationBrief(startLocationId, player.id);
  await ctx.reply(`🌲 Порубіжжя Чорнолісу ожили.\n\nВітаю, ${player.firstName ?? "мандрівнику"}. Твій слід збережено в Чорнолісі.`);
  await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
});

bot.command("me", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const player = await prisma.player.findUnique({
    where: { telegramId: String(from.id) },
    include: {
      currentLocation: true,
      resources: { include: { resourceType: true } },
    },
  });

  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const items = player.resources.length
    ? player.resources.map((i) => `${i.resourceType.name} ×${i.amount}`).join("\n")
    : "порожньо";

  await ctx.reply(`🧍 Ти:\n\nІм’я: ${player.firstName ?? "невідомо"}\nHP: ${player.hp}\nВитривалість: ${player.stamina}\nГолод: ${player.hunger}\nЛокація: ${player.currentLocation?.name ?? "невідомо"}\n\nІнвентар:\n${items}`);
});

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

  for (let i = 0; i < text.length; i += 3500) {
    await ctx.reply(text.slice(i, i + 3500));
  }
});

bot.command("look", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const player = await getPlayerByTelegramId(from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const ticks = 1;
  const seconds = Math.round((ticks * TICK_MS) / 1000);
  if (!canSpendTicks(String(from.id), ticks)) return void (await ctx.reply("Ти ще зайнятий."));

  const locationId = player.currentLocationId ?? (await getStartLocationId());
  await ctx.reply(`Ви починаєте уважно оглядатися (${seconds} с).`);

  runDelayed("look", ticks, async () => {
    await prisma.player.update({ where: { id: player.id }, data: { currentLocationId: locationId, looks: { increment: 1 } } });
    const view = await renderLocationDetails(locationId, player.id);
    await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  });
});

bot.command("say", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const text = stripUnsafeText(String(ctx.match || "").slice(0, 300));
  if (!text) return void (await ctx.reply("Напиши так: /say текст"));

  const player = await getPlayerByTelegramId(from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  if (!canSpendTicks(`say:${from.id}`, 1)) return void (await ctx.reply("Ти ще не можеш говорити так швидко."));
  await prisma.player.update({ where: { id: player.id }, data: { says: { increment: 1 } } });
  await notifyLocation(player.currentLocationId, player.id, `Хтось каже: «${text}»`);
  await ctx.reply(`Ви кажете: «${text}»`);
  await logEvent("SAY", "Player said something", text, player.currentLocationId);
});

bot.callbackQuery("look", async (ctx) => {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) {
    await safeAnswerCallbackQuery(ctx);
    return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  }

  const ticks = 1;
  const seconds = Math.round((ticks * TICK_MS) / 1000);
  if (!canSpendTicks(String(ctx.from.id), ticks)) return void (await safeAnswerCallbackQuery(ctx, "Ти ще зайнятий."));

  await safeAnswerCallbackQuery(ctx, `Огляд займе ${seconds} с.`);
  await ctx.reply(`Ви починаєте уважно оглядатися (${seconds} с).`);

  runDelayed("look callback", ticks, async () => {
    await prisma.player.update({ where: { id: player.id }, data: { looks: { increment: 1 } } });
    const view = await renderLocationDetails(player.currentLocationId!, player.id);
    await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  });
});

bot.callbackQuery(/^move:(NORTH|EAST|SOUTH|WEST|UP|DOWN|INSIDE|OUTSIDE)$/, async (ctx) => {
  const direction = ctx.match[1] as any;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) {
    await safeAnswerCallbackQuery(ctx);
    return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  }
  const currentLocationId = player.currentLocationId ?? (await getStartLocationId());
  const exit = await prisma.locationExit.findUnique({ where: { fromLocationId_direction: { fromLocationId: currentLocationId, direction } } });
  if (!exit || exit.isHidden) return void (await safeAnswerCallbackQuery(ctx, "Туди немає видимого шляху."));

  await notifyLocation(currentLocationId, player.id, "Хтось пішов звідси.");
  await prisma.player.update({ where: { id: player.id }, data: { currentLocationId: exit.toLocationId, steps: { increment: 1 } } });
  await notifyLocation(exit.toLocationId, player.id, "Хтось прийшов сюди.", buildInteractionKeyboard());
  await logEvent("MOVE", "Player moved", direction, exit.toLocationId);

  const view = await renderLocationBrief(exit.toLocationId, player.id);
  await safeAnswerCallbackQuery(ctx);
  await ctx.reply(`Ти рушив: ${directionLabels[direction]}`);
  await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
});

bot.callbackQuery(/^gather:(berries|mushrooms|herbs)$/, async (ctx) => {
  const key = ctx.match[1];
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) {
    await safeAnswerCallbackQuery(ctx);
    return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  }

  const cfg = gatherConfig[key];
  const durationSeconds = Math.round((cfg.ticks * TICK_MS) / 1000);
  if (!canSpendTicks(String(ctx.from.id), cfg.ticks)) return void (await safeAnswerCallbackQuery(ctx, "Ти ще зайнятий."));

  const locationId = player.currentLocationId;
  await safeAnswerCallbackQuery(ctx, `Збір займе ${durationSeconds} с.`);
  await ctx.reply(`Ви починаєте пошуки (${durationSeconds} с).`);

  runDelayed("gather", cfg.ticks, async () => {
    const resource = await prisma.resourceNode.findFirst({
      where: { locationId, resourceType: { key }, amount: { gt: 0 } },
      include: { resourceType: true, location: true },
    });

    await prisma.player.update({ where: { id: player.id }, data: { gatherAttempts: { increment: 1 } } });

    if (!resource || Math.random() > cfg.chance) {
      await ctx.reply(`Ви витратили час на пошуки (${durationSeconds} с), але нічого корисного не знайшли.`);
      await logEvent("GATHER", "Gather failed", key, locationId);
      return;
    }

    const found = Math.min(resource.amount, Math.floor(Math.random() * 3) + 1);
    const nextAmount = resource.amount - found;

    await prisma.resourceNode.update({ where: { id: resource.id }, data: { amount: nextAmount } });
    await prisma.playerResource.upsert({
      where: {
        playerId_resourceTypeId: {
          playerId: player.id,
          resourceTypeId: resource.resourceTypeId,
        },
      },
      update: { amount: { increment: found } },
      create: {
        playerId: player.id,
        resourceTypeId: resource.resourceTypeId,
        amount: found,
      },
    });
    await prisma.player.update({ where: { id: player.id }, data: { successfulGathers: { increment: 1 } } });
    await ctx.reply(`Ви витратили час на пошуки (${durationSeconds} с) і знайшли: ${resource.resourceType.name} ×${found}.`);
    await logEvent("GATHER", "Gather succeeded", `${resource.resourceType.name} ×${found}`, locationId);

    if (resource.amount > 0 && nextAmount <= 0) {
      await summonLisovykIfResourceDepleted(resource.resourceType.name, resource.location.regionId);
    }
  });
});

bot.callbackQuery("social:greet", async (ctx) => {
  const greeting = "Доброго здоров’я.";
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (player) await prisma.player.update({ where: { id: player.id }, data: { greetings: { increment: 1 } } });
  await safeAnswerCallbackQuery(ctx);
  await ctx.reply(`Ви сказали: «${greeting}»`);
});

bot.callbackQuery("social:inspect", async (ctx) => {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await safeAnswerCallbackQuery(ctx));
  const ticks = 1;
  const seconds = Math.round((ticks * TICK_MS) / 1000);
  if (!canSpendTicks(`inspect:${ctx.from.id}`, ticks)) return void (await safeAnswerCallbackQuery(ctx, "Ти ще зайнятий."));

  await safeAnswerCallbackQuery(ctx, `Придивитися займе ${seconds} с.`);
  await ctx.reply(`Ви починаєте придивлятися (${seconds} с).`);

  runDelayed("inspect", ticks, async () => {
    await prisma.player.update({ where: { id: player.id }, data: { looks: { increment: 1 } } });
    const [others, npcs] = await Promise.all([
      prisma.player.findMany({ where: { currentLocationId: player.currentLocationId!, NOT: { id: player.id } } }),
      prisma.creature.findMany({ where: { locationId: player.currentLocationId!, isAlive: true, species: { kind: { not: "ANIMAL" } } }, include: { species: true } }),
    ]);

    const names = [
      ...others.map((p) => p.firstName ?? p.username ?? "мандрівник"),
      ...npcs.map((c) => c.name ?? c.species.name),
    ];

    await ctx.reply(names.length ? `Ви придивляєтесь: ${names.join(", ")}` : "Ви не бачите нікого достатньо близько.");
  });
});

bot.callbackQuery("social:attack", async (ctx) => {
  await safeAnswerCallbackQuery(ctx);
  await ctx.reply("⚔️ Атака ще в розробці.");
});

bot.on("message", async (ctx) => {
  await ctx.reply("Я ще вчуся, але світ уже дихає.");
});

bot.catch((err) => {
  lastRuntimeError = String(err.error);
  console.error("Bot handler error:", err.error);
  logEvent("ERROR", "Bot handler error", lastRuntimeError).catch(() => undefined);
});

async function main() {
  console.log("Bot starting...");
  startHttpServer();
  await announceWorldUpdatedOnce();
  bot.start();
}

main().catch(async (error) => {
  lastRuntimeError = String(error);
  console.error("Bot crashed:", error);
  await logEvent("ERROR", "Bot crashed", lastRuntimeError);
  await prisma.$disconnect();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("World is updating...");
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});
