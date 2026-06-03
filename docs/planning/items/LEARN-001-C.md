---
id: LEARN-001-C
title: grantSkillProgress helper
status: testing
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
