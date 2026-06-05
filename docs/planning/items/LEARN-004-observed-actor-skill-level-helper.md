---
id: LEARN-004
title: Observed actor skill level helper
status: in_testing
type: technical
area: learning
priority: high
tags:
  - learning
  - observation
  - npc
  - actors
depends_on:
  - LEARN-003
---

# LEARN-004 — Observed Actor Skill Level Helper

## Goal

Add a small shared helper for comparing the observer's stored skill with the observed actor's likely skill, without creating a broad NPC skill table.

Preferred release target: `0.15.40`.

## Direction

- Add a helper shaped like `observedActorSkillLevel(...)` or equivalent.
- For player targets, read canonical `CharacterLearningProgress` through the shared learning service.
- For local characters / professions, return small authored defaults where they are useful, for example herbalists, hunters, fishers or other practiced roles.
- For creatures, return conservative species/profile defaults only when a skill is clearly species-relevant.
- Keep the helper qualitative and bounded; do not expose exact actor skill numbers to ordinary players.

## Why

Observation should eventually care whether the observed being is meaningfully better, worse or merely different from the observer. This helper gives later learning slices one place to ask that question.

## Non-Goals

- No broad NPC skill schema.
- No public actor stat sheet.
- No automatic apprenticeship system.
- No combat effects.

## Acceptance Notes

- Existing learning progress readers remain the source of truth for player skill.
- Profession/species defaults are small, documented and testable.
- Helpers can answer "unknown / no useful difference" safely.

## Implementation Notes

`0.15.40` implements the foundation form:

- player targets use existing canonical `CharacterLearningProgress` rows;
- creature targets can use stored `CreatureLearningProgress` rows plus small profession/species defaults;
- ordinary display stays qualitative and hides raw numbers;
- raw rows remain available through technical details and scribe/admin surfaces.

This is still not a broad NPC skill tree. Attack learning and combat effects remain outside this slice.
