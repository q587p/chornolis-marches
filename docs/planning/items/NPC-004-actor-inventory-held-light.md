---
id: NPC-004
title: Actor inventory and held light foundation
status: next
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

The immediate pressure is the hunter loop: Орина's lit torch and spare torch are currently represented by a lightweight hunter-state marker, not by real NPC-held inventory with burn timing and visibility. That is acceptable only as a temporary bridge. The next small layer should make NPC-held torches behave like player-held torches.

## Design Direction

- NPCs should be player-like actors, not special-case counters.
- If a rule exists for players and can sensibly apply to NPCs, prefer sharing it before adding profession-specific shortcuts.
- Inventory, held item visibility, active light, action queues, stamina, hunger, wounds, skills and social state should converge over time.
- Profession services such as hunter and herbalist should describe intent and decisions; shared actor services should handle ordinary item/light/action mechanics.

## First Scope

- Add or choose a shared representation for NPC-carried resources/items that can support at least `torch` and `lit_torch`.
- Preserve lit-torch burn timers for NPC-held torches instead of encoding them only in `Creature.currentAction`.
- Make NPC-held lit torches count as local light in the same visibility layer as player-held lit torches.
- Let hunter torch pickup/resupply write real held state where practical.
- Keep hunter-specific state only for hunter decisions: route intent, claimed carcasses, return-for-supply intent.
- Keep player inventory behavior unchanged.

## Acceptance

- A seeded NPC can start with a real held lit torch and a real spare torch.
- NPC-held lit torches expire or fade through the same timer assumptions as player-held lit torches.
- NPC-held lit torches can provide light to the current location.
- `/look` / `/examine` style visibility can describe an obvious NPC-held torch without exposing internal state.
- Hunter code no longer needs the lightweight `hunter_torches` marker for basic carried torch count once this foundation is active.
- Migration tests cover the current lightweight `Creature.currentAction` bridge for claimed carcasses and hunter torch bundles, especially hunter death, interruption, disappearance and reset.
- `npm test` and `npm run build` pass.

## Follow-Ups

- NPC skills should eventually reuse the same skill/progression model as players where possible.
- NPC hunger and food behavior should build on this layer so hunters and herbalists can use ordinary carried resources and food actions.
- Herbalist inventory should later use this layer for herbs, remedies and gathered resources.
- NPC group/follow behavior should eventually use the same actor-facing movement and action-state assumptions.
