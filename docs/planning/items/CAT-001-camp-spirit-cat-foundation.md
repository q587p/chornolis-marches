---
id: CAT-001
title: Camp spirit cat foundation
status: testing
type: feature
area: ecology
priority: medium
tags:
  - cat
  - camp
  - creature
  - ecology
  - spirit
  - immortal
---

# CAT-001 — Camp spirit cat foundation

## Summary

Add the first camp-bound spirit cat as a visible living-world creature/NPC that does not age, die from ordinary ecology, or require hunger upkeep.

## Scope

- Add a species/behavior key such as `camp_cat` or `camp_spirit_cat`.
- Seed exactly one starter cat in the relevant camp location.
- Give it localized Ukrainian display names and target labels.
- Mark it as camp-bound and spiritual/immortal through existing config if possible.
- Prevent ordinary age, hunger, starvation and natural death loops from affecting it.
- Ensure it can still use ordinary visible-being rendering, examine/look target flows and queued actions.

## Out of scope

- Mouse hunting.
- Meat theft.
- Player feeding.
- Companion/follow/taming.
- New migrations, unless config-only lifecycle guard is impossible.

## Acceptance criteria

- A new seeded cat appears in camp after world seed/reset.
- The cat survives lifecycle/world ticks without hunger or old-age death.
- The cat is visible/inspectable like other nearby beings.
- The cat has Ukrainian player-facing copy and no debug/internal label leaks.
- A focused test proves the cat is not removed by ordinary age/hunger/death maintenance.

## Suggested validation

- `node scripts/test/starter-animals.cjs` or a new `node scripts/test/camp-cat.cjs`.
- `npm test`.
- `npm run build`.
