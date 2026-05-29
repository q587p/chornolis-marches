---
id: WORLD-001-C
title: Daypart helper and tick advancement
status: next
type: feature
area: world_time
priority: high
estimate: 1-2h
tags:
  - world-time
  - world-tick
depends_on:
  - WORLD-001-B
---

# WORLD-001-C: Daypart helper and tick advancement

## Goal

Advance daypart through world time.

## First Scope

- Add helper for current daypart.
- Advance it in world tick or clock service.
- Keep durations configurable/simple.

## Acceptance

- Daypart changes over time.
- Helper is reused by `/time` and visibility later.
- No moon/seasons.

## Implementation Order

Do after: `WORLD-001-B`.
