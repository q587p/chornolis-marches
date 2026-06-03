---
id: NPC-003
title: Herbalist service layer
status: in_testing
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
- When herbalists carry gathered herbs, berries or mushrooms, public `examine` should summarize those supplies qualitatively (`без лікарських трав`, `трохи ягід`, `багато грибів`) rather than exposing exact private inventory counts. Scribe/admin views may show exact values.
- Give herbalists their own profession-aware reactions to fitting social signals after the service layer exists. They can acknowledge nods, quiet people with `Притишити`, point toward herbs or danger, and ignore signals that do not fit their current work.

## 0.15.26 Slice

`0.15.26` adds `src/services/npcHerbalist.ts` and moves the active herbalist tick body out of `worldTick.ts`. The new service preserves the old ambient/social fallback, then adds a narrow supply-run MVP with `WorldEvent` route markers, starter-cellar staging and existing `GATHER_SPECIFIC` gather actions.

This completes the first service-boundary step, but does not yet implement real herbalist inventory, food decisions, torch lifecycle, shared storage, richer social reactions or a full profession schedule.
