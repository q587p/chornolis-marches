---
id: WORLD-001-D
title: /time reads world state
status: next
type: feature
area: world_time
priority: high
estimate: 1h
tags:
  - world-time
  - time-command
depends_on:
  - WORLD-001-C
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

Do after: `WORLD-001-C`.
