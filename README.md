# 🌲 Chornolis Marches

Text-based Telegram RPG with a living ecosystem, inspired by MUDs, Ultima Online, and Ukrainian folklore.

Tech: living cell-based world, PostgreSQL persistence, Render deployment, world ticks, creature aging, corpse lifecycle, prioritized universal action queues, stamina/rest state, fading tracks, and a simple status page.

## 🧠 Vision

A living world simulation:

* 🐺 Wolves hunt rabbits
* 🦊 Foxes compete for prey
* 🐇 Rabbits reproduce
* 🌿 Resources grow and get depleted
* 🦴 Animals age, die, leave corpses, and feed the forest
* 👤 Players interfere and upset the balance
* 🧭 Player/NPC/animal actions take time, can be queued, interrupted and leave tracks

## 🎨 Visual direction

Visual identity notes and generated concept prompts live in [`docs/art/visual_identity.md`](docs/art/visual_identity.md) and [`docs/art/prompts/chornolis_art_prompts.md`](docs/art/prompts/chornolis_art_prompts.md).

Current direction: a dark Ukrainian / Slavic inspired forest frontier with carved wooden border markers, twisted roots, geometric embroidery-like ornament, lantern light, fog, deep green and black shadows, deep red accents and muted gold details.

Generated concept assets are stored under `assets/art/generated/` and should be treated as direction references rather than final production UI.

## 🏗 Tech Stack

* TypeScript + Node.js
* grammY (Telegram bot)
* PostgreSQL
* Prisma ORM
* Render (hosting)

## 🧩 Code structure

The bot entry point is intentionally thin. Most logic is split by responsibility:

```txt
src/
  bot.ts                 # bot composition and startup
  config.ts              # env and app version
  db.ts                  # PostgreSQL pool + Prisma client
  gameConfig.ts          # ticks and gameplay constants
  runtimeState.ts        # last runtime error for status page
  handlers/              # Telegram commands and callback handlers
  services/              # game/domain services
  server/                # HTTP status server
  ui/                    # labels and keyboards
  utils/                 # small helpers
```

## 🌍 Current features

* Cell-based world grid with directional movement.
* Persistent delayed action queue for players, NPCs and animals.
* Stamina states:
  * `Відпочивший`;
  * `Втомлений`;
  * `Дуже втомлений`;
  * `Відпочиває` while active rest is running.
* Action priorities are used for interruption, not for reordering normal route plans.
* Interrupts: urgent actions such as attacks can cancel interruptible running/waiting actions.
* Fading `WorldTrack` records for movement; `/track` can now report recent traces around the current location.
* Runtime tick timing: `WORLD_TICK_INTERVAL_MS` / `TICK_MS` sets the initial world time, and `/tickSet <ms>` can recalculate tick-derived durations without restarting the process.
* Stamina/rest loop: base stamina is 13; while stamina is non-negative, player actions execute immediately; tired actions go into the queue with duration based on action ticks and the configured tick length.
* HP recovery: passive health recovery happens only while idle; active rest is faster. At `HP = 0`, the player is unconscious, the queue is cleared, and only rest is available until HP reaches at least 1.
* Delayed player action queue:
  * actions execute immediately while the player still has stamina;
  * tired actions append to a visible plan in FIFO order;
  * `/queue` shows current and queued actions; when it is empty, it shows only `Черга дій порожня.`;
  * queue buttons can cancel the running action or clear waiting actions, and are hidden when there is nothing to manage.
* Resource nodes: berries, mushrooms, herbs.
* Player inventory for gathered resources.
* Queued player actions: movement, gathering, look, inspect, greet, attack, freshen, say and track placeholder.
* Individual creature records, not abstract population counters.
* World tick loop:
  * autonomous herbalist;
  * simple animal wandering/tracking through queued creature actions;
  * carnivores can queue attacks against prey;
  * resource regeneration;
  * Lisovyk awakening/recovery loop;
  * animal aging and corpse decay.
* Corpse lifecycle:
  * animals age by world ticks;
  * old animals have an increasing death chance;
  * corpses remain visible for a while;
  * decayed corpses disappear and increase mushrooms in that location.

## 🌍 Roadmap

The detailed long-term plan now lives in [`ROADMAP.md`](ROADMAP.md). Core design pillars are described in [`GAME_DESIGN.md`](GAME_DESIGN.md).

