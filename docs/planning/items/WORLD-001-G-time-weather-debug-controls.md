---
id: WORLD-001-G
title: Time and weather debug controls
status: testing
type: technical
area: world_time
priority: medium
estimate: 1h
tags:
  - world-time
  - weather
  - admin
  - testing
  - 0.14
depends_on:
  - WORLD-001-D
  - WORLD-001-E
---

# WORLD-001-G: Time and Weather Debug Controls

## Goal

Allow safe testing of dawn/day/dusk/night, moon phases and weather without waiting through long cycles.

## First Scope

- Add scribe/admin-only readout for exact world minute, date, clock, daypart, moon and weather.
- Optional controlled setters such as `/timeSet`, `/weatherSet` only behind existing admin/scribe checks.
- Keep `/reset world` and `/reset full` aligned with the world-clock storage task: both reset time/weather back to the starter state, while `/reset stats` leaves them untouched.
- Leave audit events for setters.
- Do not expose raw controls to ordinary players.

## Acceptance

- QA can force dusk/night/full moon/storm cases safely.
- Dangerous commands are restricted and audited.
- Reset behavior is explicit: world/full reset returns the clock to year 587, `Коло Зеленого Шуму`, day 17, 17:00; stats reset does not.
- Normal `/time` remains atmospheric.

## Implementation Order

Do after player-facing `/time` and weather MVP.

## 0.14.4 Slice

- Added scribe/admin-only `/timeDebug` readout for exact internal world minute, date, clock, daypart, moon, weather and local light snapshot.
- Added restricted `/timeSet` and `/weatherSet` controls for QA of daypart, moon and weather cases.
- Added no-leading-slash command forms for the new scribe controls.
- Added scribe audit entries for time and weather setters.
