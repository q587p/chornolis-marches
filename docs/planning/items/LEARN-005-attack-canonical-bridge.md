---
id: LEARN-005
title: Attack canonical learning bridge
status: next
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

Preferred release target: `0.15.41`.

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
