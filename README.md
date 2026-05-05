# 🌲 Chornolis Marches

Text-based Telegram RPG with a living forest world, cell-based movement, resources, creatures, and Ukrainian folklore.

## Current MVP

- Telegram bot on grammY
- Render Web Service with a tiny HTTP health endpoint
- PostgreSQL on Render
- Prisma 7 with PostgreSQL adapter
- Persistent players
- 3×3 cell-based starter region
- MUD-like movement buttons:
  - North / East / South / West
- `/look` for location details
- Resource nodes:
  - berries
  - mushrooms
  - herbs
- Basic gathering action
- Creature species seeded:
  - rabbit
  - mouse
  - fox
  - wolf
  - lisovyk

## Commands

- `/start` — enter the world or refresh player data
- `/me` — show player state
- `/world` — show technical world stats
- `/look` — inspect current location details

Movement and gathering are available through inline buttons.

## Local setup

```bash
npm install
```

Create `.env`:

```env
BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=your_external_render_postgres_url
```

For local development use Render **External Database URL**.

For Render service environment use Render **Internal Database URL**.

## Database

Generate Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev --name init
```

Seed world:

```bash
npm run seed
```

## Run locally

```bash
npm run dev
```

Only one bot instance can use long polling. Stop local bot before running the Render instance with the same token.

## Render

Recommended Web Service settings:

Build Command:

```bash
npm install && npx prisma migrate deploy && npm run build && npm run seed
```

Start Command:

```bash
npm start
```

Environment variables:

```env
BOT_TOKEN=...
DATABASE_URL=...
```

The bot opens a tiny HTTP endpoint so Render Web Service sees an open port.

## Roadmap

- Inventory
- Track system with fading footprints/scents/signs
- Skills: gathering, tracking, hunting, stealth
- Individual creature movement between cells
- Ecosystem ticks
- Hunting and traps
- Events and world history
- Admin commands
