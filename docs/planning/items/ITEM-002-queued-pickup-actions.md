---
id: ITEM-002
title: Queued pickup actions
status: backlog
type: feature
area: inventory
priority: medium
estimate: 2-4h
tags:
  - pickup
  - inventory
  - action-queue
  - stamina
  - ground-items
depends_on:
  - ITEM-001
---

# ITEM-002: Queued Pickup Actions

## Goal

Move visible-item pickup toward the same physical-action pacing as freshening, gathering, movement and other survival actions.

The current 0.13.x pickup slice keeps single pickup and `get all` / `підняти все` immediate, with a precise stamina charge. That is acceptable as a small bridge while command semantics and corpse pickup settle, but bulk pickup can eventually become too instant for large piles of corpses, resources or dropped items.

## Player Story

As a player, when I pick up a pile of things, I want it to feel like my character is actually taking them one by one or bundling them, while still having a clear way to cancel, wait, or lose a target if someone else reaches it first.

## First Scope

- Keep the existing immediate pickup behavior until this slice is deliberately implemented.
- Route visible ground-item pickup through `WorldAction` or an equivalent shared action queue path:
  - one loose resource stack;
  - one visible corpse;
  - one visible dropped torch or similar item;
  - typed bulk pickup such as `get all corpse`, `get all berries`, `підняти всі трупи`.
- Decide whether bulk pickup should enqueue:
  - one action per item/stack;
  - or a grouped action with duration/stamina scaled by count.
- Preserve clear stamina accounting. Bulk pickup should not bypass stamina limits by doing all work instantly.
- Apply the existing physical-action guards for posture, resting, sleep, action queue conflicts and location changes.
- Handle stale targets gracefully: if an item, corpse or resource stack is gone before the queued pickup resolves, skip that entry or report that it is no longer there without breaking the rest of the queue.
- Keep player-facing text concise and diegetic; do not expose internal queue ids.

## Non-Goals

- Full item-instance economy.
- Encumbrance and carried-weight simulation.
- Containers, packs or equipment slots.
- Rewriting resource gathering; gather remains its own action path.

## Acceptance

- Single visible-item pickup can be queued and completed through the shared action pacing.
- Bulk pickup no longer takes a large pile immediately once this slice is active.
- Typed bulk pickup preserves the current filtering semantics, for example only corpses or only berries.
- If a queued pickup target disappears, the action resolves safely and does not duplicate items.
- Standing/resting/sleeping guards behave like other physical actions.
- Tests cover single pickup, typed bulk pickup, stale target handling and stamina limits.

## Notes

This follows `ITEM-001`, which clarifies what counts as pickup in the first place. Keep the first implementation narrow: visible objects under `Лежить:` are the boundary, not every resource node in the місцина.
