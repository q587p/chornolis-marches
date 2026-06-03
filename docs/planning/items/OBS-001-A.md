---
id: OBS-001-A
title: Observation through existing attention surfaces
status: testing
type: feature
area: learning
priority: high
estimate: 1-2h
tags:
  - observe
  - look
  - examine
  - attentive-presence
depends_on:
  - LEARN-001-C
  - VIS-001-C
---

# OBS-001-A: Observation through existing attention surfaces

## Goal

Make the first observation-learning slice use existing attention surfaces instead of adding another look-like command.

## First Scope

- Keep `/look` as orientation.
- Keep `/examine` as careful inspection.
- Treat witnessed local action, same-location attentive presence and future follow intent as observation context.
- Do not add `/observe`, a new main keyboard button or a command alias wall in this slice.

## Acceptance

- Existing `/look` and `/examine` remain the primary attention surfaces.
- Observation-learning tasks can use `src/services/learning.ts` without inventing a separate store.
- `/observe` is deferred unless playtesting proves a separate verb is needed.

## Implementation Order

Do after: `LEARN-001-C`, `VIS-001-C`.

## Foundation Note

Use `src/services/learning.ts` and `CharacterLearningProgress` from the
`LEARN-001` foundation. Do not add a separate observation-only progress store.

## 0.15.21 Note

This slice is now the policy boundary for `0.15.21`: observation starts as a layer over existing careful play, not as a third command beside `/look` and `/examine`.
