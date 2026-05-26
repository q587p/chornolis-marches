---
id: PERF-001
title: Budgeted and aggregated creature simulation
status: backlog
type: technical
area: performance
priority: high
tags:
  - performance
  - ecology
  - creatures
  - action-queue
  - simulation
depends_on:
  - ECO-001
exports:
  github_issue: true
---

# PERF-001: Budgeted and aggregated creature simulation

## Goal

Keep the world feeling alive without making every animal think and enqueue an individual action every world tick.

The current creature model is easy to reason about, but it does not scale well: each living animal can become its own action-queue actor. As animal populations grow, creature backlog can delay player-visible actions even when player quick actions are configured correctly.

## Why it fits

Chornolis should support a living ecology on a larger map. That requires cheaper background simulation and clearer priority for player-facing interactions.

The system should preserve individual creatures where they matter:

- visible animals near players;
- named NPCs, spirits and monsters;
- predators making attacks;
- creatures with recent combat, tracks or unusual state;
- debug/admin inspection cases.

For ordinary background animals, aggregated movement and ecology are enough.

## First scope

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

## Acceptance notes

- Player quick actions should remain responsive even with large animal populations.
- `/world`, `/stat` or tick summaries should make it obvious when aggregate simulation is carrying background ecology.
- The first implementation can be conservative: it is acceptable for background animal movement to become less granular if ecology counters and local player-facing behavior stay believable.

## Not in first implementation

- Full population model rewrite.
- Persistent aggregate population tables unless the simpler budgeted approach is not enough.
- Complex pathfinding or region-scale migration AI.
