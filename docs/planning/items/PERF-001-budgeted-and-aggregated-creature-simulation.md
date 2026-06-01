---
id: PERF-001
title: Runtime performance plan and creature simulation budget
status: next
type: technical
area: performance
priority: high
tags:
  - performance
  - ecology
  - creatures
  - action-queue
  - simulation
  - status
  - auto
depends_on:
  - ECO-001
exports:
  github_issue: true
---

# PERF-001: Runtime performance plan and creature simulation budget

## Goal

Keep the world feeling alive and responsive as entity counts grow, without making every animal think and enqueue an individual action every world tick or making admin/status pages load whole tables for each click.

The current creature model is easy to reason about, but it does not scale well: each living animal can become its own action-queue actor. As animal populations grow, creature backlog can delay player-visible actions even when player quick actions are configured correctly.

Recent playtesting after herbivore reproduction points to a sharper bottleneck: the visible slowdown appears to come from a mass of creature `RUNNING` actions after population growth, not from the player queue itself. Treat this as a high-priority follow-up before adding larger ecology loops that create still more animals.

The broader performance audit also identifies the project as DB-bound in runtime hotspots: repeated small Prisma calls in loops, broad `findMany(...include...)` reads, and large mixed-responsibility services that make I/O boundaries hard to control.

## Why it fits

Chornolis should support a living ecology on a larger map. That requires cheaper background simulation and clearer priority for player-facing interactions.

The system should preserve individual creatures where they matter:

- visible animals near players;
- named NPCs, spirits and monsters;
- predators making attacks;
- creatures with recent combat, tracks or unusual state;
- debug/admin inspection cases.

For ordinary background animals, aggregated movement and ecology are enough.

## Known bottlenecks

- `src/services/worldTick.ts` is still a god-service: scheduler, ecology, regeneration, creature behavior, lisovyk behavior, logging and DB orchestration live together. Every new tick feature risks adding more SQL work unless the tick gets explicit load/simulate/persist boundaries.
- Action lifecycle has improved creature completion concurrency, but player running actions and queued-action startup still need a focused pass: avoid serial completion waves and reduce repeated passes over queued/running/resting actors.
- `src/handlers/auto.ts` currently uses per-player timers for auto mode. This is acceptable for tiny online counts, but scales into many callbacks, uneven event-loop pressure and harder DB backpressure.
- Status/admin paths were a first visible pain point. The 0.12.5 line added narrow selects, status timing logs and DB-level `/all` pagination, but the remaining status pages should keep moving toward select profiles and database pagination instead of broad reads.
- Verbose `worldEvent` writes can add steady DB I/O. Keep full debug detail available on demand, but avoid writing heavy summaries every tick by default.
- Contribution/history tables should be audited for query-specific indexes before they become large. `CarcassDropoffContribution` currently has the compound index `@@index([dropoffFeatureKey, contributorKind, playerId])`; when player-centric contribution history, rewards or admin views become common, add a separate `@@index([playerId])` or a more specific player-query index instead of relying on the compound drop-off index.

## Priority plan

### P0: measurement and narrow hot-path fixes

- Add phase timing around world ticks and action lifecycle: load/simulate/persist/notify, due completions, queued starts and notification delivery.
- Keep status timing logs for heavy status pages and expand them only where they help diagnose production latency.
- Track p50/p95 and, when practical, query counts for tick/action/status paths.
- Keep player action completion on bounded concurrency where actor ordering remains safe.
- Reduce verbose worldEvent writes with summary-every-N-ticks and full-debug-on-demand modes.

### P1: scale the biggest runtime surfaces

- Continue moving admin/status pages to narrow `select` profiles and DB-level pagination.
- Add a lightweight Prisma index audit for high-growth tables such as contributions, world events, action history and resource/inventory rows; include `CarcassDropoffContribution.playerId` once player-centric lookups matter.
- Replace per-player auto timers with one heartbeat scheduler that batches eligible auto characters and applies backpressure.
- Refactor queued-action startup so it does fewer broad passes and avoids one-by-one startup work where batchable.
- Add a per-world-tick creature processing budget, so only a bounded number of individual creatures can think in one tick.
- Prioritize individual processing for:
  - creatures in locations with players;
  - named or non-animal creatures;
  - predators with local prey;
  - creatures with overdue/running/queued actions;
  - recently attacked or otherwise important locations.

### P2: stage the simulation

- Split tick pipeline into behavior-preserving stages with explicit I/O contracts:
  - `loadTickSnapshot()`
  - `simulateTick(snapshot)`
  - `persistTickDiff(diff)`
