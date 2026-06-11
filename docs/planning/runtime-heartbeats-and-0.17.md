# Runtime Heartbeats And 0.17 Lane

Date: 12026-06-11
Status: planning-only decision note

## Decision

Do not fit the central heartbeat / scheduler rewrite into the active `0.16.x` release lane.

`0.16.x` should finish as stabilization, readiness, telemetry, narrow bugfixes and planning. The runtime architecture work should start as a `0.17.x` lane because it will touch scheduling ownership, queue cadence, world tick ownership, recovery ownership, ecology cadence and eventually database indexes or migrations.

This note changes documentation and planning only. It does not change runtime behavior, action durations, queue ordering, recovery math, creature AI, Telegram delivery, Prisma schema, migrations, SQL indexes or diagnostics endpoints.

## Why Not 0.16.x

The current `0.16.x` lane is already carrying production-readiness and responsiveness work. Recent releases added action queue observability, creature queue backpressure, recovery diagnostics, action-completion timing, Telegram send timing, database query timing, performance triage docs and lightweight readiness handling.

That makes `0.16.x` the right place for:

- finishing readiness / follow / notification polish;
- docs-only architecture triage;
- prompt/archive capture for the eventual implementation;
- guarded queue snapshots and live evidence collection;
- one narrow evidence-based fix only if telemetry points to a single bottleneck.

It is not the right place for a broad scheduler rewrite.

Attack-learning note: the existing attack practice/observation MVP does not require blocking the heartbeat decision. Keep any remaining attack work in `0.16.x` to docs/help/smoke polish or a tiny WPN-003 display/seed slice. Do not add training arenas or broader combat as part of runtime closeout.

## Recommended 0.16.x Exit

Before cutting into `0.17.x`, finish or consciously pause the active mentorship / guided learning lane and collect the operational evidence already requested by the performance watchpoints:

1. Idle guarded `/queueDebug` snapshot.
2. Active repeated-action snapshot.
3. After-drain snapshot.
4. Matching slow-log excerpts for action completion, Telegram send, database query, recovery and action queue pass if present.
5. A short note that picks exactly one next implementation category.

If there is no single obvious bottleneck, do not tune in `0.16.x`. Open the `0.17.x` scheduler lane instead.

## Bylins Concepts To Adapt

Use the MUD-style architecture as an inspiration, not as a direct port.

Adapt:

- one explicit coordinator for runtime time ownership;
- separate pulses / heartbeats for different systems;
- player-visible activity before background simulation;
- zone/region maintenance as a lower-frequency concern;
- diagnostics per heartbeat phase.

Do not copy:

- in-memory global-world assumptions;
- telnet/session architecture;
- VNUM-centric world loading;
- a one-loop-does-everything pass that assumes cheap in-memory lists;
- broad scripting/triggers before runtime ownership is clean.

## 0.17.x Runtime Lane Shape

### 0.17.0 - Heartbeat scheduler skeleton

Create a small scheduler/registry that owns heartbeat metadata and runtime snapshots while preserving current behavior. Existing loops can still call the same services, but the scheduler should make ownership explicit.

Candidate heartbeats:

- `actions.players`
- `actions.creatures`
- `world.clock`
- `world.features`
- `recovery.players`
- `recovery.creatures`
- `ai.visibleCreatures`
- `ai.backgroundCreatures`
- `ecology.lifecycle`
- `ecology.reproduction`
- `resources.regen`
- `notifications.deferred`

Acceptance:

- behavior-preserving;
- no gameplay math changes;
- no schema changes;
- guarded diagnostics show heartbeat last-start, last-finish, duration, error and skipped-because-running counts;
- player-facing action completion remains the highest-priority path.

### 0.17.1 - Player-first action cadence

Decouple player action responsiveness from the 100 ms quick-action duration. Use explicit player/creature heartbeat cadence and keep safe nudges for newly queued player actions.

Acceptance:

- repeated quick player actions do not force constant idle database polling;
- player action overdue age does not regress under light load;
- creature work remains budgeted behind player pressure;
- quick actions still feel quick because enqueue paths can nudge the player heartbeat safely.

### 0.17.2 - World tick phase split

Split the broad `worldTick` pass into named heartbeat phases before changing logic. Move per-tick diagnostic persistence toward runtime snapshots or sampled events instead of always writing a full `World Tick` event.

Acceptance:

- each phase is measured independently;
- per-tick `WorldEvent` spam is reduced or explicitly sampled;
- world clock, daypart notices, feature expiry, ecology, resource regen and creature AI have separate failure surfaces.

### 0.17.3 - Due-based recovery and lifecycle candidates

Move player/creature recovery and animal lifecycle toward due-based or sliced candidate selection. Prefer explicit `next*At` fields only after a focused migration plan exists.

Acceptance:

- no full-player or full-animal scan is narrowed without a side-effect audit;
- idle reminders, sleep auto-wake, rest messages and active refresh behavior stay accounted for;
- any schema/index work is its own PR.

### 0.17.4 - Zone/region runtime state

Use `Region` or a new runtime state table as the Chornolis equivalent of MUD zones. Simulate active, warm and background areas at different resolution.

Acceptance:

- player-visible locations remain detailed;
- background ecology remains plausible but cheaper;
- no content loop assumes every creature receives a high-frequency action every tick.

## Keep Later

Do not start with scripting/triggers, dynamic dream instances, full zone reset DSL, broad economy/profession loops or full in-memory MUD architecture. Those may become useful after the heartbeat lane makes runtime ownership clear.

## Rule Of Thumb

`0.16.x` may document the decision and gather evidence.

`0.17.x` should own the scheduler.

Content lanes such as bottles, herbalism, prepared remedies and broader mentorship can resume after runtime pressure is under control or deliberately accepted.
