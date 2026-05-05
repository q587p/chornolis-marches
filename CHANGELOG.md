# Changelog
All notable changes to this project will be documented in this file.

The format is loosely based on Keep a Changelog
and this project follows semantic-ish versioning.

---

## [0.2.0] - 2026-05-05

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

## [0.1.0] - 2026-05-04

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