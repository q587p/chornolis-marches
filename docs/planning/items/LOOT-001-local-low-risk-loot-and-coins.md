---
id: LOOT-001
title: Local low-risk loot and small coin finds
status: in_progress
type: feature
area: core-loop
priority: high
tags:
  - loot
  - foraging
  - coins
  - onboarding
  - resources
  - economy
depends_on:
  - ITEM-001
  - VIS-001-E
---

# LOOT-001: Local Low-Risk Loot and Small Coin Finds

## Goal

Make nearby safe or semi-safe locations feel worth searching so new players do not feel forced to defend distant forest spots just to find anything useful.

## Problem

Recent feedback: if surrounding tiles have no loose loot and nothing useful to search, the practical lesson becomes "go to a forest spot and defend it." That is too narrow for the early loop. The borderland should offer small, imperfect finds close to camp: enough to reward looking, not enough to become a shop or farming route.

## Scope

- Add or design modest low-risk finds around starter-adjacent locations and other calm pockets.
- Favor small, diegetic loot:
  - twigs, dry sticks, bark, moss or bones;
  - a few berries/herbs/mushrooms where the biome supports it;
  - rare small coins such as `шаг`;
  - very rare larger coin finds such as `ґривня` only where authored as a landmark or omen.
- Let visibility matter: `/look` can reveal visible loose finds in good light, while `/examine` can surface harder-to-notice things in darkness or poor visibility.
- Keep the first pass small and bounded: no full economy, vendors, theft, dynamic drop tables or reward inflation.
- Prefer authored pockets and biome-aware tables over global random loot everywhere.
- Include empty-search text that makes "nothing here now" feel local and temporary rather than like the whole world is barren.

## Design Notes

Small money can bridge several existing ideas:

- `шаг` and `ґривня` as rare ground finds;
- future shrine/offering actions such as `кинути шаг`;
- mapping/exploration rewards that do not require combat;
- later creature/spirit drops or "someone lost this while fleeing" traces.

This should remain distinct from animal carcass loot and hunter economy. Early loot should help players choose between looking around, gathering, returning to camp, or taking a risk deeper in the wilderness.

## Acceptance

- Starter-adjacent locations have at least a few meaningful but modest things to find without walking straight into deep forest pressure.
- Player-facing copy avoids generic "loot table" language.
- Coin resources are named and documented before they appear in UI.
- Visibility rules are clear: good light can show obvious finds; closer inspection can reveal subtler ones.
- There is no unlimited local farm that trivializes food, torches, offerings or future economy.

## Notes

Coordinate with `MAP-002` biome foraging and `WORLD-003` item lifetime work so loose finds can later age, vanish, be picked up by NPCs or become part of small omens instead of remaining static piles forever.

## 0.15.16 MVP Slice

The first money/loot slice landed as `MONEY-001`:

- `shah` and `grivna` are now named resource types with Ukrainian display/plural helpers.
- A few authored `shah` finds exist near starter-adjacent or calm locations.
- `shah` and `grivna` can move through the visible ground-pickup path.
- The beginner shared cache has a separate small money box with explicit player take/contribute controls.
- Successful waking-world gathering can very rarely turn up one `shah`.

Remaining `LOOT-001` work should focus on richer authored small finds, empty-search atmosphere, item lifetime, future offering hooks and avoiding an unlimited local farm. Do not promote shops, vendors, conversion rates, theft or a broad economy from this MVP alone.

## 0.15.17 Follow-Up

The observation-cue slice added the first empty-search atmosphere:

- full `/examine` can now add a short regional line when no visible small finds, gatherable resources, corpses or tracks are present;
- dream tutorial locations are excluded;
- the line frames "nothing found" as a local moment, not a permanent barren state.

Remaining `LOOT-001` work: richer authored small find objects, item lifetime, offering hooks and future search/observe integration.

Watchpoint: the empty-search cue can become too frequent in sparse regions when players use full `/examine` repeatedly. Future UX polish should tune cadence, per-location/per-character cooldowns or richer local variation before the line starts feeling like generic filler.
