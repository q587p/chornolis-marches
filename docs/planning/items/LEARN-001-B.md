---
id: LEARN-001-B
title: Minimal CharacterSkill model
status: next
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
