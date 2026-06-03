---
id: APIARY-002
title: Passive bumblebee sting hazard
status: in_progress
type: feature
area: ecology
priority: medium
tags:
  - apiary
  - bumblebee
  - hazard
  - hp
---

# APIARY-002 — Passive Bumblebee Sting Hazard

## Summary

Make the first apiary feel alive by adding rare passive bumblebee stings around it.

## Scope

- Trigger conservative passive checks after movement, full location look/inspection and waiting.
- Use apiary metadata for chance, damage and cooldown tuning.
- Skip passive checks at night while the hive sleeps.
- Store cooldown memory in `WorldEvent`.
- Clamp passive damage so it cannot kill a player.
- Keep honey/wax robbery and world-tick proactive stings out of this slice.

## 0.15.19 Slice

0.15.19 adds `src/services/apiaryHazards.ts`, hooks it into the existing action completion and inspection paths, and adds helper tests for the tuning rules.

## Acceptance Criteria

- Center apiary checks use stronger chance/damage than adjacent aura checks.
- Out-of-radius locations do not sting.
- Night passive checks do not sting.
- Cooldown prevents repeated sting spam.
- Passive damage leaves at least 1 HP.

## Suggested Validation

- `node scripts/test/apiary-hazards.cjs`
- `npm test`
- `npm run build`
