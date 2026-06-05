---
id: LEARN-003
title: Cooking observation and effect parity
status: done
type: feature
area: learning
priority: high
tags:
  - learning
  - cooking
  - food
  - observation
depends_on:
  - LEARN-002
---

# LEARN-003 — Cooking Observation And Effect Parity

## Goal

After the freshening learning/effect slice, give cooking the same small canonical bridge: practice and observation should write shared learning progress, and stored cooking progress should modestly affect cooking success.

Preferred release target: `0.15.39`.

## Scope

- Move cooking observation onto canonical `CharacterLearningProgress` rows.
- Keep existing sparse WorldEvent / milestone-style observation flavor if it still fits.
- Add a small bounded cooking success effect from stored `cooking` progress.
- Keep failed cooking consequences unchanged unless a separate food task changes them.
- Keep raw progress hidden from ordinary players.

## Non-Goals

- No recipes, ingredients or cooking stations beyond the current raw-meat loop.
- No public `/skills` UI.
- No broad food quality system.
- No extra meat yield or economy loop.
- No NPC cooking rebalance unless it is a tiny shared-path cleanup.

## Acceptance Notes

- Cooking practice still records canonical progress.
- Cooking observation records canonical progress once per observed source.
- Higher cooking progress can slightly improve success chance but cannot guarantee success.
- Player-facing text stays qualitative and does not expose formulas.

## Implementation Notes

`0.15.39` implements the MVP parity slice:

- cooking observation writes canonical `cooking` / `observation` / `cooking` progress;
- stored cooking progress adds a small capped success-chance bonus for ordinary player cooking;
- raw meat cost, cooked meat yield, hunger relief, recipes, food quality and public skill UI remain unchanged.

Watchpoints:

- observation dedupe still depends on existing WorldEvent source markers and retention;
- the first aggregation policy uses all canonical rows with `skillKey=cooking` and `contextKey=cooking`; if future cooking contexts split by recipe, station or food type, this helper should get a more explicit policy.

## Closure

Done in `0.15.39` / PR `#138`.

Validation:

- `node scripts/test/food-learning.cjs`
- `node scripts/test/meat.cjs`
- `node scripts/test/learning.cjs`
- `npm test`
- `npm run build`

Boundary: this closes cooking observation/effect parity only. Recipes, stations,
food quality, extra yield, economy hooks and public `/skills` remain separate
future work.
