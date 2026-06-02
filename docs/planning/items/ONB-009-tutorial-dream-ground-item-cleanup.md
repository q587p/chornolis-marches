---
id: ONB-009
title: Tutorial dream ground item cleanup
status: testing
type: tech
area: onboarding
priority: high
estimate: 1-2h
tags:
  - tutorial
  - dream
  - cleanup
  - items
  - resources
depends_on:
  - ONB-006
---

# ONB-009: Tutorial Dream Ground Item Cleanup

## Goal

Keep the tutorial dream focused on its authored lessons by removing or hiding unrelated ground items/resources that drift into dream locations.

The tutorial dream is a controlled teaching space. If ordinary dropped items, leftover resources, corpses, or unrelated loot appear there, a new player can mistake them for part of the lesson, skip the intended affordance, or leave with a distorted idea of how the waking world works.

## Scope

- Audit tutorial dream locations for unrelated `ResourceNode` / ground-item state.
- Decide the cleanup boundary:
  - remove unrelated ground resources/items when entering or resetting the tutorial dream;
  - or ignore/hide non-tutorial resources in tutorial rendering;
  - or mark tutorial-authored resources with explicit origin metadata and clean only non-tutorial origins.
- Preserve resources and items that are intentionally part of a tutorial lesson.
- Make `/tutorialReset`, new-character tutorial entry, and any future dream restart path leave the dream in a clean authored state.
- Add a focused regression test that unrelated ground items in tutorial dream cells do not appear in ordinary tutorial `/look` / `/examine` output after the cleanup path.

## 0.15.18 Slice

- Hide unrelated visible ground resources in tutorial dream locations through the shared `isVisibleGroundResource(...)` boundary.
- Keep only authored tutorial loose resources (`berries`, `herbs`) visible there for the current foraging lesson.
- Preserve ordinary waking-world pickup visibility outside tutorial locations.
- Add `scripts/test/tutorial-ground-items.cjs` to cover the tutorial/waking split without needing database setup.

This first slice is a visibility and normal-pickup guard. It does not delete old database rows that may already exist in dream cells; a later origin-marking or cleanup command can remove persisted leftovers if needed.

## Out of Scope

- Full item-instance lifetime or dream-item transfer system.
- Ordinary waking-world ground-item cleanup.
- Removing useful tutorial lesson resources such as authored gather/eat/rest teaching surfaces.
- Changing tutorial completion, wake, or dream navigation rules.

## Acceptance

- A fresh tutorial dream does not show unrelated dropped items, corpses, random loot, or waking-world resource leftovers.
- Tutorial-authored resources still appear where the lesson expects them.
- Re-entering or resetting the tutorial dream cleans the same boundary consistently.
- The cleanup does not delete waking-world inventory or ordinary waking-world items.
- A focused test covers at least one unrelated tutorial-dream ground item/resource case.

## Validation

- `node scripts/test/tutorial-gate.cjs`
- `node scripts/test/tutorial-voices.cjs`
- `node scripts/test/tutorial-ground-items.cjs`
- `npm test`
- `npm run build`
