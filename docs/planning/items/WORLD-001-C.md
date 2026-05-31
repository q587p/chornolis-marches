---
id: WORLD-001-C
title: Heartbeat clock advancement and daypart helper
status: next
type: feature
area: world_time
priority: high
estimate: 1-2h
tags:
  - world-time
  - world-tick
  - day-night
  - 0.14
depends_on:
  - WORLD-001-B
---

# WORLD-001-C: Heartbeat Clock Advancement and Daypart Helper

## Goal

Advance internal world time through the world heartbeat and expose reusable helpers for daypart, date, moon phase and moon illumination.

## First Scope

- Add a world-time service that advances by elapsed real milliseconds from `lastAdvancedAt`.
- Default scale: `1 in-game hour = 120_000 ms`.
- Do not derive daypart from `Date.getHours()`, server local hour or real-world timezone.
- Add helpers for current date, clock, daypart, lunar circle/day, moon phase and moon illumination.
- Call advancement from `worldTick()` or an equivalent heartbeat path.

## Acceptance

- Daypart changes over internal world time.
- Moon phase/illumination changes over the 28-day lunar circle.
- Helper is reusable by `/time`, weather and visibility later.
- No separate clock/weather timer outside the world heartbeat.

## Implementation Order

Do after: `WORLD-001-B`.
