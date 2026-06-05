---
id: LEARN-004
title: Observed actor skill level helper
status: done
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

`0.15.41` adds the first narrow observation use of this foundation:

- eligible local characters can learn from nearby supported gathering source events when they complete ordinary `LOOK`;
- the canonical row is `gathering` / `observation` / `resource:<key>` for herbs, berries or mushrooms;
- dedupe uses explicit creature observation `WorldEvent` markers;
- unsupported sources, ordinary animals and combat stay outside this item.

## Follow-up Watchpoints

- NPC/creature observation is no longer empty after `0.15.41`, but it is still
  only the first narrow bridge. Future slices should decide whether freshening,
  cooking or other non-combat observations should be added, and whether they
  should still trigger from existing `LOOK` moments or from a dedicated bounded
  observation cadence.
- `observedActorSkillLevel(...)` currently uses conservative profession/species
  defaults close to the helper. If these defaults start to matter in more
  places, move them into a small data/config map instead of spreading semantic
  policy through regex-style matching.
- Target inspection can now show compact `Навички:` summaries for visible local
  characters. Watch live play: if ordinary inspection starts feeling like an RPG
  stat sheet, narrow the public surface to top non-zero profession-flavored hints
  or move more of it behind detailed/technical views.

## Closure

Done across `0.15.40` / PR `#139` and `0.15.41` / PR `#140`.

Validation:

- `node scripts/test/learning.cjs`
- `node scripts/test/gathering-learning.cjs`
- `node scripts/test/creature-observation-learning.cjs`
- `npm test`
- `npm run build`

Boundary: this closes the helper/foundation and first narrow NPC observation
MVP. It does not close broader NPC observation scheduling, freshening/cooking
observation for creatures, default-config cleanup or public skill UI.
