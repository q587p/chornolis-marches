# Architecture + Performance Audit (12026-05-27)

## Scope

This audit reviews the currently largest runtime hotspots and proposes behavior-preserving improvements for speed and maintainability.

Analyzed areas:

- `src/services/worldTick.ts`
- `src/services/actionCompletions.ts`
- `src/handlers/status.ts`
- `src/services/locations.ts`
- `src/server/statusServer.ts`

## High-level architecture observations

1. **God-service concentration in simulation paths**
   - `worldTick.ts` combines scheduler, ecology simulation, resource regeneration, lisovyk logic, logging, and DB orchestration in one file (>1300 lines).
   - `actionCompletions.ts` mixes many unrelated completion flows (movement, gather, combat, speech, rest, inspect) in one file (>700 lines).

2. **DB-bound runtime**
   - Many hot paths perform repeated small Prisma queries/updates in loops.
   - Several operations can be grouped into batched writes or transaction blocks.

3. **Status/admin read paths are heavy**
   - `status.ts` is large and executes broad `findMany` + `include` queries; these are likely fine for small worlds but scale poorly as players/creatures/events grow.

## Slowest parts and why

## 1) World tick simulation (`src/services/worldTick.ts`) — highest impact

Why it is slow:

- Multiple full-graph `findMany(... include ...)` passes per tick over regions, locations, resources, creatures.
- N+1-style updates inside loops (`updateMany`/`create`/`findFirst` repeated per entity/resource).
- Tick-end event logging writes large text every tick (`World Tick` event), increasing DB I/O.

How to improve:

- **Split tick pipeline into stages with explicit I/O contracts**:
  - `loadTickSnapshot()` (single read phase)
  - `simulateTick(snapshot)` (pure/in-memory)
  - `persistTickDiff(diff)` (batched write phase)
- **Batch writes** for resource regen, aging, corpse decay, and queue cancels using grouped updates where filters allow.
- **Reduce tick event write volume** by making verbose event writing optional (e.g., every N ticks or debug-only).
- **Cache immutable lookup tables per process** (species caps/keys, resource type ids) and refresh only on explicit invalidation.

## 2) Action completion handler (`src/services/actionCompletions.ts`) — high impact

Why it is slow:

- Frequent actor reloads (`findUnique`) and sequential writes for each action path.
- Some flows call read → small write → read again where a single transaction or update-returning flow would be enough.

How to improve:

- **Dispatch map per action type**: isolate each action completion into its own module.
- **Per-action transaction wrappers** (`prisma.$transaction`) for tightly coupled read/write flows (move, gather, attack).
- **Shared actor prefetch** so one action path does not repeatedly re-fetch the same player/creature in the same completion cycle.

## 3) Location render path (`src/services/locations.ts`) — medium/high impact

Why it is slow:

- Location rendering performs multiple query rounds (location, actions, resources, tracks, viewer state), some serially.
- Includes fetch broad relation payloads that are not always required for every render variant.

How to improve:

- **Create query profiles**: `renderLocationLite` vs `renderLocationDetailed` with minimal `select` fields.
- **Parallelize independent reads** with `Promise.all` where safe.
- **Add short-lived in-memory cache** for static-ish location metadata (feature labels/exits) with invalidation on admin map edits.

## 4) Status/admin handlers (`src/handlers/status.ts`, `src/server/statusServer.ts`) — medium impact

Why it is slow:

- Large aggregated admin pages can load broad entity sets with nested includes.
- Formatting cost (large message/page building) grows linearly with entities.

How to improve:

- **Introduce repository-layer queries** with paginated/selected fields only.
- **Cursor pagination** for admin entity lists instead of loading everything first.
- **Memoize expensive computed summaries** for a short TTL where exact real-time precision is unnecessary.

## Architecture improvements (priority order)

### Priority A (first iteration, behavior-preserving)

1. Extract `worldTick` stages into separate modules under `src/services/worldTick/`:
   - `loadSnapshot.ts`
   - `simulate.ts`
   - `persist.ts`
   - keep `worldTick.ts` as orchestrator only.
2. Extract action completion handlers into `src/services/actionCompletions/handlers/*` and use a registry.
3. Add a small `src/services/perf/metrics.ts` with timing helpers and phase-level logs.

### Priority B (scalability)

4. Add targeted DB indexes for common filters/order keys used in tick and status flows.
5. Introduce bounded caches for read-heavy static tables (species/resource types/feature metadata).
6. Gate verbose `worldEvent` debug writes behind config flag.

### Priority C (longer-term)

7. Move heavy ecology simulation to queue worker process (BullMQ direction already aligned with technical context).
8. Keep Telegram bot process focused on command handling + response rendering.

## Concrete “first fixes” (low risk)

1. Add timing around world tick phases and top status pages.
2. Reduce repeated `findUnique` actor lookups inside one action completion.
3. Replace per-item updates in obvious loops with grouped writes where predicates match.
4. Limit or batch `World Tick` summary event inserts.

## Suggested measurable targets

- p95 world tick runtime under 500ms on baseline dev dataset.
- p95 `/status` and `/all` admin page generation under 300ms.
- Reduce DB query count per tick by at least 30% before functional refactors.

## Notes

- Recommendations are behavior-preserving and aligned with current Chornolis simulation direction.
- Prioritize extraction + observability first, then optimization; this keeps risk low while improving speed.
