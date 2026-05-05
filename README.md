# 🌲 Chornolis Marches

Text-based Telegram RPG with a living ecosystem, inspired by MUDs, Ultima Online, and Ukrainian folklore.
Tech: living cell-based world, PostgreSQL persistence, Render deployment, and a simple status page.

## 🧠 Vision

A living world simulation:

* 🐺 Wolves hunt rabbits
* 🦊 Foxes compete for prey
* 🐇 Rabbits reproduce
* 🌿 Resources grow and get depleted
* 👤 Players interfere and upset the balance

## 🏗 Tech Stack

* TypeScript + Node.js
* grammY (Telegram bot)
* PostgreSQL
* Prisma ORM
* Render (hosting)

## 🌍 Roadmap

* [x] Cell-based world (grid)
* [x] Movement (/north, /south, etc.)
* [+] Resource system
* [ ] Inventory
* [ ] Track system with fading footprints/scents/signs
* [ ] Stealth and visibility
* [ ] Creatures (wolves, rabbits, etc.)
* [ ] Ecosystem simulation/ticks
* [ ] Hunting and traps
* [ ] Combat system
* [ ] Crafting & professions
* [ ] Events and world history
* [ ] Admin/status commands

## Commands

- `/start` — enter the world
- `/me` — show character state and inventory
- `/look` — spend a tick to inspect the current location
- `/world` — show technical world status
- `/say text` — say something to everyone in the current location

## Status

Render Web Service exposes:

- `/` — human-readable status page
- `/health` — JSON health check

The status page shows version, player count, locations, alive creatures/NPC, resource nodes, latest world event, and latest runtime error.

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
- optional `APP_VERSION`

## ⚙️ Dev notes

* Only one bot instance can run (Telegram polling limitation)
* Prisma 7 uses adapter-based connection
* Database migrations required before deploy

## 🧙 Inspiration

* Ultima Online
* MUDs
* Dwarf Fortress
* Ukrainian mythology

---

🌲 The forest is watching.