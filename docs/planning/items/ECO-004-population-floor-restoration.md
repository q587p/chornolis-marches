---
id: ECO-004
title: Population floor restoration
status: next
type: feature
area: ecology
priority: high
estimate: 1-2h
tags:
  - ecology
  - creatures
  - population
  - world-tick
depends_on:
  - ECO-001
---

# ECO-004: Population Floor Restoration

## Goal

Prevent ordinary animal species from disappearing forever when players, NPCs or ecology reduce their living population to zero.

The MVP should be practical and quiet: if a configured animal species has no living members left in the waking world, the world restores its starter amount at its starter location or authored starter locations. A richer in-world explanation can come later.

## First Scope

- Track animal species that should have a minimum living population floor.
- For MVP, use existing seed/starter creature data as the source of truth where practical:
  - species key;
  - starter location key;
  - starter count;
  - starter age mix if already authored.
- During a world tick or a small ecology maintenance pass, detect when the living count for a floor-protected species is `0`.
- Spawn the starter count back into the starter location(s).
- Do not restore named NPCs, unique creatures, spirits, monsters or intentionally extinct/disabled species.
- Keep the player-facing output quiet unless there is already a scribe/technical tick summary. This is a safeguard, not a push notification.

## Acceptance

- If all living animals of a protected species are gone, a later ecology/world tick restores the starter population.
- Restoration uses normal creature rows and valid species/location references.
- It does not duplicate population while at least one living member of the species remains.
- It does not revive corpses or reset existing corpse decay.
- It does not affect tutorial/dream-only creatures.
- Tests cover at least one species going to zero and being restored to its starter location.

## Later Direction

The first version may be mechanical. Later versions should make restoration feel like Chornolis:

- migration from neighboring regions instead of direct spawning;
- dens, burrows, nests or hidden refuges that recover over time;
- place spirits, forest spirits or omen events that explain why a species returns;
- slower or partial restoration when the region is overhunted, poisoned, burned or otherwise damaged;
- player-visible clues such as new tracks, distant calls or disturbed grass before animals fully reappear.

## Non-Goals

- Full aggregate population simulation.
- Complex predator/prey equilibrium.
- Player-facing “species restored” notification spam.
- Mythic spirit restoration in the MVP.