- Move ordinary background animals toward aggregate updates by location/species/diet instead of individual `WorldAction` records where possible.
- Keep reproduction, overgrazing, aging and spread mostly aggregate-friendly.
- Add counters to world tick summaries for skipped/deferred creature processing and aggregate updates.

## First creature-simulation scope

- Add a per-world-tick creature processing budget, so only a bounded number of individual creatures can think in one tick.
- Prioritize individual processing for:
  - creatures in locations with players;
  - named or non-animal creatures;
  - predators with local prey;
  - creatures with overdue/running/queued actions;
  - recently attacked or otherwise important locations.
- For non-prioritized animals, use aggregate updates by location/species/diet instead of individual `WorldAction` records where possible.
- Keep reproduction, overgrazing, aging and spread mostly aggregate-friendly.
- Add counters to world tick summaries for skipped/deferred creature processing and aggregate updates.

## Possible mechanics

### Creature budget

Each world tick processes at most N individual background animals, with priority ordering. Unprocessed animals are not broken; they simply wait for a later tick or are covered by aggregate ecology rules.

### Location/species aggregates

For common herbivores, calculate pressure by `locationId + speciesKey` or broader groups such as herbivore/carnivore. Use those counts for grazing, spread and risk instead of creating many individual movement/eat/look actions.

### Player-visible promotion

When a player enters a location, nearby animals can be promoted back into individual behavior for a short window, so local observation still feels concrete.

### Action queue boundary

Avoid creating routine creature `WorldAction` rows for background movement, grazing or idle looking. Reserve queued actions for events that players can notice, combat, special NPC behavior or debug-visible state.

Investigate why large post-reproduction populations leave many creature actions in `RUNNING`, and either cap, aggregate, expire, coalesce or avoid those routine actions so they cannot build a persistent running tail.

## Recently completed first passes

- 0.12.3 reduced repeated stamina/action checks and added targeted `WorldAction` indexes.
- 0.12.5 added optional status performance timing, narrowed heavy status selects, added DB-level pagination for `/all`, and made due player-action completion use bounded concurrency.
- 0.14.18 adds the first per-world-tick creature processing budget. The tick now loads lightweight creature candidates, protects player-visible locations, non-animal NPCs and predators first, then fetches heavy location/resource data only for selected creatures. Tick system events and scribe/admin stats expose candidate, processed, deferred and protected counts.

## Remaining follow-up after 0.14.18

- Tune `WORLD_CREATURE_TICK_BUDGET` against production-sized worlds.
- At high populations, ordinary background herbivores may move/eat less often because they are deferred behind protected actors. This is expected for the first budget slice; watch `creatureDeferred` and local ecology outcomes rather than treating every deferral as a bug.
- Protected creature count can exceed the configured budget. This is intentional for UX and important actors, but if a player-visible location contains a very large animal crowd, the budget will not fully shield tick/action latency. Use that as a signal for crowd handling, aggregate local summaries or ecology pressure, not only for raising the global budget.
- Add aggregate background movement/eating for deferred ordinary animals so deferral is not the only scaling valve.
- Current aggregate ecology still runs, but richer aggregate background movement/eating is future work. Until that lands, deferral mainly reduces routine individual action churn rather than replacing it with a full aggregate behavior model.
- When testing starter food-rich pockets, watch ecology counters alongside queue pressure: high `mouseBirths` / `rabbitBirths` with low predator kills and rising overgrazing can turn into both a balance problem and a creature-action backlog problem.
- Add richer per-phase tick timing once the world tick is split into smaller service boundaries.
- Keep action queue and status pages under review if creature `RUNNING` pressure remains visible.

## Acceptance notes

- Player quick actions should remain responsive even with large animal populations.
- `/world`, `/stat` and service diagnostics should distinguish player queue pressure from creature `RUNNING` pressure so future delays are easier to identify.
- `/world`, `/stat` or tick summaries should make it obvious when aggregate simulation is carrying background ecology.
- Heavy admin/status pages should target p95 under 300 ms on the current production-like entity count and should not load thousands of rows when rendering one page.
- World tick instrumentation should make p95 tick time and phase bottlenecks visible before deeper refactors begin.
- The first implementation can be conservative: it is acceptable for background animal movement to become less granular if ecology counters and local player-facing behavior stay believable.

## Not in first implementation

- Full population model rewrite.
- Persistent aggregate population tables unless the simpler budgeted approach is not enough.
- Complex pathfinding or region-scale migration AI.
