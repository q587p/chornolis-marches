---
id: WORLD-001-G
title: Time and weather debug controls
status: next
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
- Leave audit events for setters.
- Do not expose raw controls to ordinary players.

## Acceptance

- QA can force dusk/night/full moon/storm cases safely.
- Dangerous commands are restricted and audited.
- Normal `/time` remains atmospheric.

## Implementation Order

Do after player-facing `/time` and weather MVP.
