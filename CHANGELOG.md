---
## [Unreleased]
# Changelog
All notable changes to this project will be documented in this file.
The format is loosely based on Keep a Changelog and this project follows semantic-ish versioning.
---

## 0.7.2 - stamina/rest queue UX fixes - 12026-05-18

### 🐛 Fixed

- Player actions now execute immediately while stamina is non-negative and there is no active player queue.
- Once stamina drops below zero, subsequent player actions are added to the queue and use `stamina cost × 13 seconds` duration.
- Normal queue order is FIFO again: priorities can interrupt actions, but they no longer reorder planned movement routes.
- Empty `/queue` output now shows only `Черга дій порожня.` without inline queue/rest buttons.
- Queue controls no longer include `📋 Черга` or `🛌 Відпочити`; rest remains available from the persistent reply keyboard and tired-state prompts.
- Queue feedback is now sent as a separate message below the location instead of replacing the location message.
- Rest button behavior was revised:
  - if there is no active queue, it starts active rest without queue buttons;
  - if a queue exists, the player is asked whether to cancel it and rest now or add rest to the end of the queue;
  - while resting, queued actions render as `Відпочиваєте` followed by `Потім ...`.
- NPCs and animals can now decide to rest when tired; the chance grows as they approach `Дуже втомлений`.
- Herbivores in dangerous locations can ignore fatigue and keep moving, risking HP loss from exhaustion.
- Auto mode now uses the same stamina rule: immediate actions while stamina is non-negative, queued actions when tired.
- The location movement keyboard is more compact: `Придивитися` sits between `Захід` and `Схід`.

### 🎮 Gameplay / UX

- Positive stamina now means quick, immediate actions instead of forcing everything through a delayed queue.
- Tiredness remains meaningful: after stamina drops below zero, the player starts planning slower queued actions until they recover.
- Rest is clearer and less noisy: the persistent `🛌 Відпочити` button is the main rest entry point, while fatigue warnings can suggest rest contextually.
- Planned routes are stable again: movement is appended to the end of the plan instead of jumping to the front because of priority.

### 🛠 Technical

- No new Prisma migration is required beyond the existing 0.7.1 stamina/rest and track migrations.
- Priority remains available for interruption logic, but normal queue ordering is FIFO.
- Auto mode uses the same stamina/action flow as manual player input.
- Immediate actions no longer race with the queue loop, preventing one click from completing movement/look twice.
- `renderPlayerActionQueue()` now uses real newlines instead of a visible `\n` sequence.
- `queue:clear` now cancels both waiting and currently running interruptible actions.
- Queue completion re-checks the latest DB status before applying effects, so recently cancelled actions do not still complete.
- `Придивитися` edits the current location message when possible instead of always creating a new location card.
- Resource and target submenus now include `↩️ Назад` to return to the location details.
- The `Поруч:` list now shows visible current actions for nearby players, NPCs and animals.

### 📝 Notes

- This release supersedes the previous 0.7.1 fix3 archive and should be applied on top of committed 0.7.1.

---

## 0.7.1 - stamina, rest, priorities and tracks - 12026-05-18


### ✨ Added

- Added base stamina model for players and creatures:
  - `stamina` defaults to `13`;
  - `staminaMax` defaults to `13`;
  - `FatigueState`: `RESTED`, `TIRED`, `VERY_TIRED`;
  - `isResting` for players;
  - `lastStaminaRegenAt` for timed recovery.
- Added action costs based on stamina:
  - movement: `1`;
  - look/inspect/track: `3`;
  - gather/freshen/set trap: `5`;
  - attack: `7`;
  - say/greet/eat: `1`.
- Action duration is now calculated as `stamina cost × 13 seconds`.
- Added active and passive stamina recovery:
  - idle recovery: `+1` stamina per minute;
  - resting recovery: `+13` stamina per minute;
  - recovery stops at current `staminaMax`.
- Added `/rest`, `🛌 Відпочити`, and `rest:start` action button.
- Added rest interruption flow:
  - while resting, the first new action asks whether to interrupt rest or queue the action after rest;
  - later queued actions append normally.
- Added `priority`, `interruptible` and `note` fields to `WorldAction`.
- Added `WorldTrack` records for movement traces with actor, direction, strength and expiration time.
- Added text queue controls:
  - `/queue clear`;
  - `/queue cancel`.
- Added first queued carnivore attacks against herbivore prey.