Current focus:

- liminal frontier identity: Chornolis Marches as a threshold between settlement, wilderness and myth;
- beginner onboarding and helper flow;
- `/respawn` for early lost characters;
- day/night cycle;
- campfires, light and night visibility;
- starter settlement and NPCs;
- fishing;
- crafting, barter and survival foundations;
- skill progression through use, observation and apprenticeship.

## 🌍 Checklist

* [x] Cell-based world (grid)
* [x] Movement via inline buttons
* [x] Resource system
* [x] Basic inventory display
* [x] Creatures and simple NPC/animal visibility
* [x] Admin/status commands
* [x] Async world ticks
* [x] Persistent delayed action queue
* [x] Creature aging
* [x] Corpse lifecycle
* [x] Delayed player action queue
* [x] Queued movement and gathering
* [x] Queue-aware interruption by urgent actions and death
* [x] Stamina costs, fatigue states and active rest
* [x] First fading track records
* [ ] Skill/stat modifiers beyond stamina
* [ ] Queue-aware skinning, trap setting and crafting
* [ ] Reproduction and offspring
* [ ] Predator hunting priority by age/HP/sex
* [x] First track system with fading footprints/signs
* [ ] Rich scent/noise/footprint interpretation
* [ ] Stealth and visibility
* [ ] Hunting and traps
* [ ] Combat system
* [ ] Crafting & professions
* [ ] Events and world history expansion

## Commands

- `/start` — enter the world
- `/help` — newcomer hints and core commands
- `/me` — show character state and inventory
- `/look` — inspect the current location immediately while rested, or queue it while tired
- `/queue` — show current action plan; empty queues show no inline controls
- `/rest` — cancel active/waiting actions and start active rest
- `/world` — show technical world status
- `/all` — show living players and creatures
- `/all dead` — show all creature records, including corpses/gone records
- `/say text` — speak immediately while rested, or queue speech while tired
- `/queue clear` — remove waiting actions
- `/queue cancel` — cancel the current interruptible action
- `🛌 Відпочити` — start rest from the reply keyboard
- `/tick` — manually run one world tick
- `/tickGet` — show world tick settings
- `/tickSet <ms>` — change runtime world timing: world tick, action/recovery loop and tick-derived durations
- `/addCreature <speciesKey> <locationKey> [count]` — debug-spawn test animals

## Status

Render Web Service exposes:

- `/` — human-readable status page
- `/health` — JSON health check

The status page shows version, player count, locations, alive animals, animal corpses, NPC count, resource nodes, recent world events, and latest runtime error.

## Local setup

```bash
npm install
```

Create `.env`:

```env
BOT_TOKEN=...
DATABASE_URL=...
WORLD_TICK_INTERVAL_MS=1500
```

Run migrations and seed:

```bash
npx prisma migrate deploy
npm run seed
npm run build
npm run dev
```

## Render

Recommended build command:

```bash
npm install && npx prisma migrate deploy && npm run build && npm run seed
```

Start command:

```bash
npm start
```

Environment variables:

- `BOT_TOKEN`
- `DATABASE_URL`
- optional `WORLD_TICK_INTERVAL_MS` — main timing knob for world ticks, action durations, regeneration and track TTL at startup
- optional `TICK_MS` — legacy alias used only when `WORLD_TICK_INTERVAL_MS` is absent
- optional `WORLD_DEBUG=true` or `WORLD_TICK_DEBUG=true`

`APP_VERSION` is no longer required. The app reads version from `package.json` first.

## ⚙️ Dev notes

* Only one bot instance can run (Telegram polling limitation).
* Prisma 7 uses adapter-based connection.
* Database migrations are required before deploy.
* Keep `src/bot.ts` as composition only; add new gameplay in `handlers/` and `services/`.
* `npm run seed` seeds world structure, resources, species, lifecycle profiles, and unique NPCs only; animals are debug-spawned via `/addCreature` for now.
* Player/NPC/animal action delays are persisted in `WorldAction`, not stored in memory-only `setTimeout` jobs.

## 🧙 Inspiration

* Ultima Online
* MUDs
* Dwarf Fortress
* Ukrainian mythology

---

🌲 The forest is watching.
