---
id: WORLD-001-D
title: /time reads world state
status: testing
type: feature
area: world_time
priority: high
estimate: 1h
tags:
  - world-time
  - time-command
depends_on:
  - WORLD-001-B
---

# WORLD-001-D: /time reads world state

## Goal

Make `/time` display actual world state.

## First Scope

- Replace static-only time text with current daypart.
- Keep atmospheric wording.
- Avoid exposing raw tick math.

## Acceptance

- `/time` changes when world daypart changes.
- Text remains diegetic.

## Implementation Order

Do after: `WORLD-001-B`.

## 0.14.0 Notes

This is satisfied through `WORLD-001-B` in the first 0.14 slice: `/time` reads the shared real-clock world-time helper. If later work adds stored or accelerated world time, keep `/time` pointed at the shared helper rather than reintroducing static calendar text.
