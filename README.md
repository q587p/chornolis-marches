# 🌲 Chornolis Marches

Text-based Telegram RPG with a living ecosystem, inspired by MUDs, Ultima Online, and Ukrainian folklore.

Tech: living cell-based world simulation, PostgreSQL persistence, Render deployment, world ticks, creature aging, corpse lifecycle, prioritized universal action queues, stamina/rest states, fading tracks, and a lightweight Telegram-native interface.

## 🧠 Vision

A living liminal frontier simulation:

* 🐺 Wolves hunt rabbits
* 🦊 Foxes compete for prey
* 🐇 Rabbits reproduce and migrate
* 🌿 Resources grow, spread and get depleted
* 🦴 Animals age, die, leave corpses and feed the forest
* 🌫 Tracks, scents and signs fade over time
* 👤 Players interfere and upset the balance
* 🧭 Actions take time, can be queued, interrupted and leave traces
* 🔥 Settlements push back against wilderness while myths push back against settlement
* 🌘 The world changes between day and night

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

The bot entry point is `src/bot.ts`. The TypeScript source lives under `src/`, while persistence, migrations and world seed data live under `prisma/`.

```txt
src/
  bot.ts                 # Telegram bot composition and startup
  handlers/              # Telegram commands and callback handlers
  services/              # gameplay, world and domain logic
  server/                # HTTP status / health endpoints
  ui/                    # Telegram labels, keyboards and message UI
  utils/                 # small shared helpers

prisma/
  schema.prisma          # database schema
  migrations/            # database migrations
  data/                  # authored world seed data
  seed.ts                # world/database seed script

docs/
  art/                   # visual direction and prompts
  planning/              # backlog, next, icebox and planning notes
  systems/               # system design docs
```

The codebase is currently Telegram-first, but gameplay logic is gradually moving into reusable services so it can later support web tools, maps or alternative clients.

## 🌍 Documentation

- [`docs/game_design.md`](docs/game_design.md) — core design pillars, identity and long-term gameplay philosophy
- [`docs/roadmap.md`](docs/roadmap.md) — roadmap phases and long-term direction
- [`docs/systems/`](docs/systems/) — gameplay system design documents
- [`docs/planning/`](docs/planning/) — backlog, next, icebox and planning notes
- [`docs/dev/`](docs/dev/) — local setup, deployment and developer notes

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

## 🛠 Developer setup

For local development and deployment setup, see:

- [`docs/dev/local_setup.md`](docs/dev/local_setup.md) — local development setup
- [`docs/dev/render_deploy.md`](docs/dev/render_deploy.md) — Render deployment notes

## 🧙 Inspiration

* Ultima Online
* MUDs
* Dwarf Fortress
* Ukrainian mythology

---

🌲 The forest is watching.