### 🎮 Gameplay / UX

- Everyone starts from a simple baseline: 13 stamina and the `Відпочивший` state.
- Spending stamina below zero moves the actor into `Втомлений` state and sends a warning message for players.
- Reaching `-39` stamina moves the actor into `Дуже втомлений`; further actions start draining HP until the actor recovers above the threshold.
- Recovery sends state messages:
  - partial recovery from very tired;
  - recovery to zero stamina;
  - full rest at maximum stamina.
- `/me` and target inspection now show stamina as `current/max` and a readable fatigue/rest state.
- `/rest` cancels current/waiting player actions and starts active recovery.
- Movement, gathering, look, inspect, greet, say, attack, track and freshen now spend stamina through the same queue layer.
- Urgent actions such as attacks can still jump ahead of slow plans.
- Movement creates fading traces that can be found by queued tracking.
- `/track` reports recent traces in the current location when available.
- Carnivores can queue attacks against prey instead of only “looking” at it.

### 🛠 Technical

- Added migration `20260518070100_action_queue_priorities_tracks`.
- Added migration `20260518071100_stamina_rest_states`.
- Queue processing now pauses player queued actions while the player is resting.
- Queue processing also handles timed stamina recovery for idle/resting players and idle creatures.
- Existing 0.7.0 action queue migration remains unchanged; 0.7.1 is a follow-up release.

### 📝 Notes

- This is still not a full combat system. Creature attacks use a simple debug damage flow.
- `staminaMax` is intentionally stored now so future housing, campfire, skills, traits or environment bonuses can modify it.
- Track interpretation is intentionally minimal for now; richer scents, footprints, freshness and stealth can build on `WorldTrack`.


---

## 0.7.0 - universal delayed action queue - 12026-05-16

### ✨ Added

- Added persistent universal world action queue stored in PostgreSQL via new `WorldAction` model.
- Added Prisma enums:
  - `WorldActorType`;
  - `WorldActionType`;
  - `WorldActionStatus`.
- `WorldAction` supports both actor kinds:
  - players;
  - creatures, including animals and NPCs.
- Added action queue service:
  - starts queued actions;
  - completes due actions;
  - validates action state at execution time;
  - survives bot restarts/deploys because actions are no longer only in memory.
- Added `/queue` command for showing the current player action plan.
- Added inline queue controls:
  - `📋 Черга`;
  - `✋ Скасувати поточну`;
  - `🧹 Очистити чергу`.

### 🎮 Gameplay / UX

- Movement is no longer instant for players.
- Pressing a direction button now adds movement to the player's action queue.
- Repeated movement presses build a route-like plan, e.g. north → east → south.
- Gathering also goes through the same queue, so players can mix movement and gathering in one plan.
- Player actions now queued:
  - movement;
  - gathering;
  - `/look` / `Придивитися`;
  - target inspection;
  - greeting;
  - attack;
  - corpse freshening;
  - `/say`;
  - tracking placeholder.
- NPCs and animals now use the same queue for world tick actions:
  - movement;
  - gathering;
  - eating;
  - looking/tracking behavior;
  - speaking;
  - resting/waiting.
- Lisovyk awakening/sleeping remains an immediate systemic state transition, but active Lisovyk behavior after awakening is now queued:
  - moving through the forest;
  - looking/listening;
  - future hunting behavior.
- World tick now plans creature actions instead of instantly moving or gathering with creatures.
- Movement notifications and location changes happen when the movement action finishes, not when the action is planned.
- Gathering and social actions check the current location, target and resource availability at completion time, so stale queued actions can fail naturally if the world changed.

### 🛠 Technical

- Added `src/services/actionQueue.ts` as the central queue processor for players and creatures.
- Added `src/handlers/actionQueue.ts` for `/queue` and queue control callbacks.
- Updated `src/handlers/movement.ts` to enqueue movement instead of directly changing `currentLocationId`.
- Updated `src/handlers/gather.ts` to enqueue gathering instead of using memory-only `runDelayed()`.
- Updated `src/handlers/look.ts`, `src/handlers/social.ts` and `src/handlers/say.ts` to enqueue active player actions.
- Updated `src/services/worldTick.ts` so animal/NPC behavior queues `WorldAction` records instead of applying movement/gather/eat instantly.
- Updated Lisovyk tick behavior to queue either `MOVE` with `нишпорить між деревами` or `LOOK` with `полює й дослухається до лісу`, while keeping wake/sleep transitions immediate.
- Added action queue gameplay constants:
  - `DEFAULT_ACTION_DURATION_MS = 13_000`;
  - `ACTION_QUEUE_POLL_MS = 1_000`;
  - `MIN_ACTION_DURATION_MS = 1_000`;
  - `MAX_QUEUED_ACTIONS_PER_ACTOR = 12`;
  - per-action durations in `actionDurationConfig`.
