---
id: VIS-001-E
title: Ground object visibility gate
status: testing
type: feature
area: visibility
priority: medium
estimate: 1-2h
tags:
  - visibility
  - objects
  - night
depends_on:
  - VIS-001-B
---

# VIS-001-E: Ground object visibility gate

## Goal

Make loose objects depend on visibility.

## First Scope

- Use helper for coins, хмиз and similar ground objects.
- Allow later examine/discovery hooks.

## Acceptance

- Objects can be hidden in darkness.
- Light/day reveals them.
- No item duplication.

## Implementation Order

Do after: `VIS-001-B`.

## 0.14.23 Reconciliation Notes

- Ground objects now pass through the shared visibility rules in location rendering.
- Local light/day can reveal loose objects; dark or dim visibility can reduce the ground-object list.
