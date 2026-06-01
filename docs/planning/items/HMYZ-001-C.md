---
id: HMYZ-001-C
title: Pickup hmyz polish
status: testing
type: feature
area: survival
priority: high
estimate: 1-2h
tags:
  - hmyz
  - pickup
  - inventory
depends_on:
  - HMYZ-001-B
---

# HMYZ-001-C: Pickup hmyz polish

## Goal

Let players pick up visible хмиз into inventory.

## First Scope

- Support `підібрати хмиз` / `взяти хмиз`.
- Remove or reduce source correctly.
- Show actor text.

## Acceptance

- Inventory gains хмиз.
- Location/source updates.
- No duplication.

## Implementation Order

Do after: `HMYZ-001-B`.

## 0.14.23 Reconciliation Notes

- Loose `twigs`/`хмиз` use the ground-resource pickup path rather than a gather chance roll.
- Visibility still controls whether the loose stack is obvious in location output.
