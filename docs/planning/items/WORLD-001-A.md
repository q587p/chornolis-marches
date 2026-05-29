---
id: WORLD-001-A
title: Tiny world-time model design
status: next
type: design
area: world_time
priority: high
estimate: 1h
tags:
  - world-time
  - day-night
depends_on: []
---

# WORLD-001-A: Tiny world-time model design

## Goal

Choose the smallest model that can support daypart state.

## First Scope

- Decide between a `WorldState` key/value row or typed world-clock fields.
- Document migration shape.
- Keep moon/seasons out.

## Acceptance

- Decision recorded.
- Out-of-scope is clear.
- Implementation task can proceed.

## Implementation Order

Can be done independently.
