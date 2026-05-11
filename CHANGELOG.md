# Changelog
All notable changes to this project will be documented in this file.
The format is loosely based on Keep a Changelog and this project follows semantic-ish versioning.

---

## [Unreleased]

---

## 0.5.3 - corpse inspection, greetings and stats UX - 12026-05-11

### ✨ Added

- Corpses can now be inspected as targets after an animal is killed.
- Fresh corpses show an `Освіжувати` action while enough decay time remains.
- `/me` now shows player statistics:
  - steps;
  - looks;
  - sayings;
  - greetings;
  - gather attempts and success rate;
  - gathered berries/mushrooms/herbs;
  - killed animals.
- Inspecting another player now shows the same statistics.

### 🐛 Fixed

- Inspecting a corpse no longer says that the target is gone while the corpse still exists.
- `/news` now shows only the latest five news entries instead of the full history.

### 🛠 Technical

- Greeting actions continue to notify other players in the same location.
- Greeting actions continue to write `GREET` world events.

---

## 0.5.2 - debug hunting and expanded stats - 12026-05-11

### ✨ Added

- Added temporary debug attack system for animals.
- Attacking an animal now:
  - kills it instantly;
  - creates a corpse;
  - starts corpse decay lifecycle.
- Added expanded player statistics:
  - `animalsKilled`
  - `berriesGathered`
  - `mushroomsGathered`
  - `herbsGathered`

### 🎮 Gameplay

- `⚔️ Атакувати` now works on animals instead of showing a placeholder message.
- Corpses produced by attacks integrate into the existing aging/corpse lifecycle system.

### 🛠 Technical

- Updated social interaction handler for creature combat debug flow.
- Extended Prisma Player schema with gathering/hunting counters.

---

## 0.5.1 - creature debug helpers and safer addCreature - 12026-05-11

### ✨ Added

- Added `/forceOld [speciesKey] [count]` debug command to force selected animals in the current location into old age for testing aging, old-age death and corpse decay.
- Extended `/addCreature` to accept either `locationKey` or `x,y,z` coordinates.
- Extended `/addCreature` with optional age: `YOUNG`, `ADULT` or `OLD`.
- `/addCreatureHelp` now shows species lifecycle parameters.

### 🐛 Fixed

- Restored admin/status commands from 0.4.x after the aging patch.
- Fixed `/addCreature` diagnostics for unknown species and locations.
- Removed the invalid `maxHp` write from `/addCreature` so the command matches the current Prisma schema.

### 🧪 Testing

- Added a quicker manual way to verify non-zero old-age deaths and corpse decay counters by spawning old animals and running `/tick`.

---

## 0.5.0 - aging and corpse lifecycle - 12026-05-06

### ✨ Added

- Added animal aging to the world tick loop.
- Added lifecycle profile fields to `CreatureSpecies`:
  - child/young/adult/old duration in ticks;
  - old-age death chance and growth;
  - corpse decay duration;
  - mushroom bonus after decay.
- Added lifecycle fields to `Creature`:
  - `ageTicks`;
  - `diedAtTick`;
  - `corpseDecayTicksLeft`;
  - `isGone`.
- Aging currently uses the existing `CreatureAge` stages: `YOUNG`, `ADULT`, `OLD`; corpse state is represented by `isAlive`, `isGone`, `diedAtTick` and `corpseDecayTicksLeft`.
- Added visible animal corpses to location details.
- Added mushroom growth after corpse decay.
- `/world` and status data now show animal corpse and gone-animal counts.
- `/all dead` now shows age, age ticks, corpse state, and decay counter.

### 🎮 Gameplay

- Player and NPC time is still effectively stopped for aging purposes.
- Animals now age every world tick.
- Old animals have a growing chance to die from old age.
- Dead animals remain as corpses for several ticks before disappearing.
- Corpse decay feeds the forest by increasing mushrooms in the same location.
- Existing movement, herbalist behavior, resource regeneration, Lisovyk awakening/recovery and debug tick commands are preserved from 0.4.x.

### 🛠 Technical

- The 0.5.0 patch is based on 0.4.12 and keeps the 0.4.x `worldTick.ts` changes:
  - `notifyLocation` / `notifyRegion`;
  - `buildTargetListKeyboard` / `buildTrackKeyboard`;
  - `WORLD_DEBUG` / `WORLD_TICK_DEBUG`;
  - `HERBALIST_SPEAK_CHANCE` and herbalist phrases;
  - directional entry text;
  - manual `/tick`, `/tickGet`, `/tickSet` commands.
- Seed now updates lifecycle profile values for animal species but still does not spawn animals automatically.

### 📝 Notes

- Reproduction is intentionally not included in 0.5.0.
- Predator hunting priority by old/weak prey is planned for a later version.
- Full track freshness system is still planned separately.

---

## 0.4.12 - latest 0.4.x baseline - 12026-05-06

### 🛠 Technical

- 0.5.0 was prepared on top of this version.
- See Git history for detailed 0.4.9–0.4.12 changes.

---

## 0.4.8 - player auto mode and cleaner Telegram menu - 12026-05-06

### ✨ Added

- Added `/location` / `/loc` command and the persistent `📍 Локація` button.
- Added persistent `Персонаж` button for `/me`.
- Added `/auto` and `/autoStop` (`/autostop`) player auto mode.

### 🐛 Fixed

- Removed `/start` from the persistent keyboard.
- Removed quick-access command hints from deploy/world tick broadcasts.
- Broadcasts now keep the persistent keyboard attached so location/player buttons remain available.
- Animal movement notifications now use “щось” instead of “хтось”.
- Animal presence is visible in location descriptions as `Поруч щось є`.
- Locations with animals show only `Оглянути` and `Атакувати` interaction buttons, without greeting.

---

## 0.4.7 - creature control and debug status UX - 12026-05-06

### ✨ Added

- Added `/addCreature <speciesKey> <locationKey|x,y,z> [count]` debug command.
- Added a minimal persistent Telegram keyboard.
- `/world`, `/health`, and the status page expose latest world events.

### 🐛 Fixed

- `/cleanupCreatures` removes all animals and leaves only canonical unique NPCs.
- Seed no longer spawns animals on every deploy/seed run.

---

## 0.4.0 - world tick - 12026-05-06

### Added

- Added basic async world tick service.
- World tick periodically updates living creatures without requiring player actions.
- Herbalist autonomously gathers herbs and moves toward nearby herb sources.
- Lisovyk awakening is handled by world tick when resources are depleted.

---

## 0.3.0 - bot.ts refactor - 12026-05-06

### Changed

- Split large `src/bot.ts` into focused modules.
- Kept `src/bot.ts` as app composition/startup file.

---

## [0.2.0] - 12026-05-05

### ✨ Added

- Detailed `/look` system.
- Resource gathering system.
- Basic inventory support.
- World events logging.

---

## [0.1.0] - 12026-05-04

### ✨ Added

- Initial Telegram bot using grammY.
- Player creation via `/start`.
- PostgreSQL + Prisma integration.
- Deployment to Render.

---

## [0.0.x] - Early prototype

### ✨ Added

- Initial project idea: Telegram-based RPG.
- Naming: **Chornolis Marches**.
