---
id: SURV-001-D
title: Actual return to start camp
status: testing
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

## 0.13.24 Notes

- Confirmed `/respawn` cancels queued/running player actions, stops rest/auto, moves the character to the configured start location, lowers stamina to at most roughly a third and writes a `Player used respawn return` world event.
- The success response explains the return diegetically before rendering the start camp again.
