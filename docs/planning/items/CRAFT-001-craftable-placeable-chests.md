---
id: CRAFT-001
title: Craftable placeable chests
status: backlog
type: feature
area: crafting
priority: medium
estimate: 4-8h
tags:
  - crafting
  - containers
  - storage
  - item-instances
  - camp
depends_on:
  - CMD-002
---

# CRAFT-001: Craftable Placeable Chests

## Goal

Allow players to craft simple storage chests and place them in the world as local containers.

This should grow out of the current shared beginner cache and future `put`/container work, but it should not turn every location into unlimited safe storage by accident.

## Scope

- Add a craftable chest item or feature:
  - basic material requirements;
  - clear Ukrainian player-facing name and case forms;
  - inspect text that explains whether it is empty, stocked or owned/maintained.
- Let a player place a crafted chest in the current location when the location allows it.
- Let players put items into and take items from the chest through the generic container action layer from `CMD-002`.
- Decide first-pass persistence:
  - feature-backed container;
  - item-instance-backed container;
  - or a transitional hybrid if item instances are not ready.
- Decide what reset/reseed flows do to player-placed chests.

## Guardrails

- Do not make crafted chests fully safe, private or permanent until ownership, theft, decay and settlement rules are designed.
- Do not allow chest spam in every location. Start with caps, placement rules or camp/settlement-only placement.
- Do not mix this with the starter `Спільна скриня прибулих`; that remains a beginner support feature, not a player-crafted chest.
- Avoid exact stock tables in ordinary player text unless debug/details mode is active.
- Keep future MUD/client command shapes in mind: `craft chest`, `place chest`, `put berries chest`, `take berries chest`.

## Acceptance

- A player can craft one simple chest from appropriate resources.
- A player can place it in an allowed location.
- The placed chest appears as an inspectable local feature/container.
- Basic put/take flows work through the same container semantics as other local containers.
- Placement limits and reset behavior are documented.
- Tests cover the pure crafting/placement rule helpers and command aliases where practical.

## Notes

This is future work after the command/container layer is less ad hoc. It should probably land before larger settlement building, but after item-instance or durable-container storage is clear enough that chests do not become invisible aggregate counters.
