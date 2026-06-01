---
id: LOOP-002
title: Gate hunting loop
status: testing
type: feature
area: world
priority: high
estimate: 3-5h
tags:
  - ecology
  - hunting
  - gate
  - living-world
depends_on:
  - ITEM-001
---

# LOOP-002: Gate Hunting Loop

## Goal

Create the first settlement-facing ecological loop: a notice near the gate says herbivores are overgrazing the borderland while predators are scarce, and a physical drop-off near the gate accepts carcasses/remains as proof of contribution.

This must feel like local ecological maintenance, not a standard kill-count quest.

## First Scope

- Add the system design doc.
- Add an inspectable gate notice.
- Add an inspectable carcass/remains drop-off feature near the gate.
- Connect the drop-off to a narrow `put` command and contribution service.
- Record player contributions and trigger small diegetic settlement reactions.
- Keep NPC hunter behavior as a follow-up slice unless it can use the same service safely.

## Out of Scope

- Formal quest accept/complete state.
- Full economy and fixed bounty table.
- Deep ecology population tuning.
- Full NPC hunting program.

## Acceptance

- The gate location has an examine-able notice.
- The gate location has an examine-able carcass drop-off feature.
- The text clearly points to bringing carcasses/remains without promising a fixed per-corpse price.
- Valid carcass/remains drop-offs are recorded.
- Invalid items are rejected safely.
- Tutorial/dream locations are not changed.
