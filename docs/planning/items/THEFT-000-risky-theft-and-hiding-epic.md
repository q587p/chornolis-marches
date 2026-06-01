---
id: THEFT-000
title: Risky theft and hiding epic
status: backlog
type: epic
area: social
priority: medium
estimate: multi-slice
tags:
  - theft
  - hiding
  - stealth
  - social-memory
  - 0.15
depends_on:
  - VIS-001-A
  - OBS-001-A
---

# THEFT-000 — Risky Theft and Hiding Epic

## Status

Planned.

## Target line

0.15.x, after the first attention/learning MVP is stable.

## Goal

Add a first theft-and-hiding foundation that treats theft as a risky social action with memory, reaction and scribe-visible statistics.

## Non-goals

- No full law system.
- No bounties.
- No settlement-wide punishment.
- No mass-looting.
- No exact item picker in the first slice.
- No theft of tutorial-critical last items.
- No permanent invisibility.

## Included planning items

- `THEFT-001-risky-theft-mvp.md`
- `HIDE-001-hidden-approach-mvp.md`
- `SOCIAL-003-theft-reaction-signals.md`
- `THEFT-002-world-controlled-thief-character.md`
- `THEFT-003-spirit-theft-mvp.md`

## Design anchor

Theft should make the world feel attentive.

A good theft result is not only “item moved from A to B”. It should answer:

- Did the thief get anything?
- Did the target notice?
- Did someone else notice?
- Did this change trust or suspicion?
- Did the world record the attempt?
- Did the thief or observer learn anything?

## Minimum acceptance

The epic can be considered initially satisfied when:

- player-controlled theft works against a player or world-controlled character;
- the first warning exists;
- one unit can transfer;
- success and detection are separate;
- cooldown exists;
- protected locations are respected;
- observed attempts notify player targets;
- every started attempt writes an incident;
- scribes can see aggregate attempt statistics.
