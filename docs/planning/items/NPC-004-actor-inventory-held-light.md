---
id: NPC-004
title: Actor inventory and held light foundation
status: in_progress
type: technical
area: npc
priority: high
estimate: 4-8h
tags:
  - npc
  - actors
  - inventory
  - torch
  - light
depends_on:
  - FIRE-001-C
---

# NPC-004: Actor Inventory and Held Light Foundation

## Goal

Move NPC state closer to player-character state: inventory, held items, lit-torch timers, light emission, action pacing, hunger and eventually skills should use shared actor-facing rules wherever practical.

The immediate pressure is the hunter loop: Орина's lit torch and spare torch used to be represented by a lightweight hunter-state marker, not by real NPC-held inventory with burn timing and visibility. The 0.13.13 slice starts replacing that bridge with real `CreatureResource` rows for NPC-held torches while leaving claimed carcasses as the remaining lightweight marker.

## Design Direction

- NPCs should be player-like actors, not special-case counters.
- If a rule exists for players and can sensibly apply to NPCs, prefer sharing it before adding profession-specific shortcuts.
- Inventory, held item visibility, active light, action queues, stamina, hunger, wounds, skills and social state should converge over time.
- Profession services such as hunter and herbalist should describe intent and decisions; shared actor services should handle ordinary item/light/action mechanics.

## First Scope

- Add or choose a shared representation for NPC-carried resources/items that can support at least `torch` and `lit_torch`.
- Preserve lit-torch burn timers for NPC-held torches instead of encoding them only in `Creature.currentAction`.
- Make NPC-held lit torches count as local light in the same visibility layer as player-held lit torches.
- Count NPC-held lit-torch light even when the NPC is not currently visible to a viewer; light belongs to the location, not to the viewer's target list.
- If an NPC is explicitly hidden or stealth-like but openly carries a lit torch, the torch should reveal that presence instead of allowing a fully hidden light source with no visible bearer.
- Let hunter torch pickup/resupply write real held state where practical.
- Keep hunter-specific state only for hunter decisions: route intent, claimed carcasses, return-for-supply intent.
- Keep player inventory behavior unchanged.

## 0.13.13 Slice

- Added `CreatureResource` as the NPC/creature-side carried-resource table, parallel to `PlayerResource`.
- Seed/reset can now assign carried resources to unique creatures; Орина starts with one `lit_torch` and one spare `torch`.
- NPC-held lit torches use the same `TORCH_DURATION_MS` timer assumptions as player-held lit torches and count as active local light.
- Hunter torch pickup and gate resupply now write real carried resources; the old `hunter_torches:` marker remains only as a compatibility fallback for already-running state.
- Hunter `currentAction` may still hold route/intent markers such as `hunter_returning_for_torches`; that is decision state, not inventory.

## Acceptance

- A seeded NPC can start with a real held lit torch and a real spare torch. (0.13.13)
- NPC-held lit torches expire or fade through the same timer assumptions as player-held lit torches. (0.13.13 foundation)
- NPC-held lit torches can provide light to the current location. (0.13.13)
- NPC-held lit torches provide local light regardless of whether the carrier was already visible to a particular character.
- A hidden NPC with a visible/openly carried lit torch is no longer fully hidden in ordinary location visibility; the light should expose at least an uncertain bearer rather than appearing as ownerless hidden light.
- `/look` / `/examine` style visibility can describe an obvious NPC-held torch without exposing internal state. (0.13.13)
- Hunter code no longer needs the lightweight `hunter_torches` marker for basic carried torch count once this foundation is active. (0.13.13, with compatibility fallback)
- Migration tests cover the current lightweight `Creature.currentAction` bridge for claimed carcasses and hunter torch bundles, especially hunter death, interruption, disappearance and reset.
- `npm test` and `npm run build` pass.

## Follow-Ups

- NPC skills should eventually reuse the same skill/progression model as players where possible.
- NPC hunger and food behavior should build on this layer so hunters and herbalists can use ordinary carried resources and food actions.
- Herbalist inventory should later use this layer for herbs, remedies and gathered resources.
- NPC group/follow behavior should eventually use the same actor-facing movement and action-state assumptions.
