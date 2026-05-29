---
id: WORLD-001-B
title: Daypart storage
status: next
type: technical
area: world_time
priority: high
estimate: 1-2h
tags:
  - world-time
  - schema
depends_on:
  - WORLD-001-A
---

# WORLD-001-B: Daypart storage

## Goal

Persist simple dawn/day/dusk/night state.

## First Scope

- Add migration/model or reuse existing world state.
- Seed default daypart if needed.
- Generate Prisma if schema changes.

## Acceptance

- Build passes.
- Default world has a valid daypart.
- No unrelated schema churn.

## Implementation Order

Do after: `WORLD-001-A`.
