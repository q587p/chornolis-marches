---
id: NPC-003
title: Herbalist service layer
status: next
type: technical
area: npc
priority: medium
estimate: 2-4h
tags:
  - npc
  - herbalist
  - architecture
  - world-tick
depends_on: []
---

# NPC-003: Herbalist Service Layer

## Goal

Move herbalist behavior out of the broad world tick file into a dedicated NPC service layer, similar to the current hunter service shape.

This is near-term cleanup, not a behavior expansion. The point is to make future herbalist work easier: visible actions, observation learning, social lines, gathering choices, hunger/food decisions, and later profession-specific inventory can grow without adding more weight to `worldTick.ts`.

## Scope

- Add a dedicated herbalist service module, likely `src/services/npcHerbalist.ts`.
- Keep a small exported tick entry point, for example `tickNpcHerbalist(bot, herbalist)`.
- Move herbalist constants, line pools and helper functions into that service where practical.
- Keep `worldTick.ts` responsible for dispatching to the service, not owning the behavior details.
- Preserve current behavior and player-facing text unless a tiny compatibility adjustment is required.
- Add focused helper coverage if line selection, profession detection or action-state parsing becomes exported.

## Acceptance

- Herbalist tick behavior is reachable through a dedicated service module.
- `worldTick.ts` no longer contains the main herbalist behavior body.
- Existing herbalist ambient behavior and social/auto speech still work.
- Existing hunter service shape remains the reference pattern.
- `npm test` and `npm run build` pass.

## Related Follow-Ups

- `OBS-001-B` can use this service boundary when exposing a visible herbalist action for observation.
- `NPC-005` can use this service boundary when hungry herbalists decide to eat berries or mushrooms.
- Later herbalist inventory/resource decisions should build on this boundary instead of placing more profession code in `worldTick.ts`.
