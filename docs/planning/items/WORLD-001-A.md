---
id: WORLD-001-A
title: Tiny world-time foundation
status: testing
type: technical
area: world_time
priority: high
estimate: 1h
tags:
  - world-time
  - day-night
depends_on: []
---

# WORLD-001-A: Tiny World-Time Foundation

## Goal

Create the smallest world-time source that can support daypart, darkness and later visibility decisions.

## First Scope

- Add a reusable helper that returns the current world-time snapshot.
- Keep the first source derived from the real `Europe/Kyiv` clock.
- Expose a stable daypart-oriented shape for later visibility helpers.
- Keep moon, seasons and accelerated world-time out.

## Acceptance

- A service/helper can return current world time.
- It is deterministic enough for focused tests by injecting a `Date`.
- No player-facing observation mechanics are added.
- Existing gameplay continues working.

## Implementation Order

Can be done independently.

## 0.14.0 Notes

- Added `src/services/worldTime.ts`.
- Chose a real-clock-derived first model instead of a Prisma migration. This keeps the first 0.14 slice small while still giving `/time` and future visibility code one shared helper.
- Added `scripts/test/world-time.cjs` coverage for daypart boundaries and rendering.
