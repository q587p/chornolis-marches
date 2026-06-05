---
id: LEARN-005
title: Attack canonical learning bridge
status: done
type: feature
area: learning
priority: medium
tags:
  - learning
  - attack
  - observation
  - combat
depends_on:
  - LEARN-004
---

# LEARN-005 — Attack Canonical Learning Bridge

## Goal

Move the existing attack practice/observation bridge onto canonical learning progress without adding attack skill effects or opening the full combat system.

Preferred release target: `0.15.42`.

## Scope

- Record canonical `attack` progress for the current narrow eligible attack flow.
- Record canonical `attack` observation progress when a player clearly observes a relevant attack source.
- Preserve existing sparse milestone flavor where appropriate.
- Use the shared learning service and the observed-actor helper from `LEARN-004` if that helper is ready.

## Strict Non-Goals

- No attack success bonus.
- No damage bonus.
- No predator/player combat expansion.
- No weapon skill effects.
- No public `/skills` UI.
- No arena/training-yard implementation yet.

## Acceptance Notes

- Attack learning becomes canonical storage, not a parallel WorldEvent-only bridge.
- No player-facing text implies that combat has become deeper or safer.
- Tests prove this is a learning-storage bridge only, with no attack mechanics change.

## Current Boundary

`0.15.42` implements this as a storage bridge:

- eligible player and creature attack attempts can write canonical `attack` / `practice` / `attack` rows;
- existing player attack observation can write canonical `attack` / `observation` / `attack` rows;
- hunter-like local characters can learn from attack observation through the existing creature `LOOK` completion path;
- old sparse kill-observation flavor remains in place.

This still does not add attack success, damage, weapon or combat effects.

## Closure

Done in `0.15.42` / PR `#141`.

Validation:

- `node scripts/test/attack-learning.cjs`
- `node scripts/test/learning.cjs`
- `node scripts/test/npc-hunter.cjs`
- `node scripts/test/target-formatting.cjs`
- `npm test`
- `npm run build`

Boundary: this closes canonical attack learning storage only. Attack chance,
damage, weapon effects, arena/training-yard runtime and full combat redesign
remain future work.
