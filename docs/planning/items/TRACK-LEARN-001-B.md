---
id: TRACK-LEARN-001-B
title: Animal movement observation
status: testing
type: feature
area: learning
priority: medium
estimate: 1-2h
tags:
  - tracking
  - animals
  - observe
depends_on:
  - TRACK-LEARN-001-A
  - OBS-001-A
---

# TRACK-LEARN-001-B: Animal movement observation

## Goal

Add one animal observation pattern that can teach tracking.

## First Scope

- Pick one animal/species behavior.
- When observed under good visibility, grant or hint tracking progress.

## Acceptance

- One concrete animal example works.
- Text feels like watching the world, not a tutorial popup.

## Implementation Order

Do after: `TRACK-LEARN-001-A`, `OBS-001-A`.

## 0.16.33 Testing Note

- Implemented as one rabbit movement observation cue only.
- Good visibility is required; hidden movement and darkness do not grant the cue.
- Progress uses the existing tracking learning storage with duplicate/cooldown bounds and qualitative text only.
- Full `Слідування` skill mechanics remain future work under `TRACK-LEARN-001`.
