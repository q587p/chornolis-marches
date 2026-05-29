---
id: SURV-001-D
title: Actual return to start camp
status: next
type: feature
area: survival
priority: high
estimate: 1-2h
tags:
  - respawn
  - location
  - queue
depends_on:
  - SURV-001-C
---

# SURV-001-D: Actual return to start camp

## Goal

Move eligible characters back to `start_border_camp` safely.

## First Scope

- Interrupt or clear incompatible queued actions.
- Move player to start location.
- Render the new location or confirmation.

## Acceptance

- Player lands at start camp.
- Queue state remains consistent.
- World event/audit is written.

## Implementation Order

Do after: `SURV-001-C`.
