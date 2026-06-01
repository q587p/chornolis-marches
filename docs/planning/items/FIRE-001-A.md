---
id: FIRE-001-A
title: Active light connects to visibility
status: testing
type: feature
area: survival
priority: high
estimate: 1-2h
tags:
  - fire
  - light
  - visibility
depends_on:
  - VIS-001-A
---

# FIRE-001-A: Active light connects to visibility

## Goal

Let campfires and carried light reveal darkness-hidden information.

## First Scope

- Use existing light checks if available.
- Wire active local light into visibility helper.

## Acceptance

- Active campfire reveals location detail at night.
- No active light means reduced detail.

## Implementation Order

Do after: `VIS-001-A`.

## 0.14.23 Reconciliation Notes

- Active local light is now part of the shared light snapshot used by visibility rules.
- Campfires, carried lit torches and dropped lit torches can reveal darkness-reduced location detail through the same visibility path.
