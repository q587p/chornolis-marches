---
id: LEARN-001-C
title: grantSkillProgress helper
status: done
type: feature
area: learning
priority: high
estimate: 1-2h
tags:
  - learning
  - service
  - progression
depends_on:
  - LEARN-001-B
---

# LEARN-001-C: grantSkillProgress helper

## Goal

Add a single service helper for learning progress.

## First Scope

- Create/update progress row or equivalent.
- Return whether progress was created, increased or capped.
- Keep text rendering outside helper.

## Acceptance

- Helper can be reused by observation and track learning.
- No duplicate progress code.

## Implementation Order

Do after: `LEARN-001-B`.

## 0.15.21 Foundation

`src/services/learning.ts` provides the reusable progress helper foundation for
future `OBS-001` and `TRACK-LEARN-001` slices. Existing food practice learning
bridges into the helper narrowly while preserving old visible milestone cadence.

## Closure

Done in `0.15.21`.

Validation:

- `node scripts/test/learning.cjs`
- `node scripts/test/food-learning.cjs`
- `node scripts/test/gathering-learning.cjs`
- `npm test`
- `npm run build`

Boundary: this closes the shared helper foundation. Later actor-aware helpers,
food effects, attack storage and tracking quality were implemented as separate
learning slices.
