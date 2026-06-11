# Prompt Archive: Runtime Heartbeats And 0.17 Architecture

Date: 12026-06-11
Status: planning prompt archive
Related docs:

- `docs/planning/runtime-heartbeats-and-0.17.md`
- `docs/planning/next.md`
- `docs/planning/post_0_16_lane.md`
- `docs/planning/watchpoints.md`

## Source Conversation Summary

The user asked whether Chornolis Marches should study a MUD architecture page about a central game loop divided into heartbeats / pulses and adopt something similar because the game already feels slow with few players and a modest number of zones.

The resulting planning conclusion was:

- adopt the heartbeat / pulse discipline;
- do not copy Bylins 1:1;
- do not implement the rewrite inside the active `0.16.x` lane;
- use `0.16.x` for readiness, observability, triage and docs-only planning;
- open `0.17.x` for explicit runtime heartbeat ownership.

## Prompt A - 0.16.x Docs-Only Closeout

Use this prompt for a docs-only branch that records the decision but changes no runtime behavior.

```text
Update Chornolis Marches documentation only.

Goal: record that the central heartbeat / scheduler rewrite belongs to 0.17.x, not the remaining 0.16.x lane.

Scope:
- update docs/planning/next.md;
- update docs/planning/post_0_16_lane.md;
- update docs/planning/watchpoints.md;
- add docs/planning/runtime-heartbeats-and-0.17.md;
- add/update docs/planning/prompts/ with the prompt archive;
- optionally update docs/roadmap.md if the roadmap needs explicit 0.16/0.17 transition language.

Guardrails:
- documentation/planning only;
- no src/ changes;
- no package changes;
- no Prisma schema, migrations, SQL, queue cadence, action duration, recovery math, creature AI, Telegram delivery or diagnostics endpoint changes;
- do not retag many planning items just because the roadmap moved;
- keep 0.16.x as readiness/telemetry/triage closure;
- put scheduler implementation in 0.17.x.

Validation:
- markdown review;
- if planning exports are updated, run npm run planning:export and include generated files;
- git diff --check.
```

## Prompt B - 0.17.0 Heartbeat Scheduler Skeleton

Use this prompt for the first implementation PR only after 0.16.x closes or pauses cleanly.

```text
Implement the first behavior-preserving heartbeat scheduler skeleton for Chornolis Marches.

Goal:
Make runtime ownership explicit without changing gameplay behavior.

Implementation shape:
- introduce a small heartbeat registry/scheduler service;
- represent heartbeat key, interval/cadence, running state, lastStartedAt, lastFinishedAt, lastDurationMs, lastError and skippedBecauseRunning;
- wire existing loops through named heartbeat wrappers where safe;
- preserve existing service bodies and ordering as much as possible;
- expose guarded runtime diagnostics for heartbeat snapshots.

Candidate heartbeat keys:
- actions.players
- actions.creatures
- world.clock
- world.features
- recovery.players
- recovery.creatures
- ai.visibleCreatures
- ai.backgroundCreatures
- ecology.lifecycle
- ecology.reproduction
- resources.regen
- notifications.deferred

Guardrails:
- no gameplay math changes;
- no action duration changes;
- no queue ordering changes;
- no recovery cadence changes unless purely represented as current config;
- no Prisma schema or migration changes;
- no SQL/index changes;
- no broad worldTick logic rewrite in this first PR;
- no triggers/scripts/dynamic zones.

Validation:
- existing queue/recovery/world tick tests still pass;
- add unit tests for heartbeat guard behavior, snapshots and error isolation;
- add source-boundary tests if the repo uses them for runtime services;
- npm test;
- npm run typecheck;
- npm run build;
- git diff --check.
```

## Prompt C - 0.17.1 Player-First Action Cadence

```text
Implement a narrow player-first action cadence PR after the heartbeat scheduler skeleton exists.

Goal:
Decouple player action responsiveness from the quick-action duration without making repeated idle database polling the only way to feel responsive.

Scope:
- introduce explicit action heartbeat cadence config for player and creature processing;
- keep safe action queue nudges after enqueue paths;
- ensure creature processing remains budgeted behind player pressure;
- measure player overdue age before/after;
- update guarded diagnostics with cadence and nudge counters.

Guardrails:
- no action duration or stamina math changes;
- no queue reordering;
- no schema/migration changes;
- do not change creature AI behavior in the same PR;
- do not tune recovery or Telegram delivery in the same PR.
```

## Prompt D - 0.17.2 World Tick Phase Split

```text
Split worldTick into named measured phases without changing world behavior.

Goal:
Stop treating worldTick as one opaque pass and make slow phases visible.

Scope:
- extract named phase functions for world clock/daypart, feature expiry/totems/gates, player hunger, animal lifecycle, herbivore ecology, predator reproduction, resource regen and creature AI selection;
- record phase durations and errors in runtime snapshots;
- reduce or sample per-tick WorldEvent diagnostic persistence;
- preserve existing order unless a phase has no dependency on earlier state.

Guardrails:
- no ecological math changes;
- no creature selection changes;
- no action enqueue semantics changes;
- no schema changes;
- do not introduce zone runtime state yet.
```

## Prompt E - 0.17.3 Due-Based Recovery / Lifecycle Audit

```text
Plan and implement due-based or sliced recovery/lifecycle candidate selection after the world tick phase split identifies pressure.

Goal:
Avoid full scans where they are not needed, without dropping side effects.

Required audit:
- player idle reminders;
- ordinary sleep auto-wake;
- rest full recovery messages;
- active-player recovery timestamp refresh;
- active-creature recovery timestamp refresh;
- custom stamina max handling;
- animal aging;
- corpse decay;
- starvation and old-age death side effects;
- world events emitted by lifecycle changes.

Guardrails:
- if new next*At fields or partial indexes are needed, split schema/index work into its own PR;
- no player-facing recovery math changes;
- no animal ecology math changes;
- no message delivery semantics changes.
```

## Prompt F - 0.17.4 Region / Zone Runtime State

```text
Design and implement the first region/zone runtime state slice.

Goal:
Give Chornolis an explicit active/warm/background simulation model using Region or a small runtime state table.

Scope:
- define ACTIVE, WARM, BACKGROUND and optionally FROZEN modes;
- compute player-visible regions and nearby/warm regions;
- keep player-visible locations detailed;
- let background ecology run at lower resolution;
- expose guarded diagnostics showing mode counts and last heartbeat per region.

Guardrails:
- no full zone reset DSL;
- no dynamic dream instance work;
- no scripting/triggers;
- no economy/profession widening;
- no hidden player-facing content changes without dedicated content review.
```
