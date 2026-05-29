---
id: VIS-001-E
title: Ground object visibility gate
status: next
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
