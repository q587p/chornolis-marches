# 🌲 Chornolis Marches

Telegram-first living liminal frontier sandbox, inspired by MUDs, Ultima Online, S.T.A.L.K.E.R. A-Life, Dwarf Fortress and Ukrainian folklore.

Tech: living cell-based world simulation, PostgreSQL persistence, Render deployment, world ticks, creature aging, corpse lifecycle, prioritized universal action queues, stamina/rest states, fading tracks, and a lightweight Telegram-native interface.

## 🧠 Vision

A living liminal frontier simulation where wilderness, settlements, factions and myth continue to move even when the player is not watching.

Characters should grow through what they actually do, notice and survive: use, observation, apprenticeship, careful attention and meaningful failures rather than abstract levels. The current near-term focus is the dream tutorial and a minimal playable loop of movement, looking, examining, small finds, stamina, rest, traces, beings nearby and small social signals.

Chornolis Marches is not a heroic theme park MMO. The world is meant to feel older, stranger and less controlled than the player. Settlements survive only where people can hold back the forest, the creatures within it and the things that move through forgotten places at night.

* 🌲 The wilderness exists independently of the player
* 🧭 Exploration is dangerous, incomplete and uncertain
* 🐺 Predators hunt prey, compete, age, die and migrate
* 🌿 Resources grow, spread, decay and get depleted
* 🦴 Corpses, remains and abandoned places feed the forest back
* 👣 Tracks, scents, blood trails and other signs fade over time
* ⚔ Factions, settlements and hostile groups compete for survival
* 👤 Players interfere with ecosystems, trade routes and local balance
* 🔥 The border between settlement and wilderness constantly shifts
* 🌘 Myth, spirits and old places become more dangerous at night
* ⏳ Actions take time, can be queued, interrupted, observed and remembered by the world
* 👁 Watching NPCs, animals, monsters or spirits can eventually teach skills
* 🗣 Small social signals are part of play, not only flavor text

## 🌫 Tone

Chornolis Marches is closer to a living frontier simulator than to a traditional MMORPG.

The world should feel:

- dangerous;
- liminal;
- partially unknowable;
- alive without the player;
- shaped by migration, scarcity, memory and old powers.

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
  content/               # authored text/content data such as the world lexicon
  handlers/              # Telegram commands and callback handlers
  services/              # gameplay, world and domain logic
  server/                # HTTP status, health and ecology stat endpoints
  ui/                    # Telegram labels, keyboards and message UI
  utils/                 # small shared helpers

prisma/
  schema.prisma          # database schema
  migrations/            # database migrations
  data/                  # authored world seed data
  seed.ts                # world/database seed script

docs/
  art/                   # visual direction and prompts
  content/               # content structure notes and lexicon documentation
  design/                # canonical terminology and design vocabulary
  dev/                   # local setup and deployment notes
  planning/              # backlog, next, icebox and planning notes
  systems/               # system design docs
```

The codebase is currently Telegram-first, but gameplay logic is gradually moving into reusable services so it can later support web tools, maps or alternative clients.

## 🌍 Documentation

- [`docs/game_design.md`](docs/game_design.md) — core design pillars, identity and long-term gameplay philosophy
- [`docs/roadmap.md`](docs/roadmap.md) — roadmap phases and long-term direction
- [`docs/design/terminology.md`](docs/design/terminology.md) — canonical Ukrainian UI/gameplay terminology
- [`docs/content/world-lexicon.md`](docs/content/world-lexicon.md) — world nouns and Ukrainian case-form source notes
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
* [x] First dream tutorial lane
* [x] First social signal system
* [ ] Skill/stat modifiers beyond stamina
* [ ] Observation-based learning MVP
* [ ] Living-world ambient event MVP
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
* S.T.A.L.K.E.R. A-Life
* Ukrainian mythology

S.T.A.L.K.E.R. is an inspiration not for modern firearms or post-apocalypse aesthetics, but for autonomous world simulation, dangerous exploration, faction tension, emergent encounters and a living territory that exists independently of the player.

---

🌲 The forest is watching.
