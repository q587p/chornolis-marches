# 🌲 Chornolis Marches

Telegram RPG prototype with a cell-based living world, PostgreSQL persistence, resources, movement buttons, and first NPC behavior.

## Current features

- Telegram bot via grammY
- Render Web Service compatibility through a tiny HTTP health endpoint
- PostgreSQL + Prisma 7 adapter-based connection
- Cell-based world map
- Movement buttons: north, east, south, west, and future extra exits
- `/start` — create/update player and enter the world
- `/me` — character stats and inventory
- `/world` — technical world status
- `/look` — detailed location inspection
- `/say <text>` — say something to everyone in the same location
- Resource nodes: berries, mushrooms, herbs
- Gathering buttons with random success:
  - mushrooms: 1/3
  - berries: 1/4
  - herbs: 1/5
- Time tick cooldowns for actions
- Basic journal through `WorldEvent`
- First NPC: herbalist
  - moves through exits
  - looks for herbs
  - gathers herbs randomly
  - sometimes says ambient phrases

## Local setup

```bash
npm install
```

Create `.env`:

```env
BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=your_external_database_url_for_local_dev
```

Build:

```bash
npm run build
```

Migrate:

```bash
npx prisma migrate dev --name add_npc_stats_and_inventory
```

Seed:

```bash
npm run seed
```

Run locally:

```bash
npm run dev
```

Only one bot instance can use Telegram long polling at a time. Stop Render or local dev before starting another instance with the same token.

## Render

Use Web Service, not Worker, for the current budget setup. The bot opens a small HTTP port so Render considers the service healthy.

Build command:

```bash
npm install && npx prisma migrate deploy && npm run build && npm run seed
```

Start command:

```bash
npm start
```

Environment variables:

```env
BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=your_internal_render_database_url
```

## Roadmap

- Stealth and visibility
- Skills and skill progression
- Better action queue
- Tracks that decay over time
- Animal ecosystem with individual creatures
- Combat, traps, trading, theft
- Admin/status commands
