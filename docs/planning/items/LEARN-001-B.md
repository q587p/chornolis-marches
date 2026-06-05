---
id: LEARN-001-B
title: Minimal CharacterSkill model
status: done
type: technical
area: learning
priority: high
estimate: 1-2h
tags:
  - learning
  - schema
  - skills
depends_on:
  - LEARN-001-A
---

# LEARN-001-B: Minimal CharacterSkill model

## Goal

Add minimal persistent skill progress if the decision requires it.

## First Scope

- Add playerId/key/level/progress/discoveredAt/updatedAt.
- Add unique playerId+key.
- Generate Prisma if schema changes.

## Acceptance

- Build passes.
- No broad skill list UI.
- No unrelated schema changes.

## Out of Scope

- Skip this if event-only prototype is chosen.

## Implementation Order

Do after: `LEARN-001-A`.

## 0.15.21 Foundation

`CharacterLearningProgress` stores `playerId`, `skillKey`, `sourceKey`,
`contextKey`, `level`, `progress`, `totalProgress`, `milestoneCount` and optional
`lastSourceEventId`. Raw progress remains implementation data, not ordinary
player-facing UI.

## Closure

Done in `0.15.21`.

Validation:

- `node scripts/test/learning.cjs`
- `node scripts/test/gathering-learning.cjs`
- `npm test`
- `npm run build`

Boundary: the MVP table is complete. Actor/creature learning storage arrived
later as a separate `0.15.40` slice and is not part of this original player-table
item.
