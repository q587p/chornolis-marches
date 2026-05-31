---
id: HMYZ-001-F
title: Persist and queue tree-shake hmyz
status: backlog
type: technical
area: survival
priority: medium
estimate: 1-2h
tags:
  - hmyz
  - trees
  - resources
  - action-queue
depends_on:
  - HMYZ-001-D
---

# HMYZ-001-F: Persist and queue tree-shake hmyz

## Goal

Turn the first climbable-tree hmyz slice into a sturdier renewable-feature model.

## Current MVP Limits

- Tree-shake cooldown currently lives in `Feature.data.last_shaken_at`, alongside `shake_cooldown_ms`.
- World reset/reseed can reset that cooldown because it is stored on JSON-backed feature data.
- `Потрусити дерево` / `/shake_tree` runs immediately after permission and location checks instead of entering the action queue.

## First Scope

- Move renewable feature cooldown state to a runtime/persistent model that survives seed refreshes where practical.
- Keep the authored seed data as static configuration: target drop location, resource key, min/max amount and default cooldown.
- Decide whether tree shaking should become a queued action with duration, stamina cost, interruption risk and local observer text.
- Preserve the simple current UX: if the tree is ready, players can understand it from `/examine`; if not, they get a clear atmospheric cooldown line.

## Acceptance

- Resetting or refreshing seed content does not unintentionally make recently shaken trees ready again.
- Tree-shake state remains inspectable/debuggable for scribes.
- If queued, old immediate callbacks cannot bypass the queue.
- Existing `/shake_tree` and Ukrainian aliases still work.

## Implementation Order

Do after the first tree-shake and campfire-fuel loops are stable.
