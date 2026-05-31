---
id: WORLD-001-B
title: Persistent world-clock storage
status: next
type: technical
area: world_time
priority: high
estimate: 1-2h
tags:
  - world-time
  - schema
  - moon
  - 0.14
depends_on:
  - WORLD-001-A
---

# WORLD-001-B: Persistent World-Clock Storage

## Goal

Persist the internal world clock so deploys/restarts do not reset day/night, moon or weather foundations.

## First Scope

- Add a single persistent world-state row or equivalent storage.
- Store at minimum `absoluteMinute` and `lastAdvancedAt`.
- Seed/default the starting timestamp: year 587, `Коло Зеленого Шуму`, day 17, 17:00.
- Leave room for weather state if it lands in the same or next slice.
- Generate Prisma if schema changes.

## Acceptance

- Build passes.
- Default world has a valid internal clock.
- The stored clock survives process restart.
- Scribe/admin `/reset world` and `/reset full` reset the stored clock back to the starter timestamp.
- `/reset stats` does not change world-clock state.
- No unrelated schema churn.
- No package version changes.

## Implementation Order

Do after: `WORLD-001-A`.
