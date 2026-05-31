---
id: SURV-001-E
title: Beginner return cooldown/consequence
status: testing
type: feature
area: survival
priority: medium
estimate: 1-2h
tags:
  - respawn
  - cooldown
  - balance
depends_on:
  - SURV-001-D
---

# SURV-001-E: Beginner return cooldown/consequence

## Goal

Prevent `Повернення` from becoming fast travel.

## First Scope

- Add a cooldown, stamina consequence or other small cost.
- Use atmospheric text.
- Keep the first version simple.

## Acceptance

- Repeated use is limited.
- Consequence is visible.
- No harsh punishment for new players.

## Implementation Order

Do after: `SURV-001-D`.

## 0.13.24 Notes

- Added a first 30-minute real-time cooldown using the world event trail.
- Added the first consequence: the return interrupts queued/running actions and lowers stamina to at most roughly a third.
