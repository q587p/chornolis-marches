---
id: WORLD-001-F
title: Light snapshot helper
status: next
type: feature
area: visibility
priority: high
estimate: 1-2h
tags:
  - world-time
  - visibility
  - moon
  - weather
  - light
  - 0.14
depends_on:
  - WORLD-001-C
  - WORLD-001-E
---

# WORLD-001-F: Light Snapshot Helper

## Goal

Create a shared helper that estimates current light from daypart, moon illumination, weather and active local light sources.

## First Scope

- Natural light from daypart.
- Moonlight contribution at night from 28-day lunar phase.
- Weather penalty/modifier.
- Local active light bonus from campfire/torch-capable features or carried light if already available.
- Return a compact label for player-facing text and numeric values only for internal/debug use.

## Acceptance

- Visibility work can call one helper instead of duplicating light math.
- Night with full moon is meaningfully different from moonless/stormy night.
- Active fire/torch light can override darkness locally.
- Normal `/look` text remains atmospheric, not a debug dump.

## Implementation Order

Do after: `WORLD-001-C` and `WORLD-001-E`; before `VIS-001-B/C/D/E`.
