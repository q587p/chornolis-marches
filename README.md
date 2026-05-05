# 🌲 Chornolis Marches

Text-based Telegram RPG with a living ecosystem, inspired by MUDs, Ultima Online, and Ukrainian folklore.

## ✨ Features (MVP)

* Telegram bot interface
* Persistent players (PostgreSQL)
* World state stored in database
* Basic commands:

  * `/start` — create player
  * `/me` — show player info
  * `/world` — world statistics

## 🧠 Vision

A living world simulation:

* 🐺 Wolves hunt rabbits
* 🦊 Foxes compete for prey
* 🐇 Rabbits reproduce
* 🌿 Resources grow and get depleted
* 👤 Players interfere and upset the balance

No levels — only skills, actions, and consequences.

## 🏗 Tech Stack

* TypeScript + Node.js
* grammY (Telegram bot)
* PostgreSQL
* Prisma ORM
* Render (hosting)

## 🚀 Local setup

```bash
git clone https://github.com/q587p/chornolis-marches.git
cd chornolis-marches

npm install
```

Create `.env`:

```env
BOT_TOKEN=your_telegram_token
DATABASE_URL=your_database_url
```

Run:

```bash
npm run dev
```

## 🛠 Deployment

* Connected to Render
* Auto-deploy on push to `main`
* Uses environment variables:

  * `BOT_TOKEN`
  * `DATABASE_URL`

## 🌍 Roadmap

* [ ] Cell-based world (grid)
* [ ] Creatures (wolves, rabbits, etc.)
* [ ] Movement (/north, /south, etc.)
* [ ] Resource system
* [ ] Ecosystem simulation
* [ ] Combat system
* [ ] Crafting & professions
* [ ] Events and world history

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
