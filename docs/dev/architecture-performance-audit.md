# Architecture + Performance Audit (12026-05-27)

## Scope

This audit reviews the currently largest runtime hotspots and proposes behavior-preserving improvements for speed and maintainability.

Analyzed areas:

- `src/services/worldTick.ts`
- `src/services/actionCompletions.ts`
- `src/handlers/status.ts`
- `src/services/locations.ts`
- `src/server/statusServer.ts`

## High-Level Architecture Observations

1. **God-service concentration in simulation paths**
   - `worldTick.ts` combines scheduler, ecology simulation, resource regeneration, lisovyk logic, logging, and DB orchestration in one file.
   - `actionCompletions.ts` mixes movement, gather, combat, speech, rest, inspect and other completion flows in one file.

2. **DB-bound runtime**
   - Many hot paths perform repeated small Prisma queries and updates in loops.
   - Several operations can be grouped into batched reads/writes or transaction blocks.

3. **Status/admin read paths are heavy**
   - `status.ts` executes broad `findMany` and nested include queries that scale poorly as players, creatures and events grow.

## Slowest Parts And Why

## 1) World Tick Simulation

Why it is slow:

- Multiple full-graph `findMany(... include ...)` passes per tick over regions, locations, resources and creatures.
- N+1-style updates inside loops.
- Tick-end event logging writes large text every tick, increasing DB I/O.

How to improve:

- Split tick pipeline into stages with explicit I/O contracts:
  - `loadTickSnapshot()`
  - `simulateTick(snapshot)`
  - `persistTickDiff(diff)`
- Batch writes for resource regen, aging, corpse decay and queue cancels where filters allow.
- Reduce tick event write volume by making verbose event writing optional or less frequent.
- Cache immutable lookup tables per process and refresh only on explicit invalidation.

## 2) Action Completion Handler

Why it is slow:

- Frequent actor reloads and sequential writes for each action path.
- Some flows call read, small write, then read again where a transaction or prefetch would be enough.

How to improve:

- Use a dispatch map per action type and isolate completion handlers into separate modules.
- Add per-action transaction wrappers for tightly coupled read/write flows.
- Use shared actor prefetch so one action path does not repeatedly re-fetch the same actor.

## 3) Location Render Path

Why it is slow:

- Location rendering performs multiple query rounds for location data, actions, resources, tracks and viewer state.
- Includes fetch broad relation payloads that are not always required.

How to improve:

- Create query profiles: `renderLocationLite` vs `renderLocationDetailed`.
- Parallelize independent reads with `Promise.all` where safe.
- Add a short-lived in-memory cache for static-ish location metadata.

## 4) Status/Admin Handlers

Why it is slow:

- Large aggregated admin pages load broad entity sets with nested includes.
- Formatting cost grows linearly with entities.

How to improve:

- Introduce repository-layer queries with paginated/selected fields only.
- Use cursor pagination for admin entity lists.
- Memoize expensive computed summaries for a short TTL where exact real-time precision is unnecessary.

## Concrete First Fixes

1. Add timing around world tick phases and top status pages.
2. Reduce repeated actor/action lookups inside hot loops.
3. Replace per-item updates in obvious loops with grouped writes where predicates match.
4. Limit or batch `World Tick` summary event inserts.

## 0.12.3 First Pass

- `recoverStamina()` now preloads active player and creature action ids once per recovery cycle instead of counting active actions per actor.
- Creature recovery refreshes `lastStaminaRegenAt` with one grouped update for busy creatures.
- `worldTick()` now preloads active creature ids and only performs heavy creature/location/resource includes for idle, non-sleeping creatures that can actually receive a new action.
- Added targeted `WorldAction` indexes for actor-specific due-action polling and queued-action startup.

## Suggested Measurable Targets

- p95 world tick runtime under 500 ms on the baseline dev dataset.
- p95 `/status` and `/all` admin page generation under 300 ms.
- Reduce DB query count per tick by at least 30% before functional refactors.
