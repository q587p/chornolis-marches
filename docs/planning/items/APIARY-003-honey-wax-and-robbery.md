---
id: APIARY-003
title: Honey wax and hive robbery
status: testing
type: feature
area: resources
priority: medium
tags:
  - apiary
  - honey
  - beeswax
  - resources
---

# APIARY-003 — Honey, Wax And Hive Robbery

## Summary

Add honey and beeswax as useful but limited rewards, then add a deliberate risky hive-robbing action.

## Scope

- Add `honey` and `beeswax` resource types and lexicon forms.
- Add inventory display/use decisions for honey and wax; `0.15.20` adds carry, inspect, drop and scribe grant surfaces, while edible/crafting use remains later.
- Add a deliberate action with warning copy, timing, stock/cooldown limits and stronger disturbance stings.
- Keep yields modest.

## Out Of Scope

- Shops, price tables or broad economy.
- Full bumblebee swarm creatures.
- Bear behavior.
- Full honey food/remedy/crafting/economy uses.

## Acceptance Criteria

- Honey and wax render with correct Ukrainian forms.
- Robbery cannot be spam-farmed.
- Disturbance is risky and visible, but understandable from inspection copy.
- A later disturbed-hive tuning pass should make a recently disturbed apiary feel unsafe to linger near: passive sting chance can rise as high as `930` promille for the disturbed period, damage should be stronger than ordinary passive stings, and the player-facing warning should be atmospheric rather than numeric, e.g. making it clear that the bees are agitated and the character may want to back away and recover.

## Watchpoints

- `0.15.20` uses a Prisma enum migration for `RAID_APIARY`. Deploy order matters: run `prisma migrate deploy` before starting the new bot runtime. PostgreSQL enum rollback is not a simple reverse migration, so rollback usually means reverting code while leaving the unused enum value in place.
- `completeApiaryRaid()` currently applies `raidApiaryForPlayer()` reward/damage/event side effects before spending stamina. This is acceptable while stamina spend is completion bookkeeping, but if stamina spending later becomes a validation gate or can fail, move stamina validation/spend before the raid side effects or make the whole completion transactional.
- `/gather_beeswax` starts the same risky apiary raid as `/gather_honey`: honey is the success reward, while beeswax is chance-based. If player copy starts implying guaranteed wax, update the wording or split the mechanic.
- Disturbed-hive copy should avoid raw numbers. Prefer a short warning that the air has become sharper and more hostile, that the bees no longer merely guard the hollow, and that stepping away may be wiser than testing their anger.
