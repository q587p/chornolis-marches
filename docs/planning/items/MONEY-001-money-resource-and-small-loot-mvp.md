---
id: MONEY-001
title: Money resource and small loot MVP
status: done
type: feature
area: core-loop
priority: high
tags:
  - money
  - loot
  - resources
  - onboarding
  - economy
depends_on:
  - LOOT-001
---

# MONEY-001: Money Resource and Small Loot MVP

## Goal

Introduce the first tiny money surface without turning the game into a shop economy: `shah` as a small find and `grivna` as a named larger unit reserved for future authored use.

## Shipped in 0.15.16

- Added `shah` and `grivna` resource types with lexicon-backed Ukrainian forms.
- Added shared money text helpers for correct plural display and `/me` money summary.
- Made `shah` and `grivna` legal visible ground-pickup resources.
- Seeded a handful of starter-adjacent `shah` finds, with no tutorial-dream money and no broad starter `grivna`.
- Added a separate money box to the beginner shared cache with explicit player take/contribute controls and no hidden money restock.
- Added a rare waking-world gathering bonus that can grant one `shah` on successful gather.
- Added focused tests for pluralization, seed authoring, cache money behavior and gather bonus boundaries.

## Still Out of Scope

- Shops, vendors, barter, prices and conversion.
- Factions, law, theft, fines or taxes.
- Broad creature/NPC coin drops.
- Common `grivna` finds.
- Shrine/offering behavior.

## Follow-Up

Fold this into `LOOT-001` follow-up work for small authored find objects, empty-search text, item lifetime and later offering/omen hooks.
