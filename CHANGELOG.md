# Changelog
All notable changes to this project will be documented in this file.
The format is loosely based on Keep a Changelog and this project follows semantic-ish versioning.

---

## [Unreleased]

---

## 0.3.0 - bot.ts refactor - 12026-05-06

### Changed

- Split the large `src/bot.ts` into focused modules:
  - `src/config.ts` for environment and app version.
  - `src/db.ts` for PostgreSQL/Prisma setup.
  - `src/server/statusServer.ts` for `/` and `/health`.
  - `src/handlers/*` for Telegram commands and callbacks.
  - `src/services/*` for domain logic: locations, notifications, resources, status, cooldowns, delayed actions, deploy announcements and world events.
  - `src/ui/*` for inline keyboards and labels.
  - `src/utils/*` for small helpers.
- Kept `src/bot.ts` as the app composition/startup file.
- Updated README with the new code structure and current command list.

### Preserved

- Existing gameplay behavior for `/start`, `/me`, `/look`, `/world`, `/all`, `/say`, movement, gathering and basic social actions.
- Existing Prisma schema and seed world content.
- Existing Render status page and health endpoint behavior.

### Notes

- This is a structural refactor intended to make future work on combat, traps, hunting, ecosystem ticks and crafting easier.
- I could not run a full `npm install && npm run build` in the sandbox because external package download was unavailable.

---

## [0.2.3] - 12026-05-06

### 🐛 Fixed
- GitHub release workflow.

## [0.2.2] - 12026-05-06

### ✨ Added
- Hidden `/all` debug command with all players, NPC/creatures, coordinates, HP and current actions.
- Attack interaction button (`⚔️ Атакувати`) for future combat. For now it replies that combat is still in development.
- Region-wide warning and Lisovyk awakening trigger when a resource node is fully depleted.
- `lisovyk` remains available as a species key, but Дід Чорноліс no longer starts alive on the map.

### 🎮 Gameplay
- Movement remains instant.
- `/look`, `Придивитися`, and gathering now complete after a short delay instead of resolving instantly.
- Detailed look keeps the base location description and then adds details.
- Interaction buttons are shown when visible characters are present.

### 🛠 Technical
- `getAppVersion()` now prefers `package.json` over `APP_VERSION`, so Render does not need a hardcoded version env var.
- Added GitHub Actions release workflow for semver bumps, changelog updates and git tags.
- Added GitHub Actions CI workflow for build checks.

### 📝 Notes
- Animal “tracks/movement” are still based on static creature records for now. Full movement/tracking requires a later world-tick system.

---

## [0.2.1] - 12026-05-06

### 🐛 Fixed
- Movement messages and formatting.

---

## [0.2.0] - 12026-05-05

### ✨ Added
- Detailed `/look` system:
  - shows resources (berries, mushrooms, herbs)
  - shows nearby characters
- Resource gathering system:
  - chance-based (berries 1/4, mushrooms 1/3, herbs 1/5)
  - time cost displayed on buttons (seconds)
- Basic inventory support (PlayerResource)
- World events logging (WorldEvent)

### 🎮 Gameplay
- Movement is now instant (no tick cost)
- Actions (look, gather, say) consume time (ticks)
- “Look” now shows contextual details instead of repeating location description

### 👥 Social
- `/say` command (broadcast in location)
- Greeting interaction:
  - "Привітатися" button
  - response: "Ви сказали: «...»"
- Arrival/departure notifications:
  - “Хтось прийшов”
  - “Хтось пішов”

### 🌍 World
- First NPC: **Травник**
  - moves randomly
  - gathers herbs
  - speaks occasionally (frequency reduced)

### 🧠 UX / Text
- Switched to neutral form:
  - "Ви придивляєтесь"
- Location names bold
- Resources italicized
- "Поруч хтось є" shown in italics
- Movement feedback split:
  - "Ти рушив: ..." as separate message

### 🧮 Stats
- Player statistics:
  - steps
  - looks
  - says
  - gatherAttempts
  - successfulGathers
- World stats command `/world`

### 🛠 Technical
- HTML formatting instead of MarkdownV2 (fix Telegram parsing errors)
- Health check endpoint `/health`
- Status page with:
  - version
  - players count
  - NPC count
  - last event

### 🐛 Fixed
- Telegram MarkdownV2 crashes ('.', '-', etc.)
- Duplicate NPC spawning on seed
- Movement not showing new location
- Inventory typing errors in TypeScript
- Prisma schema mismatch issues

---

## [0.1.0] - 12026-05-04

### ✨ Added
- Initial Telegram bot using grammY
- Player creation via `/start`
- Basic `/me` command
- PostgreSQL + Prisma integration
- Deployment to Render

### 🌍 World
- Grid-based locations (3x3)
- Movement system (N/E/S/W)
- Regions and cell locations
- Location exits

### 🧠 Mechanics
- Skill-based (no levels)
- Core stats system:
  - Strength
  - Agility
  - Perception
  - Endurance
  - Instinct

### 🌱 Ecosystem (foundation)
- Creature species system
- Individual creature instances
- Resource nodes (berries, herbs, mushrooms)

### 🛠 Technical
- Prisma schema v7 migration
- Adapter-pg setup
- Seed script for world generation

---

## [0.0.x] - Early prototype

### ✨ Added
- Initial project idea: Telegram-based RPG
- Concept:
  - living ecosystem
  - no classes, only skills
  - open PvP
  - player-driven economy
- Naming:
  - **Chornolis Marches**
  - Ukrainian flavor + dark fantasy setting

---

# 🔮 Planned

- NPC AI expansion (state machines)
- Tracking system (animal traces)
- Combat system
- Inventory UI improvements
- Crafting (potions, traps)
- Reputation & factions
- Stealth mechanics
- Async world ticks / worker system
