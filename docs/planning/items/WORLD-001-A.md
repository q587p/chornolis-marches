---
id: WORLD-001-A
title: Internal world-clock model design
status: testing
type: design
area: world_time
priority: high
estimate: 1h
tags:
  - world-time
  - day-night
  - moon
  - 0.14
depends_on: []
---

# WORLD-001-A: Internal World-Clock Model Design

## Goal

Choose and document the smallest internal Chornolis world-clock model that can support day/night, moonlight and later visibility.

## First Scope

- Define the time scale: `1 in-game hour = 120_000 ms` real elapsed time and `1 in-game minute = 2_000 ms`.
- Define 24 hours per day, 28 days per lunar circle and 13 lunar circles per year.
- Define the starting timestamp from the current public date: year 587, `Коло Зеленого Шуму`, day 17, around 17:00 / `передвечір'я`.
- Decide whether storage uses one `absoluteMinute` field or separate typed fields.
- State clearly that the clock is not bound to real-world time of day, server timezone or user timezone.
- Keep deep calendar systems out: sacred days, rituals, local calendar variants, full seasonal event tables.

## Acceptance

- Decision recorded.
- Implementation task can proceed.
- Docs explicitly distinguish elapsed real-time advancement from real-time-of-day sync.
- Minimal moon phase/illumination is in scope for light; deep calendar remains out of scope.

## Implementation Order

Can be done independently.

## 0.14.23 Reconciliation Notes

- The first internal world-clock model is implemented and subsequent WORLD-001 storage, tick, `/time`, weather, light-snapshot and debug-control slices are in testing.