- `startActionQueueLoop(bot)` now starts beside the world tick loop in `src/bot.ts`.

### 📝 Notes

- This release intentionally keeps combat simple: queued attack still uses the current debug animal-kill behavior.
- Predator hunting can later become queued `ATTACK`/`EAT` behavior without changing the overall queue architecture.
- Future crafting, traps, resting effects, gathering professions and travel skills should reuse `WorldAction`.

---

## 0.6.2 - compound Ukrainian names grammar - 12026-05-16

### ✨ Added

- `guessNameForms()` now declines every word in a Cyrillic compound name instead of changing only the last word.
- Added support for hyphenated name parts by declining each hyphen-separated piece.
- Added a small indeclinable-parts list for particles such as:
  - `де`;
  - `фон`;
  - `ван`;
  - `аль`;
  - `ібн`;
  - `огли`.

### 🎮 Gameplay / UX

- Suggested onboarding forms are better for names like:
  - `Дід Чорноліс` → `Діда Чорноліса`;
  - `Сірий Вовк` → `Сірого Вовка`;
  - `Трегол Син Туману` → `Трегола Сина Туману`;
  - `Око-Буревій` → `Ока-Буревія`.
- Character name length limit increased from 32 to 64 characters for two- and three-word names.

### 🛠 Technical

- No Prisma migration required.
- Stored full-case forms remain the source of truth after onboarding confirmation.

---

## 0.6.1 - restart onboarding reset command - 12026-05-16

### ✨ Added

- Added `/restart` debug/admin command for resetting the current player character.
- `/restart` removes the current player's inventory/resources and then deletes the player row.
- After `/restart`, `/start` begins the 0.6.0 onboarding flow again from the beginning.

### 🛠 Technical

- Exported `stopPlayerAuto()` from `src/handlers/auto.ts` so reset can stop in-memory auto mode before deleting the character.
- Added a `SYSTEM` world event when a player reset is performed.
- No Prisma migration is needed.

### 📝 Notes

- `/restart` resets only the current Telegram user's own character. It does not delete other players.

---

## 0.6.0 - Ukrainian grammar and character onboarding - 12026-05-14

### ✨ Added

- Added first-login character onboarding for new players:
  - pronoun selection: `Він`, `Вона`, `Вони`;
  - character name validation;
  - Cyrillic/Latin-only name policy without mixed alphabets;
  - Unicode NFKC normalization and invisible/bidi character stripping;
  - Ukrainian case confirmation for Cyrillic names.
- Added player name forms:
  - nominative;
  - genitive;
  - dative;
  - accusative;
  - instrumental;
  - locative;
  - vocative.
- Added grammar fields for creature species and unique named creatures.
- Added `src/services/grammar.ts` as a reusable Ukrainian grammar layer for names, forms, animacy and simple fallback declension.
- Added Prisma enums:
  - `GrammaticalGender`;
  - `Animacy`;
  - `PlayerPronoun`.
- Added migration `20260511060000_ukrainian_grammar_onboarding`.

### 🎮 Gameplay / UX

- Social/combat text can now use correct Ukrainian cases:
  - `Ви сказали Травнику`;
  - `Ви атакували зайця`;
  - `Ви придивляєтесь до вовка`;
  - `Ви освіжували труп зайця`.
- Existing players are marked as onboarded during migration so deployment does not lock old accounts behind the new flow.
- New players must complete onboarding before entering the world.

### 🛠 Technical

- Creature species now store canonical Ukrainian forms seeded for:
  - заєць;
  - миша;
  - лисиця;
  - вовк;
  - лісовик;
  - травник.
- Unique NPCs can override species forms, e.g. `Дід Чорноліс` and `Травник`.

### 📝 Notes

- This is a foundation for fuller localization, not a complete Ukrainian morphology engine.
- Manual forms remain the source of truth for NPCs, monsters, fantasy names and future quest entities.

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