---
id: FIRE-001-C
title: Carried torch visibility
status: testing
type: feature
area: survival
priority: high
estimate: 1-2h
tags:
  - torch
  - light
  - visibility
depends_on:
  - FIRE-001-A
---

# FIRE-001-C: Carried torch visibility

## Goal

Make carried lit torches use the same visibility layer.

## First Scope

- Check current torch state.
- Treat carried lit torch as light source for the actor/location as intended.

## Acceptance

- Lit torch reveals what darkness hides.
- Unlit/extinguished torch does not.

## Implementation Order

Do after: `FIRE-001-A`.

## 0.14.23 Reconciliation Notes

- Carried lit torches are treated as local light in the shared fire/light and visibility path.
- The remaining open work belongs to deeper item-instance and hand-slot modeling, not the first visibility connection.
