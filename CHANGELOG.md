---
## [Unreleased]
# Changelog
All notable changes to this project will be documented in this file.
The format is loosely based on Keep a Changelog and this project follows semantic-ish versioning.
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

> Existing 0.6.x and older changelog entries should remain below this section.
