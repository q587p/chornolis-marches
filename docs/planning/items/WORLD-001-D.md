---
id: WORLD-001-D
title: /time reads internal world-clock state
status: testing
type: feature
area: world_time
priority: high
estimate: 1h
tags:
  - world-time
  - time-command
  - moon
  - 0.14
depends_on:
  - WORLD-001-C
---

# WORLD-001-D: `/time` Reads Internal World-Clock State

## Goal

Make `/time` display actual internal Chornolis world state instead of static placeholder text or real-world clock time.

## First Scope

- Replace static-only time text with current year, lunar circle, day, clock, daypart and moon phase.
- Keep atmospheric wording.
- Avoid exposing raw tick math in normal player-facing text.
- Keep Ukrainian slashless aliases if already supported: `час` / `Час`.

## Acceptance

- `/time` changes as internal world time advances.
- Text remains diegetic.
- The command does not imply real-world local time.

## Implementation Order

Do after: `WORLD-001-C`.

## 0.14.1 Slice

- `/time` now advances and reads the stored internal world-clock state.
- The visible text includes year, lunar circle, day of circle, approximate clock, daypart and moon phase.
- Weather remains a stored placeholder until `WORLD-001-E`.
