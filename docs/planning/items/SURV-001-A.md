---
id: SURV-001-A
title: Beginner return eligibility helper
status: testing
type: feature
area: survival
priority: high
estimate: 1-2h
tags:
  - respawn
  - beginner
  - safety
depends_on:
  - ONB-001-E
---

# SURV-001-A: Beginner return eligibility helper

## Goal

Add the first helper that decides whether `Повернення` is allowed.

## First Scope

- Create a narrow helper such as `canUseBeginnerReturn`.
- Gate by early progression threshold.
- Avoid allowing fast travel for established characters.

## Acceptance

- Eligible new characters pass.
- Established characters are refused.
- Helper is isolated enough to test.

## Implementation Order

Do after: `ONB-001-E`.

## 0.13.24 Notes

- Added a generous first helper for `/respawn`: early-progress characters pass, weak characters pass, already-home, missing-location, cooldown and established-character cases are refused with player-facing text.
- Added focused helper coverage in `scripts/test/beginner-return.cjs`.
