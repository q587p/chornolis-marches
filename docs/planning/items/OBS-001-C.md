---
id: OBS-001-C
title: Gathering progress from attentive presence
status: testing
type: feature
area: learning
priority: high
estimate: 1-2h
tags:
  - observe
  - gathering
  - progression
depends_on:
  - OBS-001-B
  - LEARN-001-C
---

# OBS-001-C: Gathering progress from attentive presence

## Goal

Grant the first diegetic learning hint from attentive presence around visible gathering of medicinal herbs, berries and mushrooms without exposing raw progress.

## First Scope

- If a player notices a recent visible gathering source through existing attention surfaces, grant small progress through `CharacterLearningProgress`.
- Record resource-specific contexts for medicinal herbs, berries and mushrooms, while keeping the ordinary player text broad and diegetic.
- Show atmospheric learning text only on rare milestones.
- Keep the effect text-only for now.

## Acceptance

- Progress is persisted or event-recorded.
- Player sees no raw numbers.
- Action cannot be spammed endlessly.
- No yield, stamina or success modifier changes are introduced here.

## Implementation Order

Do after: `OBS-001-B`, `LEARN-001-C`.

## 0.15.21 Note

Implemented through `recordGatheringObservation(...)`, using `src/services/learning.ts` with `gathering` as the skill key, `observation` as the source and resource-specific contexts for medicinal herbs, berries and mushrooms.
