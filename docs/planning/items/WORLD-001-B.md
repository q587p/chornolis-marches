---
id: WORLD-001-B
title: Daypart helper and /time
status: testing
type: feature
area: world_time
priority: high
estimate: 1-2h
tags:
  - world-time
  - time-command
depends_on:
  - WORLD-001-A
---

# WORLD-001-B: Daypart Helper and `/time`

## Goal

Expose simple dawn/day/dusk/night state and make `/time` read current world state.

## First Scope

- Add a daypart helper.
- Add or update `/time` so it reads the shared helper.
- Keep player-facing text Ukrainian and atmospheric.
- Keep debug/admin output separate from ordinary player output.

## Acceptance

- `/time` shows meaningful current world-time/daypart text.
- Tests cover daypart helper behavior.
- The helper can be reused by visibility in later `VIS-001` tasks.

## Implementation Order

Do after: `WORLD-001-A`.

## 0.14.0 Notes

- `/time` now reads `getCurrentWorldTime(...)`.
- The old static "передвечір'я" line was replaced with the current daypart and a compact local clock hint.
- Darkness behavior is intentionally deferred to `VIS-001`.
