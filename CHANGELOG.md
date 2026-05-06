# Changelog
All notable changes to this project will be documented in this file.
The format is loosely based on Keep a Changelog and this project follows semantic-ish versioning.

---

## [Unreleased]

---

## 0.4.7 - creature control and debug status UX - 12026-05-06

### ✨ Added

- Added `/addCreature <speciesKey> <locationKey|x,y,z> [count] [name]` debug command.
  - Examples:
    - `/addCreature rabbit center_chornolis_edge 3`
    - `/addCreature wolf -1,-1,0`
    - `/addCreature fox west_fox_path 2`
- Added a minimal persistent Telegram keyboard with `/start` and `/me`.
- `/world`, `/health`, and the status page now expose the latest 10 world events instead of only one latest event.
- Region broadcasts can now optionally re-send the current location view with movement buttons after the broadcast.

### 🐛 Fixed

- `/cleanupCreatures` now removes all animals and leaves only canonical unique NPCs:
  - one `Травник`;
  - one `Дід Чорноліс`.
- Seed no longer spawns rabbits, mice, foxes or wolves on every deploy/seed run.
- Repeated `npm run seed` no longer repopulates animals by accident.
- World tick debug logging now supports both `WORLD_DEBUG=true` and the older `WORLD_TICK_DEBUG=true`.

### 🎮 Gameplay

- Animals are now test-controlled through `/addCreature` until reproduction, migration and danger-pressure mechanics are implemented later.
- World tick broadcasts now include a short hint for `/start` and `/me`, and restore location buttons for players in the region.

### 🛠 Technical

- `getStatusData()` now returns `latestEvents` while keeping `latestEvent` for compatibility.
- Status server renders recent events as a short HTML list and exposes them in `/health`.
- Seed remains responsible for world structure, resources, species and unique NPCs only.

---

## 0.4.6 - creature cleanup and unique NPC normalization - 12026-05-06

### ✨ Added

- Added `/cleanupCreatures` debug/admin command:
  - keeps one canonical `Травник`.
  - keeps one canonical `Дід Чорноліс`.
  - removes duplicate named NPC rows.
  - removes dead/inactive creature rows that are not the canonical sleeping Lisovyk.
  - writes a `Creature cleanup` system event.

### 🐛 Fixed

- `/all` now shows only living creatures by default, so it matches `/world` more closely.
- Added `/all dead` for full debug output including inactive/dead creature records.
- Fixed repeated `Травник` spawning after repeated seed runs when the existing herbalist had moved away from his original location.
- Fixed seed behavior for unique named NPCs by checking for them globally by species + name instead of by starting location.
- Reduced accumulation of duplicate `Дід Чорноліс` records.

### 🎮 Gameplay

- `Травник` is now treated as one moving NPC, not as a spawn slot in one fixed cell.
- `Дід Чорноліс` remains a single guardian instance that sleeps, wakes when resources are depleted, and can sleep again after recovery.

---

## 0.4.5 - tick commands, resource regeneration, Lisovyk recovery - 12026-05-06

### ✨ Added

- Manual world tick debug commands:
  - `/tick` runs one world tick immediately.
  - `/tickGet` shows the current world tick interval and tick counter.
  - `/tickSet <ms>` changes the world tick interval at runtime without restarting the server.
- Slow resource regeneration:
  - resources recover by a small amount every configured number of ticks.
  - defaults: every 10 ticks, +1 per resource node.
- Lisovyk recovery state:
  - when the resource that woke Дід Чорноліс returns anywhere in the region, he stops hunting, hides where he is and becomes inactive again.
  - the recovery is written to `WorldEvent` and broadcast to players in the region.

### 🐛 Fixed

- Prevented repeated spam broadcasts for the same Lisovyk awakening condition.
- Lisovyk awakening now sends the “resource depleted” broadcast only once while he is already awake.

### 🎮 Gameplay

- The world now has a basic depletion → guardian awakening → resource recovery → guardian sleep loop.
- Periodic tick messages include resource regeneration counts.

### 🛠 Technical

- World tick loop can now restart its interval timer in-process after `/tickSet`.
- Tick diagnostics are still integrated with `WorldEvent`, so `/world` and the status page can see the latest tick result.

---

## 0.4.4 - Region-wide ecosystem logic - 12026-05-06

### ✨ Added

- Region-wide ecosystem logic:
  - Lisovyk now awakens only when a resource is depleted across the entire region (not a single location).
- System `WorldEvent` entries for each tick (visible in `/world` and status page).
- Periodic world notifications to players:
  - "Світ ворухнувся" every few ticks.
- Lisovyk awakening now broadcasts to the entire region.

---

## 0.4.3 - chore: finalize husky setup - 12026-05-06

---

## 0.4.2 - fix: Github Action release workflow - 12026-05-06

---

## 0.4.1 - world tick debug overlay - 12026-05-06

### Added

- Added optional world tick debug heartbeat:
  - `WORLD_TICK_DEBUG=true` prints start/done tick logs to console.
  - `WORLD_TICK_DEBUG_EVENT=true` writes a `SYSTEM` world event with tick stats.
- Added per-tick counters for processed creatures, movement, gathering, looking/idling, Lisovyk awakening and per-creature errors.

### Changed

- World tick internals now collect action statistics while preserving existing autonomous behavior.
- Re-entrant ticks now log a debug skip message when `WORLD_TICK_DEBUG=true`.

---

## 0.4.0 - world tick - 12026-05-06

### Added

- Added basic async world tick service in `src/services/worldTick.ts`.
- World tick now periodically updates living creatures without requiring player actions.
- Animals now perform simple autonomous behavior:
  - herbivores move toward food or wander;
  - carnivores follow nearby herbivores or patrol.
- Herbalist now autonomously gathers herbs and moves toward nearby herb sources.
- Lisovyk awakening is now handled by world tick when any resource node is depleted.
- Added `WORLD_TICK_INTERVAL_MS` env override for tick frequency.
- Added `WORLD_TICK_CREATURE_LIMIT` env override to cap processed creatures per tick.

### Changed

- `src/bot.ts` now starts the world tick loop during bot startup.
- The first world tick implementation is intentionally non-lethal: predators track prey but do not kill yet, to keep the MVP world stable.

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
