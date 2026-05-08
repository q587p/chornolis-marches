# 🌲 Chornolis Marches

Text-based Telegram RPG with a living ecosystem, inspired by MUDs, Ultima Online, and Ukrainian folklore.
Tech: living cell-based world, PostgreSQL persistence, Render deployment, world ticks, creature aging, corpse lifecycle, and a simple status page.

## 🧠 Vision

A living world simulation:

* 🐺 Wolves hunt rabbits
* 🦊 Foxes compete for prey
* 🐇 Rabbits reproduce
* 🌿 Resources grow and get depleted
* 🦴 Animals age, die, leave corpses, and feed the forest
* 👤 Players interfere and upset the balance

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
* Resource nodes: berries, mushrooms, herbs.
* Player inventory for gathered resources.
* Individual creature records, not abstract population counters.
* World tick loop:
  * autonomous herbalist;
  * simple animal wandering/tracking;
  * resource regeneration;
  * Lisovyk awakening/recovery loop;
  * animal aging and corpse decay.
* Corpse lifecycle:
  * animals age by world ticks;
  * old animals have an increasing death chance;
  * corpses remain visible for a while;
  * decayed corpses disappear and increase mushrooms in that location.

## 🌍 Roadmap

* [x] Cell-based world (grid)
* [x] Movement via inline buttons
* [x] Resource system
* [x] Basic inventory display
* [x] Creatures and simple NPC/animal visibility
* [x] Admin/status commands
* [x] Async world ticks
* [x] Creature aging
* [x] Corpse lifecycle
* [ ] Reproduction and offspring
* [ ] Predator hunting priority by age/HP/sex
* [ ] Track system with fading footprints/scents/signs
* [ ] Stealth and visibility
* [ ] Hunting and traps
* [ ] Combat system
* [ ] Crafting & professions
* [ ] Events and world history expansion

## Commands

- `/start` — enter the world
- `/me` — show character state and inventory
- `/look` — spend a tick to inspect the current location
- `/world` — show technical world status
- `/all` — show living players and creatures
- `/all dead` — show all creature records, including corpses/gone records
- `/say text` — say something to everyone in the current location
- `/tick` — manually run one world tick
- `/tickGet` — show world tick settings
- `/tickSet <ms>` — change tick interval at runtime
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
```

Run migrations and seed:

```bash
npx prisma db push
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
- optional `WORLD_TICK_INTERVAL_MS`
- optional `WORLD_DEBUG=true` or `WORLD_TICK_DEBUG=true`

`APP_VERSION` is no longer required. The app reads version from `package.json` first.

## ⚙️ Dev notes

* Only one bot instance can run (Telegram polling limitation).
* Prisma 7 uses adapter-based connection.
* Database migrations are required before deploy.
* Keep `src/bot.ts` as composition only; add new gameplay in `handlers/` and `services/`.
* `npm run seed` seeds world structure, resources, species, lifecycle profiles, and unique NPCs only; animals are debug-spawned via `/addCreature` for now.

## 🧙 Inspiration

* Ultima Online
* MUDs
* Dwarf Fortress
* Ukrainian mythology

---

🌲 The forest is watching.
