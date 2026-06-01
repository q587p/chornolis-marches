---
id: ECO-004
title: Population floor restoration
status: testing
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

Prevent ordinary animal species from disappearing forever when players, NPCs or ecology reduce their living population to zero or, for key prey species, leave the world without an adult breeding pair.

The MVP should be practical and quiet: if a configured animal species has no living members left in the waking world, the world restores its starter amount at its starter location or authored starter locations. For starter rabbits and mice, the same safeguard can also recover the species when living animals remain but no adult male/female pair is left. A richer in-world explanation can come later.

## First Scope

- Track animal species that should have a minimum living population floor.
- For MVP, use existing seed/starter creature data as the source of truth where practical:
  - species key;
  - starter location key;
  - starter count;
  - starter age mix if already authored.
- During a world tick or a small ecology maintenance pass, detect when the living count for a floor-protected species is `0`.
- For starter rabbits and mice, also detect when no adult breeding pair remains.
- Spawn the starter count back into the starter location(s).
- Do not restore named NPCs, unique creatures, spirits, monsters or intentionally extinct/disabled species.
- Keep the player-facing output quiet unless there is already a scribe/technical tick summary. This is a safeguard, not a push notification.

## 0.13.21 Slice

- Added `restorePopulationFloors()` to the world tick after animal lifecycle processing and before ordinary ecology reproduction/spread.
- Uses `src/data/starterAnimals.ts` as the source of truth for starter species, locations, age mix and counts.
- Restores starter rabbits, mice, foxes and wolves only when that species has `0` living, non-gone animals.
- Excludes starter corpse groups and keeps restoration quiet except for technical world events / scribe tick summaries.
- Added focused helper coverage in `scripts/test/population-restoration.cjs`.

## 0.14.16 Slice

- Keeps fox and wolf restoration tied to total disappearance, so the intentionally single starter wolf does not trigger repeated pair restoration.
- Extends rabbit and mouse restoration to cover living populations that have lost their adult breeding pair.
- Adds helper coverage for healthy adult pairs, same-sex adult remnants and young-only remnants.
- Treat no-pair restoration as a mechanical safeguard, not natural migration. If rabbit or mouse rebound becomes too strong in live stats, add stricter thresholds, per-species cooldowns or partial restoration before presenting it as an in-world migration/refuge system.

## 0.14.17 Slice

- Adds `populationFloorRestored` to parsed world-tick ecology counters so scribe/admin statistics can show recent rates.
- Parses `Population floor restored` events by species and surfaces total restored counts, event counts and latest restoration time in Telegram `/stat`, protected web `/stat` and `/stat.json`.
- Per-species totals are derived from `WorldEvent` descriptions. Older periods without matching restoration events or species metadata are not backfilled by this counter; gaps are expected and should be treated as telemetry coverage limits, not proof that no restoration happened.
- Keeps the surface scribe/admin-only; ordinary player-facing news should not present the safeguard as a visible spawn mechanic.

## Acceptance

- If all living animals of a protected species are gone, a later ecology/world tick restores the starter population.
- If starter rabbits or mice remain alive but lack an adult male/female pair, a later ecology/world tick restores the starter prey population.
- Restoration uses normal creature rows and valid species/location references.
- It does not duplicate population while a floor-protected species is healthy enough for its configured safeguard.
- It does not revive corpses or reset existing corpse decay.
- It does not affect tutorial/dream-only creatures.
- The near-term stats/admin surface records how many times each protected species had to be restored after reaching `0` living animals.
- Scribe/admin statistics show recent and per-species restoration counts without exposing this as ordinary player-facing feedback.
- Historical totals are explicitly event-derived and do not pretend to reconstruct older periods before restoration events were recorded with species detail.
- Tests cover at least one species going to zero and being restored to its starter location.

## Near-Term Follow-Up

- Add a small persistent or event-derived metric for population-floor restorations by species.
- Surface the count in scribe/admin statistics so it is clear which animals are repeatedly collapsing to zero.
- Add thresholds/cooldowns for no-pair prey restoration if `/stat` shows repeated fast rebound after predator pressure is removed.
- Keep this out of ordinary player-facing news/UI unless it becomes part of an in-world ecological clue later.

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
